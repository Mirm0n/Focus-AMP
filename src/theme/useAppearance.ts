import { useCallback, useEffect, useMemo, useState } from "react";

import { applyTheme, DEFAULT_THEME, getTheme, type Theme } from "./themes";
import { DEFAULT_OPTIONS, type VizOptions, type VizTheme } from "../viz/types";
import { DEFAULT_VIZ, getVisualizer } from "../viz/registry";
import type { Visualizer } from "../viz/types";

/** Everything the user can change about how the app looks, in one place. */

const STORAGE_KEY = "tunescape:appearance";

interface Stored {
  theme: string;
  viz: string;
  options: VizOptions;
}

function load(): Stored {
  const fallback: Stored = { theme: DEFAULT_THEME, viz: DEFAULT_VIZ, options: DEFAULT_OPTIONS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      theme: parsed.theme ?? fallback.theme,
      viz: parsed.viz ?? fallback.viz,
      // Merged over defaults so an option added later can't strand an older
      // saved object with a missing key.
      options: { ...DEFAULT_OPTIONS, ...(parsed.options ?? {}) },
    };
  } catch {
    return fallback;
  }
}

export interface Appearance {
  theme: Theme;
  setTheme: (id: string) => void;
  visualizer: Visualizer;
  setVisualizer: (id: string) => void;
  options: VizOptions;
  setOption: <K extends keyof VizOptions>(key: K, value: VizOptions[K]) => void;
  /** Display colours pulled from the live theme, for the canvas. */
  vizTheme: VizTheme;
}

export function useAppearance(): Appearance {
  const [stored, setStored] = useState<Stored>(load);

  const theme = useMemo(() => getTheme(stored.theme), [stored.theme]);
  const visualizer = useMemo(() => getVisualizer(stored.viz), [stored.viz]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* private mode, or storage disabled */
    }
  }, [stored]);

  const setTheme = useCallback((id: string) => setStored((s) => ({ ...s, theme: id })), []);
  const setVisualizer = useCallback((id: string) => setStored((s) => ({ ...s, viz: id })), []);
  const setOption = useCallback(
    <K extends keyof VizOptions>(key: K, value: VizOptions[K]) =>
      setStored((s) => ({ ...s, options: { ...s.options, [key]: value } })),
    [],
  );

  // Read straight off the theme object rather than getComputedStyle: the CSS
  // variables are applied in an effect, so on the first paint after a switch
  // the computed values would still be the previous theme's.
  const vizTheme = useMemo<VizTheme>(
    () => ({
      ground: theme.tokens["--viz-ground"],
      grid: theme.tokens["--viz-grid"],
      lo: theme.tokens["--viz-lo"],
      mid: theme.tokens["--viz-mid"],
      hi: theme.tokens["--viz-hi"],
      ink: theme.tokens["--viz-ink"],
      accent: theme.tokens["--app-accent"],
    }),
    [theme],
  );

  return {
    theme,
    setTheme,
    visualizer,
    setVisualizer,
    options: stored.options,
    setOption,
    vizTheme,
  };
}
