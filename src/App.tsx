import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Loader2, Settings } from "lucide-react";

import { TitleBar } from "./components/TitleBar";
import { VisualizerCanvas } from "./components/VisualizerCanvas";
import { SettingsDialog } from "./components/SettingsDialog";
import { PlayerBar } from "./components/PlayerBar";
import { PomodoroPanel } from "./components/PomodoroPanel";
import { card, label } from "./components/primitives";
import { useRadioPlayer } from "./hooks/useRadioPlayer";
import { usePomodoro, type Phase } from "./hooks/usePomodoro";
import { GENRES, type Station } from "./data/stations";
import { getProxyPort, proxied, resolveStationUrl, isTauri } from "./lib/proxy";
import { useAppearance } from "./theme/useAppearance";

function genreOf(station: Station) {
  return GENRES.find((g) => g.stations.some((s) => s.url === station.url));
}

export default function App() {
  const [port, setPort] = useState<number | null>(null);
  const [portError, setPortError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Station>(GENRES[2].stations[0]);
  const [playing, setPlaying] = useState<Station | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  /** Stations that failed while we were listening. Dimmed, and skipped over. */
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const appearance = useAppearance();

  const resolvedCache = useRef(new Map<string, string>());
  /** Rising token so a slow resolve from an earlier click can't land after a later one. */
  const playSeq = useRef(0);
  /** Indirection so the player can call a handler defined further down. */
  const onFailedRef = useRef<(reason: string) => void>(() => {});
  /** The failure handler can fire before React has re-rendered with the new
      `playing`, so it reads the station from here rather than from state. */
  const playingRef = useRef<Station | null>(null);
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
    (station: Station) => {
      setNote(null);
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

  /**
   * A station died. Mark it, move to the next one in the same genre, and say so
   * in one line — no diagnostics, no buttons, nothing to decide.
   */
  onFailedRef.current = (reason: string) => {
    const failed = playingRef.current;
    if (!failed) return;

    const skip = new Set(unavailable).add(failed.url);
    setUnavailable(skip);

    const genre = genreOf(failed);
    const next = genre?.stations.find((s) => !skip.has(s.url));

    if (next) {
      setNote(`${failed.name} ${reason} — switching to ${next.name}`);
      setSelected(next);
      void playStation(next);
    } else {
      setNote(`${failed.name} ${reason}. Nothing else in ${genre?.name ?? "this genre"} is responding.`);
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

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <div
        id="app-shell"
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <TitleBar />

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* ── Stations ──────────────────────────────────────────────── */}
        <aside
          aria-label="Stations"
          style={{
            width: 250,
            flex: "0 0 250px",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--app-border-subtle)",
            background: "var(--app-bg-surface)",
          }}
        >
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {GENRES.map((genre) => (
            <div key={genre.id}>
              <div style={{ ...label, padding: "14px 16px 6px" }}>{genre.name}</div>
              {genre.stations.map((station) => {
                const isSel = selected.url === station.url;
                const isLive = playing?.url === station.url;
                const isBuffering = isLive && player.status === "loading";
                const isDown = unavailable.has(station.url);
                return (
                  <div
                    key={station.url}
                    className="station-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => selectAndPlay(station)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectAndPlay(station);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "8px 16px",
                      cursor: "pointer",
                      opacity: isDown ? 0.42 : 1,
                      background: isSel ? "var(--app-bg-overlay)" : "transparent",
                      borderLeft: isLive
                        ? "2px solid var(--app-accent)"
                        : isSel
                          ? "2px solid var(--app-border-default)"
                          : "2px solid transparent",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: isLive ? "var(--app-accent)" : "var(--app-text-primary)",
                          fontWeight: isLive ? 600 : 400,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {station.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--app-text-faint)" }}>
                        {isDown ? "unavailable" : station.artist}
                      </div>
                    </div>

                    {isBuffering ? (
                      <Loader2
                        size={11}
                        className="spin"
                        style={{ color: "var(--app-accent)" }}
                      />
                    ) : isLive ? (
                      <span className="nowbars" aria-label="Playing">
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
          </div>

          {/* Pinned so it stays reachable however long the station list gets. */}
          <button
            type="button"
            className="station-row"
            onClick={() => setSettingsOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              minHeight: 44,
              padding: "11px 18px",
              font: "inherit",
              fontSize: 12.5,
              textAlign: "left",
              color: "var(--app-text-muted)",
              background: "transparent",
              border: "none",
              borderTop: "1px solid var(--app-border-subtle)",
              cursor: "pointer",
            }}
          >
            <Settings size={15} aria-hidden="true" />
            Settings
          </button>
        </aside>

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
                borderColor: "var(--viz-hi)",
                color: "var(--viz-hi)",
                fontSize: 12.5,
                flex: "0 0 auto",
              }}
            >
              {portError}
            </div>
          )}

          {/* The display is the window's face: full bleed, no card, recessed
              behind an inset edge like a real instrument panel. */}
          <div
            style={{
              flex: 1,
              minHeight: 120,
              position: "relative",
              background: "var(--viz-ground)",
              borderBottom: "1px solid var(--app-border-subtle)",
              boxShadow: "inset 0 1px 0 rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.35)",
            }}
          >
            <VisualizerCanvas
              analyser={player.analyser}
              visualizer={appearance.visualizer}
              options={appearance.options}
              theme={appearance.vizTheme}
              playing={playing !== null}
            />
          </div>

          {note && (
            <div
              style={{
                fontSize: 11.5,
                color: "var(--app-text-faint)",
                flex: "0 0 auto",
                padding: "8px 20px 0",
              }}
            >
              {note}
            </div>
          )}

          <section
            style={{
              flex: "0 0 auto",
              padding: "16px 20px",
              background: "var(--app-bg-base)",
            }}
          >
            <PomodoroPanel pom={pom} />
          </section>
        </main>
        </div>

        <PlayerBar
          station={live}
          player={player}
          nowPlaying={nowPlaying}
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
          analyser={player.analyser}
          playing={playing !== null}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
