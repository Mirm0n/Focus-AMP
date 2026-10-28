import { SlidersHorizontal } from "lucide-react";

import { EQ_BANDS, EQ_PRESETS, EQ_RANGE, matchPreset, type EqState } from "../lib/eq";
import { Chip, PanelHeader, Popover } from "./Popover";

/** The five-band equalizer, opened from the transport bar. */
export function EqPopover({ eq, onChange }: { eq: EqState; onChange: (eq: EqState) => void }) {
  const preset = matchPreset(eq.gains);

  return (
    <Popover
      label="Equalizer"
      active={eq.enabled}
      width={292}
      trigger={<SlidersHorizontal size={15} aria-hidden="true" />}
    >
      <PanelHeader title="Equalizer">
        <button
          type="button"
          role="switch"
          aria-checked={eq.enabled}
          aria-label="Equalizer on"
          onClick={() => onChange({ ...eq, enabled: !eq.enabled })}
          style={{
            width: 34,
            height: 20,
            padding: 2,
            borderRadius: 999,
            border: "none",
            background: eq.enabled ? "var(--app-accent)" : "var(--app-border-muted)",
            cursor: "pointer",
            display: "flex",
            justifyContent: eq.enabled ? "flex-end" : "flex-start",
            transition: "background 0.15s ease",
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--app-bg-surface)" }}
          />
        </button>
      </PanelHeader>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 4px 0",
          opacity: eq.enabled ? 1 : 0.45,
          transition: "opacity 0.15s ease",
        }}
      >
        {EQ_BANDS.map((band, i) => {
          const g = eq.gains[i];
          return (
            <div
              key={band.freq}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 44 }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontFamily: "var(--app-font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  color: g === 0 ? "var(--app-text-faint)" : "var(--app-text-primary)",
                }}
              >
                {g > 0 ? `+${g}` : g}
              </span>
              <input
                type="range"
                min={-EQ_RANGE}
                max={EQ_RANGE}
                step={1}
                value={g}
                aria-label={`${band.label} hertz`}
                aria-valuetext={`${g} decibels`}
                onChange={(e) => {
                  const gains = [...eq.gains];
                  gains[i] = parseInt(e.target.value, 10);
                  // Moving a band is a clear sign of wanting to hear it.
                  onChange({ enabled: true, gains });
                }}
                onDoubleClick={() => {
                  const gains = [...eq.gains];
                  gains[i] = 0;
                  onChange({ ...eq, gains });
                }}
                style={{
                  writingMode: "vertical-lr",
                  direction: "rtl",
                  height: 110,
                  width: 20,
                  accentColor: "var(--app-accent)",
                  cursor: "pointer",
                }}
              />
              <span style={{ fontSize: 10.5, color: "var(--app-text-muted)" }}>{band.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
        {EQ_PRESETS.map((p) => (
          <Chip
            key={p.id}
            on={eq.enabled && preset?.id === p.id}
            onClick={() => onChange({ enabled: true, gains: [...p.gains] })}
          >
            {p.name}
          </Chip>
        ))}
      </div>
    </Popover>
  );
}
