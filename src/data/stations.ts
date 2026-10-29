/**
 * Picks — the hand-chosen stations at the top of each genre.
 *
 * The directory (see `lib/radioBrowser.ts`) fills every genre out to dozens of
 * stations, but nobody vouches for those. These are the ones somebody does:
 * each comes from a broadcaster whose terms allow a player like this one, with
 * named human programmers and a record you can check — WFMU, Radio Paradise,
 * KEXP, WXPN, SRG SSR, WCPE, Stereoscenic, Bassdrive, Nightwave Plaza — and
 * each is marked by hand as instrumental, mixed or vocal, which is the only
 * reliable source of that fact anywhere in the app.
 *
 * Every URL below answered with audio on 2026-10-29, and every `terms` record
 * was read on the date it carries. None is monitored after that: the player
 * checks a station as it plays (see `useRadioPlayer`) and moves down the list
 * by itself when one fails, so a stale entry costs a few seconds rather than a
 * broken app.
 *
 * The rules a station must pass to be added here are in docs/EXECUTION.md,
 * §3.2 ("Rules for Picks"). Record the result in its register (Part 4).
 *
 * # Why this list is shorter than it was
 *
 * It used to carry 56 Picks, 30 of them SomaFM. SomaFM's terms refuse
 * third-party clients "even noncommercial ones", so all 30 had to go, along
 * with everything else Part 3.1 marked Exclude. Radio France, MPR and laut.fm
 * are parked pending permission (task L6/U3), and four lofi streams are parked
 * pending the no-AI review under R1–R8. What is left is small and clean, and
 * the genres with nothing in them are simply not offered until the community
 * directory is switched on. Filling them back up honestly is task L3.
 *
 * Anonymous auto-DJ streams are deliberately not Picks, however good they
 * sound — they are the hardest category to verify for provenance, and that is
 * exactly where AI-generated music collects.
 */

import type { Vocals } from "./genres";

/**
 * Why we believe we may play this station, and when somebody last checked.
 *
 * `check:stations` refuses a build where a Pick has no record, so this cannot
 * quietly rot: adding a station means reading its terms.
 *
 * - `allows-players` — they publish stream URLs for other players, or say so.
 * - `silent` — no published terms either way. The weakest footing we accept.
 * - `permission` — they told us yes directly; `source` is the saved email.
 */
export interface StationTerms {
  status: "allows-players" | "silent" | "permission";
  /** The terms page, stream-URL page, or saved permission. */
  source: string;
  /** ISO date a person read it. */
  checked: string;
  note?: string;
}

export interface Station {
  name: string;
  /** The line under the name: who runs it, or what it plays. */
  artist: string;
  /** A direct stream URL, or `resolve:<uuid>` for a Radio Browser lookup. */
  url: string;
  vocals: Vocals;
  /**
   * How far to trust `vocals`: marked by hand, read off the station's own
   * tags, or merely the genre's default. Only the first two are worth showing
   * as a label; all three feed the filter.
   */
  vocalsFrom: "hand" | "tags" | "genre";
  /** Hand-chosen. Shown first in its genre, with a badge. */
  pick?: boolean;
  /** Required on a Pick. Absent on anything the directory supplied. */
  terms?: StationTerms;
  /** The station's own page, for the "Visit station" link. */
  home?: string;
}

function pick(
  name: string,
  artist: string,
  url: string,
  vocals: Vocals,
  terms: StationTerms,
  home: string,
): Station {
  return { name, artist, url, vocals, vocalsFrom: "hand", pick: true, terms, home };
}

// ── Terms records, one per broadcaster ──────────────────────────────────────
// Shared by that broadcaster's stations so a re-reading updates them together.

const WFMU_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://wfmu.org/mobile.shtml",
  checked: "2026-10-29",
  note:
    "“Here is a list of direct urls for our streams which you can use in whatever " +
    "mobile streaming client you may be using.” Listener-supported, freeform, on air " +
    "since 1958 and independent since 1994.",
};

const RADIO_PARADISE_TERMS: StationTerms = {
  status: "silent",
  source: "https://hacks.mozilla.org/2013/10/building-a-firefoxos-app-for-my-favorite-internet-radio-station/",
  checked: "2026-09-27",
  note:
    "No published terms either way. Historically welcomes developers — Mozilla documented " +
    "building a third-party player for it with the station's cooperation. Listener-supported, " +
    "hand-mixed by Bill Goldsmith.",
};

const SRG_SSR_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://www.radioswissjazz.ch/en/reception/internet",
  checked: "2026-09-27",
  note:
    "Publishes its stream URLs so listeners can add the stations to internet radios. Swiss " +
    "public broadcaster. Re-check after July 2027: Digris takes over operation of these.",
};

const KEXP_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://www.kexp.org/streaming-urls/",
  checked: "2026-09-24",
  note:
    "Publishes stream URLs for use in third-party players, VLC among them. Non-profit, " +
    "listener-supported, DJ-programmed, on air since 1972.",
};

