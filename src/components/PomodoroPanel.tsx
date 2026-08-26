import { useState } from "react";
import { Play, Pause, RotateCcw, SkipForward, Settings2, Check } from "lucide-react";

import { label } from "./primitives";
import { PHASE_LABEL, type Phase, type Pomodoro, type PomodoroSettings } from "../hooks/usePomodoro";

const PHASE_COLOR: Record<Phase, string> = {
  focus: "var(--app-accent-amber)",
  short: "var(--viz-led-lo)",
  long: "var(--viz-led-lo)",
};

function mmss(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function IconButton({
  onClick,
  title,
  children,
  accent,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 38,
        height: 38,
        display: "grid",
        placeItems: "center",
        borderRadius: "var(--app-radius-sm)",
        border: "1px solid var(--app-border-muted)",
        background: "transparent",
        color: accent ?? "var(--app-text-muted)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function NumberField({
  name,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  name: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ ...label, fontSize: 9.5 }}>{name}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          style={{
            width: 52,
            padding: "5px 7px",
            fontSize: 12.5,
            fontFamily: "ui-monospace, monospace",
            borderRadius: "var(--app-radius-sm)",
            border: "1px solid var(--app-border-input)",
            background: "var(--app-bg-overlay)",
            color: "var(--app-text-primary)",
          }}
        />
        <span style={{ fontSize: 10.5, color: "var(--app-text-faint)" }}>{suffix}</span>
      </span>
    </label>
  );
}

function Toggle({
  name,
  hint,
  on,
  onChange,
}: {
  name: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        padding: "8px 10px",
        textAlign: "left",
        borderRadius: "var(--app-radius-sm)",
        border: "1px solid var(--app-border-input)",
        background: on ? "var(--app-bg-overlay)" : "transparent",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <span
        style={{
          width: 15,
          height: 15,
          flex: "0 0 auto",
          marginTop: 1,
          display: "grid",
          placeItems: "center",
          borderRadius: 4,
          border: `1px solid ${on ? "var(--app-accent-amber)" : "var(--app-border-muted)"}`,
          background: on ? "var(--app-accent-amber)" : "transparent",
          color: "#161104",
        }}
      >
        {on && <Check size={11} strokeWidth={3} />}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--app-text-primary)" }}>
          {name}
        </span>
        <span style={{ display: "block", fontSize: 10.5, color: "var(--app-text-faint)" }}>
          {hint}
        </span>
      </span>
    </button>
  );
}

export function PomodoroPanel({ pom }: { pom: Pomodoro }) {
  const [showSettings, setShowSettings] = useState(false);
  const color = PHASE_COLOR[pom.phase];
  const progress = pom.total > 0 ? 1 - pom.remaining / pom.total : 0;

  const set = <K extends keyof PomodoroSettings>(k: K, v: PomodoroSettings[K]) =>
    pom.update({ [k]: v } as Partial<PomodoroSettings>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* Readout */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ ...label, color }}>{PHASE_LABEL[pom.phase]}</span>
            {pom.completed > 0 && (
              <span style={{ fontSize: 10.5, color: "var(--app-text-faint)" }}>
                {pom.completed} done
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 58,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
              color: pom.running ? color : "var(--app-text-primary)",
            }}
          >
            {mmss(pom.remaining)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
          {pom.running ? (
            <IconButton onClick={pom.pause} title="Pause">
              <Pause size={16} />
            </IconButton>
          ) : (
            <IconButton onClick={pom.start} title="Start" accent={color}>
              <Play size={16} />
            </IconButton>
          )}
          <IconButton onClick={pom.skip} title="Skip to next phase">
            <SkipForward size={16} />
          </IconButton>
          <IconButton onClick={pom.reset} title="Reset">
            <RotateCcw size={16} />
          </IconButton>
          <IconButton
            onClick={() => setShowSettings((s) => !s)}
            title="Timer settings"
            accent={showSettings ? "var(--app-accent-amber)" : undefined}
          >
            <Settings2 size={16} />
          </IconButton>
        </div>
      </div>

      {/* Progress */}
      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: "var(--app-border-subtle)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: color,
            transition: "width 250ms linear",
          }}
        />
      </div>

      {showSettings && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--app-border-subtle)",
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <NumberField
              name="Focus"
              value={pom.settings.focusMin}
              min={1}
              max={180}
              suffix="min"
              onChange={(v) => set("focusMin", v)}
            />
            <NumberField
              name="Short break"
              value={pom.settings.shortMin}
              min={1}
              max={60}
              suffix="min"
              onChange={(v) => set("shortMin", v)}
            />
            <NumberField
              name="Long break"
              value={pom.settings.longMin}
              min={1}
              max={120}
              suffix="min"
              onChange={(v) => set("longMin", v)}
            />
            <NumberField
              name="Long break every"
              value={pom.settings.longEvery}
              min={2}
              max={12}
              suffix="sessions"
              onChange={(v) => set("longEvery", v)}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 7,
            }}
          >
            <Toggle
              name="Auto-start next phase"
              hint="Roll straight into breaks and back"
              on={pom.settings.autoStart}
              onChange={(v) => set("autoStart", v)}
            />
            <Toggle
              name="Pause radio on breaks"
              hint="Silence while you step away"
              on={pom.settings.pauseOnBreak}
              onChange={(v) => set("pauseOnBreak", v)}
            />
            <Toggle
              name="Chime"
              hint="A two-note tone at each change"
              on={pom.settings.chime}
              onChange={(v) => set("chime", v)}
            />
            <Toggle
              name="Desktop notification"
              hint="Reaches you behind other windows"
              on={pom.settings.notify}
              onChange={(v) => set("notify", v)}
            />
          </div>

          {!pom.running && (
            <div style={{ fontSize: 10.5, color: "var(--app-text-faint)" }}>
              Duration changes apply now. While the timer runs they wait for the next phase.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
