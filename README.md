# Tunescape V2

A single-player desktop radio player. Tauri, no database, no multiplayer — pick a genre,
get a retro spectrum visualizer, listen.

Full plan: `../Tunescape/plans/tunescape-v2.md`

## Status

| Phase | State |
|---|---|
| 0 — Scaffold | **done** |
| 1 — Rust audio proxy | **done** |
| 2 — Playback core | **done** — transport, volume, automatic stream health |
| 3 — The visualizer | previewed (`Spectrum.tsx`), registry not built |
| 4 — UI shell | not started — no genre grid yet, the station list is the whole navigation |
| 5 — Desktop integration | not started |
| 6 — Package & ship | not started |

## Running it

```bash
npm install
npm run tauri dev
```

## Why there is a Rust proxy

A visualizer needs an `AnalyserNode`, which needs `createMediaElementSource()`. That call
carries a CORS rule with teeth: **if the media element's source is cross-origin and the
response carries no `Access-Control-Allow-Origin` header, the node outputs silence.** Not a
dead visualizer — dead audio. Most public Icecast endpoints send no CORS headers.

`src-tauri/src/proxy.rs` fetches upstream from Rust (no CORS there), re-serves the bytes from
`127.0.0.1` with a permissive header, and while it holds them:

- de-interleaves **ICY metadata** into `now-playing` events (a webview cannot see these at all)
- resolves `.pls` / `.m3u` playlist URLs to the stream behind them
- sidesteps mixed content, since loopback is a trustworthy origin

Verified against live traffic: `stream.zeno.fm` answers a direct request with 302 and no
ACAO; through the proxy it is 200 + ACAO with clean MP3 frame sync.

## Stream health is automatic

Radio stations die quietly — the URL still resolves, the element still reports healthy
playback, and nothing comes out. `useRadioPlayer` watches for both failure modes and moves
on by itself:

| Condition | Window | Result |
|---|---|---|
| No decodable audio at all | 12 s | station marked unavailable |
| Playing, but the analyser reads silence | 8 s | station marked unavailable |

On failure the player skips to the next station in the same genre, dims the dead one in the
list, and says so in one line. There is nothing to configure and nothing to press. An
autoplay block is handled separately, so the browser's policy is never counted against a
station.

A manual click on a dimmed station gives it another chance.

## Layout

```
src-tauri/src/proxy.rs        the audio proxy — CORS, ICY, playlists
src-tauri/src/lib.rs          Tauri setup, binds the proxy, exposes proxy_port
src/hooks/useRadioPlayer.ts   playback graph + automatic stream health
src/components/Spectrum.tsx   log-binned LED spectrum (Phase 3 preview)
src/lib/proxy.ts              proxy URLs + Radio Browser mirror resolution
src/data/stations.ts          catalog ported from V1
src/App.tsx                   station list + player
```

## Ported from V1

`styles/theme.css`, `styles/fonts.css`, `ErrorBoundary.tsx`, `ui/utils.ts`, and the station
catalog. Everything else is new. V1's visualizer was **not** ported — `fftSize: 128` with six
linear bands is too coarse, and it drew by mutating DOM element heights.

## Known gaps

- No genre grid yet — Phase 4. The station list is currently the whole navigation.
- Linux needs GStreamer plugins (`gstreamer1.0-libav`, `gstreamer1.0-plugins-bad`) for MP3/AAC
  under WebKitGTK. Untested there so far.
- No persistence — `tauri-plugin-store` is wired into the Rust build but unused, so volume and
  last station reset on every launch.
- The Lofi group is all anonymous auto-DJ streams with no named curator, which is the hardest
  category to verify for AI-generated content. See the note in `stations.ts`.
