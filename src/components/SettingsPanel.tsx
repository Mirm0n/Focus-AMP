import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";

import { VisualizerCanvas } from "./VisualizerCanvas";
import { THEMES } from "../theme/themes";
import { VISUALIZERS } from "../viz/registry";
import { onPresetNames } from "../viz/units/milkdrop";
import type { Appearance } from "../theme/useAppearance";
import type { VizOptionKey } from "../viz/types";

/**
 * Appearance settings.
 *
 * Every visualizer card runs the real visualizer on the real audio, so the
 * choice is made by watching the thing rather than by reading its name. The
 * option toggles below filter to what the selected one actually honours —
 * offering "peak markers" for the oscilloscope would be a control that does
 * nothing.
 */

const OPTION_COPY: Record<VizOptionKey, { name: string; hint: string }> = {
  density: { name: "Density", hint: "How finely the display is divided" },
  glow: { name: "Glow", hint: "Bloom around lit elements" },
  peaks: { name: "Peak markers", hint: "Hold the highest recent level" },
  mirror: { name: "Reflection", hint: "Mirror the display below itself" },
  scanlines: { name: "Scanlines", hint: "Overlay a CRT line pattern" },
  // Milkdrop's two are laid out by hand below, not as generic toggles.
  preset: { name: "Preset", hint: "Which Milkdrop preset to run" },
  cycleSeconds: { name: "Shuffle every", hint: "How long each preset holds" },
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 8px",
  fontSize: 12,
  borderRadius: "var(--app-radius-sm)",
  border: "1px solid var(--app-border-input)",
  background: "var(--app-bg-overlay)",
  color: "var(--app-text-primary)",
};

/** Preset names arrive with the pack, which loads on first Milkdrop render. */
function usePresetNames(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => onPresetNames(setNames), []);
  return names;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: "var(--app-text-primary)",
      }}
    >
      {children}
    </h2>
  );
}

function CheckBox({ on }: { on: boolean }) {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        flex: "0 0 auto",
        display: "grid",
        placeItems: "center",
        borderRadius: 4,
        border: `1px solid ${on ? "var(--app-accent)" : "var(--app-border-muted)"}`,
        background: on ? "var(--app-accent)" : "transparent",
        color: "var(--app-accent-ink)",
      }}
    >
      {on && <Check size={11} strokeWidth={3} />}
    </span>
  );
}

function MilkdropOptions({ appearance }: { appearance: Appearance }) {
  const { options, setOption } = appearance;
  const names = usePresetNames();
  const shuffling = options.preset === null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12.5, color: "var(--app-text-primary)" }}>Preset</span>
        <select
          value={options.preset ?? ""}
          onChange={(e) => setOption("preset", e.target.value || null)}
          style={fieldStyle}
        >
          <option value="">Shuffle all {names.length || ""}</option>
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {names.length === 0 && (
          <span style={{ fontSize: 10.5, color: "var(--app-text-faint)" }}>
            The preset pack loads the first time Milkdrop runs.
          </span>
        )}
      </label>

      {shuffling && (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12.5,
              color: "var(--app-text-primary)",
            }}
          >
            Shuffle every
            <span style={{ fontSize: 10.5, color: "var(--app-text-faint)" }}>
              {options.cycleSeconds === 0 ? "held" : `${options.cycleSeconds}s`}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={120}
            step={5}
            value={options.cycleSeconds}
            onChange={(e) => setOption("cycleSeconds", parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: "var(--app-accent)" }}
          />
        </label>
      )}
    </div>
  );
}

export function SettingsPanel({
  appearance,
  analyser,
  playing,
  onClose,
}: {
  appearance: Appearance;
  analyser: AnalyserNode | null;
  playing: boolean;
  onClose: () => void;
}) {
  const { theme, setTheme, visualizer, setVisualizer, options, setOption, vizTheme } = appearance;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.42)" }}
      />

      <aside
        className="settings-panel"
        style={{
          position: "relative",
          width: 396,
          maxWidth: "88vw",
          height: "100%",
          overflowY: "auto",
          background: "var(--app-bg-surface)",
          borderLeft: "1px solid var(--app-border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: 26,
          padding: "20px 22px 30px",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SectionTitle>Appearance</SectionTitle>
          <button
            onClick={onClose}
            aria-label="Close appearance settings"
            style={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              borderRadius: "var(--app-radius-sm)",
              border: "1px solid var(--app-border-muted)",
              background: "transparent",
              color: "var(--app-text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </header>

        {/* ── Themes ─────────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionTitle>Theme</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {THEMES.map((t) => {
              const active = t.id === theme.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={active}
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
                    style={{
                      display: "flex",
                      height: 30,
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
                    <span
                      style={{ display: "block", fontSize: 10.5, color: "var(--app-text-faint)" }}
                    >
                      {t.era}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Visualizers ────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionTitle>Visualizer</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {VISUALIZERS.map((v) => {
              const active = v.id === visualizer.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVisualizer(v.id)}
                  aria-pressed={active}
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
                    style={{
                      width: 92,
                      height: 52,
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
                    <span
                      style={{ display: "block", fontSize: 10.5, color: "var(--app-text-faint)" }}
                    >
                      {v.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Options for the chosen visualizer ──────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionTitle>{visualizer.name} options</SectionTitle>

          {visualizer.supports.includes("preset") && (
            <MilkdropOptions appearance={appearance} />
          )}

          {visualizer.supports.includes("density") && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12.5,
                  color: "var(--app-text-primary)",
                }}
              >
                {OPTION_COPY.density.name}
                <span style={{ fontSize: 10.5, color: "var(--app-text-faint)" }}>
                  {OPTION_COPY.density.hint}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={options.density}
                onChange={(e) => setOption("density", parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--app-accent)" }}
              />
            </label>
          )}

          {(["glow", "peaks", "mirror", "scanlines"] as VizOptionKey[])
            .filter((k) => visualizer.supports.includes(k))
            .map((k) => {
              const on = options[k] as boolean;
              return (
                <button
                  key={k}
                  onClick={() => setOption(k, !on as never)}
                  role="switch"
                  aria-checked={on}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "9px 10px",
                    textAlign: "left",
                    borderRadius: "var(--app-radius-sm)",
                    border: "1px solid var(--app-border-input)",
                    background: on ? "var(--app-bg-overlay)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <CheckBox on={on} />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{ display: "block", fontSize: 12.5, color: "var(--app-text-primary)" }}
                    >
                      {OPTION_COPY[k].name}
                    </span>
                    <span
                      style={{ display: "block", fontSize: 10.5, color: "var(--app-text-faint)" }}
                    >
                      {OPTION_COPY[k].hint}
                    </span>
                  </span>
                </button>
              );
            })}
        </section>
      </aside>
    </div>
  );
}
