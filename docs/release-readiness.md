# Release readiness audit — prompt

The prompt below is the one to paste when asking for a go/no-go on shipping Tunescape as a
public desktop release. It covers the 1.0 that ships **before** any Supabase work: local-first,
no accounts, no sync, no cloud anything.

Use it whole. It is long on purpose — the point is that a reviewer cannot skip the
uncomfortable parts by answering the easy ones well.

Two notes on using it:

- **It expects the app to be run, not just read.** Section 0 lists the checks that are
  worthless as a code review. An audit that only greps will score the app far too high.
- **Section 14 seeds known suspects.** Those are things we already believe are wrong. They are
  listed so the audit verifies and sizes them rather than spending its budget rediscovering
  them — not so it stops there.

Keep this file updated as the app changes. A readiness prompt that still asks about features
that were cut is worse than no prompt.

---

## The prompt

You are a release engineer and product reviewer doing a go/no-go readiness audit on a desktop
application before its first public release. You have shipped desktop software and you know the
difference between "it works on my machine" and "it survives contact with strangers."

**Application:** Tunescape — a single-player desktop internet radio player for focus work.
**Stack:** Tauri 2 (Rust) + Vite 6 + React 18 + TypeScript. WebView2 on Windows, WKWebView on
macOS, WebKitGTK on Linux.
**Repository:** [PATH]
**Target platforms:** [Windows / macOS / Linux — say which are actually in scope for 1.0]
**Release type:** [public / private beta / internal]
**Distribution:** [direct download / GitHub Releases / store / unsigned]

**Scope.** This is the pre-Supabase release: no accounts, no sync, no server, no telemetry
backend. Anything requiring a backend is out of scope and should not be flagged as missing —
but anything the *absence* of a backend makes harder (crash reporting, catalog updates,
remote kill-switch for a bad station) is in scope as a risk to name.

**What the app does,** so you can judge completeness rather than guess at intent: it plays
curated internet radio, shows a retro audio visualizer, and has a Pomodoro timer that can pause
the radio during breaks. A small Rust HTTP proxy inside the binary re-serves streams from
loopback, because a cross-origin stream without CORS headers makes `createMediaElementSource()`
emit silence and the visualizer needs the Web Audio graph. That proxy also de-interleaves ICY
metadata for now-playing titles. The station catalog is hand-picked by default, with a
community directory (Radio Browser) behind a setting.

---

### 0. Run it before you read it

These cannot be answered by reading source. If you cannot run them, say so explicitly in the
verdict rather than scoring them as passing.

- Build a release bundle for every target platform. Record the command, the time, and whether
  it needed anything not in the README.
- Install from that bundle on a **clean machine or VM** — not the dev box, which has toolchains,
  codecs and cached state a user will not.
- Launch with no prior data: no `localStorage`, no config, first-ever run.
- Launch with **no network**, and with network that drops mid-stream.
- Leave it playing for several hours. Record memory and CPU at start, +1h and +4h.
- Sleep and wake the machine while playing. Change the default audio device while playing.
- Resize to the minimum window size and to a 4K maximise. Change OS display scaling while open.

---

### 1. Build, packaging and distribution

- Reproducible build from a clean checkout following only the README.
- Installer for each target: MSI/NSIS, `.dmg`, `.deb`/`.AppImage`. Do they install, launch,
  and uninstall cleanly? Does uninstall leave data behind, and should it?
- **Code signing and notarization.** Unsigned Windows binaries trigger SmartScreen; unsigned or
  un-notarized macOS builds are refused by Gatekeeper with a message most users read as "this
  app is broken." State plainly what the first-run experience is on each platform today.
- Bundle size, and what dominates it.
- Version number, and whether anything enforces that it was bumped.
- Updater: present, configured, signed? If absent, how does a user ever get a fix?
- Icons at every required size, and how the app looks in the taskbar, dock, alt-tab and the
  installer.

### 2. First run and cold start

- Time from launch to interactive, and to first audio.
- What the window shows before anything loads. Is there a flash of unstyled or wrong-theme
  content?
- First-run with no network: does it explain itself or look broken?
- Is there any onboarding, and does the app need it? If a first-time user cannot work out how
  to start a station within ten seconds, say so.
- Default state: which theme, which visualizer, which station is selected, and is anything
  playing before the user asks?

