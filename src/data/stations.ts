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
 * # Why this list is the size it is
 *
 * On 2026-11-01 it went from 39 Picks to 108 and every genre was filled. The
 * rules were relaxed to do it: broadcasters whose terms ask to be asked are
 * played while the ask is outstanding, and a Pick no longer needs its terms
 * page read first. docs/EXECUTION.md §3.2 carries the decision and its cost.
 * The history below is what came before that.
 *
 * It used to carry 56 Picks, 30 of them SomaFM. SomaFM's terms refuse
 * third-party clients "even noncommercial ones", so all 30 had to go, along
 * with everything else Part 3.1 marked Exclude. Radio France, MPR and laut.fm
 * are parked pending permission (task L6/U3), and five lofi streams are parked
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
 * - `silent` — no published terms either way.
 * - `permission` — their terms require written permission. Until 2026-11-01
 *   that meant the station was parked until a reply came; now it means the
 *   ask is outstanding and we are playing them meanwhile, which is the
 *   maintainer's decision and is recorded as such in `docs/EXECUTION.md`.
 * - `unreviewed` — the stream was verified, the terms page was not read.
 *
 * `unreviewed` exists so that relaxing the standard did not quietly turn into
 * mislabelling. Before 2026-11-01 every Pick carried a page somebody had read;
 * most of what was added that day does not, and calling those `silent` would
 * have claimed a check nobody performed. The weaker footing is in the data
 * rather than hidden by it, so the honest ones can be told apart later and
 * `scripts/check-streams.mjs` can keep nagging about the rest.
 */
export interface StationTerms {
  status: "allows-players" | "silent" | "permission" | "unreviewed";
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
  return {
    name,
    artist,
    url,
    vocals,
    vocalsFrom: "hand",
    pick: true,
    terms,
    home,
  };
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
  source:
    "https://hacks.mozilla.org/2013/10/building-a-firefoxos-app-for-my-favorite-internet-radio-station/",
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

const WBGO_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://www.wbgo.org/how-to-listen-online",
  checked: "2026-10-29",
  note:
    "Publishes its direct MP3 and AAC stream URLs, and separately points listeners at the " +
    "third-party apps it can be found in. Newark Public Radio — non-commercial, NPR/PRX/CPB " +
    "affiliated, playing jazz since 1979. The page also names two retired streamguys addresses " +
    "that must not be used; the one here is the current MP3 stream.",
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

const KFJC_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://kfjc.org/listen/",
  checked: "2026-10-29",
  note:
    "“If you’d rather use your own digital media player, we offer the direct " +
    "streaming options below.” Licensed FM broadcaster (89.7) run by Foothill College, " +
    "Los Altos Hills, freeform since 1959.",
};

const KALX_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://kalx.berkeley.edu/media/live-streaming/",
  checked: "2026-10-29",
  note:
    "Publishes its streams in five formats so you can “listen to KALX with an audio " +
    "player over the Internet in the format of your choice”, and names VLC, Winamp and " +
    "Apple Music as examples. Student- and volunteer-run at UC Berkeley, on air since 1962.",
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

const CONCERTZENDER_TERMS: StationTerms = {
  status: "silent",
  source: "https://streams.greenhost.nl:8006/",
  checked: "2026-10-29",
  note:
    "Stichting Concertzender, a volunteer foundation in Utrecht making radio since 1982 and " +
    "distributed nationally by cable; it publishes annual reports and was designated a side " +
    "activity of the NOS in 1999. Its own /streams/ link resolves to the public Icecast status " +
    "page used here, which lists every mount. No terms were found either way. Each channel is a " +
    "themed re-broadcast of its own programme archive, so what plays is work its own editors " +
    "made and dated — about as far from an auto-DJ as a stream gets.",
};

const CESKY_ROZHLAS_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://jazz.rozhlas.cz/about-us-5176836",
  checked: "2026-10-29",
  note:
    "Český rozhlas, the Czech public broadcaster and an EBU member. Its own station " +
    "pages publish .m3u and .asx playlist files to open in an audio player. The https URLs " +
    "used here are the direct equivalents of those playlists — confirmed on 2026-10-29 to " +
    "answer with the same icy-name as the published api.play.cz m3u resolves to.",
};

const WMBR_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://wmbr.org/",
  checked: "2026-10-29",
  note:
    "Publishes a .m3u for external players, labelled “Live Stream (m3u)”. " +
    "Student- and community-run non-profit at MIT.",
};

const KZSU_TERMS: StationTerms = {
  status: "allows-players",
  source: "https://kzsu.stanford.edu/live/",
  checked: "2026-10-29",
  note:
    "Publishes its streams in four formats under the heading “Use your own player”. " +
    "Student-run at Stanford, on air since 1964.",
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
  "https://stream0.wfmu.org/freeform-128k.mp3",
  "vocal",
  WFMU_TERMS,
  "https://wfmu.org/",
);
const WFMU_ROCKNSOUL = pick(
  "WFMU Rock'n'Soul Radio",
  "WFMU · Vintage rock and soul 45s",
  "https://stream0.wfmu.org/rocknsoul",
  "vocal",
  WFMU_TERMS,
  "https://wfmu.org/",
);
const WFMU_DRUMMER = pick(
  "Give the Drummer Radio",
  "WFMU · Global and outsider sounds",
  "https://stream0.wfmu.org/drummer",
  "mixed",
  WFMU_TERMS,
  "https://wfmu.org/",
);
const WFMU_SHEENA = pick(
  "Sheena's Jungle Room",
  "WFMU · Garage, surf and rock'n'roll",
  "https://stream0.wfmu.org/sheena",
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
  "https://stream.srg-ssr.ch/srgssr/rsj/mp3/128",
  "mixed",
  SRG_SSR_TERMS,
  "https://www.radioswissjazz.ch/",
);
const SWISS_CLASSIC = pick(
  "Radio Swiss Classic",
  "SRG SSR · Classical, no talk",
  "https://stream.srg-ssr.ch/srgssr/rsc_de/mp3/128",
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
  "https://playerservices.streamtheworld.com/api/livestream-redirect/WCPE_FM.mp3",
  "instrumental",
  WCPE_TERMS,
  "https://theclassicalstation.org/",
);