const WXPN_TERMS: StationTerms = {
  status: "silent",
  source: "https://xpn.org/privacy-policy/",
  checked: "2026-09-24",
  note: "No terms of use published. Public radio from the University of Pennsylvania.",
};

const WCPE_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://theclassicalstation.org/listen/",
  checked: "2026-10-29",
  note:
    "“Copy/paste one of the following stream links into your Windows Media player, VLC " +
    "or Winamp player.” Listener-supported non-commercial classical broadcaster, on air " +
    "since 1978.",
};

const STEREOSCENIC_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://www.ambientsleepingpill.com/",
  checked: "2026-10-29",
  note:
    "“These are the links for adding directly to Winamp and other players.” Run by " +
    "Andrew J Klimek since 2013; much of what it plays is his own and his label's, which is " +
    "about as direct an answer to R1 as a station can give.",
};

const NIGHTWAVE_PLAZA_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://github.com/nightwaveplaza/plaza",
  checked: "2026-09-27",
  note: "Public API and an open-source official client; third-party clients exist and are not discouraged.",
};

const ALPHA_BOYS_TERMS: StationTerms = {
  status: "silent",
  source: "https://alphaboysschoolradio.com/",
  checked: "2026-10-29",
  note:
    "No terms either way; the site was read and says nothing about third-party players. " +
    "Provenance instead is about as strong as it gets: the station supports the music " +
    "programme at the Alpha School of Music in Kingston, run by the Sisters of Mercy of " +
    "Jamaica since 1890, and every record it plays features an Alpha alumnus — the " +
    "Skatalites, Yellowman, Johnny “Dizzy” Moore among them.",
};

const BASSDRIVE_TERMS: StationTerms = {
  status: "silent",
  source: "https://www.bassdrive.com/",
  checked: "2026-10-29",
  note:
    "Publishes .m3u tune-in links and says nothing about third-party players either way. " +
    "Its footer states: “All music played on Bassdrive is directly licensed by the " +
    "composers and sound recording copyright owners.” On air since 1999, with named DJs.",
};

// ── The stations ────────────────────────────────────────────────────────────
// A station may sit in more than one genre; it is defined once and shared.

const WFMU_FREEFORM = pick(
  "WFMU",
  "Listener-supported freeform, New Jersey",
  "http://stream0.wfmu.org/freeform-128k.mp3",
  "vocal",
  WFMU_TERMS,
  "https://wfmu.org/",
);
const WFMU_ROCKNSOUL = pick(
  "WFMU Rock'n'Soul Radio",
  "WFMU · Vintage rock and soul 45s",
  "http://stream0.wfmu.org/rocknsoul",
  "vocal",
  WFMU_TERMS,
  "https://wfmu.org/",
);
const WFMU_DRUMMER = pick(
  "Give the Drummer Radio",
  "WFMU · Global and outsider sounds",
  "http://stream0.wfmu.org/drummer",
  "mixed",
  WFMU_TERMS,
  "https://wfmu.org/",
);
const WFMU_SHEENA = pick(
  "Sheena's Jungle Room",
  "WFMU · Garage, surf and rock'n'roll",
  "http://stream0.wfmu.org/sheena",
  "vocal",
  WFMU_TERMS,
  "https://wfmu.org/",
);

const RP_MAIN = pick(
  "Radio Paradise",
  "Radio Paradise · Eclectic, hand-mixed",
  "https://stream.radioparadise.com/mp3-128",
  "vocal",
  RADIO_PARADISE_TERMS,
  "https://radioparadise.com/",
);
const RP_MELLOW = pick(
  "Radio Paradise Mellow",
  "Radio Paradise · Hand-mixed, gentle",
  "https://stream.radioparadise.com/mellow-128",
  "vocal",
  RADIO_PARADISE_TERMS,
  "https://radioparadise.com/",
);
const RP_ROCK = pick(
  "Radio Paradise Rock",
  "Radio Paradise · Hand-mixed rock",
  "https://stream.radioparadise.com/rock-128",
  "vocal",
  RADIO_PARADISE_TERMS,
  "https://radioparadise.com/",
);

const RP_GLOBAL = pick(
  "Radio Paradise Global Mix",
  "Radio Paradise · Hand-mixed, from everywhere",
  "https://stream.radioparadise.com/global-128",
  "vocal",
  RADIO_PARADISE_TERMS,
  "https://radioparadise.com/",
);

const SWISS_JAZZ = pick(
  "Radio Swiss Jazz",
  "SRG SSR · Jazz, no talk",
  "https://stream.srg-ssr.ch/m/rsj/mp3_128",
  "mixed",
  SRG_SSR_TERMS,
  "https://www.radioswissjazz.ch/",
);
const SWISS_CLASSIC = pick(
  "Radio Swiss Classic",
  "SRG SSR · Classical, no talk",
  "https://stream.srg-ssr.ch/m/rsc_de/mp3_128",
  "instrumental",
  SRG_SSR_TERMS,
  "https://www.radioswissclassic.ch/",
);
const SWISS_POP = pick(
  "Radio Swiss Pop",
  "SRG SSR · Pop and indie, no talk",
  "https://stream.srg-ssr.ch/srgssr/rsp/mp3/128",
  "vocal",
  SRG_SSR_TERMS,
  "https://www.radioswisspop.ch/",
);

