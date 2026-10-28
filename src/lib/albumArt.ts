/**
 * Album art for whatever the stream says is playing.
 *
 * A station's only description of the current track is one line of ICY
 * metadata, usually "Artist - Title". That line is looked up in the iTunes
 * Search API — no key, CORS-open, and the best hit rate of the free sources —
 * and the cover is used only when the result clearly is that track. A wrong
 * cover is worse than none: none reads as "this station has no art", wrong
 * reads as the app being broken.
 *
 * This sends each track title to Apple. It is a setting for that reason, it is
 * off until somebody turns it on, and nothing is sent when it is off.
 *
 * Apple's terms for the Search API allow the artwork only as a way to promote
 * their store, shown next to a link to the item itself. So a result is only
 * usable when it carries both, and `findAlbumArt` returns the pair or nothing:
 * a cover with nowhere to go is not something we are licensed to display.
 */

const ENDPOINT = "https://itunes.apple.com/search";

/** Titles that are the station talking about itself, not a track. */
const NOT_A_TRACK = /https?:|www\.|\.com|\.fm\b|\badvert|commercial|station id|jingle|unknown/i;

/** Lowercase, unaccented, alphanumeric only — what two spellings share. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Drop the parts that differ between a broadcast title and a catalog one. */
function core(s: string): string {
  return s
    .replace(/\s*[([][^)\]]*[)\]]\s*/g, " ") // (Radio Edit), [Remastered 2011]
    .replace(/\s+(feat\.?|ft\.?|featuring)\s.+$/i, "")
    .trim();
}

export function parseTitle(title: string): { artist: string; track: string } | null {
  if (!title || NOT_A_TRACK.test(title)) return null;
  // Only the first separator splits: "Artist - Title - Live" keeps its tail.
  const at = title.search(/\s[-–—]\s/);
  if (at < 1) return null;
  const artist = core(title.slice(0, at));
  const track = core(title.slice(at).replace(/^\s[-–—]\s/, ""));
  if (artist.length < 2 || track.length < 2) return null;
  return { artist, track };
}

/** One contains the other, as whole words — "Bonobo" and "Bonobo & Friends". */
function agrees(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  // A two-letter artist "contained" in a long string proves nothing.
  return short.length >= 4 && ` ${long} `.includes(` ${short} `);
}

interface Hit {
  artistName?: string;
  trackName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
}

/** A cover and the store page it must link to. Never one without the other. */
export interface AlbumArt {
  /** The artwork, at 600×600. */
  url: string;
  /** The item's page on Apple Music, which the cover links to. */
  link: string;
}

// Keyed by the raw title. null is remembered too: a track with no match is not
// asked about again every time the stream repeats its metadata.
const cache = new Map<string, AlbumArt | null>();

export async function findAlbumArt(title: string, signal?: AbortSignal): Promise<AlbumArt | null> {
  if (cache.has(title)) return cache.get(title) ?? null;

  const parsed = parseTitle(title);
  if (!parsed) {
    cache.set(title, null);
    return null;
  }

  const query = new URLSearchParams({
    term: `${parsed.artist} ${parsed.track}`,
    media: "music",
    entity: "song",
    limit: "8",
  });
  const res = await fetch(`${ENDPOINT}?${query}`, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`iTunes returned ${res.status}`);
  const data = (await res.json()) as { results?: Hit[] };

  const artist = norm(parsed.artist);
  const track = norm(parsed.track);
  const hit = (data.results ?? []).find(
    (r) =>
      r.artworkUrl100 &&
      (r.trackViewUrl ?? r.collectionViewUrl) &&
      agrees(norm(core(r.artistName ?? "")), artist) &&
      agrees(norm(core(r.trackName ?? "")), track),
  );

  // The URL names its own size; ask for one that is sharp at 2x in a big slot.
  const url = hit?.artworkUrl100?.replace(/\/\d+x\d+bb\./, "/600x600bb.");
  const link = hit?.trackViewUrl ?? hit?.collectionViewUrl;
  // Both, or neither: the artwork is licensed only beside its store link, and
  // `openExternal` will refuse anything that is not https in any case.
  const found = url && link?.startsWith("https://") ? { url, link } : null;
  cache.set(title, found);
  return found;
}
