import {
  AI_BARE,
  AI_TAGS,
  AI_WORDING,
  EXCLUDED_LANGUAGES,
  EXCLUDED_SCRIPT,
  FREE_STREAM_HOSTS,
  HIGH_RISK_GENRES,
  INSTRUMENTAL_TAGS,
  NOT_MUSIC,
  RELIGIOUS_NAME,
  ROYALTY_FREE_WORDING,
  SEARCH_PHRASE_NAME,
  VOCAL_TAGS,
  type GenreDef,
  type Vocals,
} from "../data/genres";
import { PICKS, type Station } from "../data/stations";
import { isDenied } from "../data/denylist";

/**
 * Radio Browser — the directory that fills each genre out behind its Picks.
 *
 * It is a community listing of tens of thousands of streams and nobody vouches
 * for any of them, so everything that comes back is filtered before it is
 * shown: music only, playable by this app, and wanted by enough other people
 * to be worth a slot.
 *
 * None of that makes a directory station *trusted*. The app shows Picks only
 * by default; this listing is what the "Show unverified stations" setting
 * turns on, and the filters here are the floor under that setting, not a
 * substitute for somebody having checked the station. After that the app leans on what it always has — the
 * player checks a station as it plays and moves down the list when one is dead.
 *
 * Nothing here touches Tauri, so `scripts/audit-genres.mjs` can run it in Node.
 */

// ── Mirrors ─────────────────────────────────────────────────────────────────
// A volunteer-run service behind DNS round-robin. V1 hardcoded a single mirror
// (de1), which is a single point of failure; resolve the live list instead and
// fall back to the known hosts only if that fails.

const FALLBACK_MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
];

let mirrorPromise: Promise<string> | null = null;

