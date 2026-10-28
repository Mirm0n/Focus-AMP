import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { isTauri } from "../lib/proxy";
import { loadCloseToTray } from "../lib/prefs";

/**
 * Custom chrome — the window is created with `decorations: false`, so the drag
 * region and the three controls have to be ours.
 *
 * `data-tauri-drag-region` does not inherit. Only the exact element under the
 * pointer counts, so every layout wrapper that covers part of the bar needs it
 * too — otherwise the bar looks draggable and is dead wherever a bare `<div>`
 * happens to sit, which is most of it. Buttons and inputs inside are
 * unaffected: they are their own elements and never carry the attribute.
 */
export function TitleBar({
  nowPlaying,
  children,
}: {
  nowPlaying?: string | null;
  children?: React.ReactNode;
}) {
  const inTauri = isTauri();
  const win = () => getCurrentWindow();

  const btn: React.CSSProperties = {
    width: 42,
    height: 34,
    display: "grid",
    placeItems: "center",
    background: "transparent",
    border: "none",
    color: "var(--app-text-muted)",
    cursor: "pointer",
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 44,
        flex: "0 0 44px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--app-bg-surface)",
        borderBottom: "1px solid var(--app-border-subtle)",
        paddingLeft: 15,
      }}
    >
      <div data-tauri-drag-region style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {/* The app name is the document's heading — there was no h1 at all,
            so heading navigation found nothing anywhere in the shell. */}
        <h1
          data-tauri-drag-region
          style={{
            margin: 0,
            fontFamily: "var(--app-font-ui)",
            fontWeight: 600,
            fontSize: 12.5,
            letterSpacing: "0.01em",
            color: "var(--app-accent)",
          }}
        >
          Focus AMP
        </h1>
      </div>

      {nowPlaying && (
        <span
          data-tauri-drag-region
          style={{
            flex: 2,
            textAlign: "center",
            fontFamily: "var(--app-font-ui)",
            fontSize: 12,
            color: "var(--app-text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {nowPlaying}
        </span>
      )}

      <div
        data-tauri-drag-region
        style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}
      >
        {children}
        {inTauri && (
          <>
            <button style={btn} onClick={() => win().minimize()} title="Minimize" aria-label="Minimize">
              <Minus size={14} aria-hidden="true" />
            </button>
            <button style={btn} onClick={() => win().toggleMaximize()} title="Maximize" aria-label="Maximize">
              <Square size={11} aria-hidden="true" />
            </button>
            <button
              style={btn}
              onClick={() => (loadCloseToTray() ? win().hide() : win().close())}
              title="Close"
              aria-label="Close"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#c4342b";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--app-text-muted)";
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
