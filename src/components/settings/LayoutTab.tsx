import { FieldGroup, Hint } from "./fields";
import { LAYOUTS } from "../../layout/layouts";
import { LayoutGlyph } from "../../layout/LayoutGlyph";
import type { Appearance } from "../../theme/useAppearance";

export function LayoutTab({ appearance }: { appearance: Appearance }) {
  const { layout, setLayout } = appearance;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <FieldGroup title="Window layout">
        <div
          role="radiogroup"
          aria-label="Window layout"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(206px, 1fr))",
            gap: 8,
          }}
        >
          {LAYOUTS.map((l) => {
            const active = l.id === layout.id;
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setLayout(l.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                  padding: 9,
                  textAlign: "left",
                  borderRadius: "var(--app-radius-sm)",
                  border: `1px solid ${active ? "var(--app-accent)" : "var(--app-border-input)"}`,
                  background: active ? "var(--app-bg-overlay)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <LayoutGlyph id={l.id} />
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--app-text-primary)",
                    }}
                  >
                    {l.name}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--app-text-muted)" }}>
                    {l.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <Hint>
          Layouts rearrange the display and the timer. The station list and the transport stay
          where they are.
        </Hint>
      </FieldGroup>
    </div>
  );
}