const ASP = pick(
  "Ambient Sleeping Pill",
  "Stereoscenic · Beatless ambient",
  "https://radio.stereoscenic.com/asp-s",
  "instrumental",
  STEREOSCENIC_TERMS,
  "https://www.ambientsleepingpill.com/",
);
const AM_AMBIENT = pick(
  "a.m. ambient",
  "Stereoscenic · Brighter daytime ambient",
  "https://radio.stereoscenic.com/ama-s",
  "instrumental",
  STEREOSCENIC_TERMS,
  "https://amambient.com/",
);
const AMBIENT_MODERN = pick(
  "Ambient Modern",
  "Stereoscenic · Contemporary ambient",
  "https://radio.stereoscenic.com/mod-s",
  "instrumental",
  STEREOSCENIC_TERMS,
  "https://ambientmodern.com/",
);

const KFJC = pick(
  "KFJC",
  "Foothill College · Freeform, Los Altos Hills",
  "https://netcast.kfjc.org/kfjc-128k-mp3",
  "mixed",
  KFJC_TERMS,
  "https://kfjc.org/",
);

const KALX = pick(
  "KALX",
  "UC Berkeley · Student and volunteer freeform",
  "https://stream.kalx.berkeley.edu:8443/kalx-128.mp3",
  "mixed",
  KALX_TERMS,
  "https://kalx.berkeley.edu/",
);

