import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";

import { label } from "./primitives";
import { PHASE_LABEL, type Phase, type Pomodoro } from "../hooks/usePomodoro";

const PHASE_COLOR: Record<Phase, string> = {
  focus: "var(--app-accent)",
  short: "var(--viz-lo)",
  long: "var(--viz-lo)",
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

export function PomodoroPanel({ pom }: { pom: Pomodoro }) {
  const color = PHASE_COLOR[pom.phase];
  const progress = pom.total > 0 ? 1 - pom.remaining / pom.total : 0;

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
              fontFamily: "var(--app-font-mono)",
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

    </div>
  );
}
