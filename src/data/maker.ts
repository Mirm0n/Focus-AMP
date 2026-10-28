/**
 * Who made Focus AMP, and where to find more of it.
 *
 * This is the only place these details live. Everything here is optional: a
 * blank field is simply not rendered, so the About screen never shows an empty
 * row or a placeholder to a listener.
 *
 * Decision C16: a "Made by" credit and a short "more from the maker" list,
 * plus source and donate links. Nothing in the player itself, and no tracking.
 */

export interface Link {
  label: string;
  /** Must be https. The About screen refuses to open anything else. */
  url: string;
  /** One short line. Optional. */
  note?: string;
}

export const MAKER = {
  /**
   * Taken from the git author on this repository (`marwan.hazem@puulse.ai`).
   * Change it to whatever name you want shown — this is the line people read.
   */
  name: "Marwan Hazem",

  /** Your own site. Leave blank and the name shows as plain text. */
  site: "",

  /** Other things you have made. Shown under "More from the maker". */
  projects: [] as Link[],
};

export const PROJECT = {
  /** The public repository. Blank until the repo is published. */
  source: "",

  /** GitHub Sponsors, Ko-fi, or whatever you settle on. Blank until set up. */
  donate: "",

  /** Where a broadcaster asks for a station to be removed. */
  removal: "",
};