const CZ_FILM = pick(
  "Concertzender Filmmuziek",
  "Stichting Concertzender · Film music",
  "https://streams.greenhost.nl:8006/film",
  "instrumental",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_WERELD = pick(
  "Concertzender Wereldmuziek",
  "Stichting Concertzender · Music of the world",
  "https://streams.greenhost.nl:8006/wereldmuziek",
  "vocal",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_JAZZ = pick(
  "World of Jazz",
  "Stichting Concertzender · Jazz",
  "https://streams.greenhost.nl:8006/jazz",
  "mixed",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_HARDBOP = pick(
  "Concertzender Hard Bop",
  "Stichting Concertzender · Hard bop",
  "https://streams.greenhost.nl:8006/hardbop",
  "instrumental",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_KLASSIEK = pick(
  "Concertzender Klassiek",
  "Stichting Concertzender · Classical",
  "https://streams.greenhost.nl:8006/klassiek",
  "instrumental",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_OUDE = pick(
  "Concertzender Oude Muziek",
  "Stichting Concertzender · Early music",
  "https://streams.greenhost.nl:8006/oudemuziek",
  "mixed",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_NIEUWE = pick(
  "Concertzender Nieuwe Muziek",
  "Stichting Concertzender · Contemporary composed",
  "https://streams.greenhost.nl:8006/nieuwemuziek",
  "instrumental",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_FOLK = pick(
  "Folk it!",
  "Stichting Concertzender · Folk",
  "https://streams.greenhost.nl:8006/folkit",
  "vocal",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_CHANSON = pick(
  "Concertzender Chanson",
  "Stichting Concertzender · Chanson",
  "https://streams.greenhost.nl:8006/chanson",
  "vocal",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_STILTE = pick(
  "De Gehoorde Stilte",
  "Stichting Concertzender · Ambient and quiet",
  "https://streams.greenhost.nl:8006/gehoordestilte",
  "instrumental",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CZ_POP = pick(
  "Concertzender Pop",
  "Stichting Concertzender · Off the beaten track",
  "https://streams.greenhost.nl:8006/pop",
  "vocal",
  CONCERTZENDER_TERMS,
  "https://www.concertzender.nl/",
);

const CRO_JAZZ = pick(
  "ČRo Jazz",
  "Český rozhlas · Czech and European jazz",
  "https://rozhlas.stream/jazz.mp3",
  "mixed",
  CESKY_ROZHLAS_TERMS,
  "https://jazz.rozhlas.cz/",
);

const CRO_WAVE = pick(
  "ČRo Radio Wave",
  "Český rozhlas · Alternative and electronic",
  "https://rozhlas.stream/radio_wave.mp3",
  "mixed",
  CESKY_ROZHLAS_TERMS,
  "https://wave.rozhlas.cz/",
);

const WMBR = pick(
  "WMBR",
  "MIT · Student and community freeform",
  "https://wmbr.org:8002/hi",
  "mixed",
  WMBR_TERMS,
  "https://wmbr.org/",
);

const KZSU = pick(
  "KZSU",
  "Stanford · Student freeform",
  "https://kzsu-streams.stanford.edu/kzsu-1-128.mp3",
  "mixed",
  KZSU_TERMS,
  "https://kzsu.stanford.edu/",
);

const NIGHTWAVE_PLAZA = pick(
  "Nightwave Plaza",
  "Vaporwave and mallsoft",
  "https://radio.plaza.one/ogg",
  "instrumental",
  NIGHTWAVE_PLAZA_TERMS,
  "https://plaza.one/",
);

const WBGO = pick(
  "WBGO",
  "Newark Public Radio · Jazz since 1979",
  "https://ais-sa8.cdnstream1.com/3629_128.mp3",
  "mixed",
  WBGO_TERMS,
  "https://www.wbgo.org/",
);

const ALPHA_BOYS = pick(
  "Alpha Boys School Radio",
  "Alpha School of Music · Jamaican roots, ska and dub",
  "https://alphaboys-live.streamguys1.com/alphaboys.mp3",
  "vocal",
  ALPHA_BOYS_TERMS,
  "https://alphaboysschoolradio.com/",
);

const BASSDRIVE = pick(
  "Bassdrive",
  "Drum & bass, DJ-programmed",
  "https://ice.bassdrive.net/stream",
  "mixed",
  BASSDRIVE_TERMS,
  "https://www.bassdrive.com/",
);

/**
 * Picks by genre id. A genre with none is filled entirely from the directory,
 * and is not offered at all until that setting is on.
 *
 * Every genre here has at least one Pick. The twelve that did not are in
 * `PLANNED_GENRES` in `genres.ts` with their tag sets intact, waiting on a
 * station somebody can vouch for; see docs/EXECUTION.md Part 4 for what was
 * tried. Putting a station in a genre it does not belong to would make this
 * list longer and the app worse, so the gap is recorded instead.
 */
// ── 2026-11-01: the catalog expansion ───────────────────────────────────────
//
// Everything below went in on one day, when the maintainer relaxed the station
// rules: broadcasters that had been parked waiting for a reply are played while
// the ask is outstanding, and a Pick no longer needs its terms page read first.
// docs/EXECUTION.md Part 4 records the decision and what it costs. The `status`
// on each record says which footing it actually stands on, so the ones somebody
// checked can still be told from the ones nobody did.

const RADIO_FRANCE_TERMS: StationTerms = {
  status: "permission",
  source: "https://www.radiofrance.com/conditions-generales-utilisation",
  checked: "2026-10-29",
  note:
    'Terms restrict use to "un usage strictement personnel et prive" and require written ' +
    "permission for reuse. The ask is drafted in docs/permission-emails.md and has not been " +
    "answered. Added anyway on 2026-11-01 by the maintainer's decision; remove on a no.",
};

const NRK_TERMS: StationTerms = {
  status: "permission",
  source: "https://lyd.nrk.no/",
  checked: "2026-10-29",
  note:
    "lyd.nrk.no publishes every stream URL openly, then says any other use to build new " +
    "services needs NRK's approval. Asked, unanswered; playing meanwhile by the maintainer's " +
    "decision of 2026-11-01.",
};

const LAUT_FM_TERMS: StationTerms = {
  status: "permission",
  source: "https://laut.fm/agb",
  checked: "2026-10-29",
  note:
    "Their terms forbid embedding streams on third-party websites. A desktop player is " +
    "arguably not a website, and the question is drafted in docs/permission-emails.md. " +
    "Unanswered; playing meanwhile by the maintainer's decision of 2026-11-01.",
};

const NTS_TERMS: StationTerms = {
  status: "silent",
  source: "https://www.nts.live/terms-and-conditions",
  checked: "2026-11-01",
  note:
    "The only terms NTS publishes cover Supporter subscriptions - payments, refunds, " +
    "cancellation. Nothing about third-party players, embedding or redistribution, so the " +
    "silence rule applies. Stream URLs come from NTS's own public API (/api/v2/mixtapes). " +
    "London, broadcasting since 2011. The Infinite Mixtapes send no ICY metadata, so the app " +
    "shows the station name and no track title.",
};

const HUNTER_LOFI_TERMS: StationTerms = {
  status: "silent",
  source: "https://hunter.fm/privacidade-e-termos/",
  checked: "2026-11-01",
  note:
    "No clause either way on third-party players; the page covers advertisers and privacy. " +
    "Hunter Midia Ltda, online since 2016. Credited artists (Hoogway, Mell-o) play alongside " +
    "names that cannot be traced at all, which is why it was parked until the rules changed.",
};

const WWOZ_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://www.wwoz.org/listen",
  checked: "2026-11-01",
  note:
    "Listener-supported community radio, New Orleans, on air since 1980; its Listen page " +
    "offers the stream in several formats. Stream verified; terms page not read.",
};

const WFUV_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://wfuv.org/stream",
  checked: "2026-11-01",
  note: "Fordham University's public radio station. Stream verified; terms page not read.",
};

const DUBLAB_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://dublab.com/",
  checked: "2026-11-01",
  note:
    "Non-profit arts radio, Los Angeles, since 1999; named resident DJs. Stream verified; " +
    "terms page not read.",
};

const KIOSK_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://kioskradio.com/",
  checked: "2026-11-01",
  note:
    "Non-profit community radio from a former newspaper kiosk in Brussels. Stream verified; " +
    "terms page not read.",
};

const RINSE_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://rinse.fm/",
  checked: "2026-11-01",
  note:
    "London station, pirate from 1994 and licensed since 2010. Stream verified; terms not " +
    "read.",
};

const EPIC_PIANO_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://epic-piano.com/",
  checked: "2026-11-01",
  note: "Stream verified; terms page not read. German operator, same family as Epic Lounge.",
};

const WHISPERINGS_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://www.solopianoradio.com/",
  checked: "2026-11-01",
  note:
    "Solo piano only, curated by David Nevue, artists named on air. Stream verified; terms " +
    "page not read. Previously declined under the old rules for exactly that gap.",
};

const BOSSA_JAZZ_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://www.bossajazzbrasil.com/",
  checked: "2026-11-01",
  note:
    "Brazilian bossa and jazz station. Stream verified; terms page not read. Previously " +
    "declined under the old rules.",
};

const RMC_BOSSA_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://radiomontecarlo.net/",
  checked: "2026-11-01",
  note:
    "Radio Monte Carlo's bossa channel, an Italian commercial broadcaster. Stream verified; " +
    "terms page not read.",
};

const RADIOART_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://www.radioart.com/",
  checked: "2026-11-01",
  note: "Stream verified; terms page not read.",
};

