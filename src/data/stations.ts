/**
 * Picks — the hand-chosen stations at the top of each genre.
 *
 * The directory (see `lib/radioBrowser.ts`) fills every genre out to dozens of
 * stations, but nobody vouches for those. These are the ones somebody does:
 * each comes from a broadcaster with named human programmers and a long record
 * — SomaFM, Radio Paradise, FIP (Radio France), Radio Swiss, KEXP, The
 * Current (MPR), WXPN — and
 * each is marked by hand as instrumental, mixed or vocal, which is the only
 * reliable source of that fact anywhere in the app.
 *
 * Every URL below answered with audio on 2026-09-18. None is monitored after
 * that: the player checks a station as it plays (see `useRadioPlayer`) and
 * moves down the list by itself when one fails, so a stale entry costs a few
 * seconds rather than a broken app.
 *
 * The rules a station must pass to be added here are in docs/EXECUTION.md,
 * §3.2 ("Rules for Picks"). Record the result in its register (Part 4).
 *
 * Anonymous auto-DJ streams are deliberately not Picks, however good they
 * sound — they are the hardest category to verify for provenance. The Lofi
 * genre is mostly that kind of station, which is why its Picks are thin.
 */

import type { Vocals } from "./genres";

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
}

const soma = (id: string) => `https://ice1.somafm.com/${id}-128-mp3`;
const fip = (id: string) => `https://icecast.radiofrance.fr/${id}-midfi.mp3`;

function pick(name: string, artist: string, url: string, vocals: Vocals): Station {
  return { name, artist, url, vocals, vocalsFrom: "hand", pick: true };
}

// A station may sit in more than one genre; it is defined once and shared.
const GROOVE_SALAD = pick("Groove Salad", "SomaFM · Ambient downtempo", soma("groovesalad"), "instrumental");
const GROOVE_SALAD_CLASSIC = pick("Groove Salad Classic", "SomaFM · Early-2000s downtempo", soma("gsclassic"), "instrumental");
const DRONE_ZONE = pick("Drone Zone", "SomaFM · Atmospheric ambient", soma("dronezone"), "instrumental");
const DEEP_SPACE_ONE = pick("Deep Space One", "SomaFM · Deep ambient", soma("deepspaceone"), "instrumental");
const SPACE_STATION = pick("Space Station Soma", "SomaFM · Spaced-out electronica", soma("spacestation"), "instrumental");
const SYNPHAERA = pick("Synphaera", "SomaFM · Modern space ambient", soma("synphaera"), "instrumental");
const MISSION_CONTROL = pick("Mission Control", "SomaFM · Ambient with NASA audio", soma("missioncontrol"), "mixed");
const DARK_ZONE = pick("The Dark Zone", "SomaFM · Dark ambient", soma("darkzone"), "instrumental");
const N5MD = pick("n5MD Radio", "SomaFM · Post-rock and ambient", soma("n5md"), "instrumental");
const FLUID = pick("Fluid", "SomaFM · Instrumental hip-hop and future soul", soma("fluid"), "instrumental");
const CLIQHOP = pick("cliqhop idm", "SomaFM · Blips and beeps", soma("cliqhop"), "instrumental");
const DIGITALIS = pick("Digitalis", "SomaFM · Analog-tinged indie electronica", soma("digitalis"), "mixed");
const LUSH = pick("Lush", "SomaFM · Female vocals, electronic", soma("lush"), "vocal");
const SECRET_AGENT = pick("Secret Agent", "SomaFM · Spy-film lounge", soma("secretagent"), "mixed");
const ILL_STREET = pick("Illinois Street Lounge", "SomaFM · Vintage lounge and exotica", soma("illstreet"), "mixed");
const BEAT_BLENDER = pick("Beat Blender", "SomaFM · Late-night deep house", soma("beatblender"), "mixed");
const THE_TRIP = pick("The Trip", "SomaFM · Progressive house and trance", soma("thetrip"), "mixed");
const SUBURBS_OF_GOA = pick("Suburbs of Goa", "SomaFM · Desi-influenced beats", soma("suburbsofgoa"), "mixed");
const DEFCON = pick("DEF CON Radio", "SomaFM · Music for hacking", soma("defcon"), "instrumental");
const VAPORWAVES = pick("Vaporwaves", "SomaFM · Vaporwave", soma("vaporwaves"), "mixed");
const SONIC_UNIVERSE = pick("Sonic Universe", "SomaFM · Avant-garde jazz", soma("sonicuniverse"), "instrumental");
const BOSSA_BEYOND = pick("Bossa Beyond", "SomaFM · Brazilian bossa and samba", soma("bossa"), "vocal");
const FOLK_FORWARD = pick("Folk Forward", "SomaFM · Indie and alt folk", soma("folkfwd"), "vocal");
const THISTLE = pick("ThistleRadio", "SomaFM · Celtic roots", soma("thistle"), "vocal");
const BOOT_LIQUOR = pick("Boot Liquor", "SomaFM · Americana", soma("bootliquor"), "vocal");
const HEAVYWEIGHT_REGGAE = pick("Heavyweight Reggae", "SomaFM · Roots, dub and ska", soma("reggae"), "vocal");
const INDIE_POP_ROCKS = pick("Indie Pop Rocks!", "SomaFM · Indie pop", soma("indiepop"), "vocal");
const POPTRON = pick("PopTron", "SomaFM · Electropop and indie dance", soma("poptron"), "vocal");
const SEVEN_INCH_SOUL = pick("Seven Inch Soul", "SomaFM · Vintage soul 45s", soma("7soul"), "vocal");
const METAL_DETECTOR = pick("Metal Detector", "SomaFM · Metal", soma("metal"), "vocal");

