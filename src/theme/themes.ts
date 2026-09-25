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
  /** Corner radii, small and medium. The shape of the object, not its colour. */
  radius: [number, number];
}

// ── Colour maths ────────────────────────────────────────────────────────────

type Rgb = [number, number, number];

function parse(hex: string): Rgb {
  const s = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as Rgb;
}

function format(rgb: Rgb): string {
  return "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function mix(a: string, b: string, t: number): string {
  const x = parse(a);
  const y = parse(b);
  return format([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as Rgb);
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1..21. */
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * The colour nearest `from`, on the line toward `toward`, that reaches `ratio`
 * against every colour in `against`. Falls back to `toward` itself when the
 * line never gets there — the best available, rather than a failure.
 */
function reach(from: string, toward: string, ratio: number, against: string[]): string {
  const ok = (c: string) => against.every((bg) => contrast(c, bg) >= ratio);
  if (ok(from)) return from;
  if (!ok(toward)) return toward;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const t = (lo + hi) / 2;
    if (ok(mix(from, toward, t))) hi = t;
    else lo = t;
  }
  return mix(from, toward, hi);
}

// ── Variants from seeds ─────────────────────────────────────────────────────

/**
 * A variant is written down as the few colours that were actually sampled from
 * the object — its chassis, its ink, its accent, its display — and everything
 * structural is derived from those against fixed contrast targets.
 *
 * The first version of this file listed all thirteen app tokens by hand for
 * every variant, and an audit of it found the same faults in nearly all of
 * them: borders at two thirds of the contrast they needed, panels within a few
 * percent of each other in the dark variants, accents too pale to read as text
 * in the light ones. Those are not taste, they are arithmetic, so they are now
 * computed. A seed that would miss a target is moved the least distance that
 * meets it, which keeps the sampled colour whenever the sampled colour works.
 */
interface Glass {
  ground: string;
  lo: string;
  mid: string;
  hi: string;
  ink: string;
}

interface Seed {
  era: string;
  /** The main surface: the faceplate, the case, the screen background. */
  chassis: string;
  /** Primary text. */
  ink: string;
  accent: string;
  glass: Glass;
  /** For the rare variant that must break the rules (1-bit Classic). */
  override?: Record<string, string>;
}

/** Contrast targets. Text figures are against the least favourable panel. */
const TARGET = {
  primary: 14.4,
  muted: 7,
  faint: 4.6,
  accent: 5.5,
  borderSubtle: 1.45,
  borderMuted: 2,
  borderDefault: 3.1,
  panelStep: 1.13,
  headerStep: 1.3,
  vizGrid: 1.4,
  vizLo: 4.6,
};

function variant(seed: Seed, dark: boolean): ThemeVariant {
  const { chassis, ink, glass } = seed;

  // Panels. In the dark the chassis recedes toward black and the raised
  // surfaces lift off it; in the light the chassis is the raised surface and
  // the rest recede toward the ink.
  let base: string;
  let surface: string;
  let header: string;
  let overlay: string;
  if (dark) {
    base = mix(chassis, "#000000", 0.3);
    header = mix(chassis, "#000000", 0.58);
    surface = reach(chassis, ink, TARGET.panelStep, [base]);
    overlay = reach(surface, ink, TARGET.panelStep, [surface]);
  } else {
    surface = chassis;
    base = reach(chassis, ink, TARGET.panelStep, [surface]);
    header = reach(chassis, ink, TARGET.headerStep, [surface]);
    const lifted = reach(surface, "#ffffff", 1.1, [surface]);
    // A near-white chassis has nowhere lighter to go, so its overlay recedes instead.
    overlay = contrast(lifted, surface) >= 1.1 ? lifted : reach(surface, ink, 1.1, [surface]);
  }
  const panels = [base, surface, header, overlay];

  const primary = reach(ink, dark ? "#ffffff" : "#000000", TARGET.primary, panels);
  // Start well back from the ink so the three text levels stay three levels.
  const muted = reach(mix(primary, surface, 0.42), primary, TARGET.muted, panels);
  const faint = reach(mix(primary, surface, 0.62), primary, TARGET.faint, panels);

  const accent = reach(seed.accent, primary, TARGET.accent, panels);
  const accentDark = mix(accent, "#000000", 0.88);
  const accentLight = mix(accent, "#ffffff", 0.94);
  const accentInk =
    contrast(accentDark, accent) >= contrast(accentLight, accent) ? accentDark : accentLight;

  // Errors are app text, so they can't borrow the display's top colour: that
  // one is tuned for dark glass and washes out on a light chassis.
  const danger = reach(dark ? "#ff6b5e" : "#c4271b", primary, TARGET.accent, panels);

  const [r, g, b] = parse(primary);
  // A rule has to show against both panels it can separate.
  const edges = [surface, base];

  const vizLo = reach(glass.lo, glass.ink, TARGET.vizLo, [glass.ground]);
  // Unlit segments are the ground lifted toward the display's ink — visible as
  // cells, but with no colour of their own to compete with the lit ones.
  const vizGrid = reach(glass.ground, glass.ink, TARGET.vizGrid, [glass.ground]);

  const tokens: Record<string, string> = {
    "--app-bg-base": base,
    "--app-bg-surface": surface,
    "--app-bg-header": header,
    "--app-bg-overlay": overlay,
    "--app-border-subtle": reach(surface, primary, TARGET.borderSubtle, edges),
    "--app-border-muted": reach(surface, primary, TARGET.borderMuted, edges),
    "--app-border-default": reach(surface, primary, TARGET.borderDefault, edges),
    "--app-border-input": `rgba(${r},${g},${b},${dark ? 0.2 : 0.3})`,
    "--app-accent": accent,
    "--app-accent-ink": accentInk,
    "--app-text-primary": primary,
    "--app-text-muted": muted,
    "--app-text-faint": faint,
    "--app-danger": danger,
    "--viz-ground": glass.ground,
    "--viz-grid": vizGrid,
    "--viz-lo": vizLo,
    "--viz-mid": glass.mid,
    "--viz-hi": glass.hi,
    "--viz-ink": glass.ink,
    ...seed.override,
  };

  return {
    era: seed.era,
    swatch: [tokens["--app-bg-surface"], tokens["--app-accent"]],
    tokens,
  };
}

function family(
  id: string,
  name: string,
  radius: [number, number],
  dark: Seed,
  light: Seed,
): Theme {
  return { id, name, radius, dark: variant(dark, true), light: variant(light, false) };
}

// ── The displays ────────────────────────────────────────────────────────────
// Shared within a family — the glass does not change when the chassis flips.

const glass = (ground: string, lo: string, mid: string, hi: string, ink: string): Glass => ({
  ground,
  lo,
  mid,
  hi,
  ink,
});

const AMBER_GLASS = glass("#0a0908", "#57c98a", "#e8a33d", "#e0553c", "#f1ece3");
const TEAL_GLASS = glass("#0b1211", "#4fd6b0", "#e0b04a", "#e0593c", "#dfe6e2");
const DIAL_GLASS = glass("#0f0a06", "#f2c14e", "#ff8a3d", "#e5482f", "#f6ead6");
const BRAUN_GLASS = glass("#0d0d0c", "#6fcf7a", "#f2b632", "#f0601f", "#f0efe9");
const GREEN_GLASS = glass("#030605", "#2bb866", "#5cf095", "#c9ffdd", "#d8ffe8");
const AMBER_CRT_GLASS = glass("#050301", "#c98322", "#ffb74d", "#ffe3ae", "#ffdaa2");
const RED_GLASS = glass("#080001", "#d42a20", "#ff5a4f", "#ffc2bd", "#ffd6d2");
const LCD_GLASS = glass("#0c1a0c", "#8bac0f", "#b5d334", "#e6f8a8", "#e0f8d0");
const NEON_GLASS = glass("#0d0620", "#35e0ff", "#ff4fa3", "#ffd84d", "#f6eaff");
const GRAPE_GLASS = glass("#120c1f", "#a78bfa", "#e879f9", "#fde68a", "#ece4fb");
const BLUE_GLASS = glass("#0c1a26", "#3ad0ff", "#2a8fef", "#b6dcff", "#dceaf7");


// ── The families ────────────────────────────────────────────────────────────
// Hi-fi first, then the monochrome tubes, then the colourful ones, then 1-bit.

export const THEMES: Theme[] = [
  family(
    "graphite",
    "Graphite",
    [6, 10],
    {
      era: "Black-face separate, early 80s",
      chassis: "#1b1917",
      ink: "#f1ece3",
      accent: "#e8a33d",
      glass: AMBER_GLASS,
    },
    {
      era: "Silver-face separate, 1979",
      chassis: "#e7e4dc",
      ink: "#201e1a",
      accent: "#9a6208",
      glass: AMBER_GLASS,
    },
  ),
  family(
    "marine",
    "Marine",
    [6, 10],
    {
      era: "Black-face receiver, teal dial lamp",
      chassis: "#16201e",
      ink: "#e4efed",
      accent: "#4fd6c9",
      glass: TEAL_GLASS,
    },
    {
      era: "Brushed aluminium receiver, 1977",
      chassis: "#e9e7e1",
      ink: "#22201c",
      accent: "#1c6b6b",
      glass: TEAL_GLASS,
    },
  ),
  family(
    "walnut",
    "Walnut",
    [5, 8],
    {
      era: "Wood-cabinet receiver, 1974",
      chassis: "#2b1d13",
      ink: "#f3e6d3",
      accent: "#ff8a3d",
      glass: DIAL_GLASS,
    },
    {
      era: "Cream faceplate, walnut ends",
      chassis: "#efe3cf",
      ink: "#2b1a0e",
      accent: "#a3470f",
      glass: DIAL_GLASS,
    },
  ),
  family(
    "braun",
    "Braun",
    [3, 5],
    {
      era: "Braun black series, 1970s",
      chassis: "#1c1c1b",
      ink: "#f0efe9",
      accent: "#ff6a2b",
      glass: BRAUN_GLASS,
    },
    {
      era: "Braun T3 pocket radio, 1958",
      chassis: "#ecebe6",
      ink: "#1b1b1a",
      accent: "#d9480f",
      glass: BRAUN_GLASS,
    },
  ),
  family(
    "phosphor",
    "Phosphor",
    [2, 4],
    {
      era: "P31 green monitor, 1983",
      chassis: "#0b150e",
      ink: "#aaffc8",
      accent: "#4ef08a",
      glass: GREEN_GLASS,
    },
    {
      era: "Reverse video, same tube",
      chassis: "#f1f7f2",
      ink: "#0a1c10",
      accent: "#0f6b33",
      glass: GREEN_GLASS,
    },
  ),
  family(
    "amber",
    "Amber",
    [2, 4],
    {
      era: "Amber monochrome monitor, 1985",
      chassis: "#150f06",
      ink: "#ffdaa2",
      accent: "#ffb74d",
      glass: AMBER_CRT_GLASS,
    },
    {
      era: "Reverse video, same tube",
      chassis: "#f8f2e7",
      ink: "#231803",
      accent: "#8a5200",
      glass: AMBER_CRT_GLASS,
    },
  ),
  family(
    "virtual",
    "Virtual",
    [2, 4],
    {
      era: "Virtual Boy, 1995",
      chassis: "#170506",
      ink: "#ffc9c4",
      accent: "#ff3b30",
      glass: RED_GLASS,
    },
    {
      era: "Reverse video, same LEDs",
      chassis: "#fbefee",
      ink: "#2a0606",
      accent: "#b3140c",
      glass: RED_GLASS,
    },
  ),
  family(
    "dmg",
    "DMG",
    [4, 6],
    {
      era: "Game Boy Light, backlit, 1998",
      chassis: "#17230f",
      ink: "#d7e8b0",
      accent: "#9bbc0f",
      glass: LCD_GLASS,
    },
    {
      era: "Game Boy, 1989",
      chassis: "#c4cfa1",
      ink: "#1a2410",
      accent: "#2f5a2f",
      glass: LCD_GLASS,
    },
  ),
  family(
    "outrun",
    "Outrun",
    [6, 10],
    {
      era: "Arcade cabinet, 1986",
      chassis: "#1b1033",
      ink: "#f4e9ff",
      accent: "#ff4fa3",
      glass: NEON_GLASS,
    },
    {
      era: "Miami pastel, same summer",
      chassis: "#fbeef3",
      ink: "#2a1230",
      accent: "#c2185b",
      glass: NEON_GLASS,
    },
  ),
  family(
    "grape",
    "Grape",
    [9, 14],
    {
      era: "Translucent shell, lights off",
      chassis: "#1d162b",
      ink: "#ece4fb",
      accent: "#b79bff",
      glass: GRAPE_GLASS,
    },
    {
      era: "iMac G3 Grape, 1999",
      chassis: "#f1ecf8",
      ink: "#231a33",
      accent: "#6b3fb5",
      glass: GRAPE_GLASS,
    },
  ),
  family(
    "aqua",
    "Aqua",
    [8, 12],
    {
      era: "The Graphite appearance, same year",
      chassis: "#151f2a",
      ink: "#dce9f5",
      accent: "#4aa3ff",
      glass: BLUE_GLASS,
    },
    {
      era: "Mac OS X 10.0, 2001",
      chassis: "#f3f7fb",
      ink: "#16232e",
      accent: "#1a72d8",
      glass: BLUE_GLASS,
    },
  ),
  family(
    "classic",
    "Classic",
    [0, 0],
    {
      era: "The same screen, inverted",
      chassis: "#0d0d0d",
      ink: "#ffffff",
      accent: "#ffffff",
      glass: NEON_GLASS,
      // Genuinely 1-bit: a black field, and rules drawn in the ink itself.
      override: {
        "--app-bg-base": "#000000",
        "--app-bg-header": "#000000",
        "--app-border-default": "#ffffff",
      },
    },
    {
      era: "Macintosh System 1, 1984",
      chassis: "#ffffff",
      ink: "#000000",
      accent: "#000000",
      glass: NEON_GLASS,
      override: { "--app-border-default": "#000000" },
    },
  ),
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
  root.style.setProperty("--app-radius-sm", `${theme.radius[0]}px`);
  root.style.setProperty("--app-radius-md", `${theme.radius[1]}px`);
  // Tells the webview to render native controls and scrollbars to match.
  root.style.colorScheme = resolved;
  root.dataset.theme = theme.id;
  root.dataset.mode = resolved;
}