const ANON_FM_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://anon.fm/",
  checked: "2026-11-01",
  note: "Long-running listener-run trance stream. Stream verified; terms page not read.",
};

const NIGHTRIDE_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://nightride.fm/",
  checked: "2026-11-01",
  note: "Synthwave network that publishes its stream URLs. Stream verified; terms not read.",
};

const SYSTRUM_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://systrumsistum.com/",
  checked: "2026-11-01",
  note: "Two channels of drone and experimental electronics. Stream verified; terms not read.",
};

const WKNC_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://wknc.org/",
  checked: "2026-11-01",
  note: "North Carolina State University student radio. Stream verified; terms page not read.",
};

const NEU_RADIO_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://www.neuradio.it/",
  checked: "2026-11-01",
  note: "Independent station from Bologna. Stream verified; terms page not read.",
};

const GROLLOO_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://grollooradio.nl/",
  checked: "2026-11-01",
  note:
    "Blues station from Grolloo, the Dutch village Cuby + Blizzards came from. Stream " +
    "verified; terms page not read.",
};

const CAMP_RADIO_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://listen.camp/",
  checked: "2026-11-01",
  note: "Ambient and drone, Ogg Vorbis. Stream verified; terms page not read.",
};

const MUSICAL_DECADENCE_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://musicaldecadence.ru/",
  checked: "2026-11-01",
  note: "Techno stream. Stream verified; terms page not read.",
};

const TECHNOLOVERS_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://technolovers.fm/",
  checked: "2026-11-01",
  note: "German dance network, one channel per style. Stream verified; terms not read.",
};

const REYFM_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://reyfm.de/",
  checked: "2026-11-01",
  note: "German dance network. Stream verified; terms page not read.",
};

const SLEEPSCAPES_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://www.live365.com/station/Sleepscapes-Rain-a7844de",
  checked: "2026-11-01",
  note: "Rain and sleep soundscapes. Stream verified; terms page not read.",
};

const RAUTEMUSIK_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://epic-lounge.com/",
  checked: "2026-11-01",
  note:
    "Epic Lounge, part of the rautemusik family. Stream verified; terms page not read. It was " +
    "parked in October pending a no-AI review that was never finished.",
};

const FIP_MAIN = pick(
  "FIP",
  "Radio France · Freeform, no adverts",
  "https://icecast.radiofrance.fr/fip-hifi.aac",
  "mixed",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/",
);

const FIP_JAZZ = pick(
  "FIP Jazz",
  "Radio France",
  "https://icecast.radiofrance.fr/fipjazz-hifi.aac",
  "mixed",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/jazz/",
);

const FIP_ROCK = pick(
  "FIP Rock",
  "Radio France",
  "https://icecast.radiofrance.fr/fiprock-hifi.aac",
  "vocal",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/rock/",
);

const FIP_ELECTRO = pick(
  "FIP Electro",
  "Radio France",
  "https://icecast.radiofrance.fr/fipelectro-hifi.aac",
  "instrumental",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/electro/",
);

const FIP_GROOVE = pick(
  "FIP Groove",
  "Radio France",
  "https://icecast.radiofrance.fr/fipgroove-hifi.aac",
  "vocal",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/groove/",
);

const FIP_REGGAE = pick(
  "FIP Reggae",
  "Radio France",
  "https://icecast.radiofrance.fr/fipreggae-hifi.aac",
  "vocal",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/reggae/",
);

const FIP_HIPHOP = pick(
  "FIP Hip-Hop",
  "Radio France",
  "https://icecast.radiofrance.fr/fiphiphop-hifi.aac",
  "vocal",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/hip-hop/",
);

const FIP_METAL = pick(
  "FIP Metal",
  "Radio France",
  "https://icecast.radiofrance.fr/fipmetal-hifi.aac",
  "vocal",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/metal/",
);

const FIP_POP = pick(
  "FIP Pop",
  "Radio France",
  "https://icecast.radiofrance.fr/fippop-hifi.aac",
  "vocal",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/pop/",
);

const FIP_NOUVEAUTES = pick(
  "FIP Nouveautés",
  "Radio France · New releases",
  "https://icecast.radiofrance.fr/fipnouveautes-hifi.aac",
  "mixed",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/nouveautes/",
);

const FIP_MONDE = pick(
  "FIP Monde",
  "Radio France",
  "https://icecast.radiofrance.fr/fipworld-hifi.aac",
  "mixed",
  RADIO_FRANCE_TERMS,
  "https://www.fip.fr/monde/",
);

const FM_EASY = pick(
  "France Musique Classique Easy",
  "Radio France",
  "https://icecast.radiofrance.fr/francemusiqueeasyclassique-hifi.aac",
  "instrumental",
  RADIO_FRANCE_TERMS,
  "https://www.radiofrance.fr/francemusique",
);

const FM_BAROQUE = pick(
  "France Musique Baroque",
  "Radio France",
  "https://icecast.radiofrance.fr/francemusiquebaroque-hifi.aac",
  "instrumental",
  RADIO_FRANCE_TERMS,
  "https://www.radiofrance.fr/francemusique",
);

const FM_JAZZ = pick(
  "France Musique Jazz",
  "Radio France",
  "https://icecast.radiofrance.fr/francemusiquelajazz-hifi.aac",
  "mixed",
  RADIO_FRANCE_TERMS,
  "https://www.radiofrance.fr/francemusique",
);

const FM_CONTEMP = pick(
  "France Musique Contemporaine",
  "Radio France",
  "https://icecast.radiofrance.fr/francemusiquelacontemporaine-hifi.aac",
  "instrumental",
  RADIO_FRANCE_TERMS,
  "https://www.radiofrance.fr/francemusique",
);

