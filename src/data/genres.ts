/**
 * The genre catalog — the app's whole front door.
 *
 * A genre is a set of directory tags that *we* define, never a raw tag. Radio
 * Browser's tags are free text typed by whoever submitted the station, so
 * "lofi", "lo-fi", "lo fi" and "chillhop" are four unrelated tags as far as the
 * directory knows. Each genre lists the spellings that count as it, and the
 * directory is asked for each one and the answers merged.
 *
 * Tags are matched exactly, lowercase. `scripts/audit-genres.mjs` checks how
 * many playable stations each genre actually yields, so a tag set that has
 * quietly dried up gets noticed.
 */

export type Vocals = "instrumental" | "mixed" | "vocal";

export interface GenreDef {
  id: string;
  name: string;
  /** Directory tags that count as this genre. Empty means Picks only. */
  tags: string[];
  /** Tags that disqualify a station from this genre in particular. */
  exclude?: string[];
  /**
   * What a station here most likely is when nothing better is known — the
   * weakest of the three signals, behind a hand-marked Pick and the station's
   * own tags.
   */
  vocals: Vocals;
}

export const GENRES: GenreDef[] = [
  // ── Deep focus ────────────────────────────────────────────────────────────
  {
    id: "ambient",
    name: "Ambient",

    tags: ["ambient", "ambient music", "atmospheric"],
    vocals: "instrumental",
  },
  {
    id: "classical",
    name: "Classical",

    tags: ["classical", "classical music", "baroque", "orchestral", "chamber music", "symphonic"],
    // Opera is classical, and it is the opposite of something to work to.
    exclude: ["opera"],
    vocals: "instrumental",
  },
  {
    id: "scores",
    name: "Film & game scores",

    tags: [
      "soundtrack",
      "soundtracks",
      "film music",
      "movie soundtracks",
      "ost",
      "game music",
      "video game music",
    ],
    vocals: "instrumental",
  },
  // ── Easy ──────────────────────────────────────────────────────────────────
  {
    id: "jazz",
    name: "Jazz",

    tags: ["jazz", "smooth jazz", "bebop", "swing", "cool jazz"],
    vocals: "mixed",
  },
  {
    id: "chillout",
    name: "Downtempo / Chillout",

    tags: ["chillout", "chill", "downtempo", "lounge", "chill out", "trip-hop", "trip hop"],
    vocals: "mixed",
  },
  {
    id: "lofi",
    name: "Lofi",

    tags: ["lofi", "lo-fi", "lo fi", "chillhop", "lofi hip hop", "study"],
    vocals: "instrumental",
  },
  {
    id: "folk",
    name: "Acoustic & folk",

    tags: ["folk", "acoustic", "singer-songwriter", "americana", "bluegrass"],
    vocals: "vocal",
  },
  {
    id: "reggae",
    name: "Reggae & dub",

    tags: ["reggae", "dub", "roots reggae", "ska"],
    vocals: "vocal",
  },
  {
    id: "dnb",
    name: "Drum & bass",

    tags: ["drum and bass", "dnb", "drum & bass", "drum'n'bass", "jungle", "liquid funk"],
    vocals: "mixed",
  },
  {
    id: "synthwave",
    name: "Synthwave",

    tags: ["synthwave", "retrowave", "outrun", "vaporwave", "chillsynth"],
    vocals: "instrumental",
  },
  // ── Wide ──────────────────────────────────────────────────────────────────
  // Two genres that describe what a station *is* rather than what it plays.
  // They were added once the Picks stopped being organised around one
  // broadcaster's channel list: the strongest stations left — WFMU, Radio
  // Paradise, Give the Drummer — are deliberately not single-genre, and
  // filing them under Indie or Folk said something untrue about them.
  {
    id: "eclectic",
    name: "Freeform & eclectic",
    // Stations where a human picks the next record and it could be anything.
    // "variety" is left out on purpose: in the directory it mostly means a
    // talk-and-music mix rather than freeform music.
    tags: ["freeform", "eclectic", "college radio", "community radio", "mixed"],
    exclude: ["talk", "news"],
    vocals: "mixed",
  },
  {
    id: "world",
    name: "World",
    tags: ["world", "world music", "worldmusic", "global", "afrobeat", "afro", "latin"],
    // Religious broadcasting is a large part of this tag space in the
    // directory, and RELIGIOUS_NAME only catches the obvious names.
    exclude: ["gospel", "christian", "religious"],
    vocals: "vocal",
  },
  // ── Band ──────────────────────────────────────────────────────────────────
  {
    id: "indie",
    name: "Indie",

    tags: ["indie", "indie rock", "indie pop"],
    vocals: "vocal",
  },
  {
    id: "altrock",
    name: "Alternative rock",
    // "alternative" and "alternative rock" carry this genre; the rest are the
    // scenes that fed it. "new wave" is deliberately left in Rock's era rather
    // than here — it would pull in 80s synth stations that are not alt rock.
    tags: [
      "alternative",
      "alternative rock",
      "alt rock",
      "grunge",
      "post-punk",
      "britpop",
      "modern rock",
      "college rock",
    ],
    vocals: "vocal",
  },
  {
    id: "rock",
    name: "Rock",

    tags: ["rock", "classic rock", "hard rock"],
    vocals: "vocal",
  },
  {
    id: "soul",
    name: "Soul & funk",

    tags: ["soul", "funk", "motown", "rnb", "r&b", "disco"],
    vocals: "vocal",
  },
];

