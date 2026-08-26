/**
 * Curated station catalog — seeded from V1's `MUSIC_CATEGORIES`.
 *
 * Every entry here is unverified until it has been through the Phase 1 probe.
 * V1 could not tell a dead station from a CORS-silenced one (its silence
 * auto-skip fires identically for both), so treat `verified` as the source of
 * truth and re-run the probe before promoting anything.
 */

export interface Station {
  name: string;
  artist: string;
  /** A direct stream URL, or `resolve:<uuid>` for a Radio Browser lookup. */
  url: string;
  /** Set once the station has passed the proxy probe. */
  verified?: boolean;
}

export interface Genre {
  id: string;
  name: string;
  stations: Station[];
}

export const GENRES: Genre[] = [
  {
    id: "lofi",
    name: "Lofi / Chill",
    stations: [
      { name: "Lofi 24/7", artist: "Lofi Hip Hop", url: "http://usa9.fastcast4u.com/proxy/jamz?mp=/1" },
      { name: "Lofi 101.ru", artist: "Lofi / Chill", url: "https://pub0202.101.ru:8443/stream/pro/aac/64/358" },
      { name: "Box Lofi Radio", artist: "Lofi Beats", url: "https://stream.zeno.fm/tabzverz0fctv" },
      { name: "MoE Lofi", artist: "Chillhop", url: "http://stream.zeno.fm/3u1qndyk8rhvv" },
      { name: "LITT Live", artist: "Jazz Beats", url: "https://das-sa39.cdnstream1.com/5582_128" },
      // PAX LO-FI removed 2026-08-26 — excluded pending provenance review.
      // A precaution rather than a finding about the station: anonymous
      // auto-DJ lofi is the hardest category to verify. Don't re-add blind.
    ],
  },
  {
    id: "space",
    name: "Space / Ambient",
    stations: [
      { name: "Space Station 1", artist: "Ambient Space", url: "resolve:2f02a25d-9b5d-4c3e-abb7-c43be64ca8d7" },
      { name: "Space Station 2", artist: "Deep Space", url: "resolve:83accca7-b878-419d-a506-3d21ef2f250f" },
      { name: "Space Travel", artist: "Sci-Fi", url: "http://spacetravelradio.de:1701/stream/1/" },
      { name: "Space Station 3", artist: "Cosmic", url: "resolve:9614eb15-0601-11e8-ae97-52543be04c81" },
    ],
  },
  {
    id: "reference",
    name: "Reference (known-good)",
    stations: [
      // SomaFM sends CORS headers, so these play *and* analyse without the
      // proxy. They are the control group: if the direct column is dead for
      // these, the harness itself is broken, not the station.
      { name: "Groove Salad", artist: "SomaFM · Ambient", url: "https://ice1.somafm.com/groovesalad-128-mp3" },
      { name: "Drone Zone", artist: "SomaFM · Ambient", url: "https://ice1.somafm.com/dronezone-128-mp3" },
      { name: "Lush", artist: "SomaFM · Vocal", url: "https://ice1.somafm.com/lush-128-mp3" },
    ],
  },
];

export const ALL_STATIONS: Array<Station & { genre: string }> = GENRES.flatMap((g) =>
  g.stations.map((s) => ({ ...s, genre: g.name })),
);
