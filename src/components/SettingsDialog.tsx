import { useRef, useState } from "react";
import { X, Palette, Timer } from "lucide-react";

import { AppearanceTab } from "./settings/AppearanceTab";
import { TimerTab } from "./settings/TimerTab";
import { useModalDialog } from "../hooks/useModalDialog";
import type { Appearance } from "../theme/useAppearance";
import type { Pomodoro } from "../hooks/usePomodoro";

/**
 * Settings, as an actual modal dialog.
 *
 * `useModalDialog` handles focus in, focus trapped, focus back to the trigger,
 * Escape, and freezing the rest of the app with `inert`. The tab strip follows
 * the WAI-ARIA tabs pattern: roving tabindex, arrows to move, Home and End to
 * jump, and only the selected tab is in the tab order — Tab from the strip goes
 * into the panel, not along the tabs.
 */

type TabId = "appearance" | "timer";

const TABS: Array<{ id: TabId; name: string; Icon: typeof Palette }> = [
  { id: "appearance", name: "Appearance", Icon: Palette },
  { id: "timer", name: "Timer", Icon: Timer },
];

export function SettingsDialog({
  appearance,
  pom,
  analyser,
  playing,
  onClose,
}: {
  appearance: Appearance;
  pom: Pomodoro;
  analyser: AnalyserNode | null;
  playing: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabId>("appearance");
  const { dialogRef, onKeyDown } = useModalDialog(onClose);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    // Selection follows focus, which is the expected behaviour when switching
    // panels is cheap and has no side effects.
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          position: "relative",
          width: 620,
          maxWidth: "100%",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--app-bg-surface)",
          border: "1px solid var(--app-border-subtle)",
          borderRadius: "var(--app-radius-md)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
          outline: "none",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            borderBottom: "1px solid var(--app-border-subtle)",
          }}
        >
          <h2
            id="settings-title"
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--app-text-primary)",
            }}
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            style={{
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              borderRadius: "var(--app-radius-sm)",
              border: "1px solid var(--app-border-muted)",
              background: "transparent",
              color: "var(--app-text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </header>

        <div
          role="tablist"
          aria-label="Settings sections"
          onKeyDown={onTabKeyDown}
          style={{
            display: "flex",
            gap: 4,
            padding: "10px 12px 0",
            borderBottom: "1px solid var(--app-border-subtle)",
          }}
        >
          {TABS.map(({ id, name, Icon }) => {
            const active = id === tab;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={active}
                aria-controls={`panel-${id}`}
                tabIndex={active ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[id] = el;
                }}
                onClick={() => setTab(id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 13px",
                  minHeight: 38,
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 400,
                  fontFamily: "var(--app-font-ui)",
                  color: active ? "var(--app-text-primary)" : "var(--app-text-muted)",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? "var(--app-accent)" : "transparent"}`,
                  marginBottom: -1,
                  cursor: "pointer",
                }}
              >
                <Icon size={14} aria-hidden="true" />
                {name}
              </button>
            );
          })}
        </div>

        {TABS.map(({ id }) => (
          <div
            key={id}
            role="tabpanel"
            id={`panel-${id}`}
            aria-labelledby={`tab-${id}`}
            hidden={id !== tab}
            // Focusable so a keyboard user can scroll the panel without having
            // to tab onto a control inside it first.
            tabIndex={0}
            style={
              id === tab
                ? { flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 20px 24px" }
                : undefined
            }
          >
            {id === "appearance" ? (
              <AppearanceTab appearance={appearance} analyser={analyser} playing={playing} />
            ) : (
              <TimerTab pom={pom} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
