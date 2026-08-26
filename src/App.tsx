import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Play, Square, Radio, Loader2 } from "lucide-react";

import { TitleBar } from "./components/TitleBar";
import { Spectrum } from "./components/Spectrum";
import { card, label, Button, Dot } from "./components/primitives";
import { useRadioPlayer } from "./hooks/useRadioPlayer";
import { GENRES, type Station } from "./data/stations";
import { getProxyPort, proxied, resolveStationUrl, isTauri } from "./lib/proxy";
import type { StationReport } from "./lib/probe";

/**
 * The probe harness is developer tooling — it sorts V1's catalog into
 * genuinely-dead versus merely CORS-silenced, and an end user has no use for it.
 *
 * Vite substitutes a literal `false` for `import.meta.env.DEV` at build time, so
 * this ternary collapses to `null` and the dynamic import becomes unreachable.
 * Rollup then drops the chunk entirely — harness, `lib/probe.ts`, and all.
 * `StationReport` above is a type-only import and erases, so it costs nothing.
 */
const DEV = import.meta.env.DEV;
const ProbeHarness = DEV ? lazy(() => import("./dev/ProbeHarness")) : null;

export default function App() {
  const [port, setPort] = useState<number | null>(null);
  const [portError, setPortError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Station>(GENRES[2].stations[0]);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Station | null>(null);

  // Harness-owned data App still needs, to decorate the station rows.
  const [reports, setReports] = useState<Record<string, StationReport>>({});
  const [batchAt, setBatchAt] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const player = useRadioPlayer();
  const resolvedCache = useRef(new Map<string, string>());
  /** Rising token so a slow resolve from an earlier click can't land after a later one. */
  const playSeq = useRef(0);

  const say = useCallback((line: string) => {
    // Only the harness renders the log, so in production this would be a
    // re-render on every now-playing event for something nobody can see.
    if (!DEV) return;
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 60));
  }, []);

  const handleReport = useCallback((url: string, report: StationReport) => {
    setReports((r) => ({ ...r, [url]: report }));
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      setPortError("Not running inside Tauri — start with `npm run tauri dev`.");
      return;
    }
    getProxyPort()
      .then((p) => {
        setPort(p);
        say(`proxy listening on 127.0.0.1:${p}`);
      })
      .catch((e) => setPortError(String(e)));
  }, [say]);

  useEffect(() => {
    if (!isTauri()) return;
    const un = listen<{ title: string }>("now-playing", (e) => {
      setNowPlaying(e.payload.title);
      say(`now playing — ${e.payload.title}`);
    });
    return () => {
      un.then((f) => f());
    };
  }, [say]);

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
        say(`playing ${station.name}`);
        await player.play(proxied(port, upstream));
      } catch (e) {
        if (seq !== playSeq.current) return;
        say(`could not resolve ${station.name}: ${String(e)}`);
        setPlaying(null);
      }
    },
    [player, port, resolve, say],
  );

  const stopPlayback = useCallback(() => {
    playSeq.current++; // invalidate anything still resolving
    player.stop();
    setPlaying(null);
    setNowPlaying(null);
  }, [player]);

  const selectAndPlay = useCallback(
    (station: Station) => {
      setSelected(station);
      void playStation(station);
    },
    [playStation],
  );

  const live = playing ?? selected;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <TitleBar subtitle={DEV ? "Phase 1 — proxy spike" : undefined} />

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
                const r = reports[station.url];
                const isSel = selected.url === station.url;
                const isAt = batchAt === station.url;
                const isLive = playing?.url === station.url;
                const isBuffering = isLive && player.status === "loading";
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
                      background: isSel ? "var(--app-bg-overlay)" : "transparent",
                      borderLeft: isLive
                        ? "2px solid var(--app-accent-amber)"
                        : isSel
                          ? "2px solid var(--app-border-default)"
                          : "2px solid transparent",
                    }}
                  >
                    {/* Probe verdict — dev only. In production it would be a
                        meaningless grey dot on every row. */}
                    {DEV &&
                      (isAt ? (
                        <Loader2
                          size={8}
                          className="spin"
                          style={{ color: "var(--app-accent-amber)" }}
                        />
                      ) : (
                        <Dot
                          tone={
                            !r
                              ? "idle"
                              : r.verdict === "dead"
                                ? "bad"
                                : r.verdict === "degraded"
                                  ? "warn"
                                  : "good"
                          }
                        />
                      ))}

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
                        {station.artist}
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

        {/* ── Main ──────────────────────────────────────────────────── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 18,
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
                        ? "waiting for ICY metadata…"
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
                  <Button primary onClick={() => playStation(selected)} disabled={port === null}>
                    <Play size={12} /> Play
                  </Button>
                )}
              </div>
            </div>

            <Spectrum analyser={player.analyser} height={132} />

            {player.error && (
              <div style={{ fontSize: 11, color: "var(--viz-led-hi)" }}>{player.error}</div>
            )}
          </section>

          {ProbeHarness && (
            <Suspense fallback={null}>
              <ProbeHarness
                port={port}
                selected={selected}
                resolve={resolve}
                say={say}
                log={log}
                reports={reports}
                onReport={handleReport}
                onBatchAt={setBatchAt}
              />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