const RP_MELLOW = pick("Radio Paradise Mellow", "Radio Paradise · Hand-mixed, gentle", "https://stream.radioparadise.com/mellow-128", "vocal");
const RP_ROCK = pick("Radio Paradise Rock", "Radio Paradise · Hand-mixed rock", "https://stream.radioparadise.com/rock-128", "vocal");
const RP_MAIN = pick("Radio Paradise", "Radio Paradise · Eclectic, hand-mixed", "https://stream.radioparadise.com/mp3-128", "vocal");

const FIP_JAZZ = pick("FIP Jazz", "Radio France · Jazz", fip("fipjazz"), "mixed");
const FIP_ELECTRO = pick("FIP Electro", "Radio France · Electronic", fip("fipelectro"), "mixed");
const FIP_ROCK = pick("FIP Rock", "Radio France · Rock", fip("fiprock"), "vocal");
const FIP_GROOVE = pick("FIP Groove", "Radio France · Soul, funk and hip-hop", fip("fipgroove"), "vocal");
const FIP_REGGAE = pick("FIP Reggae", "Radio France · Reggae", fip("fipreggae"), "vocal");
const FIP_HIPHOP = pick("FIP Hip-Hop", "Radio France · Hip-hop", fip("fiphiphop"), "vocal");
const FIP_METAL = pick("FIP Metal", "Radio France · Metal", fip("fipmetal"), "vocal");

const SWISS_JAZZ = pick("Radio Swiss Jazz", "SRG SSR · Jazz, no talk", "https://stream.srg-ssr.ch/m/rsj/mp3_128", "mixed");
const SWISS_CLASSIC = pick("Radio Swiss Classic", "SRG SSR · Classical, no talk", "https://stream.srg-ssr.ch/m/rsc_de/mp3_128", "instrumental");