/**
 * Genres with their tag sets worked out, waiting on Picks.
 *
 * These were in `GENRES` until 2026-10-29 and were removed for 1.0 — not
 * because the tags are wrong, but because none of them has a single station
 * anyone has vouched for. docs/EXECUTION.md Part 4 records what was tried:
 * their long-running stations are overwhelmingly commercial networks whose
 * terms forbid a player like this, or anonymous streams with no operator to
 * ask. Shipping a genre that is empty by default, and filled only by stations
 * nobody checked, would be the app quietly dropping its own standard.
 *
 * They are kept whole rather than deleted so that putting one back is moving
 * its entry into `GENRES` and adding a `PICKS` row — not reconstructing the
 * tag set from scratch. The tags were checked against the live directory and
 * each yields plenty; the gap is Picks, nothing else.
 *
 * Nothing reads this array. It is a record, and the build does not ship it.
 */
export const PLANNED_GENRES: GenreDef[] = [
  {
    id: "space",
    name: "Space / Drone",

    tags: ["drone", "space music", "spacemusic", "dark ambient", "space"],
    vocals: "instrumental",
  },
  {
    id: "piano",
    name: "Solo piano",

    tags: ["piano", "solo piano", "piano music"],
    vocals: "instrumental",
  },
  {
    id: "nature",
    name: "Nature & soundscapes",

    tags: ["nature", "nature sounds", "relaxation", "meditation", "new age", "sleep"],
    vocals: "instrumental",
  },
  {
    id: "bossa",
    name: "Bossa & latin jazz",

    tags: ["bossa nova", "bossanova", "bossa", "latin jazz", "mpb"],
    vocals: "mixed",
  },
  // ── Electronic ────────────────────────────────────────────────────────────
  {
    id: "house",
    name: "Deep house",

    tags: ["deep house", "house", "tech house", "progressive house"],
    vocals: "mixed",
  },
  {
    id: "techno",
    name: "Techno",

    tags: ["techno", "minimal", "minimal techno"],
    vocals: "instrumental",
  },
  {
    id: "trance",
    name: "Trance",

    tags: ["trance", "progressive trance", "psytrance", "goa"],
    vocals: "mixed",
  },
  {
    id: "idm",
    name: "IDM / Electronica",

    tags: ["idm", "electronica", "glitch", "experimental electronic", "leftfield"],
    vocals: "instrumental",
  },
  {
    id: "postrock",
    name: "Post-rock",

    tags: ["post-rock", "post rock", "postrock", "shoegaze", "math rock", "instrumental rock"],
    vocals: "instrumental",
  },
  {
    id: "metal",
    name: "Metal",

    tags: ["metal", "heavy metal", "death metal", "black metal"],
    vocals: "vocal",
  },
  {
    id: "blues",
    name: "Blues",

    tags: ["blues", "blues rock"],
    vocals: "vocal",
  },
  {
    id: "hiphop",
    name: "Hip-hop",

    tags: ["hip-hop", "hip hop", "hiphop", "rap"],
    vocals: "vocal",
  },
];

export function getGenre(id: string): GenreDef | undefined {
  return GENRES.find((g) => g.id === id);
}

/**
 * Tags that mean a station is not, or not mainly, music. Matched against each
 * of a station's tags as a whole word, so "talk" catches "talk radio" without
 * "news" catching "newsoul".
 */
export const NOT_MUSIC = [
  "news",
  "talk",
  "sport",
  "sports",
  "politics",
  "comedy",
  "podcast",
  "podcasts",
  "spoken",
  "information",
  "info",
  "debate",
  "religion",
  "religious",
  "sermon",
  "sermons",
  "preaching",
  "bible",
  "quran",
  "islamic",
  "catholic",
  "christian",
  "gospel",
  "worship",
  "praise",
  "ccm",
  "hymns",
  "church",
  "jesus",
  "orthodox",
  "jewish",
  "torah",
  "koran",
  "islam",
  "muslim",
  "nasheed",
  "anasheed",
  "tilawat",
  "recitation",
  "hindu",
  "bhajan",
  "bhakti",
  "kirtan",
  "devotional",
  "audiobook",
  "audiobooks",
  "traffic",
  "weather",
  "police",
  "scanner",
];

