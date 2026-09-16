/**
 * Themes.
 *
 * Each one is a family with a light and a dark variant, and each variant is
 * sampled from a specific object rather than being a tint of the other. A
 * receiver came in black-face and silver-face models; a terminal ran normal and
 * reverse video; the 1984 Macintosh inverted to white-on-black for selection.
 * The accent is what holds constant across a family — it is the family's
 * identity — while the chassis flips.
 *
 * The display stays dark glass in every variant. On a real silver faceplate the
 * meter window is a smoked panel, so it is both period-correct and the reason
 * the visualizer holds up on a bright chassis.
 */

export type Mode = "light" | "dark" | "system";
export type Resolved = "light" | "dark";

export interface ThemeVariant {
  /** The object this palette is sampled from. */
  era: string;
  /** Two colours for the picker swatch: chassis, then accent. */
  swatch: [string, string];
  tokens: Record<string, string>;
}

export interface Theme {
  id: string;
  name: string;
  light: ThemeVariant;
  dark: ThemeVariant;
}

/** The display half is shared within a family — the glass does not change. */
const glass = (ground: string, grid: string, lo: string, mid: string, hi: string, ink: string) => ({
  "--viz-ground": ground,
  "--viz-grid": grid,
  "--viz-lo": lo,
  "--viz-mid": mid,
  "--viz-hi": hi,
  "--viz-ink": ink,
});

const AMBER_GLASS = glass("#0a0908", "#241f1a", "#57c98a", "#e8a33d", "#e0553c", "#f1ece3");
const TEAL_GLASS = glass("#0b1211", "#22302d", "#4fbf8f", "#d8a63c", "#c2492f", "#dfe6e2");
const GREEN_GLASS = glass("#030605", "#123020", "#1f9c55", "#3fd97b", "#a6ffc9", "#d8ffe8");
const AMBER_CRT_GLASS = glass("#050301", "#2c1f0b", "#b4711a", "#ffb74d", "#ffe3ae", "#ffdaa2");
const MONO_GLASS = glass("#000000", "#2b2b2b", "#6e6e6e", "#b4b4b4", "#ffffff", "#ffffff");
const BLUE_GLASS = glass("#0c1a26", "#1e3446", "#3ad0ff", "#2a8fef", "#b6dcff", "#dceaf7");

