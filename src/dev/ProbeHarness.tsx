import { useCallback, useMemo, useState } from "react";
import { Activity, FlaskConical, Loader2 } from "lucide-react";

import { card, label, Button, Dot, type Tone } from "../components/primitives";
import { GENRES, type Station } from "../data/stations";
import { proxied } from "../lib/proxy";
import {
  probeStream,
  unlockAudio,
  verdictFor,
  VERDICT_COPY,
  type ProbeResult,
  type StationReport,
} from "../lib/probe";

/**
 * Developer tooling, never shipped.
 *
 * App imports this through `lazy(() => import(...))` guarded by
 * `import.meta.env.DEV`, so Rollup drops the whole chunk — and everything it
 * pulls in, `lib/probe.ts` included — from production builds.
 *
 * Its job: run each station down both paths, direct and proxied, and report
 * whether audio reached the element AND whether the analyser saw signal. Those
 * two answers disagreeing is the CORS-silence failure mode, and it is how V1's
 * catalog gets sorted into genuinely-dead versus merely unreachable.
 */

export interface ProbeHarnessProps {
  port: number | null;
  selected: Station;
  /** Shared with App so the `resolve:` lookup cache isn't duplicated. */
  resolve: (station: Station) => Promise<string>;
  say: (line: string) => void;
  log: string[];
  reports: Record<string, StationReport>;
  onReport: (url: string, report: StationReport) => void;
  /** Tells App which row to spin during a batch run. */
  onBatchAt: (url: string | null) => void;
}

// ── Result rendering ────────────────────────────────────────────────────────

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

/** One half of the A/B: what happened on this path. */
function PathCard({
  title,
  note,
  result,
  busy,
}: {
  title: string;
  note: string;
  result: ProbeResult | null;
  busy: boolean;
}) {
  const tone: Tone = !result
    ? "idle"
    : result.analyserAlive
      ? "good"
      : result.audioReached
        ? "warn"
        : "bad";

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
          <Row
            k="Audio reached element"
            v={result ? (result.audioReached ? "yes" : "no") : "…"}
            ok={result?.audioReached}
          />
          <Row
            k="Analyser sees signal"
            v={result ? (result.analyserAlive ? "yes" : "no") : "…"}
            ok={result?.analyserAlive}
            emphasis
          />
          <Row k="Peak level" v={result ? `${result.peak} / 255` : "…"} />
          <Row
            k="Time to signal"
            v={result?.timeToSignal != null ? `${result.timeToSignal} ms` : "—"}
          />
          {result?.error && (
            <div style={{ fontSize: 11, color: "var(--viz-led-hi)", marginTop: 2 }}>
              {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Harness ─────────────────────────────────────────────────────────────────

export default function ProbeHarness({
  port,
  selected,
  resolve,
  say,
  log,
  reports,
  onReport,
  onBatchAt,
}: ProbeHarnessProps) {
  const [busy, setBusy] = useState<null | "direct" | "proxy" | "batch">(null);

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

  /** Both paths for one station. `onPhase` lets the single-station button show
      which leg is running; the batch run leaves it off and drives the row spinner. */
  const probeOne = useCallback(
    async (station: Station, onPhase?: (phase: "direct" | "proxy") => void) => {
      onPhase?.("direct");
      const direct = await runProbe(station, "direct");
      onPhase?.("proxy");
      const proxy = await runProbe(station, "proxy");
      if (!direct || !proxy) return;
      const report: StationReport = { direct, proxy, verdict: verdictFor(direct, proxy) };
      onReport(station.url, report);
      say(`${station.name} → ${VERDICT_COPY[report.verdict].label}`);
    },
    [runProbe, onReport, say],
  );

  const probeBoth = useCallback(
    async (station: Station) => {
      try {
        await probeOne(station, setBusy);
      } catch (e) {
        say(`probe failed: ${String(e)}`);
      } finally {
        setBusy(null);
      }
    },
    [probeOne, say],
  );

  const probeAll = useCallback(async () => {
    setBusy("batch");
    for (const genre of GENRES) {
      for (const station of genre.stations) {
        onBatchAt(station.url);
        try {
          await probeOne(station);
        } catch (e) {
          say(`${station.name} errored: ${String(e)}`);
        }
      }
    }
    onBatchAt(null);
    setBusy(null);
  }, [probeOne, onBatchAt, say]);

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

  const verdictColor = (tone: "good" | "warn" | "bad") =>
    tone === "good"
      ? "var(--viz-led-lo)"
      : tone === "warn"
        ? "var(--viz-led-mid)"
        : "var(--viz-led-hi)";

  return (
    <>
      {/* A/B */}
      <section style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
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
              borderLeft: `3px solid ${verdictColor(VERDICT_COPY[current.verdict].tone)}`,
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

      {/* Tally */}
      {tally.total > 0 && (
        <section style={{ ...card, display: "flex", gap: 26, flexWrap: "wrap" }}>
          {(
            [
              ["Probed", tally.total, "var(--app-text-primary)"],
              ["Already sent CORS", tally.ok, "var(--viz-led-lo)"],
              ["Rescued by the proxy", tally.rescued, "var(--app-accent-amber)"],
              ["Still broken", tally.degraded, "var(--viz-led-mid)"],
              ["Genuinely dead", tally.dead, "var(--viz-led-hi)"],
            ] as const
          ).map(([k, v, c]) => (
            <div key={k}>
              <div style={{ ...label, marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
            </div>
          ))}
        </section>
      )}

      {/* Activity */}
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
    </>
  );
}
