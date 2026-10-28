# Privacy

Short version: Focus AMP has no account, no server of its own, and no
analytics. Nothing about you is collected, because there is nowhere to collect
it to.

This is written to be checkable rather than reassuring. Every claim below names
the file that implements it, so you can disagree with the code rather than with
the prose.

Last updated 2026-10-29, for version 0.1.0.

## What leaves your computer

**With the default settings: one thing.** When you press play, the app connects
to the station's stream. The station's server sees your IP address, as it would
if you opened the stream in VLC or a browser, and whatever its own logging
policy says it keeps. That is between you and the broadcaster, and every
station's own page is linked from its row in the app.

The connection is made by the app's local proxy
(`src-tauri/src/proxy.rs`), which identifies itself as `FocusAMP/2.0`. It sends
no identifier of you, because it has none.

**Two things are off until you switch them on.**

| Setting | Where | What it sends | To whom |
|---|---|---|---|
| Community directory | Settings → Stations | The genre tags being browsed | [Radio Browser](https://www.radio-browser.info), a volunteer-run directory |
| Album art | Settings → Appearance → Now playing | The "Artist – Title" line the station is broadcasting | Apple's iTunes Search API |

Album art is the more revealing of the two, because a track title is a fact
about what you are listening to right now. That is why it is off by default and
why it says so on its own setting.

**Nothing else.** The fonts are bundled in the app rather than fetched from
Google (`src/styles/fonts/`), so launching it offline contacts nobody at all.
There is no update check in 0.1.0; if one is added it will be listed here
before it ships.

## What stays on your computer

Everything the app remembers lives in your browser-profile storage inside the
app, under the `focusamp:` prefix, and never leaves the machine:

- your theme, layout and visualizer settings
- favourites, pinned genres, and the last station you played
- the Pomodoro timer's state, and the equaliser
- the list of local audio files you have added — the paths only, never the
  files themselves

You can delete all of it by deleting the app's data folder. Uninstalling leaves
it behind, which is deliberate: reinstalling should not lose your favourites.

## What the app never does

- No analytics, telemetry, crash reporting or "anonymous usage statistics".
- No account, login, or sync.
- No advertising, and no advertising identifiers.
- No reading of files you have not explicitly added through the file picker.
  The local-file proxy serves an allowlist and refuses everything else
  (`AllowedFiles`, in `src-tauri/src/proxy.rs`).
- No sale or sharing of anything, because there is nothing held to sell.

## The local proxy

The app runs a small HTTP server on `127.0.0.1` on a random port, because a
visualizer needs CORS-clean audio and public radio streams do not send CORS
headers. It is not reachable from outside your machine, and on your machine it
is gated three ways: a random token per run that only the app's own window can
obtain, an origin allowlist, and a refusal to fetch anything that resolves to a
loopback, private or link-local address. The README section "Why the proxy is
not an open relay" explains the reasoning.

## Children

Focus AMP is not directed at children and collects nothing from anybody,
including them.

## Questions, or a correction

If something here does not match what the code does, that is a bug and worth an
issue — a privacy policy that overstates is as bad as one that understates.
Contact details are in [SECURITY.md](SECURITY.md).