const FM_OCORA = pick(
  "France Musique Ocora",
  "Radio France · World traditions",
  "https://icecast.radiofrance.fr/francemusiqueocoramonde-hifi.aac",
  "mixed",
  RADIO_FRANCE_TERMS,
  "https://www.radiofrance.fr/francemusique",
);

const NRK_JAZZ = pick(
  "NRK Jazz",
  "Norwegian public radio",
  "https://lyd.nrk.no/nrk_radio_jazz_mp3_h",
  "mixed",
  NRK_TERMS,
  "https://radio.nrk.no/",
);

const NRK_KLASSISK = pick(
  "NRK Klassisk",
  "Norwegian public radio",
  "https://lyd.nrk.no/nrk_radio_klassisk_mp3_h",
  "instrumental",
  NRK_TERMS,
  "https://radio.nrk.no/",
);

const NRK_FOLK = pick(
  "NRK Folkemusikk",
  "Norwegian public radio",
  "https://lyd.nrk.no/nrk_radio_folkemusikk_mp3_h",
  "mixed",
  NRK_TERMS,
  "https://radio.nrk.no/",
);

const NRK_P3 = pick(
  "NRK P3",
  "Norwegian public radio",
  "https://lyd.nrk.no/nrk_radio_p3_mp3_h",
  "vocal",
  NRK_TERMS,
  "https://radio.nrk.no/",
);

const NRK_MP3 = pick(
  "NRK mP3",
  "Norwegian public radio",
  "https://lyd.nrk.no/nrk_radio_mp3_mp3_h",
  "vocal",
  NRK_TERMS,
  "https://radio.nrk.no/",
);

const LAUT_LOFI = pick(
  "laut.fm Lofi",
  "Community station",
  "https://stream.laut.fm/lofi",
  "instrumental",
  LAUT_FM_TERMS,
  "https://laut.fm/lofi",
);

const LAUT_POSTROCK = pick(
  "laut.fm Post-Rock",
  "Community station",
  "https://stream.laut.fm/post-rock",
  "instrumental",
  LAUT_FM_TERMS,
  "https://laut.fm/post-rock",
);

const LAUT_BLUES = pick(
  "laut.fm Blues",
  "Community station",
  "https://stream.laut.fm/blues",
  "vocal",
  LAUT_FM_TERMS,
  "https://laut.fm/blues",
);

const LAUT_TRANCE = pick(
  "laut.fm Trance",
  "Community station",
  "https://stream.laut.fm/trance",
  "instrumental",
  LAUT_FM_TERMS,
  "https://laut.fm/trance",
);

const LAUT_TECHNO = pick(
  "laut.fm Techno",
  "Community station",
  "https://stream.laut.fm/techno",
  "instrumental",
  LAUT_FM_TERMS,
  "https://laut.fm/techno",
);

const LAUT_HOUSE = pick(
  "laut.fm House",
  "Community station",
  "https://stream.laut.fm/house",
  "instrumental",
  LAUT_FM_TERMS,
  "https://laut.fm/house",
);

const NTS_LOW_KEY = pick(
  "NTS Low Key",
  "NTS Radio · Lo-fi hip hop and smooth R&B",
  "https://stream-mixtape-geo.ntslive.net/mixtape2",
  "mixed",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/100-percent-hip-hop",
);

const NTS_LIVE1 = pick(
  "NTS 1",
  "NTS Radio · London, live",
  "https://stream-relay-geo.ntslive.net/stream",
  "mixed",
  NTS_TERMS,
  "https://www.nts.live/",
);

const NTS_LIVE2 = pick(
  "NTS 2",
  "NTS Radio · London, live",
  "https://stream-relay-geo.ntslive.net/stream2",
  "mixed",
  NTS_TERMS,
  "https://www.nts.live/",
);

const NTS_SLOW_FOCUS = pick(
  "NTS Slow Focus",
  "NTS Radio · Ambient, drone and ragas",
  "https://stream-mixtape-geo.ntslive.net/mixtape",
  "instrumental",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/slow-focus",
);

const NTS_EXPANSIONS = pick(
  "NTS Expansions",
  "NTS Radio · Jazz and its variations",
  "https://stream-mixtape-geo.ntslive.net/mixtape3",
  "mixed",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/expansions",
);

const NTS_POOLSIDE = pick(
  "NTS Poolside",
  "NTS Radio · Balearic and boogie",
  "https://stream-mixtape-geo.ntslive.net/mixtape4",
  "mixed",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/poolside",
);

const NTS_FOUR_FLOOR = pick(
  "NTS 4 To The Floor",
  "NTS Radio · House and techno",
  "https://stream-mixtape-geo.ntslive.net/mixtape5",
  "instrumental",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/4-to-the-floor",
);

const NTS_MEMORY = pick(
  "NTS Memory Lane",
  "NTS Radio · Turn on, tune in",
  "https://stream-mixtape-geo.ntslive.net/mixtape6",
  "mixed",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/memory-lane",
);

const NTS_ISLAND = pick(
  "NTS Island Time",
  "NTS Radio · Reggae and dub",
  "https://stream-mixtape-geo.ntslive.net/mixtape21",
  "vocal",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/island-time",
);

const NTS_RAP_HOUSE = pick(
  "NTS Rap House",
  "NTS Radio · 808s and champagne",
  "https://stream-mixtape-geo.ntslive.net/mixtape22",
  "vocal",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/rap-house",
);

const NTS_FIELD = pick(
  "NTS Field Recordings",
  "NTS Radio · Natural ambience",
  "https://stream-mixtape-geo.ntslive.net/mixtape23",
  "instrumental",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/field-recordings",
);

const NTS_SWEAT = pick(
  "NTS Sweat",
  "NTS Radio · International party music",
  "https://stream-mixtape-geo.ntslive.net/mixtape24",
  "vocal",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/sweat",
);

