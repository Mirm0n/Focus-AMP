# Tunescape 1.0 — execution doc (free, open-source radio)

The build instructions for Tunescape 1.0: a **free, open-source internet radio player** for
Windows. Every decision is already made. Each task says where the work happens and when it
counts as done. Anyone picking up the work, a person or an agent, should be able to start
from this file alone.

- **Live dashboard:** [Road to 1.0](https://claude.ai/artifact/Bkn7yhCGz3gGHUkqxjRX4G) tracks
  progress. Update it whenever a box here gets ticked.
- **Rights reference:** [Music Rights](https://claude.ai/artifact/9sQZMLtcvVzeTfXTtwY99y) records
  each broadcaster's published terms, with sources.
- **Still in force:** `docs/music-plan.md` (how the catalog works: Picks plus the directory) and
  `docs/no-ai-music.md` (which stations may be Picks).
- **Parked:** the paid, Audius-only plan lives on branch `mvp/audius`. It isn't part of 1.0.

Last updated 2026-09-27.

---

## 1. The decision rule

In priority order:

1. **Respect every station's published terms and every removal request.** Where a station
   forbids third-party players, it isn't in Tunescape, not even through the directory.
2. **The fastest route to a public release.**
3. **Choices that won't need redoing later.**

## 2. Why free and open source

Most stations license **personal listening**. A paid app made their streams part of a product
being sold, which their terms forbid. A free, open-source player is a tool a person uses to
listen personally, like VLC or a car radio, which is how established open-source radio players
built on the same Radio Browser directory operate. It also makes the project eligible for free
code signing (SignPath Foundation), and removes the trial, payment and licensing work. This is a
reading of published terms, not legal advice.

## 3. Decisions

| # | Decision | Reopen when |
|---|---|---|
| R1 | **Free and open source, licensed GPL-3.0-or-later.** Anyone may use, study and improve it; nobody may take it closed and sell it. | Before the repo goes public, if MIT is preferred |
| R2 | **Radio is the product.** The Audius work stays parked on `mvp/audius`. | After 1.0, as an optional mode at most |
| R3 | **The catalog:** curated Picks by default, plus the Radio Browser directory behind a working "Show community directory" setting (off by default) | — |
| R4 | **Station eligibility.** A station can't appear at all (Pick or directory) if its terms forbid third-party players, even free ones. It can be a Pick if its terms allow listening through other players or say nothing against it, and it passes the no-AI review. Stations whose terms restrict reuse or brand use are asked for permission, and meanwhile are neither Picks nor listed. | Each time terms or permissions change |
| R5 | **Neutral presentation:** station name, a one-line description, genre, and a "Visit station" link to the broadcaster's own site. No logos, and no wording that implies endorsement. | A station asks for something else |
| R6 | **Removal on request, within 7 days,** through a GitHub issue template or email. The host goes on the denylist, which also filters the directory. | — |
| R7 | **The no-AI promise stays** (`docs/no-ai-music.md`). Picks pass R1–R8; the directory keeps its filters and stays off by default. | — |
| R8 | **Distribution:** GitHub Releases. The first public release goes out unsigned as a beta (required to apply to SignPath), then 1.0 is signed through SignPath at $0. A Microsoft Store listing and winget are optional extras later. | — |
| R9 | **Updates** through the Tauri updater from GitHub Releases, with a self-generated signing key ($0) | — |
| R10 | **Money:** donations only (GitHub Sponsors, Ko-fi). No paywall. | Never a paywall on the radio |
| R11 | **The local stream proxy stays**, because the visualizer needs it for live radio. Its security fix, tracked separately, is a **launch blocker.** | — |
| R12 | **Album art:** off by default. When on, the cover sits next to an Apple Music link, as Apple's terms require. | — |
| R13 | **Windows first.** Linux next (Flathub suits open-source apps), macOS later. | After 1.0 |
| R14 | **The legal review is optional now:** a short check of the station-listing policy and privacy policy, if budget allows | — |

## 4. The station picture under R4

The 54 current Picks, classified under the free-player reading. This is the **starting point
for task L1**, which confirms each one against the source links on the Music Rights page.

| Status | Picks | Stations |
|---|---|---|
| **Keep** (terms allow players or are silent) | 8 | KEXP (publishes its stream URLs for third-party players), Radio Swiss Jazz and Classic (publish URLs for internet radios), Radio Paradise Main, Rock and Mellow (no terms; historically welcomes developers), Nightwave Plaza (public API, third-party clients exist), WXPN (no terms) |
| **Hold for the no-AI review** (terms are fine; A2 never ran) | 5 | Hotmix Lo-Fi (household use is personal listening), 0nlineradio LO-FI, Epic Lounge, Hunter.FM Lo-Fi, CLIAMP Lofi |
| **Ask first** (terms restrict reuse or brand use) | 9 | Radio France FIP ×7, The Current (MPR; its URL also returns 404), laut.fm Lofi |
| **Exclude** | 32 | SomaFM ×30 (forbids third-party clients even when free), Box Lofi Radio (demoted under the no-AI policy), BGMVibes (dead) |

The genres left without a Pick are the main work of Phase 1 (task L3).

## 5. Specs

### 5.1 Station terms record

Every Pick in `src/data/stations.ts` gets a `terms` record, and the check in §5.3 refuses
builds without it:

```ts
interface StationTerms {
  status: "allows-players" | "silent" | "permission";
  source: string;          // URL of the terms page, stream-URL page or saved email
  checked: string;         // ISO date a person read it
  note?: string;
}
```

### 5.2 Denylist

`src/data/denylist.ts` lists hosts that never play: a station that forbids third-party players
(`somafm.com`), or one that asked to be removed. The directory filters them out before anything
is shown, and favorites and the last station drop them on load.

### 5.3 `check:stations`

`npm run check:stations` runs first in `npm run build` and fails if:

- a Pick has no `terms` record, or an unknown status
- a Pick's host is on the denylist
- a Pick isn't recorded in the register in `docs/no-ai-music.md` (R8)

It prints the number of Picks per genre.

## 6. Phases

### Phase 0 — Open-source groundwork (≈ 1 h agent time + U1)

- [ ] **O1 Licence and project files:** `LICENSE` (GPL-3.0), licence fields in `package.json`
      and `Cargo.toml`, a README that says what the app is and how to build, contribute and
      donate, `CONTRIBUTING.md`, `SECURITY.md` (how to report a vulnerability privately), and
      issue templates, including **"Station removal request"**.
- [ ] **O2 Pre-publication scan:** search the full git history for secrets, keys, personal paths
      and private notes before the repo goes public, and fix anything found first.
- [ ] **O3 Third-party notices:** generate licence notices for the npm and Cargo dependencies,
      and the Chivo fonts (OFL).
- **Done when:** the repo could go public today without exposing anything, and its licence is
  unambiguous.

### Phase 1 — A catalog that respects every station (≈ 4–6 h agent time + U2, U3)

- [ ] **L1 Confirm every Pick under R4:** check each of the 54 against its source link, finalise
      §4, and update the Music Rights page.
- [ ] **L2 Apply it:** remove the 32 excluded Picks; move "ask first" and "hold" stations into the
      register as parked; add `terms` records (§5.1) and the denylist (§5.2). Filter the
      directory, favorites and the last station through the denylist.
- [ ] **L3 Replacement Picks:** find stations with permissive or silent terms for every genre left
      empty, starting with Ambient, Space / Drone, Chillout, Folk, Reggae, House, Techno, Trance,
      IDM, Post-rock, Metal, Soul and Hip-hop. Each needs a named operator (R1–R8 of the no-AI
      policy), terms that allow players, and a working stream. Target: at least 2 per genre,
      presented to you for a listen (U2).
- [ ] **L4 The directory setting works:** restore the "Show community directory" setting (the
      audit found it forced on and its tab unmounted), off by default.
- [ ] **L5 Presentation:** a "Visit station" link on every station, neutral descriptions, no logos,
      and a "Request removal" link in Settings → About.
- [ ] **L6 Permission emails:** a short, friendly email for the "ask first" stations and for any
      replacement whose terms are unclear. The agent drafts; you send (U3).
- [ ] **L7 Album art (R12):** off by default, with an Apple Music link beside the cover.
- [ ] **L8 `check:stations`** (§5.3), wired into `npm run build`.
- **Done when:** every visible genre has at least 2 Picks with terms records, nothing on the
  denylist can play from anywhere, and the build refuses a Pick without a terms record.

### Phase 2 — Launch blockers and fixes (≈ 4–6 h agent time)

- [ ] **B1 Proxy security fix** (tracked separately). Launch blocker.
- [ ] **B2 Bring over the proven fixes from `mvp/audius`:** an interrupted `play()`
      (`AbortError`) is never a failure, so fast switching no longer marks stations dead (audit
      A3), and favorites and the last station restore through the current catalog.
- [ ] **B3 Audit quick fixes:** the visualizer idle loop (stop when stopped, minimized or hidden;
      30 fps cap), always on top (permission, effect in `App.tsx`, error caught), validation of the
      saved `mode` plus a "Reset settings" button, remembered volume, bundled fonts, validation of
      timer settings, clipping at 880×560, and the toast icon out of `%TEMP%`.
- [ ] **B4 Reflow at 200% zoom:** every control reachable at 880×560.
- [ ] **B5 About screen:** version, GPL licence, source code link, donate link, the station
      policy and removal link, third-party notices.
- [ ] **B6 Docs:** README catalog section, the register updated, and a privacy policy (the app
      contacts the stations you play, Radio Browser when the directory is on, and Apple only when
      album art is on; no accounts, no tracking).
- **Done when:** the release audit's blockers and majors are closed, with idle CPU under 3% of a
  core.

### Phase 3 — Public release (≈ 2–3 h agent time + U4, U5)

- [ ] **D1 CI:** a GitHub Actions workflow runs the checks on every push, and on a version tag
      builds the Windows installers and attaches them to a GitHub Release.
- [ ] **D2 Updater (R9):** `tauri-plugin-updater` against GitHub Releases, with a self-generated
      key. An installed beta updates itself to the next release.
- [ ] **D3 Beta release (v0.9, unsigned):** release notes, and install instructions explaining the
      SmartScreen warning.
- [ ] **D4 Release verification:** automated checks on the built installer (every visible genre
      plays, idle CPU, restart persistence, clean exit, accessibility checks).
- [ ] **D5 1.0, signed through SignPath** once the application is approved.

## 7. Your tasks

- [ ] **U1** Create the public GitHub repository, or confirm the current one can go public, and
      turn on two-factor authentication (SignPath requires it).
- [ ] **U2** Listen to the replacement Picks from L3 and approve or reject each one.
- [ ] **U3** Send the permission emails the agent drafts in L6.
- [ ] **U4** Publish the v0.9 beta release on GitHub.
- [ ] **U5** Apply to the SignPath Foundation for free signing, right after the beta. Review takes
      about 1–2 weeks.
- [ ] **U6** Optional: set up GitHub Sponsors or Ko-fi.
- [ ] **U7** Optional: a short legal check of the station policy and privacy policy (R14).
- [ ] **U8** Check the name "Tunescape" on GitHub and in a trademark search before announcing.

## 8. After 1.0

| Release | Scope |
|---|---|
| 1.0.x | Stations that grant permission join as Picks. Fix what users report. |
| 1.1 | Linux (Flathub, AppImage). The volume slider fix for assistive tech. An optional Microsoft Store listing and winget. |
| Later | macOS. Optional Supabase sync, only if it stays free. The Audius "continuous music" mode, if wanted. |

## 9. Verification commands

```bash
npm test                  # unit tests
npm run check:stations    # terms records, denylist, register
npm run build             # type check + vite build (runs check:stations)
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build       # release build
```

## 10. Changelog

- **2026-09-27** Created. Tunescape becomes a free, open-source radio player (GPL-3.0). The paid,
  Audius-only plan is parked on `mvp/audius`.
