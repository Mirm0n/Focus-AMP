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

/**
 * ────────────────────────────────────────────────────────────────────────────
 * FILL THIS IN WHEN THE REPOSITORY GOES PUBLIC (task U1).
 *
 * Set `source` to the repository URL and the About screen gains three things
 * at once: the source link the GPL expects people to be able to find, the
 * route for a broadcaster to ask to be taken out of the app, and the privacy
 * policy. The last two are worked out from the first, so there is one line to
 * edit rather than three to keep in step.
 *
 * Until it is set, the About screen shows no links at all — which is correct
 * for a private build and wrong for a published one, so do not ship a release
 * with it empty.
 * ────────────────────────────────────────────────────────────────────────────
 */
const SOURCE = "";

/** `owner/name` for a GitHub URL, so the derived links can be built. */
function gitHubSlug(url: string): string | null {
  const m = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(url);
  return m ? m[1] : null;
}

const slug = gitHubSlug(SOURCE);

export const PROJECT = {
  /** The public repository. Blank until the repo is published. */
  source: SOURCE,

  /** GitHub Sponsors, Ko-fi, or whatever you settle on. Blank until set up. */
  donate: "",

  /**
   * Where a broadcaster asks for a station to be removed. Points at the
   * "Station removal" issue template when the source is on GitHub; set it by
   * hand to an email or a form if you would rather not make them open an
   * account to ask.
   */
  removal: slug
    ? `https://github.com/${slug}/issues/new?template=station-removal.yml`
    : "",

  /** What the app sends, and to whom. Kept beside the code it describes. */
  privacy: slug ? `https://github.com/${slug}/blob/main/PRIVACY.md` : "",
};
