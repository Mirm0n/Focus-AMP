# Focus AMP V2

A single-player desktop radio player. Tauri, no database, no multiplayer — pick a genre,
get a retro spectrum visualizer, listen.

Plan, decisions, station policy and known gaps: [docs/EXECUTION.md](docs/EXECUTION.md).

## Status

Heading for 1.0 as a free, open-source radio player. Progress and what's left are in
[docs/EXECUTION.md](docs/EXECUTION.md).

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
`127.0.0.1` with the header the webview needs, and while it holds them:

- de-interleaves **ICY metadata** into `now-playing` events (a webview cannot see these at all)
- resolves `.pls` / `.m3u` playlist URLs to the stream behind them
- sidesteps mixed content, since loopback is a trustworthy origin

Verified against live traffic: `stream.zeno.fm` answers a direct request with 302 and no
ACAO; through the proxy it is 200 + ACAO with clean MP3 frame sync.

### Why the proxy is not an open relay

A loopback port is not private. Anything else on the machine can reach it, and so can any web
page in any browser — the ephemeral range takes a second or two to scan. A proxy that takes a
URL and fetches it is, unguarded, a way for a page to launder requests through this app and
reach what it cannot: your own services on `127.0.0.1`, your LAN, a cloud metadata endpoint at
`169.254.169.254`. Three independent guards stop that, each of which has to hold on its own:

| | |
|---|---|
| **A token** | 32 random bytes per run, handed to the webview over Tauri IPC and required on every request. It is never printed or written to disk. A page that finds the port cannot ask Tauri for it. |
| **An origin allowlist** | `Access-Control-Allow-Origin` goes to the app's own webview and nothing else, so a page that somehow had the token still could not read the reply. |
| **A target allowlist** | Upstream must be `http(s)` and must not resolve to a loopback, private, link-local or carrier-NAT address — checked before the request, on each redirect, and again against the address actually connected to, which is what closes DNS rebinding. |

`cargo test -p focus-amp` covers the address and token rules directly. Against a running
build, every unauthenticated request is refused with 403, and a valid token aimed at
`169.254.169.254`, `192.168.1.1`, `file://` or the proxy's own port is refused too.

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

## The catalog: music only, Picks only

Focus AMP is a focus-music app that plays music made by people. The catalog is **Picks and
nothing else**: stations chosen by hand, from broadcasters with named people behind them. The
sidebar lists the genres that have Picks; opening one lists its stations. A search
box sits above both levels. A genre with no Picks yet is not shown at all.

**The catalog is small, and that is the point.** It carried 56 Picks until the broadcasters'
own terms were read properly; 33 of those had to go, 30 of them SomaFM, whose terms refuse
third-party clients "even noncommercial ones". Fourteen more are parked pending permission or
a provenance review. What is left is 20 Picks across 13 genres, every one of which carries a
`terms` record saying where somebody read that we may play it, and on what date. `npm run
check:stations` refuses to build a catalog where that is not true, and the broadcasters who
said no are on a denylist that the directory, favourites and the last-played station are all
filtered through — so a no stays a no by every route. Filling the empty genres back up
honestly is the open work (task L3).

That default is the whole of the app's protection against AI-generated music stations, and it
is deliberate: nothing reaches the list by itself, so nothing unvetted can. The rules for what
may become a Pick, and which stations may appear at all, are in
[docs/EXECUTION.md](docs/EXECUTION.md) Part 3.

**Show community directory** (off by default) fills each genre out from
the community directory and brings back the genres with no Picks. A genre holding both then
splits under two headings, Picks and Community directory, so the two can be told apart. Search, favorites and the remembered last station all
follow the same setting: with it off they see Picks only, and a directory station starred
earlier is kept but not listed until it is turned back on.

With that setting on, a genre is filled from two sources, merged into one list:

- **Picks** (`src/data/stations.ts`) are hand-chosen from broadcasters with named human
  programmers — WFMU, Radio Paradise, KEXP, WXPN, Radio Swiss, WCPE, Stereoscenic, Bassdrive,
  Alpha Boys School Radio, Nightwave Plaza — and marked by hand as instrumental, mixed or
  vocal. They come first, under their own heading, and need no network.