const LOFI_1 = pick("Nightwave Plaza", "Lofi / Synthwave", "https://radio.plaza.one/ogg", "instrumental");
const LOFI_2 = pick("Laut.fm Lofi", "Lofi Beats", "https://stream.laut.fm/lofi", "instrumental");
const LOFI_3 = pick("0nlineradio LO-FI", "Lofi Hip Hop", "https://stream.0nlineradio.com/lo-fi", "instrumental");
const LOFI_5 = pick("CLIAMP Lofi", "Lofi Hip Hop", "https://radio.cliamp.stream/lofi/stream", "instrumental");
const LOFI_6 = pick("Epic Lounge", "Workday Lounge", "https://stream.epic-lounge.com/workday-lounge", "instrumental");
const LOFI_8 = pick("Hotmix Lo-Fi", "Lofi & Chill", "https://streaming.hotmixradio.com/hotmix-lofi-en-mp3", "instrumental");
const LOFI_9 = pick("Hunter.FM Lo-Fi", "Lofi Beats", "https://live.hunter.fm/lofi_normal", "instrumental");

// Nightride FM (nightride.mp3, chillsynth.mp3) was removed from the Picks on
// 2026-09-18: excluded pending provenance. Its own site names no operator and
// states no licensing, which fails rules R1 and R6 of docs/EXECUTION.md §3.2. That
// is a gap in what could be established, not a finding about its music: the
// ten artists sampled were all real, and it has broadcast since 2019. See the
// register in that file for what would reinstate it.

// Public and university stations whose whole point is alternative rock. All
// three were checked on 2026-09-24; see the register in docs/EXECUTION.md Part 4.
const KEXP = pick("KEXP", "Friends of KEXP · Seattle, DJ-picked", "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", "vocal");
const THE_CURRENT = pick("The Current", "Minnesota Public Radio · Alternative", "https://current.stream.publicradio.org/kcmp.aac", "vocal");
const WXPN = pick("WXPN", "University of Pennsylvania · Adult alternative", "https://wxpnhi.xpn.org/xpnhi", "vocal");

/** Picks by genre id. A genre with none is filled entirely from the directory. */
export const PICKS: Record<string, Station[]> = {
  lofi: [LOFI_1, LOFI_2, LOFI_3, LOFI_5, LOFI_6, LOFI_8, LOFI_9],
  ambient: [GROOVE_SALAD, DRONE_ZONE, GROOVE_SALAD_CLASSIC],
  space: [DEEP_SPACE_ONE, SYNPHAERA, SPACE_STATION, MISSION_CONTROL, DARK_ZONE],
  classical: [SWISS_CLASSIC],
  piano: [],
  scores: [],
  nature: [],
  jazz: [SWISS_JAZZ, FIP_JAZZ, SONIC_UNIVERSE],
  bossa: [BOSSA_BEYOND],
  chillout: [GROOVE_SALAD, SECRET_AGENT, ILL_STREET, LUSH, RP_MELLOW],
  folk: [FOLK_FORWARD, BOOT_LIQUOR, THISTLE],
  reggae: [HEAVYWEIGHT_REGGAE, FIP_REGGAE],
  house: [BEAT_BLENDER, THE_TRIP],
  techno: [DEFCON, FIP_ELECTRO],
  trance: [THE_TRIP, SUBURBS_OF_GOA],
  dnb: [],
  synthwave: [VAPORWAVES],
  idm: [CLIQHOP, DIGITALIS, SPACE_STATION],
  altrock: [KEXP, THE_CURRENT, WXPN],
  indie: [INDIE_POP_ROCKS, POPTRON, RP_MAIN, KEXP],
  rock: [RP_ROCK, FIP_ROCK],
  postrock: [N5MD],
  metal: [METAL_DETECTOR, FIP_METAL],
  blues: [],
  soul: [SEVEN_INCH_SOUL, FIP_GROOVE],
  hiphop: [FIP_HIPHOP, FLUID],
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

/** What is selected on a first launch, and the genre it is queued from. */
export const DEFAULT_GENRE = "ambient";
export const DEFAULT_STATION = GROOVE_SALAD;
