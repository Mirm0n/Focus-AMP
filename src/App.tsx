import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Play, Square, Radio, Activity, FlaskConical, Loader2 } from "lucide-react";

import { TitleBar } from "./components/TitleBar";
import { Spectrum } from "./components/Spectrum";
import { useRadioPlayer } from "./hooks/useRadioPlayer";
import { GENRES, type Station } from "./data/stations";
import { getProxyPort, proxied, resolveStationUrl, isTauri } from "./lib/proxy";
import {
  probeStream,
  unlockAudio,
  verdictFor,
  VERDICT_COPY,
  type StationReport,
} from "./lib/probe";

/**
 * The probe harness is developer tooling — it exists to sort V1's catalog into
 * genuinely-dead versus merely CORS-silenced, and an end user has no use for it.
 *
 * Vite substitutes a literal `false` here at build time, so every panel behind
 * this flag is dropped from production bundles. The probe *module* still gets
 * linked in, because the handlers reference it unconditionally — extracting the
 * harness into `src/dev/` would remove that last few KB.
 */
const DEV = import.meta.env.DEV;

// ── Small presentational helpers ────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--app-bg-surface)",
  border: "1px solid var(--app-border-subtle)",
  borderRadius: "var(--app-radius-md)",
  padding: 16,
};

const label: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
  color: "var(--app-text-faint)",
  fontFamily: "var(--app-font-ui)",
};

function Dot({ tone }: { tone: "good" | "bad" | "idle" | "warn" }) {
  const c =
    tone === "good"
      ? "var(--viz-led-lo)"
      : tone === "bad"
        ? "var(--viz-led-hi)"
        : tone === "warn"
          ? "var(--viz-led-mid)"
          : "var(--app-border-default)";
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: c,
        display: "inline-block",
        flex: "0 0 auto",
      }}
    />
  );
}

function Button({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 13px",
        fontSize: 12.5,
        fontFamily: "var(--app-font-ui)",
        fontWeight: 500,
        borderRadius: "var(--app-radius-sm)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        border: primary ? "1px solid var(--app-accent-amber)" : "1px solid var(--app-border-muted)",
        background: primary ? "var(--app-accent-amber)" : "transparent",
        color: primary ? "#161104" : "var(--app-text-primary)",
      }}
    >
      {children}
    </button>
  );
}