/** Station tags that settle the vocals question better than a genre default. */
export const INSTRUMENTAL_TAGS = ["instrumental", "instrumentals", "no vocals", "beats"];
export const VOCAL_TAGS = [
  "vocal",
  "vocals",
  "vocal jazz",
  "vocal trance",
  "a cappella",
  "acapella",
  "singer-songwriter",
  "choir",
  "choral",
  "opera",
];

/**
 * The same judgement made on a station's *name*. Tags are typed by whoever
 * submitted the station, and a Quran recitation channel filed under "classical"
 * with no other tag sails straight past a tag filter. Names are harder to get
 * wrong ("christ" is spelled out so that Christmas jazz survives). Latin-script
 * words match whole; the Arabic ones match anywhere, since
 * Arabic attaches its article and prepositions to the word.
 */
export const RELIGIOUS_NAME =
  /\b(quran|qur'?an|koran|islam\w*|muslim|bible|gospel|church|worship|praise|jesus|christ(ian\w*)?|catholic|adventist|ministr\w+|sermon\w*|radio maria|hymn\w*|torah|bhajan\w*|kirtan|gurbani|devotional)\b|قرآن|قران|إسلام|اسلام|تلاوة|أناشيد|اناشيد|الدعوة|إنجيل|كنيسة/i;

/**
 * Languages the catalog leaves out altogether, by the directory's language
 * name and ISO code. A house rule for this app, not a judgement about music.
 */
export const EXCLUDED_LANGUAGES = ["arabic", "ar", "ara"];

/** Arabic script, so a station with no language filled in is still caught by
    its name. This also takes Persian and Urdu names, which share the script. */
export const EXCLUDED_SCRIPT =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * A station that says its music is AI-generated, in its name or a tag. See
 * docs/EXECUTION.md §3.2, rule D1. This only catches the ones that say so \u2014 most
 * don't \u2014 which is why the directory is hidden by default and this is merely
 * the floor under the "unverified" setting.
 *
 * A bare "AI" has to stand alone and in capitals: as a substring it would take
 * every station with "rai", "air", "main" or "Thai" in its name, and in lower
 * case it is an ordinary word in Italian ("Radio ai Giovani"). Tags arrive
 * lowercased, so there it is matched as the whole tag instead.
 */
export const AI_BARE = /(?<![A-Za-z0-9])A\.?I\.?(?![A-Za-z0-9])/;
export const AI_WORDING =
  /(?<![a-z0-9])(ai[- ]?(generated|music|radio|beats|lofi|made)|generative|neural|suno|udio|mubert|aiva|boomy|soundraw|beatoven|loudly|endel|stable audio)(?![a-z])/i;
export const AI_TAGS = ["ai", "a.i.", "a.i", "ai music", "ai generated", "ai-generated"];

/**
 * Rule D2: stations built on "royalty-free" libraries. Those libraries are now
 * substantially AI-generated, and a station that draws on one has no way of
 * knowing what it is playing.
 */
export const ROYALTY_FREE_WORDING =
  /royalty[- ]?free|copyright[- ]?free|no[- ]copyright|non[- ]copyright|(?<![a-z])ncs(?![a-z])|dmca[- ]?free|stream(er)?[- ]safe|twitch[- ]safe/i;

/**
 * Genres where AI-generated music concentrates: functional, wordless,
 * interchangeable. docs/EXECUTION.md §3.2 ("Where the risk is"). In these, an unverified
 * station must show some sign of somebody being behind it (see
 * `lacksProvenance` in radioBrowser.ts).
 */
// Includes ids from PLANNED_GENRES (space, piano, nature). They match nothing
// while those genres are out, and are right again the moment one returns.
export const HIGH_RISK_GENRES = new Set([
  "lofi",
  "ambient",
  "space",
  "piano",
  "nature",
  "chillout",
  "synthwave",
]);

/**
 * Hosts that give anyone a stream in minutes. Being on one proves nothing —
 * plenty of real hobby stations are — but a homepage that is only the host's
 * own page means the station has no site of its own.
 */
export const FREE_STREAM_HOSTS =
  /(^|\.)(zeno\.fm|radio\.co|radioking\.(com|io)|caster\.fm|listen2myradio\.com|myradiostream\.com|streamerr\.co|radiojar\.com|laut\.fm|live365\.com|torontocast\.com|fastcast4u\.com|shoutca\.st|radionomy\.com|streamtheworld\.com)$/i;

/**
 * A name that is a search phrase rather than a station: "Lofi Beats to Study
 * 24/7", "Deep Sleep Piano Radio". Red flag from section 7 of the policy.
 */
export const SEARCH_PHRASE_NAME =
  /\b(24\s*\/\s*7|beats to|to (study|sleep|relax|focus)|for (study|studying|sleep|sleeping|relaxation|focus|work|meditation)|study music|sleep music|relaxing music|deep sleep|calm music|background music)\b/i;