const NTS_TUBE = pick(
  "NTS The Tube",
  "NTS Radio · Post-punk and minimal wave",
  "https://stream-mixtape-geo.ntslive.net/mixtape26",
  "vocal",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/the-tube",
);

const NTS_FEELINGS = pick(
  "NTS Feelings",
  "NTS Radio · Soul, gospel and boogie",
  "https://stream-mixtape-geo.ntslive.net/mixtape27",
  "vocal",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/feelings",
);

const NTS_LABYRINTH = pick(
  "NTS Labyrinth",
  "NTS Radio · Enter the void",
  "https://stream-mixtape-geo.ntslive.net/mixtape31",
  "instrumental",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/labyrinth",
);

const NTS_PIT = pick(
  "NTS The Pit",
  "NTS Radio · Songs of the ancient metal bards",
  "https://stream-mixtape-geo.ntslive.net/mixtape34",
  "vocal",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/the-pit",
);

const NTS_SHEET = pick(
  "NTS Sheet Music",
  "NTS Radio · Classical and contemporary",
  "https://stream-mixtape-geo.ntslive.net/mixtape35",
  "instrumental",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/sheet-music",
);

const NTS_OTAKU = pick(
  "NTS Otaku",
  "NTS Radio · Video game and anime scores",
  "https://stream-mixtape-geo.ntslive.net/mixtape36",
  "instrumental",
  NTS_TERMS,
  "https://www.nts.live/infinite-mixtapes/otaku",
);

const HUNTER_LOFI = pick(
  "Hunter.FM Lo-Fi",
  "Lo-fi hip hop and chillhop",
  "https://live.hunter.fm/lofi_high",
  "instrumental",
  HUNTER_LOFI_TERMS,
  "https://hunter.fm/lofi/",
);

const WWOZ = pick(
  "WWOZ",
  "New Orleans · Listener-supported",
  "https://wwoz-sc.streamguys1.com/wwoz-hi.mp3",
  "vocal",
  WWOZ_TERMS,
  "https://www.wwoz.org/",
);

const WFUV = pick(
  "WFUV",
  "Fordham University · Public radio",
  "https://onair.wfuv.org/onair-hi",
  "vocal",
  WFUV_TERMS,
  "https://wfuv.org/",
);

const DUBLAB = pick(
  "dublab",
  "Los Angeles · Non-profit arts radio",
  "https://dublab.out.airtime.pro/dublab_a",
  "mixed",
  DUBLAB_TERMS,
  "https://dublab.com/",
);

const KIOSK_RADIO = pick(
  "Kiosk Radio",
  "Brussels · Community radio",
  "https://kioskradiobxl.out.airtime.pro/kioskradiobxl_a",
  "mixed",
  KIOSK_TERMS,
  "https://kioskradio.com/",
);

const RINSE_FM = pick(
  "Rinse FM",
  "London · Pirate turned licensed",
  "https://admin.stream.rinse.fm/proxy/rinse_uk/stream",
  "mixed",
  RINSE_TERMS,
  "https://rinse.fm/",
);

const WHISPERINGS = pick(
  "Whisperings Solo Piano",
  "Curated by David Nevue",
  "https://pianosolo.streamguys1.com/live",
  "instrumental",
  WHISPERINGS_TERMS,
  "https://www.solopianoradio.com/",
);

const EPIC_PIANO_CHILL = pick(
  "Epic Piano Chillout",
  "Chillout piano",
  "https://stream.epic-piano.com/chillout-piano",
  "instrumental",
  EPIC_PIANO_TERMS,
  "https://epic-piano.com/",
);

const EPIC_PIANO_ROMANTIC = pick(
  "Epic Piano Romantic",
  "Romantic piano",
  "https://stream.epic-piano.com/romantic-piano",
  "instrumental",
  EPIC_PIANO_TERMS,
  "https://epic-piano.com/",
);

const BOSSA_JAZZ = pick(
  "Bossa Jazz Brasil",
  "Bossa nova and Brazilian jazz",
  "https://centova5.transmissaodigital.com:20104/live",
  "mixed",
  BOSSA_JAZZ_TERMS,
  "https://www.bossajazzbrasil.com/",
);

const RMC_BOSSA = pick(
  "RMC Bossa Nova",
  "Radio Monte Carlo",
  "https://mc-mcbossa.hostingradio.ru/mcbossa96.aacp",
  "mixed",
  RMC_BOSSA_TERMS,
  "https://radiomontecarlo.net/",
);

const RADIOART_BOSSA = pick(
  "Radio Art Smooth Bossa",
  "Smooth bossa nova",
  "https://live.radioart.com/fSmooth_bossa_nova.mp3",
  "mixed",
  RADIOART_TERMS,
  "https://www.radioart.com/",
);

const ANON_FM = pick(
  "Anon.FM",
  "Listener-run trance",
  "https://icecast.anon.fm/radio",
  "instrumental",
  ANON_FM_TERMS,
  "https://anon.fm/",
);

const NIGHTRIDE_DATAWAVE = pick(
  "Nightride Datawave",
  "Nightride FM · Electronic",
  "https://stream.nightride.fm/datawave.mp3",
  "instrumental",
  NIGHTRIDE_TERMS,
  "https://nightride.fm/",
);

const SYSTRUM_SSR1 = pick(
  "Systrum Sistum SSR1",
  "Drone and ambient",
  "https://systrum.net:8443/SSR1",
  "instrumental",
  SYSTRUM_TERMS,
  "https://systrumsistum.com/",
);

const SYSTRUM_SSR2 = pick(
  "Systrum Sistum SSR2",
  "Experimental electronics",
  "https://systrum.net:8443/SSR2",
  "instrumental",
  SYSTRUM_TERMS,
  "https://systrumsistum.com/",
);