/** One half of the A/B: what happened on this path. */
function PathCard({
  title,
  note,
  result,
  busy,
}: {
  title: string;
  note: string;
  result: StationReport["direct"] | null;
  busy: boolean;
}) {
  const tone = !result ? "idle" : result.analyserAlive ? "good" : result.audioReached ? "warn" : "bad";
  return (
    <div style={{ ...card, flex: 1, minWidth: 220 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Dot tone={tone} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        {busy && <Loader2 size={12} className="spin" style={{ color: "var(--app-text-faint)" }} />}
      </div>
      <div style={{ fontSize: 11, color: "var(--app-text-faint)", marginBottom: 12 }}>{note}</div>

      {!result && !busy && (
        <div style={{ fontSize: 12, color: "var(--app-text-faint)" }}>Not probed yet.</div>
      )}

      {(result || busy) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Row k="Audio reached element" v={result ? (result.audioReached ? "yes" : "no") : "…"} ok={result?.audioReached} />
          <Row
            k="Analyser sees signal"
            v={result ? (result.analyserAlive ? "yes" : "no") : "…"}
            ok={result?.analyserAlive}
            emphasis
          />
          <Row k="Peak level" v={result ? `${result.peak} / 255` : "…"} />
          <Row k="Time to signal" v={result?.timeToSignal != null ? `${result.timeToSignal} ms` : "—"} />
          {result?.error && (
            <div style={{ fontSize: 11, color: "var(--viz-led-hi)", marginTop: 2 }}>{result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, ok, emphasis }: { k: string; v: string; ok?: boolean; emphasis?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
      <span style={{ color: "var(--app-text-faint)" }}>{k}</span>
      <span
        style={{
          fontFamily: "ui-monospace, monospace",
          fontWeight: emphasis ? 700 : 500,
          color:
            ok === undefined
              ? "var(--app-text-muted)"
              : ok
                ? "var(--viz-led-lo)"
                : "var(--viz-led-hi)",
        }}
      >
        {v}
      </span>
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [port, setPort] = useState<number | null>(null);
  const [portError, setPortError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Station>(GENRES[2].stations[0]);
  const [reports, setReports] = useState<Record<string, StationReport>>({});
  const [busy, setBusy] = useState<null | "direct" | "proxy" | "batch">(null);
  const [batchAt, setBatchAt] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Station | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const player = useRadioPlayer();
  const resolvedCache = useRef(new Map<string, string>());
  /** Rising token so a slow resolve from an earlier click can't land after a later one. */
  const playSeq = useRef(0);

  const say = useCallback((line: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 60));
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

  const runProbe = useCallback(
    async (station: Station, path: "direct" | "proxy") => {
      if (path === "proxy" && port === null) return null;
      await unlockAudio();
      const upstream = await resolve(station);
      const url = path === "proxy" ? proxied(port!, upstream) : upstream;
      say(`probing ${station.name} · ${path}`);
      return probeStream(url, { windowMs: 7000 });
    },
    [port, resolve, say],
  );

  const probeBoth = useCallback(
    async (station: Station) => {
      try {
        setBusy("direct");
        const direct = await runProbe(station, "direct");
        setBusy("proxy");
        const proxy = await runProbe(station, "proxy");
        if (!direct || !proxy) return;
        const report: StationReport = { direct, proxy, verdict: verdictFor(direct, proxy) };
        setReports((r) => ({ ...r, [station.url]: report }));
        say(`${station.name} → ${VERDICT_COPY[report.verdict].label}`);
      } catch (e) {
        say(`probe failed: ${String(e)}`);
      } finally {
        setBusy(null);
      }
    },
    [runProbe, say],
  );

  const probeAll = useCallback(async () => {
    setBusy("batch");
    for (const genre of GENRES) {
      for (const station of genre.stations) {
        setBatchAt(station.url);
        try {
          const direct = await runProbe(station, "direct");
          const proxy = await runProbe(station, "proxy");
          if (direct && proxy) {
            const report: StationReport = { direct, proxy, verdict: verdictFor(direct, proxy) };
            setReports((r) => ({ ...r, [station.url]: report }));
            say(`${station.name} → ${VERDICT_COPY[report.verdict].label}`);
          }
        } catch (e) {
          say(`${station.name} errored: ${String(e)}`);
        }
      }
    }
    setBatchAt(null);
    setBusy(null);
  }, [runProbe, say]);

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

  /** Clicking a row both selects it (for the A/B panel) and starts it. */
  const selectAndPlay = useCallback(
    (station: Station) => {
      setSelected(station);
      void playStation(station);
    },
    [playStation],
  );

  const tally = useMemo(() => {
    const out = { total: 0, ok: 0, rescued: 0, dead: 0, degraded: 0 };
    for (const r of Object.values(reports)) {
      out.total++;
      if (r.verdict === "ok-direct") out.ok++;
      else if (r.verdict === "cors-silenced" || r.verdict === "proxy-only") out.rescued++;
      else if (r.verdict === "dead") out.dead++;
      else out.degraded++;
    }
    return out;
  }, [reports]);

  const current = reports[selected.url];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .station-row { outline-offset: -2px; }
        .station-row:hover { background: var(--app-bg-overlay) !important; }

        /* Now-playing glyph — three bars bouncing, the universal shorthand. */
        .nowbars { display: inline-flex; align-items: flex-end; gap: 2px; height: 11px; }
        .nowbars i {
          display: block; width: 2px; border-radius: 1px;
          background: var(--app-accent-amber);
          animation: nowbars 900ms ease-in-out infinite;
        }
        .nowbars i:nth-child(1) { animation-delay: -300ms; }
        .nowbars i:nth-child(2) { animation-delay: -150ms; }
        @keyframes nowbars { 0%, 100% { height: 3px; } 50% { height: 11px; } }
        @media (prefers-reduced-motion: reduce) {
          .nowbars i { animation: none; height: 7px; }
        }
      `}</style>

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
                        <Loader2 size={8} className="spin" style={{ color: "var(--app-accent-amber)" }} />
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

                    {/* Playback state lives on the right; the probe verdict keeps the left. */}
                    {isBuffering ? (
                      <Loader2 size={11} className="spin" style={{ color: "var(--app-accent-amber)" }} />
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
        <main style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
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

          {/* Live listen */}
          <section style={{ ...card, display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <Radio size={15} style={{ color: "var(--app-accent-amber)", flex: "0 0 auto" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {(playing ?? selected).name}
                  </div>
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

            <div style={{ fontSize: 11, color: "var(--app-text-faint)" }}>
              Log-spaced bands, peak-hold caps, colour keyed to column height. If the bars move across
              the full width, the analyser is carrying real music — not just a non-zero reading.
              {player.error && <span style={{ color: "var(--viz-led-hi)" }}> · {player.error}</span>}
            </div>
          </section>

          {/* A/B — dev only */}
          {DEV && (
          <section style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FlaskConical size={14} style={{ color: "var(--app-text-faint)" }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>A/B probe — {selected.name}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={() => probeBoth(selected)} disabled={busy !== null || port === null}>
                  {busy === "direct" || busy === "proxy" ? (
                    <>
                      <Loader2 size={12} className="spin" /> Probing {busy}…
                    </>
                  ) : (
                    <>
                      <Activity size={12} /> Probe this station
                    </>
                  )}
                </Button>
                <Button primary onClick={probeAll} disabled={busy !== null || port === null}>
                  {busy === "batch" ? (
                    <>
                      <Loader2 size={12} className="spin" /> Probing all…
                    </>
                  ) : (
                    "Probe all stations"
                  )}
                </Button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <PathCard
                title="Direct"
                note="Straight at the station, as a plain webview would."
                result={current?.direct ?? null}
                busy={busy === "direct"}
              />
              <PathCard
                title="Through the Rust proxy"
                note={port ? `127.0.0.1:${port} · ACAO: *` : "proxy unavailable"}
                result={current?.proxy ?? null}
                busy={busy === "proxy"}
              />
            </div>

            {current && (
              <div
                style={{
                  ...card,
                  borderLeft: `3px solid ${
                    VERDICT_COPY[current.verdict].tone === "good"
                      ? "var(--viz-led-lo)"
                      : VERDICT_COPY[current.verdict].tone === "warn"
                        ? "var(--viz-led-mid)"
                        : "var(--viz-led-hi)"
                  }`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
                  {VERDICT_COPY[current.verdict].label}
                </div>
                <div style={{ fontSize: 12, color: "var(--app-text-muted)" }}>
                  {VERDICT_COPY[current.verdict].detail}
                </div>
              </div>
            )}
          </section>
          )}

          {/* Tally — dev only */}
          {DEV && tally.total > 0 && (
            <section style={{ ...card, display: "flex", gap: 26, flexWrap: "wrap" }}>
              {[
                ["Probed", tally.total, "var(--app-text-primary)"],
                ["Already sent CORS", tally.ok, "var(--viz-led-lo)"],
                ["Rescued by the proxy", tally.rescued, "var(--app-accent-amber)"],
                ["Still broken", tally.degraded, "var(--viz-led-mid)"],
                ["Genuinely dead", tally.dead, "var(--viz-led-hi)"],
              ].map(([k, v, c]) => (
                <div key={k as string}>
                  <div style={{ ...label, marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: c as string, lineHeight: 1 }}>
                    {v as number}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Log — dev only */}
          {DEV && (
          <section style={{ ...card, flex: "0 0 auto" }}>
            <div style={{ ...label, marginBottom: 8 }}>Activity</div>
            <div
              className="selectable"
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                color: "var(--app-text-muted)",
                maxHeight: 150,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {log.length === 0 ? (
                <span style={{ color: "var(--app-text-faint)" }}>Nothing yet.</span>
              ) : (
                log.map((l, i) => <div key={i}>{l}</div>)
              )}
            </div>
          </section>
          )}
        </main>
      </div>
    </div>
  );
}