export async function pickMirror(): Promise<string> {
  if (mirrorPromise) return mirrorPromise;
  mirrorPromise = (async () => {
    try {
      const res = await fetch("https://all.api.radio-browser.info/json/servers", {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const servers = (await res.json()) as Array<{ name: string }>;
        const names = servers.map((s) => `https://${s.name}`).filter(Boolean);
        if (names.length) return names[Math.floor(Math.random() * names.length)];
      }
    } catch {
      /* fall through to the hardcoded list */
    }
    return FALLBACK_MIRRORS[Math.floor(Math.random() * FALLBACK_MIRRORS.length)];
  })();
  return mirrorPromise;
}

async function getOnce<T>(path: string): Promise<T> {
  const mirror = await pickMirror();
  const res = await fetch(`${mirror}${path}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Radio Browser returned ${res.status}`);
  return (await res.json()) as T;
}

/**
 * One retry. A genre is several requests at once and the mirrors are
 * volunteer-run, so one of them timing out is ordinary — and when it is the
 * genre's main tag that drops, the genre comes back looking nearly empty
 * rather than failing, which is worse.
 */
async function get<T>(path: string): Promise<T> {
  try {
    return await getOnce<T>(path);
  } catch {
    return getOnce<T>(path);
  }
}

// ── Filtering ───────────────────────────────────────────────────────────────

interface Row {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  tags: string;
  codec: string;
  bitrate: number;
  hls: number;
  language: string;
  languagecodes: string;
  votes: number;
  clickcount: number;
  /** 1 when the directory's own checker last reached the stream. */
  lastcheckok: number;
  /** When it last tried, ISO 8601. */
  lastchecktime_iso8601: string;
  /** Non-zero when the directory hit a TLS problem fetching it. */
  ssl_error: number;
}

/**
 * How stale the directory's own check may be. `hidebroken` only drops stations
 * that failed their *last* check, and that check can be days old — which is
 * why roughly one directory station in ten was still dead on arrival. A
 * station the directory has not reached recently is not offered.
 */
const CHECK_MAX_AGE_DAYS = 3;

/** Asked of the directory per tag, before filtering. */
const PER_TAG = 80;
/** Shown per genre, after filtering. */
const PER_GENRE = 60;

/**
 * The bar for a directory station to be shown at all: this many people voted
 * for it. It is the cheapest proxy there is for "real, and music" — a
 * mislabelled talk station or somebody's test stream does not collect votes.
 * Niche genres don't have enough stations to be that choosy, so when the strict
 * bar leaves a genre thin it falls back to the lenient one.
 */
const VOTES_STRICT = 20;
const VOTES_LENIENT = 5;
const THIN = 12;

const tagsOf = (row: Row) =>
  row.tags
    .toLowerCase()
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

/** True when any tag is, or contains as a whole word, one of `words`. */
function tagged(tags: string[], words: string[]): boolean {
  return tags.some((tag) => words.some((w) => tag === w || tag.split(/[\s/&-]+/).includes(w)));
}

/** By the directory's language fields, or failing those, the name's script. */
function unwantedLanguage(row: Row, name: string): boolean {
  const spoken = `${row.language ?? ""},${row.languagecodes ?? ""}`
    .toLowerCase()
    .split(/[,;\s]+/)
    .filter(Boolean);
  return spoken.some((l) => EXCLUDED_LANGUAGES.includes(l)) || EXCLUDED_SCRIPT.test(name);
}

/**
 * Says of itself that its music is AI-generated, or comes from a royalty-free
 * library (docs/EXECUTION.md §3.2, D1 and D2). Exported so the audit can report
 * what these two rules remove.
 */
export function declaresAI(name: string, tags: string[]): boolean {
  if (AI_BARE.test(name) || AI_WORDING.test(name) || ROYALTY_FREE_WORDING.test(name)) return true;
  return tags.some(
    (t) => AI_TAGS.includes(t) || AI_WORDING.test(t) || ROYALTY_FREE_WORDING.test(t),
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * No sign of anybody behind the station: no site of its own, or a name that is
 * a search phrase. Applied only in the high-risk genres, and only ever as
 * "excluded pending provenance" — it says what could not be established, never
 * that the station plays AI music. Returns the reason, or null.
 */
export function lacksProvenance(name: string, homepage: string): string | null {
  const host = hostOf(homepage);
  if (!host) return "no homepage";
  if (FREE_STREAM_HOSTS.test(host)) return "homepage is only its streaming host";
  if (SEARCH_PHRASE_NAME.test(name)) return "name is a search phrase";
  return null;
}

/** Reached by the directory's checker, recently, without a TLS problem. */
function recentlyAlive(row: Row): boolean {
  if (row.lastcheckok !== 1 || (row.ssl_error ?? 0) !== 0) return false;
  const checked = Date.parse(row.lastchecktime_iso8601 ?? "");
  if (Number.isNaN(checked)) return false;
  return Date.now() - checked <= CHECK_MAX_AGE_DAYS * 86_400_000;
}

/** A bitrate the codec can't make listenable. Zero means "not reported". */
function tooThin(row: Row): boolean {
  if (row.bitrate <= 0) return false;
  return /aac|opus|ogg/i.test(row.codec) ? row.bitrate < 48 : row.bitrate < 96;
}

function inferVocals(tags: string[], genre: GenreDef): Pick<Station, "vocals" | "vocalsFrom"> {
  const instrumental = tagged(tags, INSTRUMENTAL_TAGS);
  const vocal = tagged(tags, VOCAL_TAGS);
  // Both or neither says nothing; only a clear one-sided signal counts.
  if (instrumental !== vocal) {
    const vocals: Vocals = instrumental ? "instrumental" : "vocal";
    return { vocals, vocalsFrom: "tags" };
  }
  return { vocals: genre.vocals, vocalsFrom: "genre" };
}

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** "jazz,smooth jazz,usa" + 128 → "Jazz · Smooth Jazz · 128k". */
function describe(tags: string[], row: Row): string {
  // Decade tags ("1930", "80s") say when, not what, and make a poor subtitle.
  const shown = tags
    .filter((t) => t.length > 2 && t.length < 18 && !/^\d/.test(t))
    .slice(0, 2)
    .map(titleCase);
  const quality = row.bitrate > 0 ? `${row.bitrate}k` : row.codec;
  return [...shown, quality].filter(Boolean).join(" · ") || "Radio";
}

/** Same stream, however the broadcaster spelled the scheme or the slash. */
const urlKey = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();

function build(rows: Row[], genre: GenreDef, minVotes: number, taken: Set<string>): Station[] {
  const seen = new Set(taken);
  const out: Station[] = [];
  for (const row of rows) {
    if (out.length >= PER_GENRE) break;
    const url = row.url_resolved || row.url;
    const name = row.name.trim().replace(/\s+/g, " ");
    // HLS is a playlist of segments, which an <audio> element in Chromium
    // can't play without a demuxer this app doesn't ship.
    if (!url || !name || row.hls === 1 || row.votes < minVotes || tooThin(row)) continue;
    if (!recentlyAlive(row)) continue;

    // A broadcaster who refuses third-party players, or who asked to be
    // removed, must not reappear here just because the directory lists them.
    // This used to skip SomaFM only, and for the opposite reason: they were
    // Picks, and the directory repeats each channel across relays.
    if (isDenied(url)) continue;

    const tags = tagsOf(row);
    if (tagged(tags, NOT_MUSIC) || RELIGIOUS_NAME.test(name)) continue;
    if (unwantedLanguage(row, name)) continue;
    if (declaresAI(name, tags)) {
      removedForAI.push(`${genre.id}: ${name}`);
      continue;
    }
    if (HIGH_RISK_GENRES.has(genre.id)) {
      const gap = lacksProvenance(name, row.homepage ?? "");
      if (gap) {
        pendingProvenance.push({ genre: genre.id, name, reason: gap });
        continue;
      }
    }
    if (genre.exclude && tagged(tags, genre.exclude)) continue;

    // Big broadcasters list the same stream many times over.
    const nameKey = name.toLowerCase();
    if (seen.has(nameKey) || seen.has(urlKey(url))) continue;
    seen.add(nameKey);
    seen.add(urlKey(url));

    out.push({ name, artist: describe(tags, row), url, ...inferVocals(tags, genre) });
  }
  return out;
}

// ── Genres ──────────────────────────────────────────────────────────────────

/** Stations left out of high-risk genres this session, with the reason. */
export const pendingProvenance: Array<{ genre: string; name: string; reason: string }> = [];

/** Names dropped by `declaresAI` this session, for the audit to print. */
export const removedForAI: string[] = [];

// Promises, not results, are cached — two callers asking at once share a fetch.
// A failure is evicted so the next open gets to try again.
const promises = new Map<string, Promise<Station[]>>();
const loaded = new Map<string, Station[]>();

/**
 * Everything playable in a genre: its Picks first, then the directory's
 * stations by votes. A genre with no tags is its Picks and nothing else.
 */
export function listGenre(genre: GenreDef): Promise<Station[]> {
  const hit = promises.get(genre.id);
  if (hit) return hit;

  const picks = PICKS[genre.id] ?? [];
  const promise = (async () => {
    if (genre.tags.length === 0) return picks;

    // One request per spelling; a spelling that fails just contributes nothing,
    // unless they all do.
    const answers = await Promise.allSettled(
      genre.tags.map((tag) => {
        const query = new URLSearchParams({
          tag,
          tagExact: "true",
          hidebroken: "true",
          order: "votes",
          reverse: "true",
          limit: String(PER_TAG),
        });
        return get<Row[]>(`/json/stations/search?${query}`);
      }),
    );
    if (answers.every((a) => a.status === "rejected")) {
      throw new Error("Radio Browser could not be reached");
    }

    const byId = new Map<string, Row>();
    for (const a of answers) {
      if (a.status !== "fulfilled") continue;
      for (const row of a.value) byId.set(row.stationuuid, row);
    }
    const rows = [...byId.values()].sort(
      (a, b) => b.votes - a.votes || b.clickcount - a.clickcount,
    );

    // A Pick is never listed twice, under its directory entry as well.
    const taken = new Set(picks.flatMap((p) => [p.name.toLowerCase(), urlKey(p.url)]));
    let found = build(rows, genre, VOTES_STRICT, taken);
    if (picks.length + found.length < THIN) found = build(rows, genre, VOTES_LENIENT, taken);
    return [...picks, ...found];
  })()
    .then((stations) => {
      loaded.set(genre.id, stations);
      return stations;
    })
    .catch((e) => {
      promises.delete(genre.id);
      throw e;
    });

  promises.set(genre.id, promise);
  return promise;
}

/** Genres fetched so far this session — what search can look through. */
export function loadedGenres(): ReadonlyMap<string, Station[]> {
  return loaded;
}
