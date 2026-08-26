import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Play, Square, Radio, Loader2 } from "lucide-react";

import { TitleBar } from "./components/TitleBar";
import { Spectrum } from "./components/Spectrum";
import { card, label, Button } from "./components/primitives";
import { useRadioPlayer } from "./hooks/useRadioPlayer";
import { GENRES, type Station } from "./data/stations";
import { getProxyPort, proxied, resolveStationUrl, isTauri } from "./lib/proxy";

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

  const resolvedCache = useRef(new Map<string, string>());
  /** Rising token so a slow resolve from an earlier click can't land after a later one. */
  const playSeq = useRef(0);
  /** Indirection so the player can call a handler defined further down. */
  const onFailedRef = useRef<(reason: string) => void>(() => {});

  const player = useRadioPlayer({ onFailed: (reason) => onFailedRef.current(reason) });

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

  /**
   * A station died. Mark it, move to the next one in the same genre, and say so
   * in one line — no diagnostics, no buttons, nothing to decide.
   */
  onFailedRef.current = (reason: string) => {
    const failed = playing;
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
      setPlaying(null);
    }
  };

  const stopPlayback = useCallback(() => {
    playSeq.current++; // invalidate anything still resolving
    player.stop();
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

  const live = playing ?? selected;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <TitleBar />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* ── Stations ──────────────────────────────────────────────── */}
        <aside
          style={{
            width: 268,
            flex: "0 0 268px",
            borderRight: "1px solid var(--app-border-subtle)",
            overflowY: "auto",
            background: "var(--app-bg-surface)",
          }}
        >
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
                        ? "2px solid var(--app-accent-amber)"
                        : isSel
                          ? "2px solid var(--app-border-default)"
                          : "2px solid transparent",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: isLive ? "var(--app-accent-amber)" : "var(--app-text-primary)",
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
                        style={{ color: "var(--app-accent-amber)" }}
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
        </aside>

        {/* ── Player ────────────────────────────────────────────────── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {portError && (
            <div
              style={{
                ...card,
                borderColor: "var(--viz-led-hi)",
                color: "var(--viz-led-hi)",
                fontSize: 12.5,
              }}
            >
              {portError}
            </div>
          )}

          <section style={{ ...card, display: "flex", flexDirection: "column", gap: 13 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <Radio size={15} style={{ color: "var(--app-accent-amber)", flex: "0 0 auto" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{live.name}</div>
                  <div
                    className="selectable"
                    style={{
                      fontSize: 11.5,
                      color: nowPlaying ? "var(--app-accent-amber)" : "var(--app-text-faint)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {nowPlaying ??
                      (player.status === "playing"
                        ? live.artist
                        : player.status === "loading"
                          ? "connecting…"
                          : "not playing")}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={player.volume}
                  onChange={(e) => player.setVolume(parseFloat(e.target.value))}
                  style={{ width: 90, accentColor: "var(--app-accent-amber)" }}
                  title="Volume"
                />
                {playing ? (
                  <Button onClick={stopPlayback}>
                    <Square size={12} /> Stop
                  </Button>
                ) : (
                  <Button primary onClick={() => selectAndPlay(selected)} disabled={port === null}>
                    <Play size={12} /> Play
                  </Button>
                )}
              </div>
            </div>

            <Spectrum analyser={player.analyser} height={132} />
          </section>

          {note && (
            <div style={{ fontSize: 11.5, color: "var(--app-text-faint)", paddingLeft: 2 }}>
              {note}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
