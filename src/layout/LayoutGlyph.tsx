import type { LayoutId } from "./layouts";

/**
 * A schematic of the window: station list on the left, transport along the
 * bottom, and the stage arranged the way the layout arranges it. The display
 * is drawn as dark glass and the timer as a bar of accent, so the two are
 * tellable apart at thumbnail size without a legend.
 */

export function LayoutGlyph({ id, height = 96 }: { id: LayoutId; height?: number }) {
  // A dark representation of the visualizer canvas
  const canvasBg = "var(--viz-ground)";
  const canvasAccent = "var(--app-accent)";
  const panelBg = "var(--app-bg-surface)";
  
  const renderThumbnail = () => {
    switch (id) {
      case "console":
        return (
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            <div style={{ flex: 1, background: canvasBg, display: "flex", alignItems: "flex-end", padding: "0 10%" }}>
              {/* fake bars */}
              <div style={{ width: "20%", height: "40%", background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
              <div style={{ width: "20%", height: "70%", background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
              <div style={{ width: "20%", height: "30%", background: canvasAccent, opacity: 0.8 }} />
            </div>
            <div style={{ height: "30%", background: panelBg, borderTop: "1px solid var(--app-border-subtle)", display: "flex", alignItems: "center", padding: "0 10%" }}>
              <div style={{ width: "30%", height: "40%", background: canvasAccent, borderRadius: 2 }} />
            </div>
          </div>
        );
      case "focus":
        return (
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            <div style={{ flex: 1, background: panelBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "50%", height: "30%", background: canvasAccent, borderRadius: 2 }} />
            </div>
            <div style={{ height: "30%", background: canvasBg, borderTop: "1px solid var(--app-border-subtle)", display: "flex", alignItems: "flex-end", padding: "0 10%" }}>
              <div style={{ width: "20%", height: "50%", background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
              <div style={{ width: "20%", height: "80%", background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
              <div style={{ width: "20%", height: "30%", background: canvasAccent, opacity: 0.8 }} />
            </div>
          </div>
        );
      case "split":
        return (
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            <div style={{ flex: 1, background: canvasBg, display: "flex", alignItems: "flex-end", padding: "0 5%" }}>
              <div style={{ width: "25%", height: "50%", background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
              <div style={{ width: "25%", height: "80%", background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
            </div>
            <div style={{ flex: 1, background: panelBg, borderLeft: "1px solid var(--app-border-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "50%", height: "20%", background: canvasAccent, borderRadius: 2 }} />
            </div>
          </div>
        );
      case "dashboard":
        return (
          <div style={{ display: "flex", width: "100%", height: "100%", padding: "6%", gap: "6%", background: "var(--app-bg-base)" }}>
            <div style={{ flex: 1.5, background: canvasBg, borderRadius: 4, display: "flex", alignItems: "flex-end", padding: "0 5%", overflow: "hidden" }}>
              <div style={{ width: "25%", height: "50%", background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
              <div style={{ width: "25%", height: "80%", background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
            </div>
            <div style={{ flex: 1, background: panelBg, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--app-border-subtle)" }}>
              <div style={{ width: "50%", height: "15%", background: canvasAccent, borderRadius: 2 }} />
            </div>
          </div>
        );
      case "backdrop":
        return (
          <div style={{ position: "relative", width: "100%", height: "100%", background: canvasBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", bottom: 0, left: "10%", display: "flex", alignItems: "flex-end" }}>
              <div style={{ width: 10, height: 20, background: canvasAccent, opacity: 0.5, marginRight: 2 }} />
              <div style={{ width: 10, height: 40, background: canvasAccent, opacity: 0.5, marginRight: 2 }} />
            </div>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
            <div style={{ width: "50%", height: "25%", background: canvasAccent, borderRadius: 4, zIndex: 1 }} />
          </div>
        );
      case "hud":
        return (
          <div style={{ position: "relative", width: "100%", height: "100%", background: canvasBg }}>
            <div style={{ position: "absolute", bottom: 0, left: "10%", display: "flex", alignItems: "flex-end" }}>
              <div style={{ width: 10, height: 20, background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
              <div style={{ width: 10, height: 40, background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
              <div style={{ width: 10, height: 15, background: canvasAccent, opacity: 0.8, marginRight: 2 }} />
            </div>
            <div style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", width: "40%", height: "20%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <div style={{ width: "50%", height: "30%", background: canvasAccent, borderRadius: 2 }} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        height,
        width: "100%",
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid var(--app-border-input)",
        background: "var(--app-bg-base)",
      }}
    >
      {renderThumbnail()}
    </span>
  );
}

