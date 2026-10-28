/**
 * Hosts that never play, whatever route they arrive by.
 *
 * Removing a station from `PICKS` is not enough. The same stream can come back
 * through the Radio Browser directory, or sit in somebody's favourites, or be
 * the station they were last listening to. A broadcaster who has said no — or
 * whose terms say no on their behalf — should not be reachable by any of those
 * paths, so this list is applied to all of them.
 *
 * Two kinds of entry, and the difference matters if anyone asks:
 *
 * - **refuses-players** — their published terms forbid third-party apps. This
 *   is not a judgement about the station, and several of these are excellent.
 * - **asked-to-be-removed** — they contacted us. No reason is required and
 *   none is recorded beyond the date, per the promise on the About screen.
 *
 * Matching is on the registrable host and its subdomains, so `somafm.com`
 * also covers `ice1.somafm.com`. See docs/EXECUTION.md Part 3.1 and Part 4.
 */

export interface DenyEntry {
  host: string;
  reason: "refuses-players" | "asked-to-be-removed";
  /** ISO date the decision was taken. */
  since: string;
  /** Where it is written down. Empty for a private request. */
  source: string;
  note?: string;
}

export const DENYLIST: DenyEntry[] = [
  {
    host: "somafm.com",
    reason: "refuses-players",
    since: "2026-09-27",
    source: "https://somafm.com/contact/tos.html",
    note:
      "“We can’t grant permission for third-party SomaFM clients or applications, " +
      "even noncommercial ones.” They grandfather general-purpose tuners that predate " +
      "the policy and state they are not adding new ones. Their music licences do not let " +
      "them authorise it, so this is not something they can waive on request.",
  },
  {
    host: "zeno.fm",
    reason: "refuses-players",
    since: "2026-09-26",
    source: "https://zeno.fm/terms/",
    note: "Their licences cover zeno.fm itself, not players that carry its streams.",
  },
];

/** Hosts only, for the places that just need a quick membership test. */
const HOSTS = DENYLIST.map((e) => e.host);

/**
 * Whether a stream URL belongs to a denied broadcaster.
 *
 * Subdomains count, and nothing else does: `notsomafm.com` is a different
 * party, and `example.com/somafm.com` is a path, not a host.
 */
export function isDenied(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    // Not a URL we can read — `local:` entries and `resolve:` placeholders
    // land here, and neither is a remote broadcaster.
    return false;
  }
  return HOSTS.some((denied) => host === denied || host.endsWith(`.${denied}`));
}

/** The entry behind a refusal, for anywhere that explains itself to a person. */
export function denialFor(url: string): DenyEntry | undefined {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
    return DENYLIST.find((e) => host === e.host || host.endsWith(`.${e.host}`));
  } catch {
    return undefined;
  }
}
