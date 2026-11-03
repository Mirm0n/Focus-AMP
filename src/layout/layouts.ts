/**
 * Window layouts.
 *
 * A layout only rearranges the stage — the display and the timer. The station
 * list, the title bar and the transport stay where they are in every one, so
 * switching never moves the controls someone is reaching for.
 *
 * Adding one is an entry here, a case in `Stage.tsx`, and a glyph in
 * `LayoutTab.tsx`.
 */

export type LayoutId = "console" | "focus" | "split" | "backdrop" | "dashboard" | "hud";

export interface Layout {
  id: LayoutId;
  name: string;
  blurb: string;
}

export const LAYOUTS: Layout[] = [
  {
    id: "console",
    name: "Console",
    blurb: "The display fills the stage, the timer sits in a strip below",
  },
  {
    id: "focus",
    name: "Focus",
    blurb: "The timer fills the stage, the display shrinks to a meter strip",
  },
  {
    id: "split",
    name: "Split",
    blurb: "Display and timer side by side, equal weight",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    blurb: "Floating side-by-side panels with soft shadows",
  },
  {
    id: "backdrop",
    name: "Backdrop",
    blurb: "The display runs full bleed with the timer floating over it",
  },
  {
    id: "hud",
    name: "HUD",
    blurb: "Full screen display with a sleek frosted glass timer pill",
  },
];

/**
 * Focus, not Console: the timer is the reason the app is open, so it gets the
 * stage and the visualizer takes the strip. Console shows the opposite, which
 * is the better *demo* and the worse default.
 *
 * Only new installs see this. A saved choice is read back in
 * `useAppearance`, so changing it never moves anyone's layout out from under
 * them.
 */
export const DEFAULT_LAYOUT: LayoutId = "focus";

export function getLayout(id: string): Layout {
  // Falls back to the default rather than LAYOUTS[0], so an unknown id and a
  // fresh install land in the same place instead of drifting apart whenever
  // the array is reordered.
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS.find((l) => l.id === DEFAULT_LAYOUT)!;
}