- **The directory** is [Radio Browser](https://www.radio-browser.info), which fills a genre out
  to about sixty stations. A genre is a *set of tags we define* (`src/data/genres.ts`), because
  the directory's tags are free text: "lofi", "lo-fi", "lo fi" and "chillhop" are four
  unrelated tags to it. Results are filtered hard: anything tagged as talk, news, sport or
  religious programming is dropped — and religious stations are caught by *name* as well,
  because a recitation channel filed under "classical" with no other tag passes any tag
  filter. Arabic-language stations are left out by the directory's language field or, failing
  that, an Arabic-script name (a house rule; see `EXCLUDED_LANGUAGES` in `genres.ts`).
  Stations that *say* they are AI-generated or built on a royalty-free library are dropped by
  name and tag — a floor only, since most such stations don't say so. In the genres where
  AI music concentrates (Lofi, Ambient, Space, Piano, Nature, Chillout, Synthwave) a station
  with no site of its own, or a search phrase for a name, is left out pending provenance.
  Also dropped, as are broken, HLS-only, duplicate and low-bitrate
  streams, and a station needs 20 votes to appear (5 in genres too small to be that choosy).

Stations also carry a vocals mark (instrumental, mixed or vocal). The directory has no such
field, so it comes from a Pick's hand mark, else the station's own tags ("instrumental",
"vocal", "choir"…), else the genre's default. It is data the catalog keeps, not something the
list shows: the filter that used it, and the INST / VOX row marks, were both removed — in a
genre of mostly instrumental stations the marks sat on nearly every row and said nothing.

Whichever list a station was picked from travels with it as its queue, so the automatic
failover below moves to the next station *in that list*. It gives up after five dead stations
in a row. The last station and genre are remembered across restarts; the station is
selected, not auto-played.

**Pinned genres and where playback came from.** The pin on a genre row lifts it to the top of
the list, above a hairline rule; pins persist and keep the order you pinned them in. Whatever
list the playing station was picked from is marked in the sidebar — the genre row turns accent
and carries the now-playing glyph, or the Favorites heading does when it came from there. The
queue records its own genre, so a queue restored from an older session marks nothing rather
than guessing.

**Favorites.** Every station row has a star, and so does the player bar for whatever is on.
Starred stations appear in a Favorites section above the genres and work as a list of their
own: if one dies, the player moves to the next favorite. The whole station is stored, not
just its URL, because most of the catalog comes from a directory listing that can change
between sessions.

**Album art.** When a stream announces its track ("Artist - Title" in its ICY metadata), the
cover is looked up in the iTunes Search API and shown in the player bar. It is used only on a
confident match — artist and title both agreeing after edit tags like "(Radio Edit)" and
"feat." are stripped — because a wrong cover reads as a bug and a missing one doesn't. This
sends each track title to Apple, so it is **off by default**, behind a setting
(Settings → Appearance → Now playing); the CSP allows exactly `itunes.apple.com` and
`*.mzstatic.com` for it. The cover is a link to the track on Apple Music, which is the
condition Apple's terms put on showing their artwork, so a result that has artwork but no
store page is discarded rather than displayed. Stations that send no track titles keep the
radio icon.

**Fonts are bundled, not fetched.** Chivo and Chivo Mono ship inside the app as woff2 subsets
under `src/styles/fonts/`, with the SIL Open Font License text beside them. They used to load
from Google Fonts at runtime, which contacted a third party on every launch and left the
interface on `system-ui` offline.

`npm run audit:genres` runs the app's own listing code against the live directory and
reports stations per genre, so a tag set that has quietly dried up gets caught.

## The pomodoro timer

Deadline-based, not tick-based: the remaining time is derived from a stored end
timestamp rather than decremented each second. Background windows throttle timers hard, so a
counter that subtracts one second per tick drifts badly over 25 minutes.

Configurable focus / short / long durations, a long break every N sessions, auto-start,
a synthesised two-note chime, and desktop notifications. Settings persist to `localStorage`.

Notifications go through the app's own `notify` command rather than the notification plugin's
JS API. Windows files a toast under an AppUserModelID, not under the process that sent it, and
the plugin registers ours only for an installed build — so in development every alert arrived
as "Windows PowerShell", with PowerShell's icon. `src-tauri/src/notify.rs` registers the id
under HKCU with the app's name and icon and sends the toast under it, so the notification says
Focus AMP whether the app is installed or run from source. macOS and Linux take the name from
the bundle and still go through the plugin.

The one integration a radio app can offer that a standalone timer cannot: **pause radio on
breaks**. Turn it on and the stream stops when a break begins and the same station comes back
when focus resumes.

## Themes and visualizers

Twelve theme families, each with a light and a dark variant — twenty-four palettes. A variant is
sampled from a specific object rather than being a tint of the other: a receiver came in
black-face and silver-face models, a terminal ran normal and reverse video, the 1984
Macintosh inverted to white-on-black for selection. The accent holds constant across a
family; the chassis flips.

| Family | Light | Dark |
|---|---|---|
| Graphite | Silver-face separate, 1979 | Black-face separate, early 80s |
| Marine | Brushed aluminium receiver, 1977 | Black-face receiver, teal dial lamp |
| Walnut | Cream faceplate, walnut ends | Wood-cabinet receiver, 1974 |
| Braun | Braun T3 pocket radio, 1958 | Braun black series, 1970s |
| Phosphor | Reverse video, same tube | P31 green monitor, 1983 |
| Amber | Reverse video, same tube | Amber monochrome monitor, 1985 |
| Virtual | Reverse video, same LEDs | Virtual Boy, 1995 |
| DMG | Game Boy, 1989 | Game Boy Light, backlit, 1998 |
| Outrun | Miami pastel, same summer | Arcade cabinet, 1986 |
| Grape | iMac G3 Grape, 1999 | Translucent shell, lights off |
| Aqua | Mac OS X 10.0, 2001 | The Graphite appearance, same year |
| Classic | Macintosh System 1, 1984 | The same screen, inverted |

A family also sets the corner radius — square for Classic, tight for the terminals and
Braun, soft for Aqua and Grape — so themes differ in shape as well as colour.

Light / Dark / System sits at the top of the Appearance tab. System tracks
`prefers-color-scheme` continuously, so a machine on a sunset schedule follows without a
restart.

A variant is written as four sampled seeds — chassis, ink, accent, display — and every
structural token (panels, borders, the three text levels, the error colour, unlit display
cells) is derived from them against fixed contrast targets. A seed that would miss a target
is moved the least distance that meets it. Hand-listing the tokens, as this file first did,
left borders and panel steps too faint in every dark variant and accents too pale in several
light ones. `npm run audit:themes` checks all twenty-four variants: text at 4.5:1 or better on
every panel it can sit on, default borders at 3:1, lit display cells at 4.5:1 on the glass.

In every variant the display stays dark glass. On a real silver faceplate the meter
window is a smoked panel, so it is both period-correct and the reason the visualizer stays
legible on a bright chassis.

Seven visualizers, all hand-drawn panels imitating a piece of hardware, each a different
*form* rather than a recolour.

| Visualizer | What it is |
|---|---|
| Ladder | Segmented LED analyser — log bands, colour keyed to column height, peak caps |
| VFD | Fluorescent spectrum — whole segments mirrored about a lit spine, colour printed on the glass in zones, bass read between FFT bins so it slopes instead of stepping |
| Matrix | Dot-matrix LCD — unlit cells stay faintly visible, as a real panel does |
| Phosphor | Oscilloscope tube — triggered sweep that eases between frames, beam brightens where it dwells, no ghost trails |
| Ridge | Pulsar chart — the last few seconds of spectrum as stacked traces with hidden-line removal, drifting up the page |
| Waterfall | Spectrogram — frequency across, time down, level as colour; rows laid on a clock so it scrolls the same at any frame rate |
| Needle | Twin moving-coil meters — a VU needle modelled as a damped spring beside an instant-attack peak meter |

They split three ways by what they show: the spectrum now (Ladder, VFD, Matrix), the signal
over time (Phosphor, Ridge, Waterfall), and plain level (Needle) — the calmest of the lot,
for when a full spectrum is more movement than you want beside a timer.

### On third-party visualizer engines

Butterchurn — a WebGL reimplementation of Milkdrop, Winamp's own visualizer, with the
original community preset library — was integrated and then removed. It works and it is
genuinely the article from that era, but the Milkdrop look is not what this app is for. The
integration is in the history (`f97e653`) if it is ever wanted back, along with the
component-surface hook on the `Visualizer` contract that let a library own its own canvas.

[audioMotion-analyzer](https://github.com/hvianna/audioMotion-analyzer) is the other strong
option and was rejected on licensing: it is AGPL-3.0-or-later, which would require Focus AMP
itself to ship with source available. Not a reason to avoid it, but a deliberate decision
rather than an accidental one.

Adding another is one file in `src/viz/units/` and one line in `registry.ts`. Nothing in the
audio pipeline, the canvas host, or the settings panel changes.

The appearance panel (the slider icon in the title bar) previews every visualizer **live on
the current audio**, and the option toggles filter to whatever the selected one honours.

## Window layouts

The quick bar under the title bar switches layout, display, theme and light/dark without
opening settings. Each is a dropdown whose entries show the thing itself: a schematic of the
layout, the display running live on the current audio, the theme's own colours. Closed, the
bar is a quiet line of four labels. The menus follow the WAI-ARIA menu button pattern —
arrows, Home and End, Enter or Space to choose, Escape back to the trigger. Settings holds
the same choices plus the per-display options.

Settings → Layout rearranges the stage — the display and the timer. The station list, title
bar and transport stay put in every one.

| Layout | What gets the room |
|---|---|
| Console | The display fills the stage, the timer sits in a strip below (the default) |
| Focus | The timer fills the stage, the display shrinks to a meter strip above the transport |
| Split | Display and timer side by side, equal weight |
| Backdrop | The display runs full bleed with the timer floating over it |

Every layout is the same two elements under different styles, so switching keeps the canvas
mounted and the visualizer carries on mid-frame. The large timer sizes itself with container
query units, against the box it was given rather than the window. Adding a layout is an entry
in `src/layout/layouts.ts`, an arrangement in `Stage.tsx` and a glyph in `LayoutTab.tsx`.

## Layout

```
src-tauri/src/proxy.rs         the audio proxy — CORS, ICY, playlists
src-tauri/src/lib.rs           Tauri setup, binds the proxy, exposes proxy_port
src/hooks/useRadioPlayer.ts    playback graph + automatic stream health
src/hooks/usePomodoro.ts       deadline-based timer state machine
src-tauri/src/notify.rs        branded toasts: registers the Windows app id and sends under it
src/hooks/useFavorites.ts      starred stations, persisted
src/hooks/useCatalog.ts        Picks only, or Picks plus the unverified directory
src/theme/themes.ts            theme definitions
src/theme/useAppearance.ts     persisted theme + visualizer + options + layout
src/layout/layouts.ts          the window layouts
src/layout/LayoutGlyph.tsx     schematic of a layout, shared by settings and the quick bar
src/viz/types.ts               the visualizer contract and shared DSP helpers
src/viz/registry.ts            every visualizer the app knows about
src/viz/units/                 ladder, vfd, matrix, phosphor, ridge, waterfall, needle
src/types/butterchurn.d.ts     hand-written declarations (butterchurn ships none)
src/components/VisualizerCanvas.tsx  the canvas host and RAF loop
src/components/SettingsPanel.tsx     appearance, with live previews
src/components/Sidebar.tsx     the genre list, a genre's stations and search
src/components/PlayerBar.tsx   persistent transport
src/components/QuickBar.tsx    dropdowns for layout, display, theme and mode
src/components/Stage.tsx       display + timer, arranged by the chosen layout
src/components/PomodoroPanel.tsx     the timer, as a strip or a full-stage readout
src/lib/proxy.ts               proxy URLs + Radio Browser mirror resolution
src/lib/albumArt.ts            track title → cover, via iTunes Search, confident matches only
src/lib/radioBrowser.ts        the directory: per-genre listing, music-only and quality filters
src/data/genres.ts             the 26 genres: tag sets and vocals defaults
src/data/stations.ts           Picks, the hand-chosen stations per genre
src/App.tsx                    playback orchestration: queue, failover, timer hand-off
```

## Ported from V1

`ErrorBoundary.tsx`, `ui/utils.ts`, and the station catalog. Everything else is new.

V1's visualizer was **not** ported — `fftSize: 128` with six linear bands is too coarse, and
it drew by mutating DOM element heights. V1's stylesheets are gone too: the palette is now
generated from `themes.ts`, and the six Google font families V1 inherited from Figma (of which
five were unused) are down to Chivo and Chivo Mono.

## Known gaps

Worth knowing before you try it:

- **Thirteen genres have no Picks** and are hidden unless you switch the community directory
  on — see the catalog section above. Filling them is the main open work, and it is harder
  than it sounds: the long-running stations in those genres mostly either forbid third-party
  players or name nobody who could vouch for what they play.
- **Windows only** for now. Nothing in the code is deliberately Windows-specific except the
  tray and the notification AppUserModelID, but nothing else has been tested.
- **No updater yet**, so a new version means downloading it yourself.
- **Releases are unsigned**, so Windows SmartScreen will warn about the installer. Signing is
  waiting on an application to the SignPath Foundation.

The full list, with what is planned and what is deliberately not, is in
[docs/EXECUTION.md](docs/EXECUTION.md) Part 6.

## Contributing

Bug reports, platform fixes and new visualizers are welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md) — it covers the build, the checks worth running, and the two
rules that are not style preferences: stations need a provenance record, and a broadcaster's own
terms come first.

**Broadcasters:** to have a station removed, open a *Station removal request* issue. No reason
needed, and we aim to act within seven days.

**Security:** please don't open a public issue. See [SECURITY.md](SECURITY.md).

## Licence

**GPL-3.0-or-later.** See [LICENSE](LICENSE). Anyone may use, study, change and share
Focus AMP; anyone who distributes a changed version has to pass the same freedoms on, which
means nobody can take it closed and sell it.

Focus AMP is free, and free is not incidental: most stations license *personal listening*, and
a player being sold would make their streams part of a product. The reasoning is in
[docs/EXECUTION.md](docs/EXECUTION.md) §1.2.

Third-party dependencies keep their own licences, listed in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) (`npm run notices` regenerates it).

## Donations

Not set up yet. When there is a public release there will be a GitHub Sponsors or Ko-fi link
here. There will never be a paywall on the radio.
