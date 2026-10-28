# Focus AMP — the build doc

Focus AMP 1.0 is a **free, open-source internet radio player** for Windows, licensed GPL-3.0.
This is the project's one working document: the plan, the decisions, how the catalog works,
the station policy and register, and what's known to be missing. Anyone picking up the work,
a person or an agent, should be able to start from this file alone.

- **Progress dashboard:** [Road to 1.0](https://claude.ai/artifact/Bkn7yhCGz3gGHUkqxjRX4G), the
  only live page. Tick a box here, then update its row there.
- **Front page:** `README.md` covers what the app is, how to run it, and how the code is laid
  out. Everything about plans and policy lives here instead.
- **Parked:** the paid, Audius-only plan is on branch `mvp/audius`. It isn't part of 1.0.

Last updated 2026-09-27.

**Contents.** Part 1: the plan · Part 2: how the catalog works · Part 3: station policy (terms
and no-AI rules) · Part 4: the Picks register · Part 5: accessibility · Part 6: known gaps ·
Part 7: parked research · Changelog.

---

# Part 1 — The plan

## 1.1 The decision rule

In priority order:

1. **Respect every station's published terms and every removal request.** Where a station
   forbids third-party players, it isn't in Focus AMP, not even through the directory.
2. **The fastest route to a public release.**
3. **Choices that won't need redoing later.**

## 1.2 Why free and open source

Most stations license **personal listening**. A paid app would make their streams part of a
product being sold, which their terms forbid. A free, open-source player is a tool a person
uses to listen personally, like VLC or a car radio, which is how established open-source radio
players built on the same Radio Browser directory operate. It also makes the project eligible
for free code signing (SignPath Foundation), and removes the trial, payment and licensing work.
This is a reading of published terms, not legal advice.

## 1.3 Decisions

| # | Decision | Reopen when |
|---|---|---|
| C1 | **Free and open source, licensed GPL-3.0-or-later.** Anyone may use, study and improve it; nobody may take it closed and sell it. | Before the repo goes public, if MIT is preferred |
| C2 | **Radio is the product.** The Audius work stays parked on `mvp/audius`. | After 1.0, as an optional mode at most |
| C3 | **The catalog:** curated Picks by default, plus the Radio Browser directory behind a working "Show community directory" setting (off by default) | — |
| C4 | **Station eligibility (Part 3.1).** A station that forbids third-party players, even free ones, can't appear at all, as a Pick or in the directory. One that allows players or says nothing against them can be a Pick, after the no-AI rules (Part 3.2). One that restricts reuse or brand use is asked for permission, and meanwhile is neither a Pick nor listed. | Each time terms or permissions change |
| C5 | **Neutral presentation:** station name, a one-line description, genre, and a "Visit station" link to the broadcaster's own site. No logos, and no wording that implies endorsement. | A station asks for something else |
| C6 | **Removal on request, within 7 days,** through a GitHub issue template or email. The host goes on the denylist, which also filters the directory. | — |
| C7 | **The no-AI promise stays** (Part 3.2). Picks pass R1–R8; the directory keeps its filters and stays off by default. | — |
| C8 | **Distribution:** GitHub Releases. The first public release goes out unsigned as a beta (required to apply to SignPath), then 1.0 is signed through SignPath at $0. A Microsoft Store listing and winget are optional extras later. | — |
| C9 | **Updates** through the Tauri updater from GitHub Releases, with a self-generated signing key ($0) | — |
| C10 | **Money:** donations only (GitHub Sponsors, Ko-fi). No paywall. | Never a paywall on the radio |
| C11 | **The local stream proxy stays**, because the visualizer needs it for live radio. Its security fix, tracked separately, is a **launch blocker.** | — |
| C12 | **Album art:** off by default. When on, the cover sits next to an Apple Music link, as Apple's terms require. | — |
| C13 | **Windows first.** Linux next (Flathub suits open-source apps), macOS later. | After 1.0 |
| C14 | **The legal review is optional:** a short check of the station-listing policy and privacy policy, if budget allows | — |
| C15 | **Purpose: audience and a personal project, not revenue.** No paywall and no paid tier planned. Focus AMP gets the time budget in this plan (about 12–16 agent hours plus the U tasks); anything beyond waits until after 1.0, so it doesn't take time from money-making projects. No contributor agreement: contributions come in under GPL-3.0 like everything else. | If a real audience appears and money becomes a goal: the licensed-music "Focus" work on `mvp/audius` is the starting point |
| C16 | **Audience hooks:** a "Made by" credit and a short "More from the maker" section in About, linking to the maker's site and other projects, plus GitHub star and donate links. Nothing in the player itself, and no tracking. | — |

## 1.4 The station picture

**Applied 2026-10-29 (tasks L1 and L2).** The 56 Picks the app shipped with were checked
against Part 3.1 and the verdicts carried out. What is left:

| Status | Picks | Stations |
|---|---|---|
| **Kept** | 9 | KEXP, WXPN, Radio Paradise Main/Rock/Mellow, Radio Swiss Jazz/Classic, Nightwave Plaza |
| **Added** (task L3, first pass) | 9 | WFMU ×4, Radio Swiss Pop, The Classical Station (WCPE), Ambient Sleeping Pill, a.m. ambient, Ambient Modern, Bassdrive |
| **Removed to the denylist** | 31 | SomaFM ×30 (terms forbid third-party clients), Box Lofi Radio (zeno.fm) |
| **Removed, dead** | 1 | BGMVibes |
| **Parked: awaiting permission** (U3) | 9 | Radio France FIP ×7, The Current (MPR), laut.fm Lofi |
| **Parked: awaiting the no-AI review** | 5 | Hotmix Lo-Fi, 0nlineradio LO-FI, Epic Lounge, Hunter.FM Lo-Fi, CLIAMP Lofi |

18 Picks across 12 genres. `npm run check:stations` prints the count per genre and fails the
build if any of this drifts.

**The 14 genres with no Picks** — space, piano, scores, nature, bossa, reggae, house, techno,
trance, idm, postrock, metal, blues, hiphop — are not offered at all unless the community
directory is switched on. That is the honest state: a genre with nothing vouched for in it
should not pretend otherwise, and padding it with a station that does not belong there would
make the list longer and the app worse. Filling them is the rest of **L3**.

Every added station was verified on 2026-10-29: terms read and quoted in its `terms` record,
and the stream confirmed to answer with audio.

## 1.5 Specs

### Station terms record

Every Pick in `src/data/stations.ts` gets a `terms` record, and `check:stations` refuses builds
without one:

```ts
interface StationTerms {
  status: "allows-players" | "silent" | "permission";
  source: string;          // URL of the terms page, stream-URL page or saved email
  checked: string;         // ISO date a person read it
  note?: string;
}
```

### Denylist

`src/data/denylist.ts` lists hosts that never play: a station that forbids third-party players
(`somafm.com`), or one that asked to be removed. The directory filters them out before anything
is shown, and favorites and the last station drop them on load. Each entry carries a reason and
a date, worded as in Part 3.2 ("When one gets through").

### `check:stations`

`npm run check:stations` runs first in `npm run build` and fails if a Pick has no `terms` record
or an unknown status, if a Pick's host is on the denylist, or if a Pick has no row in the
register (Part 4). It prints the number of Picks per genre.

## 1.6 Phases

### Phase 0 — Open-source groundwork (≈ 1 h agent time + U1)

- [x] **O1 Licence and project files:** `LICENSE` (GPL-3.0), licence fields in `package.json`
      and `Cargo.toml`, a short README (what it is, how to build, contribute and donate),
      `CONTRIBUTING.md`, `SECURITY.md` (how to report a vulnerability privately), and issue
      templates, including **"Station removal request"**.
- [x] **O2 Pre-publication scan:** search the full git history for secrets, keys, personal paths
      and private notes before the repo goes public, and fix anything found first.
- [x] **O3 Third-party notices:** generate licence notices for the npm and Cargo dependencies,
      and the Chivo fonts (OFL).
- **Done 2026-09-27.** `LICENSE` (verbatim GPL-3.0), `license` fields in `package.json` and
  `Cargo.toml`, `CONTRIBUTING.md`, `SECURITY.md`, three issue templates including the station
  removal request, README sections for contributing, licence and donations, and
  `THIRD-PARTY-NOTICES.md` generated by `npm run notices` (55 npm packages, 518 crates; every
  declared licence is permissive and GPL-compatible — MIT, Apache-2.0, BSD, ISC, Zlib, MPL-2.0,
  Unicode-3.0, 0BSD, Unlicense, CC0).
- **O2 found no secrets, keys, env files or personal paths** in any of the 30 commits. Two
  things are left for U1 rather than fixed here, because both are the maker's call:
  - every commit is authored `marwan.hazem@puulse.ai`, which becomes public with the repo. A
    GitHub noreply address would avoid that, but only by rewriting history.
  - the GPL copyright line still needs a name: decide what `Copyright (C) 2026 …` should say
    and put it in the README's licence section.
- **Donations** are named in the README but not set up; C10's Sponsors or Ko-fi link is still
  a blank.

### Phase 1 — A catalog that respects every station (≈ 4–6 h agent time + U2, U3)

- [x] **L1 Confirm every Pick under C4:** check each of the 54 against its source in Part 3.1 and
      finalise §1.4.
- [x] **L2 Apply it:** remove the 32 excluded Picks; move "ask first" and "hold" stations into the
      register as parked; add `terms` records and the denylist (§1.5). Filter the directory,
      favorites and the last station through the denylist.
- [ ] **L3 Replacement Picks:** *first pass done 2026-10-29* — 9 added (WFMU ×4, Radio Swiss Pop,
      WCPE, the three Stereoscenic ambient stations, Bassdrive), covering Ambient, Chillout, Folk,
      Soul, Classical, D&B and filling out Indie and Rock. **Still empty:** space, piano, scores,
      nature, bossa, reggae, house, techno, trance, idm, postrock, metal, blues, hiphop. Electronic
      and metal are the hard ones: the long-running stations there mostly publish no terms and name
      no operator. Each addition needs terms that allow players, a working stream, and a pass under
      R1–R8. Target: at least 2 per genre, presented to you for a listen (U2).
- [x] **L4 The directory setting works:** done 2026-10-29. `useCatalog.ts` was hardcoded to
      `true` with a note to fix it later, and its tab was never mounted in `SettingsDialog`, so
      the app's own claims about itself were false. It now persists to
      `focusamp:showUnverified`, defaults to off, and the Stations tab is in the rail.
- [~] **L5 Presentation:** every Pick now carries a `home` URL and the About screen gains
      "Request a station's removal" and a privacy link as soon as `PROJECT.source` is set
      (one line in `data/maker.ts`, task U1). **Still owed:** rendering the "Visit station"
      link on each station row — the data is there, nothing displays it yet.
- [x] **L6 Permission emails:** drafted in `docs/permission-emails.md` — Radio France (FIP),
      MPR (The Current), laut.fm, plus a template for any station whose terms are silent. You
      send them (U3). No email to SomaFM: their licences do not let them say yes.
- [x] **L7 Album art (C12):** off by default, with an Apple Music link beside the cover.
- [x] **L8 `check:stations`** (§1.5), wired into `npm run build`.
- **Done when:** every visible genre has at least 2 Picks with terms records, nothing on the
  denylist can play from anywhere, and the build refuses a Pick without a terms record.

### Phase 2 — Launch blockers and fixes (≈ 4–6 h agent time)

- [ ] **B1 Proxy security fix** (tracked separately). Launch blocker.
- [ ] **B2 Bring over the proven fixes from `mvp/audius`:** an interrupted `play()`
      (`AbortError`) is never a failure, so fast switching no longer marks stations dead, and
      favorites and the last station restore through the current catalog.
- [ ] **B3 Audit quick fixes:** the visualizer idle loop (stop when stopped, minimized or hidden;
      30 fps cap), always on top (permission, effect in `App.tsx`, error caught), validation of the
      saved `mode` plus a "Reset settings" button, remembered volume, bundled fonts, validation of
      timer settings, clipping at 880×560, and the toast icon out of `%TEMP%`.
- [ ] **B4 Reflow at 200% zoom:** every control reachable at 880×560.
- [x] **B5 About screen:** version, GPL licence, source code link, donate link, the station
      policy and removal link, third-party notices, and the C16 "Made by" and "More from the
      maker" section (links supplied by you).
- [~] **B6 Docs:** privacy policy written (`PRIVACY.md`) and the register updated (Part 4).
      Still owed: the README catalog section rewritten for the smaller catalog. (the app
      contacts the stations you play, Radio Browser when the directory is on, and Apple only when
      album art is on; no accounts, no tracking).
- **Done when:** the release audit's blockers and majors are closed, with idle CPU under 3% of a
  core.

### Phase 3 — Public release (≈ 2–3 h agent time + U4, U5)

- [ ] **S1 CI:** a GitHub Actions workflow runs the checks on every push, and on a version tag
      builds the Windows installers and attaches them to a GitHub Release.
- [ ] **S2 Updater (C9):** `tauri-plugin-updater` against GitHub Releases, with a self-generated
      key. An installed beta updates itself to the next release.
- [ ] **S3 Beta release (v0.9, unsigned):** release notes, and install instructions explaining the
      SmartScreen warning.
- [ ] **S4 Release verification:** automated checks on the built installer (every visible genre
      plays, idle CPU, restart persistence, clean exit, accessibility checks from Part 5).
- [ ] **S5 1.0, signed through SignPath** once the application is approved.

## 1.7 Your tasks

- [ ] **U1** Create the public GitHub repository, or confirm the current one can go public, and
      turn on two-factor authentication (SignPath requires it). Public only after O2.
- [ ] **U2** Listen to the replacement Picks from L3 and approve or reject each one.
- [ ] **U3** Send the permission emails the agent drafts in L6.
- [ ] **U4** Publish the v0.9 beta release on GitHub.
- [ ] **U5** Apply to the SignPath Foundation for free signing, right after the beta. Review takes
      about 1–2 weeks.
- [ ] **U6** Optional: set up GitHub Sponsors or Ko-fi.
- [ ] **U7** Optional: a short legal check of the station policy and privacy policy (C14).
- [ ] **U8** Check the name "Focus AMP" on GitHub and in a trademark search before announcing.

## 1.8 After 1.0

| Release | Scope |
|---|---|
| 1.0.x | Stations that grant permission join as Picks. Fix what users report. |
| 1.1 | Linux (Flathub, AppImage). The volume slider fix for assistive tech. An optional Microsoft Store listing and winget. |
| Later | macOS. Optional Supabase sync, only if it stays free. The Audius "continuous music" mode, if wanted. |

## 1.9 Verification commands

```bash
npm test                  # unit tests
npm run check:stations    # terms records, denylist, register
npm run build             # type check + vite build (runs check:stations)
npm run audit:genres      # directory yield per genre, and what D1/D2 remove
npm run audit:themes      # contrast of every theme variant
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build       # release build
```

The full release-readiness audit prompt used on 2026-09-26 is in git history:
`git show dcdf293:docs/release-readiness.md`.

---

# Part 2 — How the catalog works

Focus AMP is a focus-music radio, not a world radio with a timer attached. Music only: talk,
news, sport and religious programming are filtered out everywhere. Genre is the whole front
door; there is no country browser.

**Two sources, one list.**

- **Picks** are the stations in `src/data/stations.ts`: hand-chosen, checked against Part 3,
  marked by hand as instrumental, mixed or vocal. They show first in their genre.
- **The directory** is Radio Browser, which fills each genre out to dozens of stations when
  "Show community directory" is on. It is uncurated, so it is filtered hard before anyone sees it:
  - a genre is a **set of tags we define**, not a raw tag. Directory tags are free text ("lofi",
    "lo-fi", "lo fi" and "chillhop" are four different tags), so each genre lists the tags that
    count as it and the tags that disqualify a station from it (`src/data/genres.ts`)
  - music only: anything tagged news, talk, sport, religion, politics, comedy or podcast is
    dropped, and religious stations are also caught by name
  - broken, HLS-only, duplicate and sub-96k streams are dropped; results are ordered by votes,
    then clicks. A station needs 20 votes (5 in small genres such as Post-rock and Synthwave)
  - Arabic-language stations are excluded by the language field or an Arabic-script name
  - the no-AI directory rules D1–D5 (Part 3.2) apply, and the denylist (§1.5)

**Vocals** has no field in the directory, so it is inferred, most trusted first: marked by hand
on a Pick; the station's own tags ("instrumental", "vocal"); the genre's default. It is data
only — the filter that used it and the INST / VOX row marks were both built and then removed
at the maker's request, the marks because in a genre of mostly instrumental stations they sat
on nearly every row and said nothing.

**Telling a Pick from a directory station.** When the directory setting is on and a genre holds
both, the list is split under two headings, **Picks** and **Community directory**, in that
order. A per-row PICK badge did this until 2026-09-27; in a Picks-heavy genre it appeared on
nearly every row, so it was replaced by the two headings, which say the same thing once.

**Genres** come in four groups: Deep focus (Lofi, Ambient, Space / Drone, Classical, Solo
piano, Film & game scores, Nature & soundscapes), Easy (Jazz, Bossa & latin jazz, Downtempo /
Chillout, Acoustic & folk, Reggae & dub), Electronic (Deep house, Techno, Trance, Drum & bass,
Synthwave, IDM / Electronica) and Band (Indie, Alternative rock, Rock, Post-rock, Metal, Blues,
Soul & funk, Hip-hop). A genre with no Pick is hidden while the directory setting is off.

**Browsing** lives in the sidebar: collapsible genre groups, then one genre's stations, with a
search box that searches whatever is listed. Favorites sit above the genres and act as their
own list. The last genre and station are remembered. When a station fails, the player moves to
the next one in the list it came from, and gives up after five in a row.

---

# Part 3 — Station policy

## 3.1 Terms: may a free player play this station?

Per broadcaster, read on 2026-09-26 and re-read under the free-player reading on 2026-09-27.
Task L1 confirms each row. Not legal advice.

| Broadcaster | Picks | What their terms say | Under C4 | Source |
|---|---|---|---|---|
| SomaFM | 30 | Won't permit third-party clients or apps, "even noncommercial ones" | **Exclude everywhere** | [terms](https://somafm.com/contact/tos.html) |
| Radio France (FIP) | 7 | "Strictly personal and private use"; reuse and brand use need written permission | **Ask first** | [terms](https://www.radiofrance.com/conditions-generales-dutilisation-des-sites-de-radio-france) |
| KEXP | 1 | Publishes its stream URLs for use in third-party players (VLC and others); site terms are personal and non-commercial | **Keep** | [stream URLs](https://www.kexp.org/streaming-urls/) · [terms](https://kexp.org/terms-and-conditions/) |
| Minnesota Public Radio (The Current) | 1 | No redistribution or rebroadcast; licensing case by case | **Ask first**; also fix the 404 URL | [permissions](https://www.mpr.org/permissions) |
| laut.fm | 1 | No embedding on third-party websites | **Ask first** | [terms](https://laut.fm/pages/terms_and_conditions) |
| Hotmix | 1 | Use within the household ("family circle"), i.e. personal listening | **Keep terms-wise**; hold for no-AI review | [terms](https://web.hotmixradio.com/fr/profile/terms-and-conditions) |
| Zeno.fm (Box Lofi Radio) | 1 | Licences cover zeno.fm itself | **Exclude** (also failed R3) | [terms](https://zeno.fm/terms/) |
| Radio Paradise | 3 | No published terms; historically welcomes developers | **Keep** | [Mozilla Hacks, 2013](https://hacks.mozilla.org/2013/10/building-a-firefoxos-app-for-my-favorite-internet-radio-station/) |
| SRG SSR (Radio Swiss Jazz, Classic) | 2 | Publishes stream URLs for listeners to add to internet radios. Being sold: Digris runs both from July 2027 | **Keep**; re-check after the sale | [reception](https://www.radioswissjazz.ch/en/reception/internet) |
| Nightwave Plaza | 1 | Public API, open-source official app, third-party clients exist | **Keep** | [app source](https://github.com/nightwaveplaza/plaza) |
| WXPN | 1 | No terms of use published | **Keep** | [xpn.org](https://xpn.org/privacy-policy/) |
| RauteMusik (0nlineradio, Epic Lounge) | 2 | Terms page timed out during the check | **Hold**: read terms, then no-AI review | [RauteMusik](https://en.wikipedia.org/wiki/RauteMusik.FM) |
| Hunter.FM | 1 | Terms don't mention third-party use | **Hold** for no-AI review | [terms](https://hunter.fm/privacidade-e-termos/) |
| CLIAMP Lofi | 1 | No information on operator or music source | **Hold**; likely fails R1 | [docs](https://github.com/bjarneo/cliamp/blob/main/docs/streaming.md) |
| BGMVibes | 1 | Stream dead since 2026-09-26 | **Exclude** | — |

**Services the app uses.** Radio Browser: directory data is public domain, and use in free and
non-free software is explicitly allowed ([radio-browser.info](https://www.radio-browser.info/));
each station's stream is still governed by that station. Apple's iTunes Search (album art):
artwork may only be used to promote Apple's store, next to a store badge that links to the item
([terms](https://performance-partners.apple.com/search-api)), hence C12.

## 3.2 No AI music: the station rules

Adopted 2026-09-18. Focus AMP plays music made by people; these rules keep AI-generated music
stations out of the catalog.

### The principle

**Nobody can reliably tell AI-generated music from a radio stream.** There is no detector
accurate enough to act on. So the rules don't try to detect AI music. They check provenance:

> **A station is allowed in because there is evidence that people choose and make its music.
> It is never allowed in merely because there is no evidence against it.**

Some genuine, anonymous stations will be left out. A smaller catalog that can be trusted is the
goal. When in doubt, leave it out.

### What counts as AI music

**Not allowed:** recordings whose composition or performance is primarily produced by a
generative model (Suno, Udio, Stable Audio, Mubert, AIVA, Boomy, Soundraw, Beatoven, Loudly,
Endel and whatever comes next); stations that stream them as all or a substantial part of their
programming; "infinite", "endless" or "generative" streams produced live by a model; stations
whose credited artists don't exist outside the station.

**Allowed:** human-made music that used machine learning as a tool (mastering, stem separation,
pitch correction); human-made generative *art* music in the older sense (modular patches,
Eno-style systems, live coding); **auto-DJ stations** sequencing human-made tracks, as long as
R3 is met; AI-voiced idents, which are unwelcome but outside this policy.

**The unit is the station, not the track.** A station is removed when AI music is what it is
for, or when its operator stops caring about the difference.

### Where the risk is

| Risk | Genres |
|---|---|
| **High** | Lofi · Ambient · Space / Drone · Solo piano · Nature & soundscapes · Downtempo / Chillout · Synthwave |
| **Medium** | Classical (public-domain works, synthetic performances) · Film & game scores · Deep house · Techno · Trance · IDM / Electronica |
| **Lower** | Jazz · Bossa · Folk · Reggae · Indie · Alternative rock · Rock · Post-rock · Metal · Blues · Soul & funk · Hip-hop · Drum & bass |

High-risk genres are the ones this app exists for, which is why the rules are stricter there
instead of the genres being dropped.

### Rules for Picks

A station becomes a Pick only if **every** rule passes, and the result is written into the
register (Part 4). One failure, or one "couldn't find out", means it isn't a Pick.

- **R1. A named operator:** an identifiable organisation or person runs it (legal name,
  non-profit, public broadcaster, named founder). *Check:* About or Imprint page; a registry.
- **R2. Named people choose the music:** named DJs, directors, curators or hosts who can be found
  elsewhere. *Check:* About, Shows or Team pages; search one of the names.
- **R3. Not anonymous, even if automated:** auto-DJ passes only with R1 and R2. This rule removed
  the original four Lofi Picks.
- **R4. It predates the generators:** broadcasting before 1 January 2023. A newer station needs
  stronger evidence on R2, R5 and R6, and the register must say why. *Check:* Internet Archive
  first capture, domain age, social account age, press.
- **R5. The artists exist:** take ten consecutive track titles from the stream; at least nine
  artists must have a footprint predating the station (MusicBrainz, Discogs, Bandcamp). A station
  sending no metadata passes only through published tracklists.
- **R6. It says where its music comes from:** it pays performance royalties and says so, or is a
  licensed public broadcaster, or plays credited releases from named labels. **Fail outright** on
  "royalty-free", "copyright-free", "no copyright", "DMCA-free" or "stream-safe".
- **R7. No AI claims, anywhere:** search its site and socials for AI, generated, generative, Suno,
  Udio, Mubert, AIVA, Boomy, Soundraw, Endel, Stable Audio, neural. So is a network of dozens of
  near-identical channels with no staff.
- **R8. Hand-marked, dated, re-checked:** every Pick carries its check date and is re-checked
  every six months, or at once after a change of ownership or format. One that can't be
  re-verified is demoted.

### Rules for directory stations

Nobody looks at these, so the rules use only the directory's own fields. They exclude; they
never vouch.

- **D1. AI keywords** in name or tags, as whole words: ai, a.i., ai music, ai generated,
  ai-generated, generated, generative, neural, suno, udio, mubert, aiva, boomy, soundraw,
  beatoven, loudly, endel, stable audio, infinite, endless. `ai` must match as a whole word only.
- **D2. Royalty-free keywords:** royalty free, royalty-free, copyright free, copyright-free,
  no copyright, ncs, dmca free, dmca-free, stream safe, streamer safe, twitch safe.
- **D3. A higher bar in high-risk genres:** a homepage on file that isn't a bare streaming-host
  URL, and not a search-phrase name. (A 50-vote bar was designed but not adopted.)
- **D4. The denylist:** see §1.5. Every entry carries a reason, a date and what was found.
- **D5. Votes are a floor, not a proof:** the vote threshold removes test and abandoned streams;
  it is never evidence of human music.
- **D6. A runtime match-rate signal:** designed, parked. Only worth building if the directory
  becomes the default.

**Red flags** (two or more on an anonymous, high-risk station is enough to leave it out): no
homepage, or a template with no people; a name that is a search phrase ("Lofi Beats to Study
24/7"); no or generic track metadata ("Lofi Track 47"); artists that don't exist anywhere; every
track credited to the station or one prolific "artist"; impossible output; a network of
near-identical channels launched together; AI-generated cover art throughout; selling
royalty-free packs or a generator; launched after 2023 with no people attached; a free streaming
host with no site of its own plus any of the above.

### When one gets through

It will. **Review** the reported station under R1–R7 and record what was found. **Remove** it:
add it to the denylist, and if it was a Pick, take it out of `stations.ts` and note the removal
in the register's history. **Word it carefully:** unless a station says its music is
AI-generated, the entry reads "excluded pending provenance: no named operator, artists not
found", never "AI station". It's fairer, and the repo is public. **Reinstatement** means passing
R1–R8 like any new Pick.

### Changing these rules

A rule is loosened only with a written reason here ("the genre looked empty" isn't one). A rule
is tightened freely. Keyword lists grow as new tools appear. Any change to an automated rule is
tested against the live directory first, with the numbers in the commit message.

### What these rules can't do

They can't detect AI music by listening. They can't vouch for every track on a human-curated
station. They can't make the directory trustworthy, only less bad: **only Picks are vouched
for**, and the interface should never imply otherwise. They depend on stations describing
themselves truthfully. They will exclude some real, human, anonymous stations, deliberately.

### What is enforced today

| Rule | Status | Where |
|---|---|---|
| Picks only by default | **Broken**: forced on, setting unreachable. Task L4 | `useCatalog.ts`, `StationsTab.tsx` |
| R3: anonymous auto-DJ stations aren't Picks | Built | the original Lofi four were demoted |
| R1–R8 recorded per Pick | First pass for 7 broadcasters (Part 4); the Lofi Picks never reviewed | Part 4 |
| R8: six-monthly re-check | Not done | no dates per Pick yet (terms record adds them) |
| D1, D2 keyword exclusion | Built | `AI_BARE`, `AI_WORDING`, `AI_TAGS`, `ROYALTY_FREE_WORDING` in `genres.ts` |
| D3 provenance check, high-risk genres | Built, lighter form | `lacksProvenance` in `radioBrowser.ts` |
| D4 denylist | To build | Task L2 |
| D5 vote floor (20, falling back to 5) | Built | `radioBrowser.ts` |
| D6 match-rate signal, report action | Parked | — |

---

# Part 4 — The Picks register

One row per broadcaster; a Pick's channels inherit their broadcaster's row. First review
2026-09-18 by Claude from public sources and the stations' own track feeds, **not yet confirmed
by a person**. "Not established" means the evidence couldn't be retrieved, not that it doesn't
exist.

| Broadcaster | R1 Operator | R2 Who programmes | R4 Since | R5 Artists exist | R6 Music source | R7 AI claims | Verdict |
|---|---|---|---|---|---|---|---|
| SomaFM | Pass: SomaFM.com, LLC; founder Rusty Hodge | Partly: "playlist curators" credited | Pass: Feb 2000 | Pass: 20 of 20 | Pass: pays SoundExchange royalties | None found | Passes the no-AI rules, but **excluded under C4** (terms) |
| Radio Paradise | Pass: William and Rebecca Goldsmith | Pass: the founders | Pass: Feb 2000 | Pass: 12 of 12 | Pass: pays webcasting royalties | Not established (site script-rendered) | **Keep** |
| FIP | Pass: Radio France | Pass: small team of curators | Pass: 1971 | Pass, narrowly: 8 of 9 | Pass: public broadcaster | None found | Passes; **ask first under C4** |
| Radio Swiss Jazz / Classic | Pass: SRG SSR | Not established; in-house at a public broadcaster | Pass: 2002 | Pass: 10 of 10 (Jazz); Classic not sampled | Pass: public broadcaster | None found | **Keep** |
| KEXP | Pass: Friends of KEXP, non-profit | Pass: named DJs | Pass: on air since 1972 | Pass: 12 of 12 | Pass: listener-supported licensed broadcaster | None found | **Keep** |
| The Current | Pass: Minnesota Public Radio | Pass: named directors and hosts | Pass: 2005 | Pass: 10 of 10 | Pass: public radio | None found | Passes; **ask first under C4** |
| WXPN | Pass: University of Pennsylvania | Pass: named hosts | Pass: on air since 1945 | Not sampled (playlist script-rendered) | Pass: non-commercial university station | None found | **Keep, R5 owed** |
| Nightride FM | Fail: no operator named | Partly | Pass: 2019 | Pass: 10 of 10 | Not established | None found | Removed |

**Still owed on the keepers:** confirm R2 for Radio Swiss, read Radio Paradise's site for R7,
sample Radio Swiss Classic and WXPN for R5. **Not yet reviewed:** Nightwave Plaza and the Lofi
holds (Hotmix, 0nlineradio, Epic Lounge, Hunter.FM, CLIAMP).

**History**

| Date | Station | Action | Reason |
|---|---|---|---|
| 2026-10-29 | WFMU, Rock'n'Soul, Give the Drummer, Sheena's Jungle Room | Added as Picks | Publishes direct stream URLs "which you can use in whatever mobile streaming client you may be using"; listener-supported freeform since 1958 |
| 2026-10-29 | The Classical Station (WCPE) | Added as a Pick | "Copy/paste one of the following stream links into your Windows Media player, VLC or Winamp player"; non-commercial, on air since 1978 |
| 2026-10-29 | Ambient Sleeping Pill, a.m. ambient, Ambient Modern | Added as Picks | "Links for adding directly to Winamp and other players"; run by Andrew J Klimek since 2013, playing largely his own label's music — a direct R1/R5 pass |
| 2026-10-29 | Radio Swiss Pop | Added as a Pick | Same SRG SSR terms as Jazz and Classic, already kept |
| 2026-10-29 | Bassdrive | Added as a Pick | Publishes .m3u tune-in links; states all music is "directly licensed by the composers and sound recording copyright owners"; named DJs since 1999 |
| 2026-10-29 | Echoes of Bluemars / Cryosleep | Rejected | bluemars.org reads only "Signal lost." — the station is gone |
| 2026-10-29 | Venice Classic Radio | Rejected | Names no operator and publishes no stream URLs; fails R1 and R6 |
| 2026-10-29 | SomaFM ×30, Box Lofi Radio | **Removed and denylisted** | L2 carried out. SomaFM's ToS re-read and confirmed verbatim; their music licences do not let them authorise third-party apps, so this is not waivable on request |
| 2026-10-29 | FIP ×7, The Current, laut.fm Lofi | **Parked** | Removed from Picks pending permission (U3). Not denylisted: a yes would bring them straight back |
| 2026-10-29 | Hotmix, 0nlineradio, Epic Lounge, Hunter.FM, CLIAMP | **Parked** | Removed from Picks pending the no-AI review under R1–R8 |
| 2026-09-27 | SomaFM ×30, Box Lofi Radio, BGMVibes | To be removed (L2) | SomaFM's terms forbid third-party clients even when free; Box Lofi failed R3; BGMVibes is dead |
| 2026-09-27 | FIP ×7, The Current, laut.fm Lofi | To be parked (L2) | Terms restrict reuse or brand use; asked for permission first |
| 2026-09-24 | KEXP, The Current, WXPN | Added as Picks | Vetted for the new Alternative rock genre |
| 2026-09-18 | Nightride FM, Chillsynth FM | Removed from Picks | Excluded pending provenance: no named operator (R1), licensing not stated (R6). Not a finding about its music |
| 2026-09-18 | Lofi 24/7, Box Lofi Radio, MoE Lofi, LITT Live | Demoted from Picks | Anonymous auto-DJ streams; fail R3 |
| 2026-08-26 | PAX LO-FI | Removed | Excluded pending provenance review; a precaution, not a finding |

---

# Part 5 — Accessibility

The WCAG 2.1 AA audit found 20 issues; **all 20 are fixed** (one, disabled text selection, is kept
by design), verified against `d9cda71`. The release audit's axe-core run found 0 violations on
the main view and every Settings tab.

Still to verify by hand, as part of S4: an NVDA pass (settings, failover announcements, the
player bar, the pin buttons); Windows High Contrast, watching the visualizer; keyboard only, to
check the sidebar isn't tedious to get past. 200% zoom is known to fail and is task B4.

---

# Part 6 — Known gaps

- HLS-only streams are left out: the webview can't play them without a demuxer.
- Picks aren't monitored between checks; R8 dates arrive with the terms record (L2).
- Linux needs GStreamer plugins (`gstreamer1.0-libav`, `gstreamer1.0-plugins-bad`) for MP3/AAC
  under WebKitGTK. Untested there.
- Settings persist through `localStorage`; `tauri-plugin-store` is wired but unused.
- The release audit's findings not yet fixed are the tasks in Phase 2.

---

# Part 7 — Parked research

Kept in case Focus AMP ever adds a "continuous music" mode. The full notes are on branch
`mvp/audius` (`docs/EXECUTION.md` there).

| Source | What it offers | Allowed in a paid app? |
|---|---|---|
| Audius | Open catalog and free API; audio plays without the proxy | Yes: Audius Open Music License (§1.2 grants music players a royalty-free licence; §1.5 requires credit and a link). Thin in quiet genres: only 17 of 26 genres reach 5 verified artists |
| Free Music Archive | CC-BY and CC0 tracks, including Field Recordings and Brazilian | Yes for CC-BY/CC0, self-hosted only (no hotlinking) |
| Musopen | Public-domain classical and piano | Per recording (CC0, CC BY-SA) |
| Kevin MacLeod (incompetech) | Large CC BY 4.0 catalog | Yes, with the exact credit line |
| National Park Service | Public-domain nature recordings | Yes |
| Freesound | CC0 and CC-BY sounds | Yes if downloaded and self-hosted; its API is non-commercial |
| OpenGameArt | Game music | Yes, with credit |
| Cloudflare R2 | Hosting for self-hosted files | Free tier: 10 GB, no bandwidth charges |
| Jamendo, Chillhop, Lofi Girl, Pixabay | — | No: non-commercial only, or no restreaming |

---

## Changelog

- **2026-10-23** **B5 done.** Settings → About: version (injected from `package.json`, so it
  cannot drift from the build), licence, the "made by" credit, the no-AI and no-tracking
  promise, and credits to Radio Browser, the Pick broadcasters and the fonts. Links open in the
  real browser through `tauri-plugin-opener` — the JS half was already installed, the Rust half
  was not; the capability allows `opener:allow-open-url` only, and the screen refuses anything
  that is not https. The maker's details live in `src/data/maker.ts`. **Still blank, and only
  you can fill them (U-task):** your site, your other projects, the source link, the donate
  link and the removal link. Blank fields render nothing rather than a placeholder, so the
  screen is already shippable; it just says less than C16 asks for.

- **2026-10-23** The title bar is draggable everywhere again. `data-tauri-drag-region` does not
  inherit — only the exact element under the pointer counts — so the flex wrappers that cover
  most of the bar, the quick-bar container and each dropdown wrapper were all dead to dragging
  while looking identical to the parts that worked. That is why it failed "sometimes": it
  depended on where you grabbed. A sweep of the bar now finds 0 dead pixels, where the gap
  between the app name and the first dropdown used to be one of the largest.

- **2026-10-23** The display now flips with the chassis. Every theme family carries two glass
  palettes rather than one: an emissive set for dark mode (colour on black glass, as a VFD or
  an LED ladder behaves) and a reflective set for light mode (dark segments on a pale panel, as
  a passive LCD behaves). A daylight chassis no longer has a black hole cut in it. All 24
  variants still clear the contrast audit. Classic's light display is monochrome, which also
  settles its old mismatch of a 1-bit chassis against a neon display — its dark display is
  still neon, which is open.
- **2026-10-23** Classic is first in the theme list and the default. The first-paint baseline in
  `theme.css` was regenerated from it, so launch no longer flashes Graphite for a frame.

- **2026-10-23** Every Pick tested, three rounds. 52 of 54 answer reliably. **Removed:** BGMVibes
  (host stopped answering; already recorded dead on 2026-09-26) and Box Lofi Radio (503 through
  zeno.fm, which C4 excludes anyway — its licences cover zeno.fm itself). **Fixed:** The Current,
  whose `.mp3` endpoint now 404s permanently; MPR serves `.aac`. That endpoint is still
  intermittent (200, 200, 404, 404 across four tries), so it leans on the proxy retry.
  **Not removed, not broken:** Radio Swiss Jazz and Classic return a web page *on this network
  only* — the request is intercepted by the maker's ISP and redirected to
  `megaplusredirection.tedata.net`. SomaFM and FIP are not intercepted, so this is a local route
  problem, not the broadcaster's. Verify from another connection before touching those two.
- **2026-10-23** **No Pick fails the 24-hour test.** Every remaining station broadcasts round the
  clock. Three do carry scheduled speech rather than continuous music — KEXP (DJ-hosted), WXPN
  (World Cafe, Star's End) and The Current (morning show) — which is a different question from
  being off air, and is open.

- **2026-10-19** Dead stations, measured and reduced. A sample of 180 directory stations had a
  10.0% failure rate; the Picks had 4% (2 of 54). Four changes: the directory listing now
  requires a successful check by Radio Browser's own checker within 3 days and no TLS error
  (`hidebroken` alone only drops stations that failed their *last* check, which can be days
  old); the proxy retries a failed handshake once; a 200 that returns a web page is treated as
  a failure and retried, rather than handed to the audio element to fail as a decode error
  seconds later; and a station is dimmed as unavailable only after **two** failures, not one.
  The same 180-station sample afterwards: **3.3%**. No genre lost stations — all 26 still
  healthy.

- **2026-09-27** Phase 0 done: GPL-3.0-or-later confirmed and applied. Licence, contributing,
  security and issue templates added; third-party notices generated; git history scanned clean.
- **2026-09-27** The per-row PICK badge and the INST / VOX marks were removed from the sidebar.
  A genre holding both kinds now splits under "Picks" and "Community directory" headings.
- **2026-09-27** Consolidated: `docs/music-plan.md` (Part 2), `docs/no-ai-music.md` (Parts 3.2 and
  4), the Music Rights and Accessibility pages (Parts 3.1 and 5) and the README's status and
  known gaps (Part 6) now live here. Decisions renamed C1–C16 and release tasks S1–S5 so they
  don't clash with the policy's R1–R8 and D1–D6. The audit prompt moved to git history.
- **2026-09-27** Purpose confirmed as audience and a personal project (C15, C16).
- **2026-09-27** Created. Focus AMP becomes a free, open-source radio player (GPL-3.0). The paid,
  Audius-only plan is parked on `mvp/audius`.
