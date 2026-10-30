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

**One thing is on by default.** About eight seconds after launch, the app asks
GitHub whether a newer version of Focus AMP exists. The request carries no
account, no identifier and nothing about you — it is an anonymous fetch of a
public file, like opening the releases page in a browser. GitHub sees an IP
address, as any website does.

It is on by default because a program that plays streams off the internet and
cannot be patched is the more dangerous of the two options; version 0.1.0 of
this app shipped a local HTTP proxy with a real hole in it, and that is the
kind of thing an update exists to close. **Settings → General → Check for
updates** turns it off, and then updates have to be fetched by hand.

Nothing is installed without you pressing a button, and nothing can be sent to
this machine from outside. The app asks; it is never told. Updates are
signature-checked against a key compiled into the app, so one that has not been
signed by the maintainer is refused.

**Two more are off until you switch them on.**

| Setting | Where | What it sends | To whom |
|---|---|---|---|
| Community directory | Settings → Stations | The genre tags being browsed, **and anything typed in the search box** | [Radio Browser](https://www.radio-browser.info), a volunteer-run directory |
| Album art | Settings → Appearance → Now playing | The "Artist – Title" line the station is broadcasting | Apple's iTunes Search API |

Album art is the more revealing of the two, because a track title is a fact
about what you are listening to right now. That is why it is off by default and
why it says so on its own setting.

The search box is worth its own line. With the community directory on, what you
type is sent to Radio Browser so it can look through the whole directory rather
than only the genres you have opened. With it off, nothing you type leaves the
machine — search then covers the Picks, which are already on disk.

**Nothing else.** The fonts are bundled in the app rather than fetched from
Google (`src/styles/fonts/`), so with the update check off and both settings
off, launching it offline contacts nobody at all.

## What stays on your computer

Everything the app remembers lives in your browser-profile storage inside the
app, under the `focusamp:` prefix, and never leaves the machine:

- your theme, layout and visualizer settings
- whether the update check is on
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
