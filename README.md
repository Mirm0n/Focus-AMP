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
| — Pomodoro | **done** — configurable, with radio integration |
| 3 — The visualizer | **done** — registry, 3 visualizers, 6 themes, appearance settings |
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

## The pomodoro timer

Deadline-based, not tick-based: the remaining time is derived from a stored end
timestamp rather than decremented each second. Background windows throttle timers hard, so a
counter that subtracts one second per tick drifts badly over 25 minutes.

Configurable focus / short / long durations, a long break every N sessions, auto-start,
a synthesised two-note chime, and desktop notifications. Settings persist to `localStorage`.

The one integration a radio app can offer that a standalone timer cannot: **pause radio on
breaks**. Turn it on and the stream stops when a break begins and the same station comes back
when focus resumes.

## Themes and visualizers

Each theme is a specific object from a specific year rather than a hue rotation, and the
palettes are sampled from what those things looked like:

| Theme | Artifact |
|---|---|
| Graphite | Black-face separate, early 80s — amber backlight |
| Silver | Brushed aluminium receiver, 1977 — teal dial lamp |
| Phosphor | P31 green monitor, 1983 — one phosphor, three brightnesses |
| Amber | Amber monochrome monitor, 1985 |
| Classic | Macintosh System 1, 1984 — genuinely 1-bit, black accent |
| Aqua | Mac OS X 10.0, 2001 |

Under the three light themes the display stays dark glass. On a real silver faceplate the meter
window is a smoked panel, so it is both period-correct and the reason the visualizer stays
legible on a bright chassis.

Three visualizers, all hand-drawn panels imitating a piece of hardware, each a different
*form* rather than a recolour.

| Visualizer | What it is |
|---|---|
| Ladder | Segmented LED analyser — log bands, colour keyed to column height, peak caps |
| Scope | Phosphor oscilloscope — zero-crossing trigger, beam dims with velocity, afterglow |
| Matrix | Dot-matrix LCD — unlit cells stay faintly visible, as a real panel does |

### On third-party visualizer engines

Butterchurn — a WebGL reimplementation of Milkdrop, Winamp's own visualizer, with the
original community preset library — was integrated and then removed. It works and it is
genuinely the article from that era, but the Milkdrop look is not what this app is for. The
integration is in the history (`f97e653`) if it is ever wanted back, along with the
component-surface hook on the `Visualizer` contract that let a library own its own canvas.

[audioMotion-analyzer](https://github.com/hvianna/audioMotion-analyzer) is the other strong
option and was rejected on licensing: it is AGPL-3.0-or-later, which would require Tunescape
itself to ship with source available. Not a reason to avoid it, but a deliberate decision
rather than an accidental one.

Adding another is one file in `src/viz/units/` and one line in `registry.ts`. Nothing in the
audio pipeline, the canvas host, or the settings panel changes.

The appearance panel (the slider icon in the title bar) previews every visualizer **live on
the current audio**, and the option toggles filter to whatever the selected one honours.

## Layout

```
src-tauri/src/proxy.rs         the audio proxy — CORS, ICY, playlists
src-tauri/src/lib.rs           Tauri setup, binds the proxy, exposes proxy_port
src/hooks/useRadioPlayer.ts    playback graph + automatic stream health
src/hooks/usePomodoro.ts       deadline-based timer state machine
src/theme/themes.ts            theme definitions
src/theme/useAppearance.ts     persisted theme + visualizer + options
src/viz/types.ts               the visualizer contract and shared DSP helpers
src/viz/registry.ts            every visualizer the app knows about
src/viz/units/                 ladder, scope, matrix
src/types/butterchurn.d.ts     hand-written declarations (butterchurn ships none)
src/components/VisualizerCanvas.tsx  the canvas host and RAF loop
src/components/SettingsPanel.tsx     appearance, with live previews
src/components/PlayerBar.tsx   persistent transport
src/components/PomodoroPanel.tsx
src/lib/proxy.ts               proxy URLs + Radio Browser mirror resolution
src/data/stations.ts           catalog
src/App.tsx                    station list + display + timer + player bar
```

## Ported from V1

`ErrorBoundary.tsx`, `ui/utils.ts`, and the station catalog. Everything else is new.

V1's visualizer was **not** ported — `fftSize: 128` with six linear bands is too coarse, and
it drew by mutating DOM element heights. V1's stylesheets are gone too: the palette is now
generated from `themes.ts`, and the six Google font families V1 inherited from Figma (of which
five were unused) are down to Chivo and Chivo Mono.

## Known gaps

- No genre grid yet — Phase 4. The station list is currently the whole navigation.
- Linux needs GStreamer plugins (`gstreamer1.0-libav`, `gstreamer1.0-plugins-bad`) for MP3/AAC
  under WebKitGTK. Untested there so far.
- Volume and last station reset on every launch. Theme, visualizer, appearance options and
  pomodoro settings persist, but via `localStorage` rather than `tauri-plugin-store`, which is
  still wired but unused.
- The Lofi group is all anonymous auto-DJ streams with no named curator, which is the hardest
  category to verify for AI-generated content. See the note in `stations.ts`.
