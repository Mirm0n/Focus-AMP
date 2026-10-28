/**
 * Five-band graphic equalizer: the bands, the presets, and persistence.
 *
 * The filters themselves live in `useRadioPlayer`, in the one audio graph. A
 * band at 0 dB is acoustically transparent, so "off" is just every band at
 * zero — the graph is never rewired, which would click.
 */

export interface EqBand {
  /** Short label for under the slider. */
  label: string;
  freq: number;
  type: BiquadFilterType;
}

export const EQ_BANDS: EqBand[] = [
  { label: "60", freq: 60, type: "lowshelf" },
  { label: "250", freq: 250, type: "peaking" },
  { label: "1k", freq: 1000, type: "peaking" },
  { label: "4k", freq: 4000, type: "peaking" },
  { label: "12k", freq: 12000, type: "highshelf" },
];

/** Slider range, in dB either side of flat. */
export const EQ_RANGE = 12;

export interface EqPreset {
  id: string;
  name: string;
  gains: number[];
}

export const EQ_PRESETS: EqPreset[] = [
  { id: "flat", name: "Flat", gains: [0, 0, 0, 0, 0] },
  { id: "bass", name: "Bass boost", gains: [6, 3, 0, 0, 0] },
  { id: "warm", name: "Lo-fi warmth", gains: [-2, 4, 1, -2, -6] },
  { id: "crisp", name: "Crisp", gains: [0, -2, 1, 4, 3] },
  { id: "voice", name: "Voice", gains: [-3, -1, 3, 3, -1] },
  { id: "soft", name: "Soft focus", gains: [-2, -3, -3, -2, -4] },
];

export interface EqState {
  enabled: boolean;
  gains: number[];
}

const STORAGE_KEY = "focusamp:eq";

export const DEFAULT_EQ: EqState = { enabled: false, gains: [0, 0, 0, 0, 0] };

export function loadEq(): EqState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || !Array.isArray(parsed.gains) || parsed.gains.length !== EQ_BANDS.length) {
      return DEFAULT_EQ;
    }
    return {
      enabled: parsed.enabled === true,
      gains: parsed.gains.map((g: unknown) =>
        typeof g === "number" && Number.isFinite(g) ? Math.max(-EQ_RANGE, Math.min(EQ_RANGE, g)) : 0,
      ),
    };
  } catch {
    return DEFAULT_EQ;
  }
}

export function saveEq(eq: EqState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eq));
  } catch {
    /* private mode, or storage disabled */
  }
}

/** The preset these gains match exactly, if any. */
export function matchPreset(gains: number[]): EqPreset | undefined {
  return EQ_PRESETS.find((p) => p.gains.every((g, i) => g === gains[i]));
}