const WKNC = pick(
  "WKNC 88.1",
  "NC State · Student radio",
  "https://streaming.live365.com/a45877",
  "mixed",
  WKNC_TERMS,
  "https://wknc.org/",
);

const NEU_RADIO = pick(
  "NEU Radio",
  "Bologna · Independent",
  "https://nr9.newradio.it/proxy/ebaruffa?mp=/stream",
  "mixed",
  NEU_RADIO_TERMS,
  "https://www.neuradio.it/",
);

const GROLLOO = pick(
  "Grolloo Radio",
  "Blues from Grolloo",
  "https://uk1.streamingpulse.com/ssl/grollooradio",
  "vocal",
  GROLLOO_TERMS,
  "https://grollooradio.nl/",
);

const CAMP_RADIO = pick(
  "CAMP Radio",
  "Ambient and drone",
  "https://listen.camp/campradio.ogg",
  "instrumental",
  CAMP_RADIO_TERMS,
  "https://listen.camp/",
);

const MUSICAL_DECADENCE = pick(
  "Musical Decadence",
  "Techno",
  "https://stream.musicaldecadence.ru/live",
  "instrumental",
  MUSICAL_DECADENCE_TERMS,
  "https://musicaldecadence.ru/",
);

const TECHNOLOVERS_DEEP = pick(
  "Technolovers Deep House",
  "Deep house",
  "https://stream.technolovers.fm/deep-house",
  "instrumental",
  TECHNOLOVERS_TERMS,
  "https://technolovers.fm/",
);

const REYFM_HOUSE = pick(
  "REYFM Houseparty",
  "House",
  "https://listen.reyfm.de/houseparty_192kbps.mp3",
  "instrumental",
  REYFM_TERMS,
  "https://reyfm.de/",
);

const SLEEPSCAPES = pick(
  "Sleepscapes Rain",
  "Rain and sleep soundscapes",
  "https://stream.willstare.com:8850/",
  "instrumental",
  SLEEPSCAPES_TERMS,
  "https://www.live365.com/station/Sleepscapes-Rain-a7844de",
);

const EPIC_LOUNGE = pick(
  "Epic Lounge Workday",
  "Lounge and downtempo",
  "https://stream.epic-lounge.com/workday-lounge",
  "instrumental",
  RAUTEMUSIK_TERMS,
  "https://epic-lounge.com/",
);

// ── 2026-11-04: Lofi, judged by what the stations actually play ─────────────
//
// The genre had three Picks and only one of them was lofi. The fix was not to
// trust the directory's "lofi" tag — it is attached to news stations mis-filed
// by bitrate, to chiptune, to Malayalam slowed-and-reverbed edits, and to
// dance networks with a lofi channel in name only. Each candidate below was
// opened and held until it announced a few tracks, and kept only when those
// tracks were by artists the genre actually has: Phlocalyst, Arbour, Claxy,
// Tomppabeats, im.fine, Kalaido, Kanisan, Unheard, PRODUCERBOIBRAD.
//
// Rejected on the same evidence: CLIAMP (playing John Bartmann, a public-domain
// library composer), Hotmix (library titles with UUIDs appended), Retro Lofi
// Chiptune (chiptune), Palmera Blanca (vaporwave), Radio Digital Malayali
// (slowed edits), PAX LO-FI (sermons between the beats).

const NIA_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://nia.nc/",
  checked: "2026-11-04",
  note: "New Caledonian station. Sampled playing Arbour, a Chillhop Records artist. Stream verified; terms page not read.",
};

const RADIO_RECORD_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://www.radiorecord.ru/station/lofi",
  checked: "2026-11-04",
  note: "Large Russian commercial network, one channel per style. Sampled playing Claxy and Tomppabeats, both real lofi artists. Stream verified; terms page not read.",
};

const ILM_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://www.ilovemusic.de/ilovechillhop/",
  checked: "2026-11-04",
  note: "German commercial network. Sampled playing PRODUCERBOIBRAD. Stream verified; terms page not read.",
};

const LITT_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://littlive.com/",
  checked: "2026-11-04",
  note: "Sampled playing Kalaido. Stream verified; terms page not read.",
};

const KALIZO_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://www.kalizoradio.com/",
  checked: "2026-11-04",
  note: "Sampled playing Unheard. Stream verified; terms page not read.",
};

const RADIO_RELAX_TERMS: StationTerms = {
  status: "unreviewed",
  source: "https://radiorelax.md/",
  checked: "2026-11-04",
  note: "Moldovan station. Sampled playing Kanisan. Stream verified; terms page not read.",
};

const RM_STUDY = pick(
  "rautemusik Study",
  "Lofi beats to work to",
  "https://study-high.rautemusik.fm/",
  "instrumental",
  RAUTEMUSIK_TERMS,
  "https://www.rm.fm/study",
);

const EPIC_JAZZHOP = pick(
  "Epic Lounge Jazzhop",
  "Jazzhop and lofi",
  "https://stream.epic-lounge.com/jazzhop-lounge",
  "instrumental",
  RAUTEMUSIK_TERMS,
  "https://epic-lounge.com/",
);

const REYFM_LOFI = pick(
  "REYFM Lofi",
  "Lofi hip hop",
  "https://listen.reyfm.de/lofi_320kbps.mp3",
  "instrumental",
  REYFM_TERMS,
  "https://www.reyfm.de/",
);

const NIA_LOFI = pick(
  "NIA Lo-Fi",
  "New Caledonia",
  "https://radio.nia.nc/radio/8020/lofi-hq-stream.aac",
  "instrumental",
  NIA_TERMS,
  "https://nia.nc/",
);

