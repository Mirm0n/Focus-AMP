import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { isTauri } from "../lib/proxy";

/**
 * Custom chrome — the window is created with `decorations: false`, so the drag
 * region and the three controls have to be ours.
 */
export function TitleBar({ subtitle }: { subtitle?: string }) {
  const { theme, toggle } = useTheme();
  const inTauri = isTauri();

  const win = () => getCurrentWindow();

  const btn: React.CSSProperties = {
    width: 42,
    height: 32,
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
        height: 38,
        flex: "0 0 38px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--app-bg-header)",
        borderBottom: "1px solid var(--app-border-subtle)",
        paddingLeft: 14,
      }}
    >
      <div data-tauri-drag-region style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          data-tauri-drag-region
          style={{
            fontFamily: "var(--app-font-brand)",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "-0.01em",
            color: "var(--app-text-primary)",
          }}
        >
          Tunescape
        </span>
        {subtitle && (
          <span
            data-tauri-drag-region
            style={{ fontSize: 11, color: "var(--app-text-faint)", fontFamily: "var(--app-font-ui)" }}
          >
            {subtitle}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <button style={btn} onClick={toggle} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        {inTauri && (
          <>
            <button style={btn} onClick={() => win().minimize()} title="Minimize">
              <Minus size={14} />
            </button>
            <button style={btn} onClick={() => win().toggleMaximize()} title="Maximize">
              <Square size={11} />
            </button>
            <button
              style={{ ...btn, marginRight: 0 }}
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
