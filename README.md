# Tunescape V2

A single-player desktop radio player. Tauri, no database, no multiplayer — pick a genre,
get a retro spectrum visualizer, listen.

Full plan: `../Tunescape/plans/tunescape-v2.md`

## Status

| Phase | State |
|---|---|
| 0 — Scaffold | **done** |
| 1 — Rust audio proxy | **done, needs live verification** |
| 2 — Playback core | seeded (`useRadioPlayer`), not wired to a real catalog UI |
| 3 — The visualizer | previewed (`Spectrum.tsx`), registry not built |
| 4 — UI shell | not started |
| 5 — Desktop integration | not started |
| 6 — Package & ship | not started |

The app currently opens onto the **Phase 1 spike harness**, not the real UI. That is
deliberate: the harness exists to prove the CORS claim before anything is built on top of it.

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

## Using the spike harness

Pick a station on the left, then:

- **Probe this station** runs the same stream twice — once direct, once through the proxy —
  and reports, for each, whether audio reached the element *and* whether the analyser saw
  anything. Those two answers coming apart is the whole point.
- **Probe all stations** sweeps the catalog and tallies the verdicts.
- **Listen** plays through the proxy with the live spectrum, so you can confirm the analyser
  data is musical rather than merely non-zero.

### Reading the verdicts

| Verdict | Meaning |
|---|---|
| Sends CORS | Works either way. The SomaFM reference stations should land here. |
| Was CORS-silenced | Element played, graph was silent. **This is the case that justifies the proxy.** |
| Proxy-only | Not reachable directly at all. |
| Still broken | The proxy did not recover it — investigate before shipping. |
| Genuinely dead | No audio on either path. Prune from the catalog. |

The "Reference (known-good)" group is the control. If those show as dead on the direct path,
the harness is broken, not the stations.

## Layout

```
src-tauri/src/proxy.rs      the audio proxy — CORS, ICY, playlists
src-tauri/src/lib.rs        Tauri setup, binds the proxy, exposes proxy_port
src/lib/probe.ts            the A/B measurement
src/lib/proxy.ts            proxy URLs + Radio Browser mirror resolution
src/hooks/useRadioPlayer.ts persistent playback graph (Phase 2 seed)
src/components/Spectrum.tsx log-binned LED spectrum (Phase 3 preview)
src/data/stations.ts        catalog ported from V1, unverified
src/App.tsx                 the spike harness
```

## Ported from V1

`styles/theme.css`, `styles/fonts.css`, `ErrorBoundary.tsx`, `ui/utils.ts`, and the station
catalog. Everything else here is new. V1's visualizer was **not** ported — `fftSize: 128`
with six linear bands is too coarse, and it drew by mutating DOM element heights.

## Known gaps

- Stations in `src/data/stations.ts` are marked unverified until the probe has run.
- Linux needs GStreamer plugins (`gstreamer1.0-libav`, `gstreamer1.0-plugins-bad`) for MP3/AAC
  under WebKitGTK. Untested there so far.
- No persistence yet — `tauri-plugin-store` is wired into the Rust build but unused.