export const THEMES: Theme[] = [
  {
    id: "graphite",
    name: "Graphite",
    dark: {
      era: "Black-face separate, early 80s",
      swatch: ["#191715", "#e8a33d"],
      tokens: {
        "--app-bg-base": "#121110",
        "--app-bg-surface": "#191715",
        "--app-bg-header": "#0c0b0a",
        "--app-bg-overlay": "#0a0908",
        "--app-border-subtle": "#272320",
        "--app-border-muted": "#37322c",
        "--app-border-default": "#4d463d",
        "--app-border-input": "rgba(255,255,255,0.09)",
        "--app-accent": "#e8a33d",
        "--app-accent-ink": "#191104",
        "--app-text-primary": "#f1ece3",
        "--app-text-muted": "#b4ab9c",
        "--app-text-faint": "#928979",
        ...AMBER_GLASS,
      },
    },
    light: {
      era: "Silver-face separate, 1979",
      swatch: ["#e7e4dc", "#9a6208"],
      tokens: {
        "--app-bg-base": "#d7d4cc",
        "--app-bg-surface": "#e7e4dc",
        "--app-bg-header": "#c5c1b6",
        "--app-bg-overlay": "#f2f0ea",
        "--app-border-subtle": "#bab6aa",
        "--app-border-muted": "#a5a094",
        "--app-border-default": "#8a8478",
        "--app-border-input": "rgba(0,0,0,0.16)",
        "--app-accent": "#9a6208",
        "--app-accent-ink": "#fff8ec",
        "--app-text-primary": "#201e1a",
        "--app-text-muted": "#524d45",
        "--app-text-faint": "#5b564e",
        ...AMBER_GLASS,
      },
    },
  },
  {
    id: "marine",
    name: "Marine",
    light: {
      era: "Brushed aluminium receiver, 1977",
      swatch: ["#e9e7e1", "#1c6b6b"],
      tokens: {
        "--app-bg-base": "#d9d6ce",
        "--app-bg-surface": "#e9e7e1",
        "--app-bg-header": "#c7c3b9",
        "--app-bg-overlay": "#f3f2ed",
        "--app-border-subtle": "#bcb8ad",
        "--app-border-muted": "#a9a497",
        "--app-border-default": "#8b8679",
        "--app-border-input": "rgba(0,0,0,0.16)",
        "--app-accent": "#1c6b6b",
        "--app-accent-ink": "#f3f9f8",
        "--app-text-primary": "#22201c",
        "--app-text-muted": "#4b473f",
        "--app-text-faint": "#5c5750",
        ...TEAL_GLASS,
      },
    },
    dark: {
      era: "Black-face receiver, teal dial lamp",
      swatch: ["#171b1a", "#4fd6c9"],
      tokens: {
        "--app-bg-base": "#101312",
        "--app-bg-surface": "#171b1a",
        "--app-bg-header": "#0a0d0c",
        "--app-bg-overlay": "#080a0a",
        "--app-border-subtle": "#212826",
        "--app-border-muted": "#2e3836",
        "--app-border-default": "#43524f",
        "--app-border-input": "rgba(255,255,255,0.09)",
        "--app-accent": "#4fd6c9",
        "--app-accent-ink": "#04201d",
        "--app-text-primary": "#e4efed",
        "--app-text-muted": "#a2b4b1",
        "--app-text-faint": "#83938f",
        ...TEAL_GLASS,
      },
    },
  },
  {
    id: "phosphor",
    name: "Phosphor",
    dark: {
      era: "P31 green monitor, 1983",
      swatch: ["#0a110c", "#4ef08a"],
      tokens: {
        "--app-bg-base": "#060a07",
        "--app-bg-surface": "#0a110c",
        "--app-bg-header": "#040706",
        "--app-bg-overlay": "#030605",
        "--app-border-subtle": "#15271b",
        "--app-border-muted": "#1e3826",
        "--app-border-default": "#2f553b",
        "--app-border-input": "rgba(78,240,138,0.16)",
        "--app-accent": "#4ef08a",
        "--app-accent-ink": "#02160a",
        "--app-text-primary": "#aaffc8",
        "--app-text-muted": "#74cf97",
        "--app-text-faint": "#59ab79",
        ...GREEN_GLASS,
      },
    },
    light: {
      era: "Reverse video, same tube",
      swatch: ["#f1f7f2", "#0f6b33"],
      tokens: {
        "--app-bg-base": "#e6f0e8",
        "--app-bg-surface": "#f1f7f2",
        "--app-bg-header": "#d5e4d9",
        "--app-bg-overlay": "#ffffff",
        "--app-border-subtle": "#c2d5c7",
        "--app-border-muted": "#a8bfae",
        "--app-border-default": "#7d9a85",
        "--app-border-input": "rgba(0,0,0,0.16)",
        "--app-accent": "#0f6b33",
        "--app-accent-ink": "#f0fff4",
        "--app-text-primary": "#0a1c10",
        "--app-text-muted": "#33543d",
        "--app-text-faint": "#4c7157",
        ...GREEN_GLASS,
      },
    },
  },
  {
    id: "amber",
    name: "Amber",
    dark: {
      era: "Amber monochrome monitor, 1985",
      swatch: ["#130e06", "#ffb74d"],
      tokens: {
        "--app-bg-base": "#0b0703",
        "--app-bg-surface": "#130e06",
        "--app-bg-header": "#070502",
        "--app-bg-overlay": "#050301",
        "--app-border-subtle": "#2b1e0a",
        "--app-border-muted": "#3d2c0e",
        "--app-border-default": "#5f4416",
        "--app-border-input": "rgba(255,183,77,0.16)",
        "--app-accent": "#ffb74d",
        "--app-accent-ink": "#1d1102",
        "--app-text-primary": "#ffdaa2",
        "--app-text-muted": "#d9a960",
        "--app-text-faint": "#b08a49",
        ...AMBER_CRT_GLASS,
      },
    },
    light: {
      era: "Reverse video, same tube",
      swatch: ["#f8f2e7", "#8a5200"],
      tokens: {
        "--app-bg-base": "#f0e7d8",
        "--app-bg-surface": "#f8f2e7",
        "--app-bg-header": "#e2d5bf",
        "--app-bg-overlay": "#fffdf8",
        "--app-border-subtle": "#d3c4a9",
        "--app-border-muted": "#bda98a",
        "--app-border-default": "#96805d",
        "--app-border-input": "rgba(0,0,0,0.18)",
        "--app-accent": "#8a5200",
        "--app-accent-ink": "#fff6e6",
        "--app-text-primary": "#231803",
        "--app-text-muted": "#5a4620",
        "--app-text-faint": "#6f5930",
        ...AMBER_CRT_GLASS,
      },
    },
  },
  {
    id: "classic",
    name: "Classic",
    light: {
      era: "Macintosh System 1, 1984",
      swatch: ["#ffffff", "#000000"],
      tokens: {
        // Genuinely 1-bit: no tinted greys, and an accent that is simply black.
        "--app-bg-base": "#ffffff",
        "--app-bg-surface": "#f6f6f6",
        "--app-bg-header": "#e6e6e6",
        "--app-bg-overlay": "#ffffff",
        "--app-border-subtle": "#c9c9c9",
        "--app-border-muted": "#9a9a9a",
        "--app-border-default": "#000000",
        "--app-border-input": "rgba(0,0,0,0.26)",
        "--app-accent": "#000000",
        "--app-accent-ink": "#ffffff",
        "--app-text-primary": "#000000",
        "--app-text-muted": "#3d3d3d",
        "--app-text-faint": "#5e5e5e",
        ...MONO_GLASS,
      },
    },
    dark: {
      era: "The same screen, inverted",
      swatch: ["#0d0d0d", "#ffffff"],
      tokens: {
        "--app-bg-base": "#000000",
        "--app-bg-surface": "#0d0d0d",
        "--app-bg-header": "#000000",
        "--app-bg-overlay": "#151515",
        "--app-border-subtle": "#2e2e2e",
        "--app-border-muted": "#4a4a4a",
        "--app-border-default": "#ffffff",
        "--app-border-input": "rgba(255,255,255,0.26)",
        "--app-accent": "#ffffff",
        "--app-accent-ink": "#000000",
        "--app-text-primary": "#ffffff",
        "--app-text-muted": "#c4c4c4",
        "--app-text-faint": "#9e9e9e",
        ...MONO_GLASS,
      },
    },
  },
  {
    id: "aqua",
    name: "Aqua",
    light: {
      era: "Mac OS X 10.0, 2001",
      swatch: ["#f3f7fb", "#1a72d8"],
      tokens: {
        "--app-bg-base": "#e1e8f0",
        "--app-bg-surface": "#f3f7fb",
        "--app-bg-header": "#cbd8e7",
        "--app-bg-overlay": "#ffffff",
        "--app-border-subtle": "#b9c8da",
        "--app-border-muted": "#a2b4c8",
        "--app-border-default": "#8095ad",
        "--app-border-input": "rgba(0,0,0,0.16)",
        "--app-accent": "#1a72d8",
        "--app-accent-ink": "#ffffff",
        "--app-text-primary": "#16232e",
        "--app-text-muted": "#4a5c6d",
        "--app-text-faint": "#4f606f",
        ...BLUE_GLASS,
      },
    },
    dark: {
      era: "The Graphite appearance, same year",
      swatch: ["#151f2a", "#4aa3ff"],
      tokens: {
        "--app-bg-base": "#0e151d",
        "--app-bg-surface": "#151f2a",
        "--app-bg-header": "#0a1119",
        "--app-bg-overlay": "#091019",
        "--app-border-subtle": "#1f2d3c",
        "--app-border-muted": "#2c3f52",
        "--app-border-default": "#44607a",
        "--app-border-input": "rgba(255,255,255,0.09)",
        "--app-accent": "#4aa3ff",
        "--app-accent-ink": "#04121f",
        "--app-text-primary": "#dce9f5",
        "--app-text-muted": "#a0b4c7",
        "--app-text-faint": "#8398ac",
        ...BLUE_GLASS,
      },
    },
  },
];

export const DEFAULT_THEME = "graphite";
export const DEFAULT_MODE: Mode = "system";

/** Families renamed since a preference may already be stored. */
const RENAMED: Record<string, string> = { silver: "marine" };

export function getTheme(id: string): Theme {
  const canonical = RENAMED[id] ?? id;
  return THEMES.find((t) => t.id === canonical) ?? THEMES[0];
}

export function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveMode(mode: Mode): Resolved {
  return mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
}

/** Write a variant's tokens onto the document root. */
export function applyTheme(theme: Theme, resolved: Resolved) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme[resolved].tokens)) {
    root.style.setProperty(key, value);
  }
  // Tells the webview to render native controls and scrollbars to match.
  root.style.colorScheme = resolved;
  root.dataset.theme = theme.id;
  root.dataset.mode = resolved;
}