const RECORD_LOFI = pick(
  "Record Lo-Fi",
  "Radio Record",
  "https://radiorecord.hostingradio.ru/lofi96.aacp",
  "instrumental",
  RADIO_RECORD_TERMS,
  "https://www.radiorecord.ru/station/lofi",
);

const ILM_CHILLHOP = pick(
  "I Love Chillhop",
  "I Love Music",
  "https://ilm.stream12.radiohost.de/ilm_ilovechillhop_mp3-192",
  "instrumental",
  ILM_TERMS,
  "https://www.ilovemusic.de/ilovechillhop/",
);

const LITT_LOFI = pick(
  "LITT Live Lofi",
  "Chill and instrumental jazz beats",
  "https://das-sa39.cdnstream1.com/5582_128",
  "instrumental",
  LITT_TERMS,
  "https://littlive.com/",
);

const KALIZO_LOFI = pick(
  "Kalizo Lo-fi",
  "Chillofi",
  "https://streams.dez.ovh/listen/chillofi/radio.mp3",
  "instrumental",
  KALIZO_TERMS,
  "https://www.kalizoradio.com/",
);

const RELAX_LOFI = pick(
  "Relax Lo-Fi",
  "Radio Relax",
  "https://radio8.dixi.md/listen/relax_lofi/relax_lofi128.aac",
  "instrumental",
  RADIO_RELAX_TERMS,
  "https://radiorelax.md/",
);

export const PICKS: Record<string, Station[]> = {
  ambient: [
    ASP,
    AM_AMBIENT,
    AMBIENT_MODERN,
    CZ_STILTE,
    NTS_SLOW_FOCUS,
    CAMP_RADIO,
  ],
  classical: [
    SWISS_CLASSIC,
    WCPE,
    CZ_KLASSIEK,
    CZ_OUDE,
    CZ_NIEUWE,
    FM_EASY,
    FM_BAROQUE,
    NRK_KLASSISK,
    NTS_SHEET,
    FM_CONTEMP,
  ],
  scores: [CZ_FILM, NTS_OTAKU],
  jazz: [
    SWISS_JAZZ,
    WBGO,
    CZ_JAZZ,
    CZ_HARDBOP,
    CRO_JAZZ,
    FIP_JAZZ,
    FM_JAZZ,
    NRK_JAZZ,
    NTS_EXPANSIONS,
    WWOZ,
  ],
  chillout: [RP_MELLOW, AM_AMBIENT, NTS_POOLSIDE, EPIC_LOUNGE, LAUT_LOFI],
  lofi: [
    HUNTER_LOFI,
    RM_STUDY,
    NIA_LOFI,
    RECORD_LOFI,
    ILM_CHILLHOP,
    REYFM_LOFI,
    LITT_LOFI,
    KALIZO_LOFI,
    RELAX_LOFI,
    EPIC_JAZZHOP,
  ],
  space: [NTS_SLOW_FOCUS, SYSTRUM_SSR1, CAMP_RADIO],
  piano: [WHISPERINGS, EPIC_PIANO_CHILL, EPIC_PIANO_ROMANTIC],
  nature: [NTS_FIELD, SLEEPSCAPES],
  bossa: [BOSSA_JAZZ, RMC_BOSSA, RADIOART_BOSSA],
  folk: [WFMU_DRUMMER, RP_GLOBAL, CZ_FOLK, NRK_FOLK, WFUV],
  reggae: [ALPHA_BOYS, FIP_REGGAE, NTS_ISLAND],
  dnb: [BASSDRIVE],
  house: [NTS_FOUR_FLOOR, LAUT_HOUSE, TECHNOLOVERS_DEEP, REYFM_HOUSE],
  techno: [NTS_FOUR_FLOOR, LAUT_TECHNO, MUSICAL_DECADENCE, FIP_ELECTRO],
  trance: [LAUT_TRANCE, ANON_FM],
  idm: [NIGHTRIDE_DATAWAVE, SYSTRUM_SSR2, NTS_LABYRINTH],
  postrock: [LAUT_POSTROCK, WKNC, NEU_RADIO],
  metal: [FIP_METAL, NTS_PIT],
  blues: [WWOZ, LAUT_BLUES, GROLLOO],
  hiphop: [FIP_HIPHOP, NTS_RAP_HOUSE, NTS_LOW_KEY],
  synthwave: [NIGHTWAVE_PLAZA, NIGHTRIDE_DATAWAVE],
  eclectic: [
    WFMU_FREEFORM,
    KFJC,
    KALX,
    WMBR,
    KZSU,
    CRO_WAVE,
    RP_MAIN,
    WFMU_DRUMMER,
    RP_GLOBAL,
    FIP_MAIN,
    NTS_LIVE1,
    NTS_LIVE2,
    DUBLAB,
    KIOSK_RADIO,
    RINSE_FM,
    NTS_MEMORY,
  ],
  world: [
    RP_GLOBAL,
    ALPHA_BOYS,
    WFMU_DRUMMER,
    CZ_WERELD,
    CZ_CHANSON,
    FIP_MONDE,
    FM_OCORA,
    NTS_SWEAT,
  ],
  altrock: [KEXP, WXPN, KALX, CRO_WAVE, FIP_ROCK, NTS_TUBE, NRK_P3],
  indie: [
    RP_MAIN,
    KEXP,
    SWISS_POP,
    WFMU_FREEFORM,
    KFJC,
    CZ_POP,
    FIP_NOUVEAUTES,
    FIP_POP,
    NRK_MP3,
  ],
  rock: [RP_ROCK, WFMU_SHEENA, WFMU_ROCKNSOUL, FIP_ROCK],
  soul: [WFMU_ROCKNSOUL, NTS_FEELINGS, FIP_GROOVE, NTS_LOW_KEY],
};

const PICK_URLS = new Set(
  Object.values(PICKS).flatMap((list) => list.map((s) => s.url)),
);

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
