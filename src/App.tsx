import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import { TitleBar } from "./components/TitleBar";
import { Sidebar, type Queue } from "./components/Sidebar";
import { QuickBar } from "./components/QuickBar";
import { VisualizerCanvas } from "./components/VisualizerCanvas";
import { SettingsDialog } from "./components/SettingsDialog";
import { PlayerBar } from "./components/PlayerBar";
import { Stage } from "./components/Stage";
import { card } from "./components/primitives";
import { useRadioPlayer } from "./hooks/useRadioPlayer";
import { usePomodoro, type Phase } from "./hooks/usePomodoro";
import { getGenre } from "./data/genres";
import { DEFAULT_GENRE, DEFAULT_STATION, PICKS, isPick, type Station } from "./data/stations";
import { getProxyPort, proxied, resolveStationUrl, isTauri } from "./lib/proxy";
import { useAppearance } from "./theme/useAppearance";
import { useFavorites } from "./hooks/useFavorites";
import { useAlbumArt } from "./hooks/useAlbumArt";
import { loadShowUnverified, useCatalog } from "./hooks/useCatalog";

/** How many dead stations in a row the player will step over by itself. The
    world lists are uncurated, and without a limit one bad country could have
    it walking down eighty streams. */
const MAX_AUTO_SKIPS = 5;

/**
 * The last station and the list it came from, so a restart puts back what was
 * on rather than the default. It is selected, not played: a radio that starts
 * by itself when the app opens is a surprise nobody asked for.
 */
const LAST_KEY = "tunescape:last";

