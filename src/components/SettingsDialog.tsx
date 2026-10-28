import { useRef, useState } from "react";
import { X, Info, LayoutGrid, Palette, Timer, SlidersHorizontal } from "lucide-react";

import { AppearanceTab } from "./settings/AppearanceTab";
import { LayoutTab } from "./settings/LayoutTab";
import { GeneralTab } from "./settings/GeneralTab";

import { AboutTab } from "./settings/AboutTab";
import { TimerTab } from "./settings/TimerTab";
import { useModalDialog } from "../hooks/useModalDialog";
import type { Appearance } from "../theme/useAppearance";
import type { Pomodoro } from "../hooks/usePomodoro";


/**
 * Settings — a wide modal with a category rail, the desktop convention.
 *
 * `useModalDialog` handles focus in, focus trapped, focus back to the trigger,
 * Escape, and freezing the rest of the app with `inert`.
 *
 * The rail is a vertical tablist per the WAI-ARIA pattern: roving tabindex so
 * Tab leaves the rail rather than walking down it, Up and Down to move (Left
 * and Right too, since people try both), Home and End to jump.
 *
 * The dialog is a fixed size rather than one that hugs its content, so
 * switching categories does not resize the window under the pointer.
 */

type TabId = "appearance" | "layout" | "timer" | "general" | "about";

const TABS: Array<{ id: TabId; name: string; blurb: string; Icon: typeof Palette }> = [
  { id: "appearance", name: "Appearance", blurb: "Theme and visualizer", Icon: Palette },
  { id: "layout", name: "Layout", blurb: "How the window is arranged", Icon: LayoutGrid },
  { id: "timer", name: "Timer", blurb: "Pomodoro and alerts", Icon: Timer },
  { id: "general", name: "General", blurb: "Tray and media keys", Icon: SlidersHorizontal },
  { id: "about", name: "About", blurb: "Version, licence and credits", Icon: Info },
];

export function SettingsDialog({
  appearance,
  pom,
  onClose,
}: {
  appearance: Appearance;
  pom: Pomodoro;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabId>("appearance");
  const { dialogRef, onKeyDown } = useModalDialog(onClose);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onRailKeyDown = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    // Selection follows focus — switching panels is cheap and has no side effects.
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
        padding: 20,
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
          width: "min(940px, 100%)",
          height: "min(620px, 100%)",
          display: "flex",
          flexDirection: "column",
          background: "var(--app-bg-surface)",
          border: "1px solid var(--app-border-subtle)",
          borderRadius: "var(--app-radius-md)",
          boxShadow: "0 20px 64px rgba(0,0,0,0.5)",
          outline: "none",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "13px 14px 13px 20px",
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

        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          {/* ── Category rail ──────────────────────────────────────────── */}
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label="Settings categories"
            onKeyDown={onRailKeyDown}
            style={{
              flex: "0 0 194px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: "12px 10px",
              overflowY: "auto",
              background: "var(--app-bg-base)",
              borderRight: "1px solid var(--app-border-subtle)",
            }}
          >
            {TABS.map(({ id, name, blurb, Icon }) => {
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
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    width: "100%",
                    minHeight: 46,
                    padding: "9px 11px",
                    textAlign: "left",
                    fontFamily: "var(--app-font-ui)",
                    borderRadius: "var(--app-radius-sm)",
                    border: "1px solid transparent",
                    borderColor: active ? "var(--app-border-input)" : "transparent",
                    background: active ? "var(--app-bg-surface)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <Icon
                    size={15}
                    aria-hidden="true"
                    style={{
                      flex: "0 0 auto",
                      marginTop: 1,
                      color: active ? "var(--app-accent)" : "var(--app-text-muted)",
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12.5,
                        fontWeight: active ? 600 : 400,
                        color: active ? "var(--app-text-primary)" : "var(--app-text-muted)",
                      }}
                    >
                      {name}
                    </span>
                    <span
                      style={{ display: "block", fontSize: 11, color: "var(--app-text-muted)" }}
                    >
                      {blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Panels ─────────────────────────────────────────────────── */}
          {TABS.map(({ id }) => (
            <div
              key={id}
              role="tabpanel"
              id={`panel-${id}`}
              aria-labelledby={`tab-${id}`}
              hidden={id !== tab}
              // Focusable so the panel can be scrolled without tabbing onto a
              // control inside it first.
              tabIndex={0}
              style={
                id === tab
                  ? { flex: 1, minWidth: 0, overflowY: "auto", padding: "20px 24px 28px" }
                  : undefined
              }
            >
              {id === "appearance" ? (
                <AppearanceTab appearance={appearance} />
              ) : id === "layout" ? (
                <LayoutTab appearance={appearance} />
              ) : id === "about" ? (
                <AboutTab />
              ) : id === "general" ? (
                <GeneralTab />
              ) : (
                <TimerTab pom={pom} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
