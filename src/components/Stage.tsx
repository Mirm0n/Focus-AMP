import type { CSSProperties, ReactNode } from "react";

import { PomodoroPanel } from "./PomodoroPanel";
import type { LayoutId } from "../layout/layouts";
import type { Pomodoro } from "../hooks/usePomodoro";

/**
 * The stage — the display and the timer, arranged by the chosen layout.
 *
 * Every layout is the same two elements under different styles, never a
 * different tree. Switching layouts therefore keeps the canvas mounted: the
 * visualizer carries on with its levels and afterglow intact instead of
 * restarting from black.
 */

/** Recessed behind an inset edge, like a real instrument panel. */
const GLASS: CSSProperties = {
  position: "relative",
  // Also zeroes the flex minimum. A canvas's intrinsic size is its own pixel
  // buffer, so without this a fixed-basis display grows to fit the canvas, the
  // host resizes the canvas to the new box, and the two chase each other.
  overflow: "hidden",
  background: "var(--viz-ground)",
  boxShadow: "inset 0 1px 0 rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.35)",
};

const HAIRLINE = "1px solid var(--app-border-subtle)";

interface Arrangement {
  direction: "row" | "column";
  display: CSSProperties;
  timer: CSSProperties;
  /** The Pomodoro variant to render. */
  variant: "strip" | "hero" | "hud";
  /** The timer sits over the display, not over an app surface. */
  onGlass: boolean;
}

const ARRANGEMENTS: Record<LayoutId, Arrangement> = {
  console: {
    direction: "column",
    display: { flex: 1, minHeight: 120, borderBottom: HAIRLINE },
    timer: { flex: "0 0 auto", padding: "16px 20px" },
    variant: "strip",
    onGlass: false,
  },
  focus: {
    direction: "column",
    display: { order: 2, flex: "0 0 84px", borderTop: HAIRLINE },
    timer: { order: 1, flex: 1, minHeight: 0, padding: 20 },
    variant: "hero",
    onGlass: false,
  },
  split: {
    direction: "row",
    display: { flex: 1, minWidth: 0, borderRight: HAIRLINE },
    timer: { flex: 1, minWidth: 0, minHeight: 0, padding: 20 },
    variant: "hero",
    onGlass: false,
  },
  dashboard: {
    direction: "row",
    display: {
      flex: 1.5,
      minWidth: 0,
      margin: 20,
      marginRight: 10,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.05)",
      boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
      overflow: "hidden",
    },
    timer: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      padding: 24,
      margin: 20,
      marginLeft: 10,
      borderRadius: 12,
      background: "var(--app-bg-surface)",
      border: "1px solid var(--app-border-subtle)",
      boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
    },
    variant: "hero",
    onGlass: false,
  },
  backdrop: {
    direction: "column",
    display: { position: "absolute", inset: 0 },
    timer: {
      position: "absolute",
      inset: 0,
      padding: 40,
      background: "rgba(0, 0, 0, 0.4)",
    },
    variant: "hero",
    onGlass: true,
  },
  hud: {
    direction: "column",
    display: { position: "absolute", inset: 0 },
    timer: {
      position: "absolute",
      bottom: 40,
      left: "50%",
      transform: "translateX(-50%)",
      padding: "10px 14px 10px 24px",
      background: "rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(24px)",
      borderRadius: 100,
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 16px 40px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)",
      width: "auto",
      flex: "0 0 auto",
      minHeight: 0,
    },
    variant: "hud",
    onGlass: true,
  },
};

interface StageProps {
  layout: LayoutId;
  pom: Pomodoro;
  note: string | null;
  children: ReactNode;
}

export function Stage({ layout, pom, note, children }: StageProps) {
  const a = ARRANGEMENTS[layout];

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        position: "relative",
        display: "flex",
        flexDirection: a.direction,
        background: layout === "dashboard" ? "var(--app-bg-base)" : "transparent",
      }}
    >
      <div style={{ ...GLASS, ...a.display }}>{children}</div>

      <section
        aria-label="Timer"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          background: layout === "dashboard" ? undefined : "var(--app-bg-base)",
          ...a.timer,
        }}
      >
        {note && (
          <div
            style={{
              fontSize: 11.5,
              color: a.onGlass
                ? "color-mix(in srgb, var(--viz-ink) 55%, transparent)"
                : "var(--app-text-faint)",
              ...(a.variant === "hero"
                ? { position: "absolute", top: 12, left: 20, right: 20 }
                : a.variant === "hud"
                ? { position: "absolute", bottom: "100%", marginBottom: 12, left: 20, right: 20, textAlign: "center", whiteSpace: "nowrap" }
                : { margin: "-8px 0 10px" }),
            }}
          >
            {note}
          </div>
        )}
        <div style={{ flex: a.variant === "hero" ? 1 : "0 0 auto", minHeight: 0 }}>
          <PomodoroPanel pom={pom} variant={a.variant} onGlass={a.onGlass} />
        </div>
      </section>
    </div>
  );
}
