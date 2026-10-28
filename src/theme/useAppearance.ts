import { useCallback, useEffect, useMemo, useState } from "react";

import {
  applyTheme,
  DEFAULT_MODE,
  DEFAULT_THEME,
  getTheme,
  resolveMode,
  type Mode,
  type Resolved,
  type Theme,
  type ThemeVariant,
} from "./themes";
import { DEFAULT_OPTIONS, type VizOptions, type VizTheme } from "../viz/types";
import { DEFAULT_VIZ, getVisualizer } from "../viz/registry";
import type { Visualizer } from "../viz/types";
import { DEFAULT_LAYOUT, getLayout, type Layout, type LayoutId } from "../layout/layouts";

/** Everything the user can change about how the app looks, in one place. */

const STORAGE_KEY = "focusamp:appearance";

interface Stored {
  theme: string;
  mode: Mode;
  viz: string;
  options: VizOptions;
  layout: string;
  albumArt: boolean;
}

function load(): Stored {
  const fallback: Stored = {
    theme: DEFAULT_THEME,
    mode: DEFAULT_MODE,
    viz: DEFAULT_VIZ,
    options: DEFAULT_OPTIONS,
    layout: DEFAULT_LAYOUT,
    // Off until asked for: turning it on sends every track title to Apple.
    albumArt: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      theme: parsed.theme ?? fallback.theme,
      mode: parsed.mode ?? fallback.mode,
      viz: parsed.viz ?? fallback.viz,
      // Merged over defaults so an option added later can't strand an older
      // saved object with a missing key.
      options: { ...DEFAULT_OPTIONS, ...(parsed.options ?? {}) },
      layout: parsed.layout ?? fallback.layout,
      albumArt: typeof parsed.albumArt === "boolean" ? parsed.albumArt : fallback.albumArt,
    };
  } catch {
    return fallback;
  }
}


/**
 * Read a CSS system colour keyword as a concrete value.
 *
 * The visualizer paints through `ctx.fillStyle`, which `forced-colors` cannot
 * reach — the whole display would keep its own palette while the rest of the
 * app switched to the user's. Resolving the keywords here and feeding them in
 * as ordinary colours is the only way to make the canvas follow.
 */
function systemColor(keyword: string, fallback: string): string {
  try {
    const probe = document.createElement("span");
    probe.style.cssText = `color:${keyword};position:absolute;visibility:hidden`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value || fallback;
  } catch {
    return fallback;
  }
}

export interface Appearance {
  theme: Theme;
  setTheme: (id: string) => void;
  /** What the user chose, which may be "system". */
  mode: Mode;
  setMode: (mode: Mode) => void;
  /** What "system" actually resolved to right now. */
  resolved: Resolved;
  /** The active half of the theme, for swatches and labels. */
  variant: ThemeVariant;
  visualizer: Visualizer;
  setVisualizer: (id: string) => void;
  options: VizOptions;
  setOption: <K extends keyof VizOptions>(key: K, value: VizOptions[K]) => void;
  layout: Layout;
  setLayout: (id: LayoutId) => void;
  /** Look up covers for the playing track. Sends track titles to Apple. */
  albumArt: boolean;
  setAlbumArt: (on: boolean) => void;
  /** Display colours pulled from the live variant, for the canvas. */
  vizTheme: VizTheme;
}

export function useAppearance(): Appearance {
  const [stored, setStored] = useState<Stored>(load);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [forced, setForced] = useState(() => window.matchMedia("(forced-colors: active)").matches);

  // Track the OS preference continuously, not just at startup — someone on a
  // sunset schedule should see the app follow without restarting it.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);

    const fc = window.matchMedia("(forced-colors: active)");
    const onForced = (e: MediaQueryListEvent) => setForced(e.matches);
    fc.addEventListener("change", onForced);

    return () => {
      mq.removeEventListener("change", onChange);
      fc.removeEventListener("change", onForced);
    };
  }, []);

  const theme = useMemo(() => getTheme(stored.theme), [stored.theme]);
  const visualizer = useMemo(() => getVisualizer(stored.viz), [stored.viz]);

  const layout = useMemo(() => getLayout(stored.layout), [stored.layout]);

  const resolved: Resolved =
    stored.mode === "system" ? (systemDark ? "dark" : "light") : stored.mode;
  const variant = theme[resolved];

  useEffect(() => {
    applyTheme(theme, resolved);
  }, [theme, resolved]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* private mode, or storage disabled */
    }
  }, [stored]);

  const setTheme = useCallback((id: string) => setStored((s) => ({ ...s, theme: id })), []);
  const setMode = useCallback((mode: Mode) => setStored((s) => ({ ...s, mode })), []);
  const setVisualizer = useCallback((id: string) => setStored((s) => ({ ...s, viz: id })), []);
  const setLayout = useCallback((id: LayoutId) => setStored((s) => ({ ...s, layout: id })), []);
  const setAlbumArt = useCallback((on: boolean) => setStored((s) => ({ ...s, albumArt: on })), []);
  const setOption = useCallback(
    <K extends keyof VizOptions>(key: K, value: VizOptions[K]) =>
      setStored((s) => ({ ...s, options: { ...s.options, [key]: value } })),
    [],
  );

  // Read straight off the variant rather than getComputedStyle: the CSS
  // variables are applied in an effect, so on the first paint after a switch
  // the computed values would still be the previous theme's.
  const vizTheme = useMemo<VizTheme>(() => {
    if (forced) {
      // Monochrome by necessity: the user's palette has two text colours and a
      // highlight, so the ladder collapses to lit / very lit rather than a
      // green-amber-red ramp.
      const text = systemColor("CanvasText", "#000");
      return {
        ground: systemColor("Canvas", "#fff"),
        grid: systemColor("GrayText", "#888"),
        lo: text,
        mid: text,
        hi: systemColor("Highlight", "#00f"),
        ink: text,
        accent: systemColor("Highlight", "#00f"),
      };
    }
    return {
      ground: variant.tokens["--viz-ground"],
      grid: variant.tokens["--viz-grid"],
      lo: variant.tokens["--viz-lo"],
      mid: variant.tokens["--viz-mid"],
      hi: variant.tokens["--viz-hi"],
      ink: variant.tokens["--viz-ink"],
      accent: variant.tokens["--app-accent"],
    };
  }, [variant, forced]);

  return {
    theme,
    setTheme,
    mode: stored.mode,
    setMode,
    resolved,
    variant,
    visualizer,
    setVisualizer,
    options: stored.options,
    setOption,
    layout,
    setLayout,
    albumArt: stored.albumArt,
    setAlbumArt,
    vizTheme,
  };
}

export { resolveMode };
