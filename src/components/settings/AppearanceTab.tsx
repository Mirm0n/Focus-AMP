import { useId } from "react";

import { VisualizerCanvas } from "../VisualizerCanvas";
import { FieldGroup, Hint, Toggle } from "./fields";
import { THEMES } from "../../theme/themes";
import { VISUALIZERS } from "../../viz/registry";
import type { Appearance } from "../../theme/useAppearance";
import type { VizOptionKey } from "../../viz/types";

const OPTION_COPY: Record<VizOptionKey, { name: string; hint: string }> = {
  density: { name: "Density", hint: "How finely the display is divided" },
  glow: { name: "Glow", hint: "Bloom around lit elements" },
  peaks: { name: "Peak markers", hint: "Hold the highest recent level" },
  mirror: { name: "Reflection", hint: "Mirror the display below itself" },
  scanlines: { name: "Scanlines", hint: "Overlay a CRT line pattern" },
};

const TOGGLE_KEYS: VizOptionKey[] = ["glow", "peaks", "mirror", "scanlines"];

export function AppearanceTab({
  appearance,
  analyser,
  playing,
}: {
  appearance: Appearance;
  analyser: AnalyserNode | null;
  playing: boolean;
}) {
  const { theme, setTheme, visualizer, setVisualizer, options, setOption, vizTheme } = appearance;
  const densityId = useId();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <FieldGroup title="Theme">
        <div
          role="radiogroup"
          aria-label="Theme"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(206px, 1fr))",
            gap: 8,
          }}
        >
          {THEMES.map((t) => {
            const active = t.id === theme.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(t.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 9,
                  textAlign: "left",
                  borderRadius: "var(--app-radius-sm)",
                  border: `1px solid ${active ? "var(--app-accent)" : "var(--app-border-input)"}`,
                  background: active ? "var(--app-bg-overlay)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "flex",
                    height: 28,
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid var(--app-border-input)",
                  }}
                >
                  <span style={{ flex: 2, background: t.swatch[0] }} />
                  <span style={{ flex: 1, background: t.swatch[1] }} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--app-text-primary)",
                    }}
                  >
                    {t.name}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--app-text-muted)" }}>
                    {t.era}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </FieldGroup>

      <FieldGroup title="Visualizer">
        <div
          role="radiogroup"
          aria-label="Visualizer"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 8,
          }}
        >
          {VISUALIZERS.map((v) => {
            const active = v.id === visualizer.id;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setVisualizer(v.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 8,
                  textAlign: "left",
                  borderRadius: "var(--app-radius-sm)",
                  border: `1px solid ${active ? "var(--app-accent)" : "var(--app-border-input)"}`,
                  background: active ? "var(--app-bg-overlay)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 92,
                    height: 50,
                    flex: "0 0 auto",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid var(--app-border-input)",
                    background: vizTheme.ground,
                  }}
                >
                  <VisualizerCanvas
                    analyser={analyser}
                    visualizer={v}
                    options={options}
                    theme={vizTheme}
                    playing={playing}
                    preview
                  />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--app-text-primary)",
                    }}
                  >
                    {v.name}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--app-text-muted)" }}>
                    {v.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </FieldGroup>

      <FieldGroup title={`${visualizer.name} options`}>
        {visualizer.supports.includes("density") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor={densityId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                color: "var(--app-text-primary)",
              }}
            >
              {OPTION_COPY.density.name}
              <span style={{ fontSize: 11, color: "var(--app-text-muted)" }}>
                {OPTION_COPY.density.hint}
              </span>
            </label>
            <input
              id={densityId}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={options.density}
              aria-valuetext={`${Math.round(options.density * 100)} percent`}
              onChange={(e) => setOption("density", parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--app-accent)" }}
            />
          </div>
        )}

        {TOGGLE_KEYS.filter((k) => visualizer.supports.includes(k)).map((k) => (
          <Toggle
            key={k}
            name={OPTION_COPY[k].name}
            hint={OPTION_COPY[k].hint}
            on={options[k] as boolean}
            onChange={(v) => setOption(k, v as never)}
          />
        ))}

        <Hint>Options apply to the selected visualizer only.</Hint>
      </FieldGroup>
    </div>
  );
}
