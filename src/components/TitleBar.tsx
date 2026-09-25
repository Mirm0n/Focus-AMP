import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { isTauri } from "../lib/proxy";

/**
 * Custom chrome — the window is created with `decorations: false`, so the drag
 * region and the three controls have to be ours.
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
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <span
          data-tauri-drag-region
          style={{
            fontFamily: "var(--app-font-ui)",
            fontWeight: 600,
            fontSize: 12.5,
            letterSpacing: "0.01em",
            color: "var(--app-accent)",
          }}
        >
          Tunescape
        </span>
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

      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        {children}
        {inTauri && (
          <>
            <button style={btn} onClick={() => win().minimize()} title="Minimize">
              <Minus size={14} />
            </button>
            <button style={btn} onClick={() => win().toggleMaximize()} title="Maximize">
              <Square size={11} />
            </button>
            <button
              style={btn}
              onClick={() => win().close()}
              title="Close"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#c4342b";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--app-text-muted)";
              }}
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
