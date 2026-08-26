/**
 * Curated station catalog — seeded from V1's `MUSIC_CATEGORIES`.
 *
 * Nothing here is hand-verified. The player checks each station as it plays
 * (see `useRadioPlayer`) and moves on by itself when one fails, so a stale
 * entry costs a few seconds rather than a broken app.
 */

export interface Station {
  name: string;
  artist: string;
  /** A direct stream URL, or `resolve:<uuid>` for a Radio Browser lookup. */
  url: string;
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
      // Lofi 101.ru removed 2026-08-26 — the endpoint refuses connections
      // (502 from the proxy, three attempts, ~2.6s each). Possibly geo-blocked.
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
      // Two of V1's `resolve:` UUIDs turned out to be SomaFM channels behind a
      // Radio Browser lookup. Pinned to the real URLs: one less network
      // round trip before playback starts, and one less dependency.
      { name: "Synphaera", artist: "SomaFM · Space Ambient", url: "https://ice6.somafm.com/synphaera-256-mp3" },
      { name: "Mission Control", artist: "SomaFM · Space", url: "https://ice5.somafm.com/missioncontrol-128-mp3" },
      { name: "Space Travel", artist: "Sci-Fi", url: "http://spacetravelradio.de:1701/stream/1/" },
      // Resolves to stream.drugradio.ru — a Russian station, content unverified,
      // and "Space Station 1" was only ever a placeholder name.
      { name: "Space Station 1", artist: "Ambient Space", url: "resolve:2f02a25d-9b5d-4c3e-abb7-c43be64ca8d7" },
    ],
  },
  {
    id: "somafm",
    name: "SomaFM",
    stations: [
      // Listener-supported, human-curated, and long-running — the most
      // dependable group in this catalog.
      { name: "Groove Salad", artist: "SomaFM · Ambient", url: "https://ice1.somafm.com/groovesalad-128-mp3" },
      { name: "Drone Zone", artist: "SomaFM · Ambient", url: "https://ice1.somafm.com/dronezone-128-mp3" },
      { name: "Lush", artist: "SomaFM · Vocal", url: "https://ice1.somafm.com/lush-128-mp3" },
    ],
  },
];

export const ALL_STATIONS: Array<Station & { genre: string }> = GENRES.flatMap((g) =>
  g.stations.map((s) => ({ ...s, genre: g.name })),
);
