/**
 * Themes.
 *
 * Each one is a particular object from a particular year rather than a hue
 * rotation — a black-face receiver, a brushed aluminium one, two phosphor
 * monitors, and the first version of Aqua. The palettes are sampled from what
 * those things actually looked like, which is why none of them are a neutral
 * grey with an accent dropped in.
 *
 * Note that the display stays dark glass under the light themes. On a real
 * silver faceplate the meter window is a smoked panel, and keeping that is both
 * period-correct and the reason the visualizer stays legible.
 */

export interface Theme {
  id: string;
  name: string;
  /** The object, and roughly when. */
  era: string;
  dark: boolean;
  /** Two colours for the picker swatch: chrome, then display. */
  swatch: [string, string];
  tokens: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: "graphite",
    name: "Graphite",
    era: "Black-face separate, early 80s",
    dark: true,
    swatch: ["#191715", "#e8a33d"],
    tokens: {
      "--app-bg-base": "#121110",
      "--app-bg-surface": "#191715",
      "--app-bg-header": "#0c0b0a",
      "--app-bg-overlay": "#0a0908",
      "--app-border-subtle": "#272320",
      "--app-border-muted": "#37322c",
      "--app-border-default": "#4d463d",
      "--app-border-input": "rgba(255,255,255,0.07)",
      "--app-accent": "#e8a33d",
      "--app-accent-ink": "#191104",
      "--app-text-primary": "#f1ece3",
      "--app-text-muted": "#a49c8f",
      "--app-text-faint": "#6f685e",
      "--viz-ground": "#0a0908",
      "--viz-grid": "#241f1a",
      "--viz-lo": "#57c98a",
      "--viz-mid": "#e8a33d",
      "--viz-hi": "#e0553c",
      "--viz-ink": "#f1ece3",
    },
  },
  {
    id: "silver",
    name: "Silver",
    era: "Brushed aluminium receiver, 1977",
    dark: false,
    swatch: ["#d9d6ce", "#1c6b6b"],
    tokens: {
      "--app-bg-base": "#d9d6ce",
      "--app-bg-surface": "#e9e7e1",
      "--app-bg-header": "#c7c3b9",
      "--app-bg-overlay": "#f3f2ed",
      "--app-border-subtle": "#bcb8ad",
      "--app-border-muted": "#a9a497",
      "--app-border-default": "#8b8679",
      "--app-border-input": "rgba(0,0,0,0.14)",
      "--app-accent": "#1c6b6b",
      "--app-accent-ink": "#f3f9f8",
      "--app-text-primary": "#22201c",
      "--app-text-muted": "#56524a",
      "--app-text-faint": "#827c71",
      "--viz-ground": "#1a211f",
      "--viz-grid": "#32403c",
      "--viz-lo": "#4fbf8f",
      "--viz-mid": "#d8a63c",
      "--viz-hi": "#c2492f",
      "--viz-ink": "#dfe6e2",
    },
  },
  {
    id: "phosphor",
    name: "Phosphor",
    era: "P31 green monitor, 1983",
    dark: true,
    swatch: ["#0a110c", "#4ef08a"],
    tokens: {
      "--app-bg-base": "#060a07",
      "--app-bg-surface": "#0a110c",
      "--app-bg-header": "#040706",
      "--app-bg-overlay": "#030605",
      "--app-border-subtle": "#15271b",
      "--app-border-muted": "#1e3826",
      "--app-border-default": "#2f553b",
      "--app-border-input": "rgba(78,240,138,0.12)",
      "--app-accent": "#4ef08a",
      "--app-accent-ink": "#02160a",
      "--app-text-primary": "#aaffc8",
      "--app-text-muted": "#61bd84",
      "--app-text-faint": "#3c7c54",
      "--viz-ground": "#030605",
      "--viz-grid": "#123020",
      // Monochrome ladder: one phosphor, three brightnesses.
      "--viz-lo": "#1f9c55",
      "--viz-mid": "#3fd97b",
      "--viz-hi": "#a6ffc9",
      "--viz-ink": "#d8ffe8",
    },
  },
  {
    id: "amber",
    name: "Amber",
    era: "Amber monochrome monitor, 1985",
    dark: true,
    swatch: ["#120d05", "#ffb74d"],
    tokens: {
      "--app-bg-base": "#0b0703",
      "--app-bg-surface": "#130e06",
      "--app-bg-header": "#070502",
      "--app-bg-overlay": "#050301",
      "--app-border-subtle": "#2b1e0a",
      "--app-border-muted": "#3d2c0e",
      "--app-border-default": "#5f4416",
      "--app-border-input": "rgba(255,183,77,0.12)",
      "--app-accent": "#ffb74d",
      "--app-accent-ink": "#1d1102",
      "--app-text-primary": "#ffdaa2",
      "--app-text-muted": "#ca9b56",
      "--app-text-faint": "#8b6b3b",
      "--viz-ground": "#050301",
      "--viz-grid": "#2c1f0b",
      "--viz-lo": "#b4711a",
      "--viz-mid": "#ffb74d",
      "--viz-hi": "#ffe3ae",
      "--viz-ink": "#ffdaa2",
    },
  },
  {
    id: "aqua",
    name: "Aqua",
    era: "Mac OS X 10.0, 2001",
    dark: false,
    swatch: ["#e1e8f0", "#1a72d8"],
    tokens: {
      "--app-bg-base": "#e1e8f0",
      "--app-bg-surface": "#f3f7fb",
      "--app-bg-header": "#cbd8e7",
      "--app-bg-overlay": "#ffffff",
      "--app-border-subtle": "#b9c8da",
      "--app-border-muted": "#a2b4c8",
      "--app-border-default": "#8095ad",
      "--app-border-input": "rgba(0,0,0,0.12)",
      "--app-accent": "#1a72d8",
      "--app-accent-ink": "#ffffff",
      "--app-text-primary": "#16232e",
      "--app-text-muted": "#4a5c6d",
      "--app-text-faint": "#7a8a9a",
      "--viz-ground": "#0c1a26",
      "--viz-grid": "#1e3446",
      "--viz-lo": "#3ad0ff",
      "--viz-mid": "#2a8fef",
      "--viz-hi": "#b6dcff",
      "--viz-ink": "#dceaf7",
    },
  },
];

export const DEFAULT_THEME = "graphite";

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Write a theme's tokens onto the document root. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(key, value);
  }
  root.style.colorScheme = theme.dark ? "dark" : "light";
  root.dataset.theme = theme.id;
}