### 3. Core playback reliability

This is the product. A fault here outranks everything else in this document.

- Stream start latency across the catalog. Which stations are slow, and does the UI say
  anything during the wait?
- Automatic failover: kill a stream mid-play and confirm it moves on, dims the dead one, and
  says so. Confirm it gives up rather than looping forever.
- Dead-station and silence detection thresholds — are they right, or do healthy stations get
  dropped?
- Recovery after network loss and after sleep/wake.
- Audio device change while playing.
- Rapid station switching: click twenty stations in five seconds and confirm the right one ends
  up playing and nothing leaks.
- Long-run stability: memory, CPU, file handles, and whether the audio graph survives hours.
- Volume, mute, and whether the level persists.

### 4. Catalog health and the Picks policy

- Run `npm run audit:genres`. How many genres are thin or empty?
- What fraction of the shipped Picks are actually alive today? Test them.
- What happens when Radio Browser is down, slow, or returns nothing — with the directory
  setting both on and off?
- Is the Picks-only default genuinely the safe default it claims to be? Read
  `docs/no-ai-music.md` and judge whether the shipped catalog honours it.
- A station that goes bad after release: what is the remediation path with no backend?
- Legal: is linking to and re-serving third-party streams through the local proxy defensible?
  Note anything that needs a lawyer rather than guessing.

### 5. Cross-platform parity

- **Linux:** WebKitGTK needs GStreamer plugins for MP3/AAC. Does the app detect their absence
  and say so, or silently play nothing? Is the dependency documented and declared in the `.deb`?
- **macOS:** WKWebView differences — `setSinkId`, HLS, autoplay policy, notification behaviour.
- **Windows:** WebView2 runtime — is it bootstrapped by the installer or assumed present?
- Custom titlebar (`decorations: false`) on each platform: window controls on the correct side,
  snap/tile gestures, double-click to maximise, keyboard window menu.
- Fonts: the UI loads Chivo from Google Fonts. What does the app look like offline, or on a
  machine that blocks that request?

### 6. Data, persistence and migration

- Everything currently persists to `localStorage`, while `tauri-plugin-store` is a declared
  dependency that nothing uses. Pick one and say why.
- Where does user data live on each platform, and is that the conventional location?
- What happens to a user's settings, favorites and pinned genres when the app updates and a
  stored shape has changed? Is there any migration, or does it silently reset?
- Corrupt or partial stored state: does the app start?
- Is there any way to export, reset, or back up settings?
- `localStorage` in a webview can be cleared by the OS or the runtime. Is losing every favorite
  an acceptable failure mode?

### 7. Security

Treat this section as adversarial. The app runs a network listener.

- **The loopback proxy takes an arbitrary `url` query parameter and fetches it**
  (`src-tauri/src/proxy.rs`), and answers with `Access-Control-Allow-Origin: *`. Establish
  concretely: can another local process use this as an open proxy? Can a web page the user
  visits scan loopback ports, find it, and *read* the response cross-origin because of the
  permissive header? What can be reached through it — intranet hosts, link-local addresses,
  cloud metadata endpoints, non-HTTP schemes? Then decide what it needs: a scheme and host
  allowlist, a per-session token the webview passes, binding tighter, or all three.
- Tauri capabilities: is every permission in `src-tauri/capabilities/` actually used?
- CSP: is it as narrow as it can be, and does every allowed origin have a reason?
- Dependency audit — `npm audit`, `cargo audit` — and a judgement on whether anything found
  actually reaches a user.
- Anything executed, eval'd, or interpolated from a station's name, URL or metadata.
- Is the Rust proxy's ICY parser robust against a hostile stream? It parses attacker-controlled
  bytes on every connection.

### 8. Privacy and network egress

- Enumerate **every** request the app makes and to whom: stream hosts, Radio Browser mirrors,
  the iTunes Search API, Google Fonts. For each: what is sent, is it necessary, is it optional,
  and is the user told?
- Track titles are sent to Apple for album art. It is a setting — is it off by default, and is
  the consequence stated where the switch is?
- Any analytics or crash reporting? If none, say so as a fact rather than leaving it implied.
- Is there a privacy statement anywhere a user will find it?

### 9. Performance and resource use

