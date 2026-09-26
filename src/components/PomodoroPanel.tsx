import { Play, Pause, RotateCcw, SkipForward, Brain, Coffee } from "lucide-react";

import { label } from "./primitives";
import { PHASE_LABEL, type Phase, type Pomodoro } from "../hooks/usePomodoro";

const PHASE_COLOR: Record<Phase, string> = {
  focus: "var(--app-accent)",
  short: "var(--viz-lo)",
  long: "var(--viz-lo)",
};

const PHASE_ICON: Record<Phase, React.ElementType> = {
  focus: Brain,
  short: Coffee,
  long: Coffee,
};

function mmss(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Text and hairline colours. Over the display the panel is sitting on dark
 * glass whatever the app theme, so it has to take its ink from the display's
 * palette — the app's own text colour is near-black under a light theme.
 */
interface Inks {
  primary: string;
  muted: string;
  faint: string;
  border: string;
  track: string;
}

const APP_INKS: Inks = {
  primary: "var(--app-text-primary)",
  muted: "var(--app-text-muted)",
  faint: "var(--app-text-faint)",
  border: "var(--app-border-muted)",
  track: "var(--app-border-subtle)",
};

const GLASS_INKS: Inks = {
  primary: "var(--viz-ink)",
  muted: "color-mix(in srgb, var(--viz-ink) 72%, transparent)",
  faint: "color-mix(in srgb, var(--viz-ink) 55%, transparent)",
  border: "color-mix(in srgb, var(--viz-ink) 28%, transparent)",
  track: "color-mix(in srgb, var(--viz-ink) 16%, transparent)",
};

function IconButton({
  onClick,
  title,
  children,
  color,
  border,
  size = 38,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  color: string;
  border: string;
  size?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        borderRadius: "var(--app-radius-sm)",
        border: `1px solid ${border}`,
        background: "transparent",
        color,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Progress({ value, color, track }: { value: number; color: string; track: string }) {
  return (
    <div style={{ height: 5, borderRadius: 3, background: track, overflow: "hidden" }}>
      <div
        style={{
          width: `${value * 100}%`,
          height: "100%",
          background: color,
          transition: "width 250ms linear",
        }}
      />
    </div>
  );
}

interface PomodoroPanelProps {
  pom: Pomodoro;
  /**
   * `strip`: The default sidebar layout (vertical flow).
   * `hero`: A responsive, large layout for the center of a window.
   * `hud`: A sleek, single-line horizontal pill layout.
   */
  variant?: "strip" | "hero" | "hud";
  /** Draw using translucent white inks instead of theme colors, for dark glass. */
  onGlass?: boolean;
}

export function PomodoroPanel({ pom, variant = "strip", onGlass = false }: PomodoroPanelProps) {
  const color = PHASE_COLOR[pom.phase];
  const Icon = PHASE_ICON[pom.phase];
  const progress = pom.total > 0 ? 1 - pom.remaining / pom.total : 0;
  const inks = onGlass ? GLASS_INKS : APP_INKS;
  const hero = variant === "hero";
  const hud = variant === "hud";
  const iconSize = hero ? 18 : 16;
  const buttonSize = hero ? 44 : hud ? 34 : 38;

  const phase = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ ...label, fontSize: hero ? 11.5 : label.fontSize, color, display: "flex", alignItems: "center", gap: 4 }}>
        <Icon size={hero ? 12 : 10} />
        {PHASE_LABEL[pom.phase]}
      </span>
      {pom.completed > 0 && (
        <span style={{ fontSize: hero ? 11.5 : 10.5, color: inks.faint }}>
          {pom.completed} done
        </span>
      )}
    </div>
  );

  const buttons = (
    <div style={{ display: "flex", gap: hero ? 8 : 6, flex: "0 0 auto" }}>
      {pom.running ? (
        <IconButton
          onClick={pom.pause}
          title="Pause"
          color={inks.muted}
          border={inks.border}
          size={buttonSize}
        >
          <Pause size={iconSize} />
        </IconButton>
      ) : (
        <IconButton
          onClick={pom.start}
          title="Start"
          color={color}
          border={inks.border}
          size={buttonSize}
        >
          <Play size={iconSize} />
        </IconButton>
      )}
      <IconButton
        onClick={pom.skip}
        title="Skip to next phase"
        color={inks.muted}
        border={inks.border}
        size={buttonSize}
      >
        <SkipForward size={iconSize} />
      </IconButton>
      <IconButton
        onClick={pom.reset}
        title="Reset"
        color={inks.muted}
        border={inks.border}
        size={buttonSize}
      >
        <RotateCcw size={iconSize} />
      </IconButton>
    </div>
  );

  const digits: React.CSSProperties = {
    fontFamily: "var(--app-font-mono)",
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
    color: inks.primary,
  };

  if (hero) {
    return (
      // A size container, so the digits can be set in fractions of the box
      // they were actually given rather than of the window.
      <div
        style={{
          containerType: "size",
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(12px, 3.5cqh, 28px)",
            // Five characters of a monospace face run about three ems wide.
            fontSize: "clamp(56px, min(23cqw, 38cqh), 280px)",
          }}
        >
          {phase}
          <div role="timer" aria-live="off" style={digits}>{mmss(pom.remaining)}</div>
          {/* Stretched to the digits, which are the widest thing in the column. */}
          <div style={{ alignSelf: "stretch" }}>
            <Progress value={progress} color={color} track={inks.track} />
          </div>
          {buttons}
        </div>
      </div>
    );
  }

  if (hud) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: `${color}1A`, color }}>
            <Icon size={16} />
          </div>
          <div role="timer" aria-live="off" style={{ ...digits, fontSize: 32 }}>{mmss(pom.remaining)}</div>
        </div>
        
        <div style={{ width: 100, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: inks.faint, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>{PHASE_LABEL[pom.phase]}</span>
            {pom.completed > 0 && <span>{pom.completed} DONE</span>}
          </div>
          <Progress value={progress} color={color} track={inks.track} />
        </div>

        <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)", margin: "0 -4px" }} />

        {buttons}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ marginBottom: 2 }}>{phase}</div>
          <div role="timer" aria-live="off" style={{ ...digits, fontSize: 58 }}>{mmss(pom.remaining)}</div>
        </div>
        {buttons}
      </div>
      <Progress value={progress} color={color} track={inks.track} />
    </div>
  );
}