const KEXP = pick(
  "KEXP",
  "Friends of KEXP · Seattle, DJ-picked",
  "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
  "vocal",
  KEXP_TERMS,
  "https://www.kexp.org/",
);
const WXPN = pick(
  "WXPN",
  "University of Pennsylvania · Adult alternative",
  "https://wxpnhi.xpn.org/xpnhi",
  "vocal",
  WXPN_TERMS,
  "https://xpn.org/",
);
const WCPE = pick(
  "The Classical Station",
  "WCPE · Listener-supported classical",
  "http://playerservices.streamtheworld.com/api/livestream-redirect/WCPE_FM.mp3",
  "instrumental",
  WCPE_TERMS,
  "https://theclassicalstation.org/",
);

const ASP = pick(
  "Ambient Sleeping Pill",
  "Stereoscenic · Beatless ambient",
  "http://radio.stereoscenic.com/asp-s",
  "instrumental",
  STEREOSCENIC_TERMS,
  "https://www.ambientsleepingpill.com/",
);
const AM_AMBIENT = pick(
  "a.m. ambient",
  "Stereoscenic · Brighter daytime ambient",
  "http://radio.stereoscenic.com/ama-s",
  "instrumental",
  STEREOSCENIC_TERMS,
  "https://amambient.com/",
);
const AMBIENT_MODERN = pick(
  "Ambient Modern",
  "Stereoscenic · Contemporary ambient",
  "http://radio.stereoscenic.com/mod-s",
  "instrumental",
  STEREOSCENIC_TERMS,
  "https://ambientmodern.com/",
);

const NIGHTWAVE_PLAZA = pick(
  "Nightwave Plaza",
  "Vaporwave and mallsoft",
  "https://radio.plaza.one/ogg",
  "instrumental",
  NIGHTWAVE_PLAZA_TERMS,
  "https://plaza.one/",
);

const ALPHA_BOYS = pick(
  "Alpha Boys School Radio",
  "Alpha School of Music · Jamaican roots, ska and dub",
  "http://alphaboys-live.streamguys1.com/alphaboys.mp3",
  "vocal",
  ALPHA_BOYS_TERMS,
  "https://alphaboysschoolradio.com/",
);

const BASSDRIVE = pick(
  "Bassdrive",
  "Drum & bass, DJ-programmed",
  "http://ice.bassdrive.net/stream",
  "mixed",
  BASSDRIVE_TERMS,
  "https://www.bassdrive.com/",
);

/**
 * Picks by genre id. A genre with none is filled entirely from the directory,
 * and is not offered at all until that setting is on.
 *
 * Fourteen genres are empty after the Part 3.1 verdicts were applied. That is
 * task L3, and the gap is recorded rather than papered over: putting a station
 * in a genre it does not belong to would make the list longer and the app
 * worse.
 */
export const PICKS: Record<string, Station[]> = {
  lofi: [NIGHTWAVE_PLAZA],
  ambient: [ASP, AM_AMBIENT, AMBIENT_MODERN],
  space: [],
  classical: [SWISS_CLASSIC, WCPE],
  piano: [],
  scores: [],
  nature: [],
  jazz: [SWISS_JAZZ],
  bossa: [],
  chillout: [RP_MELLOW, AM_AMBIENT],
  folk: [WFMU_DRUMMER, RP_GLOBAL],
  reggae: [ALPHA_BOYS],
  house: [],
  techno: [],
  trance: [],
  dnb: [BASSDRIVE],
  synthwave: [NIGHTWAVE_PLAZA],
  idm: [],
  altrock: [KEXP, WXPN],
  indie: [RP_MAIN, KEXP, SWISS_POP, WFMU_FREEFORM],
  rock: [RP_ROCK, WFMU_SHEENA, WFMU_ROCKNSOUL],
  postrock: [],
  metal: [],
  blues: [],
  soul: [WFMU_ROCKNSOUL],
  hiphop: [],
};

const PICK_URLS = new Set(Object.values(PICKS).flatMap((list) => list.map((s) => s.url)));

/**
 * Whether a station is a Pick *now*. Asked of the URL, not of a stored `pick`
 * flag: favorites and the last station are saved whole, and a station that has
 * since been removed from this file would otherwise keep vouching for itself.
 */
export function isPick(station: { url: string }): boolean {
  return PICK_URLS.has(station.url);
}

/** Every Pick, deduplicated. Used by `check:stations` and the audit scripts. */
export function allPicks(): Station[] {
  const seen = new Map<string, Station>();
  for (const list of Object.values(PICKS)) {
    for (const s of list) if (!seen.has(s.url)) seen.set(s.url, s);
  }
  return [...seen.values()];
}

/** What is selected on a first launch, and the genre it is queued from. */
export const DEFAULT_GENRE = "ambient";
export const DEFAULT_STATION = ASP;