- Idle CPU with the visualizer running, per visualizer, on integrated graphics.
- CPU and memory while playing, over hours.
- Battery impact on a laptop. A focus app that halves battery life is not a focus app.
- Behaviour when minimised or hidden — does the visualizer keep burning frames?
- Startup memory and steady-state memory.
- Frame rate at 4K maximise.

### 10. Accessibility

A live audit already exists and most findings are closed; do not redo it from scratch. Instead:

- Confirm the closed findings really are closed, in a running build rather than in source.
- Run the manual passes that audit never got: NVDA on Windows, Ctrl+/Ctrl− text zoom against a
  fixed-pixel layout, Windows High Contrast, and keyboard-only operation.
- Report anything new, and say whether the app is fit to ship to a screen reader user.

### 11. UI completeness and polish

- Every state of every view: empty, loading, error, offline, one item, very many items.
- Long text: a 90-character station name, a track title with no spaces, a genre with 200
  stations.
- All 24 theme variants at a glance — does any one of them have an unreadable corner?
- All 7 visualizers, in both light and dark, at small and large sizes.
- Window at minimum size: does anything overlap, clip or become unreachable?
- Focus states, hover states, disabled states, and whether they agree with each other.
- Copy review: does anything still say something that is no longer true, or use a developer's
  word for a user's concept?
- Anything visibly unfinished, placeholder, or obviously a developer convenience.

### 12. Error handling and recovery

- Proxy fails to bind at startup. Proxy dies while the app runs.
- Every station in a genre is dead.
- Radio Browser unreachable with the directory setting on.
- Malformed data in `localStorage`.
- A panic in the Rust side — what does the user see?
- Are errors actionable? "Something went wrong" is not.
- Is there any log a user could send you, and can they find it?

### 13. Legal, licensing and support

- Does the project have a licence? It currently has no `LICENSE` file.
- Third-party licence attribution for npm and crate dependencies, and the fonts.
- Radio Browser and iTunes API terms of use — is the app within them?
- Trademark and naming check on "Tunescape."
- Is there a `CHANGELOG.md`, a `SECURITY.md`, and a stated way to report a bug? None exist
  today.
- Support expectations: who answers, and where?

### 14. Known suspects — verify and size these, do not stop at them

These are already believed to be problems. Confirm, size and prioritise them; the audit's value
is in what it finds *beyond* this list.

1. The proxy's unvalidated `url` parameter combined with `Access-Control-Allow-Origin: *`
   (section 7). Suspected release blocker.
2. No `LICENSE`, `CHANGELOG.md`, `SECURITY.md`, or CI of any kind.
3. No code signing or notarization configured; no updater.
4. `tauri-plugin-store` is a dependency that nothing uses; all state is in `localStorage` with
   no migration path.
5. Linux GStreamer codec dependency is undeclared and untested.
6. Google Fonts is a hard runtime dependency for the UI typeface.
7. Volume and last-played station do not persist, while theme and favorites do — an
   inconsistency users will read as a bug.
8. No tray icon, no media key support, no "minimise to tray" — normal expectations for a music
   player that runs all day.
9. Version is still `0.1.0` and nothing enforces bumping it.
10. Accessibility is verified against source only; no screen reader has ever run against it.

---

### Severity

- **Blocker** — do not ship. Data loss, a security hole, a crash on a common path, a legal
  exposure, or a platform where the app simply does not work.
- **Major** — ship only with a conscious, written decision and a fix already scheduled.
- **Minor** — ship, fix in the next release.
- **Polish** — ship, fix when convenient.

### Deliverable

1. **Verdict: SHIP / SHIP WITH CAVEATS / DO NOT SHIP**, and one paragraph saying why. Lead with
   this. Do not bury it after the findings.
2. **Blockers**, each with: what breaks, who it breaks for, how you confirmed it, and what the
   fix costs roughly.
3. **Majors**, same format.
4. **Minors and polish**, listed compactly.
5. **What you could not verify**, and what it would take to. This section is mandatory and an
   audit that leaves it empty is not finished.
6. **The shortest credible path to shippable** — the ordered list of work that turns the verdict
   into SHIP, with rough effort against each item.
7. **What is genuinely good**, briefly. A readiness report that reads as uniformly negative gets
   discounted, and the strong parts are worth knowing so they are not accidentally broken later.

Be specific throughout. Name files, commands, line numbers and observed measurements rather
than categories of concern. Where you are inferring rather than observing, say so.