function loadLast(): { station: Station; queue: Queue } {
  const fallback = {
    station: DEFAULT_STATION,
    queue: { name: getGenre(DEFAULT_GENRE)?.name ?? "Ambient", stations: PICKS[DEFAULT_GENRE] ?? [] },
  };
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
    const ok = (s: unknown): s is Station =>
      !!s && typeof (s as Station).name === "string" && typeof (s as Station).url === "string";
    if (!parsed || !ok(parsed.station)) return fallback;
    // With the catalog at Picks only, a directory station left over from before
    // doesn't get to come back as the thing that is on.
    const allowed = (s: Station) => loadShowUnverified() || isPick(s);
    if (!allowed(parsed.station)) return fallback;
    const stations = Array.isArray(parsed.queue?.stations)
      ? parsed.queue.stations.filter(ok).filter(allowed)
      : [];
    return {
      station: parsed.station,
      queue: stations.length
        ? { name: String(parsed.queue.name ?? "this list"), stations }
        : fallback.queue,
    };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [port, setPort] = useState<number | null>(null);
  const [portError, setPortError] = useState<string | null>(null);
  const [last] = useState(loadLast);
  const [selected, setSelected] = useState<Station>(last.station);
  const [playing, setPlaying] = useState<Station | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  /** Stations that failed while we were listening. Dimmed, and skipped over. */
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const appearance = useAppearance();
  const favorites = useFavorites();
  const catalog = useCatalog();

  const resolvedCache = useRef(new Map<string, string>());
  /** Rising token so a slow resolve from an earlier click can't land after a later one. */
  const playSeq = useRef(0);
  /** Indirection so the player can call a handler defined further down. */
  const onFailedRef = useRef<(reason: string) => void>(() => {});
  /** The failure handler can fire before React has re-rendered with the new
      `playing`, so it reads the station from here rather than from state. */
  const playingRef = useRef<Station | null>(null);
  /** The list the current station was picked from — where "next" comes from. */
  const queueRef = useRef<Queue>(last.queue);
  /** The same queue as state, so the sidebar can mark where playback came from. */
  const [queue, setQueue] = useState<Queue>(last.queue);
  const autoSkips = useRef(0);
  /** What to put back on when a break ends. */
  const resumeRef = useRef<Station | null>(null);
  const onPhaseRef = useRef<(next: Phase, previous: Phase) => void>(() => {});

  const player = useRadioPlayer({ onFailed: (reason) => onFailedRef.current(reason) });
  const pom = usePomodoro({ onPhaseChange: (n, p) => onPhaseRef.current(n, p) });

  useEffect(() => {
    if (!isTauri()) {
      setPortError("Not running inside Tauri — start with `npm run tauri dev`.");
      return;
    }
    getProxyPort()
      .then(setPort)
      .catch((e) => setPortError(String(e)));
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const un = listen<{ title: string }>("now-playing", (e) => setNowPlaying(e.payload.title));
    return () => {
      un.then((f) => f());
    };
  }, []);

  const resolve = useCallback(async (station: Station) => {
    const hit = resolvedCache.current.get(station.url);
    if (hit) return hit;
    const url = await resolveStationUrl(station.url);
    resolvedCache.current.set(station.url, url);
    return url;
  }, []);

  const playStation = useCallback(
    async (station: Station) => {
      if (port === null) return;
      const seq = ++playSeq.current;

      // Show the switch immediately — resolving can take a network round trip
      // for `resolve:` entries, and the list should never feel laggy.
      playingRef.current = station;
      setPlaying(station);
      setNowPlaying(null);

      try {
        const upstream = await resolve(station);
        if (seq !== playSeq.current) return; // a later click already won
        await player.play(proxied(port, upstream));
      } catch {
        if (seq !== playSeq.current) return;
        onFailedRef.current("could not be reached");
      }
    },
    [player, port, resolve],
  );

  const stopPlayback = useCallback(() => {
    playSeq.current++; // invalidate anything still resolving
    player.stop();
    playingRef.current = null;
    setPlaying(null);
    setNowPlaying(null);
    setNote(null);
  }, [player]);

  const selectAndPlay = useCallback(
    (station: Station, from?: Queue) => {
      setNote(null);
      if (from) {
        queueRef.current = from;
        setQueue(from);
      }
      autoSkips.current = 0;
      // A manual pick is a second chance — clear any past failure for it.
      setUnavailable((prev) => {
        if (!prev.has(station.url)) return prev;
        const next = new Set(prev);
        next.delete(station.url);
        return next;
      });
      setSelected(station);
      void playStation(station);
    },
    [playStation],
  );

  useEffect(() => {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ station: selected, queue: queueRef.current }));
    } catch {
      /* private mode, or storage disabled */
    }
  }, [selected]);

  // A station that actually plays clears the run of failures.
  useEffect(() => {
    if (player.status === "playing") autoSkips.current = 0;
  }, [player.status]);

  /**
   * A station died. Mark it, move to the next one in the list it came from, and
   * say so in one line — no diagnostics, no buttons, nothing to decide.
   */
  onFailedRef.current = (reason: string) => {
    const failed = playingRef.current;
    if (!failed) return;

    const skip = new Set(unavailable).add(failed.url);
    setUnavailable(skip);

    // The next live one after it, wrapping — not the first live one from the
    // top, which in a long list would mean jumping back to the start.
    const queue = queueRef.current;
    const at = queue.stations.findIndex((s) => s.url === failed.url);
    const order = [...queue.stations.slice(at + 1), ...queue.stations.slice(0, Math.max(0, at))];
    const next =
      autoSkips.current < MAX_AUTO_SKIPS ? order.find((s) => !skip.has(s.url)) : undefined;

    if (next) {
      autoSkips.current++;
      setNote(`${failed.name} ${reason} — switching to ${next.name}`);
      setSelected(next);
      void playStation(next);
    } else {
      setNote(`${failed.name} ${reason}. Nothing else in ${queue.name} is responding.`);
      playingRef.current = null;
      setPlaying(null);
    }
  };

  /** Hand the radio over to the timer when "pause radio on breaks" is on. */
  onPhaseRef.current = (next: Phase) => {
    if (!pom.settings.pauseOnBreak) return;
    if (next === "focus") {
      const back = resumeRef.current;
      resumeRef.current = null;
      if (back) void playStation(back);
    } else if (playingRef.current) {
      resumeRef.current = playingRef.current;
      stopPlayback();
    }
  };

  const live = playing ?? selected;
  const art = useAlbumArt(playing ? nowPlaying : null, appearance.albumArt);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <div
        id="app-shell"
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <TitleBar nowPlaying={nowPlaying}>
          <QuickBar
            appearance={appearance}
            analyser={player.analyser}
            playing={playing !== null}
          />
        </TitleBar>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar
          selected={selected}
          playing={playing}
          buffering={player.status === "loading"}
          unavailable={unavailable}
          favorites={favorites}
          showUnverified={catalog.showUnverified}
          playingFrom={playing ? queue : null}
          onPick={selectAndPlay}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* ── Stage ─────────────────────────────────────────────────── */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {portError && (
            <div
              style={{
                ...card,
                margin: 16,
                borderColor: "var(--app-danger)",
                color: "var(--app-danger)",
                fontSize: 12.5,
                flex: "0 0 auto",
              }}
            >
              {portError}
            </div>
          )}

          <Stage layout={appearance.layout.id} pom={pom} note={note}>
            <VisualizerCanvas
              analyser={player.analyser}
              visualizer={appearance.visualizer}
              options={appearance.options}
              theme={appearance.vizTheme}
              playing={playing !== null}
            />
          </Stage>
        </main>
        </div>

        <PlayerBar
          station={live}
          favorites={favorites}
          player={player}
          nowPlaying={nowPlaying}
          art={art}
          playing={playing !== null}
          disabled={port === null}
          onPlay={() => selectAndPlay(selected)}
          onStop={stopPlayback}
        />
      </div>

      {settingsOpen && (
        <SettingsDialog
          appearance={appearance}
          pom={pom}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
