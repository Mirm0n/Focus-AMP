import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

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
import { useSleepTimer } from "./hooks/useSleepTimer";
import { isLocal, localPath, localUrl, useLocalLibrary } from "./lib/localFiles";

/** How many dead stations in a row the player will step over by itself. The
    world lists are uncurated, and without a limit one bad country could have
    it walking down eighty streams. */
const MAX_AUTO_SKIPS = 5;

/** Failures before a station is dimmed and skipped for the rest of the session. */
const FAILURES_BEFORE_UNAVAILABLE = 2;

/**
 * The last station and the list it came from, so a restart puts back what was
 * on rather than the default. It is selected, not played: a radio that starts
 * by itself when the app opens is a surprise nobody asked for.
 */
const LAST_KEY = "focusamp:last";

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
    const allowed = (s: Station) => loadShowUnverified() || isPick(s) || isLocal(s);
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
  /**
   * How many times each station has failed this session. The proxy already
   * retries the handshake, so one failure here means two refusals a second
   * apart — but radio hosts recover, and dimming a station forever on the
   * strength of one bad minute is how a working catalog comes to look broken.
   * It is only struck off on the second.
   */
  const strikes = useRef(new Map<string, number>());
  const [note, setNote] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** What a screen reader should hear. The app changes station by itself when
      one dies, which is otherwise silent — the note is on screen, but only
      sighted users get it. Track titles are left out deliberately: announcing
      every song would bury the things that need saying. */
  const [announcement, setAnnouncement] = useState("");

  const appearance = useAppearance();
  const favorites = useFavorites();
  const catalog = useCatalog();
  const local = useLocalLibrary();

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
  /** Moves on when a local file finishes; defined further down. */
  const onEndedRef = useRef<() => void>(() => {});

  const player = useRadioPlayer({
    onFailed: (reason) => onFailedRef.current(reason),
    onEnded: () => onEndedRef.current(),
  });
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
        if (isLocal(station)) {
          // A file on disk: no resolving, and a quiet passage is not dead air.
          await player.play(localUrl(port, localPath(station)), { watchSilence: false });
          return;
        }
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
    if (player.status !== "playing") return;
    autoSkips.current = 0;
    const live = playingRef.current;
    // It works, so whatever went wrong before did not last. Forget it, or a
    // blip now and another next week would retire a perfectly good station.
    if (live) strikes.current.delete(live.url);
  }, [player.status]);

  /**
   * A station died. Mark it, move to the next one in the list it came from, and
   * say so in one line — no diagnostics, no buttons, nothing to decide.
   */
  onFailedRef.current = (reason: string) => {
    const failed = playingRef.current;
    if (!failed) return;

    const count = (strikes.current.get(failed.url) ?? 0) + 1;
    strikes.current.set(failed.url, count);

    // Struck off on the second failure; on the first it stays in the list and
    // is simply passed over for now.
    const skip = new Set(unavailable);
    if (count >= FAILURES_BEFORE_UNAVAILABLE) skip.add(failed.url);
    setUnavailable(skip);

    // The next live one after it, wrapping — not the first live one from the
    // top, which in a long list would mean jumping back to the start.
    const queue = queueRef.current;
    const at = queue.stations.findIndex((s) => s.url === failed.url);
    const order = [...queue.stations.slice(at + 1), ...queue.stations.slice(0, Math.max(0, at))];
    const next =
      autoSkips.current < MAX_AUTO_SKIPS ? order.find((s) => !skip.has(s.url) && s.url !== failed.url)
        : undefined;

    if (next) {
      autoSkips.current++;
      setNote(`${failed.name} ${reason} — switching to ${next.name}`);
      setAnnouncement(`${failed.name} ${reason}. Switching to ${next.name}.`);
      setSelected(next);
      void playStation(next);
    } else {
      setNote(`${failed.name} ${reason}. Nothing else in ${queue.name} is responding.`);
      setAnnouncement(`${failed.name} ${reason}. Nothing else in ${queue.name} is responding.`);
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
      if (back) {
        setAnnouncement(`Break over. Resuming ${back.name}.`);
        void playStation(back);
      }
    } else if (playingRef.current) {
      resumeRef.current = playingRef.current;
      setAnnouncement("Break started. Radio paused.");
      stopPlayback();
    }
  };

  // On a desktop the window title is how a screen reader user picks this
  // window out of the list. Static "Focus AMP" tells them nothing.
  useEffect(() => {
    if (!isTauri()) return;
    const title = playing ? `${playing.name} — Focus AMP` : "Focus AMP";
    getCurrentWindow().setTitle(title).catch(() => {});
  }, [playing]);

  /** The station `by` places along the current list from the one on now,
      wrapping, stepping over anything struck off this session. */
  const stepFrom = (by: 1 | -1): Station | undefined => {
    const list = queueRef.current.stations;
    if (list.length === 0) return undefined;
    const from = playingRef.current ?? selected;
    const at = list.findIndex((s) => s.url === from.url);
    for (let i = 1; i <= list.length; i++) {
      const s = list[(((at + by * i) % list.length) + list.length) % list.length];
      if (!unavailable.has(s.url) && s.url !== from.url) return s;
    }
    return undefined;
  };

  const step = (by: 1 | -1) => {
    const next = stepFrom(by);
    if (next) selectAndPlay(next);
  };

  const togglePlayback = () => {
    if (playingRef.current) stopPlayback();
    else selectAndPlay(selected);
  };

  // A local file ran out: carry on down the list, as an album would.
  onEndedRef.current = () => {
    const next = stepFrom(1);
    if (next) {
      setSelected(next);
      void playStation(next);
    } else {
      playingRef.current = null;
      setPlaying(null);
    }
  };

  // Tray menu, OS media keys and the tray all call through here, so they
  // always act on this render's state rather than whatever they closed over.
  const transportRef = useRef({ toggle: togglePlayback, next: () => step(1), prev: () => step(-1) });
  transportRef.current = { toggle: togglePlayback, next: () => step(1), prev: () => step(-1) };

  const sleep = useSleepTimer({
    onFadeStart: (seconds) => player.fadeTo(0, seconds),
    onFadeCancel: () => player.fadeTo(1, 0.4),
    onExpire: () => {
      setAnnouncement("Sleep timer ended. Radio stopped.");
      stopPlayback();
      // Back to full for whenever it is next switched on.
      player.fadeTo(1, 0.05);
    },
  });

  useEffect(() => {
    if (!isTauri()) return;
    const un = listen<string>("tray-action", (e) => {
      if (e.payload === "toggle") transportRef.current.toggle();
      else if (e.payload === "next") transportRef.current.next();
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  // Hardware media keys and the Windows media overlay. The webview routes
  // them through the Media Session API; nothing is grabbed system-wide.
  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms) return;
    const set = (action: MediaSessionAction, fn: () => void) => {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        /* action not supported here */
      }
    };
    set("play", () => !playingRef.current && transportRef.current.toggle());
    set("pause", () => playingRef.current && transportRef.current.toggle());
    set("stop", () => playingRef.current && transportRef.current.toggle());
    set("nexttrack", () => transportRef.current.next());
    set("previoustrack", () => transportRef.current.prev());
  }, []);

  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms) return;
    ms.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  useEffect(() => {
    if (!isTauri()) return;
    const text = playing
      ? nowPlaying
        ? `${playing.name} — ${nowPlaying}`
        : playing.name
      : "Focus AMP";
    // Windows truncates tray tooltips at 127 characters.
    invoke("set_tray_tooltip", { text: text.slice(0, 120) }).catch(() => {});
  }, [playing, nowPlaying]);

  const live = playing ?? selected;
  const art = useAlbumArt(playing ? nowPlaying : null, appearance.albumArt);

  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms || typeof MediaMetadata === "undefined") return;
    ms.metadata = playing
      ? new MediaMetadata({
          title: nowPlaying ?? playing.name,
          artist: nowPlaying ? playing.name : playing.artist,
          album: "Focus AMP",
          artwork: art ? [{ src: art, sizes: "600x600" }] : [],
        })
      : null;
  }, [playing, nowPlaying, art]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Mounted always and empty to start. A live region inserted at the same
          moment as its text is frequently missed. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

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
          local={local}
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
          sleep={sleep}
          nowPlaying={nowPlaying}
          art={art}
          playing={playing !== null}
          disabled={port === null}
          onPlay={() => selectAndPlay(selected)}
          onStop={stopPlayback}
          onNext={() => step(1)}
          onPrev={() => step(-1)}
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
