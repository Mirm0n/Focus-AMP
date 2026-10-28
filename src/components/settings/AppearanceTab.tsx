import { useEffect, useId, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { FieldGroup, Hint, Toggle } from "./fields";
import type { Appearance } from "../../theme/useAppearance";
import type { VizOptionKey } from "../../viz/types";
import { isTauri } from "../../lib/proxy";

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
}: {
  appearance: Appearance;
}) {
  const {
    visualizer,
    options,
    setOption,
    albumArt,
    setAlbumArt,
  } = appearance;
  const densityId = useId();

  const inTauri = isTauri();
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("focusamp:alwaysOnTop") ?? "false");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (inTauri) {
      getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
    }
  }, [alwaysOnTop, inTauri]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

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

      <FieldGroup title="Now playing">
        <Toggle
          name="Album art"
          hint="Show the cover of the current track in the player bar. Off by default: it contacts Apple"
          on={albumArt}
          onChange={setAlbumArt}
        />
        <Hint>
          Covers are looked up by sending each track title to Apple's iTunes search — the only
          thing this app sends anywhere that is not a station or the directory. Only stations that
          announce their tracks can have one, and a cover is shown only on a confident match. The
          cover links to the track on Apple Music, which is the condition Apple puts on using it.
        </Hint>
      </FieldGroup>

      {inTauri && (
        <FieldGroup title="Window">
          <Toggle
            name="Always on top"
            hint="Keep the app above other windows"
            on={alwaysOnTop}
            onChange={(v) => {
              setAlwaysOnTop(v);
              localStorage.setItem("focusamp:alwaysOnTop", JSON.stringify(v));
            }}
          />
        </FieldGroup>
      )}
    </div>
  );
}
