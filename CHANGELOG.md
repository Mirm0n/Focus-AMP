# Changelog

Notable changes, newest first. Dates are ISO. This project follows
[semantic versioning](https://semver.org) once it reaches 1.0; before then,
minor versions may break things.

## Unreleased

The work that made the repository fit to be public.

### Added

- Bundled fonts: Chivo and Chivo Mono now ship inside the app under the SIL
  Open Font License, so a launch contacts nobody and the interface renders
  offline.
- `terms` records on every Pick, and `npm run check:stations`, which runs first
  in `npm run build` and refuses a catalog where a Pick has no record of why we
  may play it.
- A denylist (`src/data/denylist.ts`) applied to the directory, favourites and
  the last station, so a broadcaster who refuses players or asks to be removed
  cannot return by any route.
- CI on every push: the frontend build and catalog check on Linux, and
  `cargo fmt`, `clippy -D warnings` and tests on Windows.
- A privacy policy, a code of conduct, a pull request template and Dependabot.
- `CHANGELOG.md`, which is this file.
- **Self-updating.** The app asks GitHub once a launch whether a newer release
  exists and offers it in a banner; nothing installs without a click. It is
  pull-only — an installed copy cannot be reached from outside, and someone who
  never reopens the app never updates. Releases are signed, and an update that
  does not verify against the public key compiled into the app is refused, so
  taking over the GitHub account alone is not enough to ship code to anyone.
  On by default, declared in `PRIVACY.md`, and switched off in
  Settings → General.
- `npm run check:release`, which refuses to build a release whose updater
  endpoint is still a placeholder, whose About screen would ship with no source
  link, or whose version disagrees between `package.json`, `Cargo.toml`,
  `tauri.conf.json` and the tag being released. All of these only matter at the
  moment of publishing, which is exactly when they are easiest to forget.
- **Linux builds.** CI compiles, lints and tests the Rust half on Ubuntu as
  well as Windows — until now the `#[cfg(not(windows))]` half of `notify.rs`
  was never compiled by anything. Releases ship `.deb`, `.rpm` and AppImage
  alongside the Windows installers, and all three update themselves in place.
  The `.deb` declares the GStreamer codecs WebKitGTK needs for MP3 and AAC,
  because without them a station connects, reports healthy playback and plays
  silence.
- `npm run check:streams`, which asks every Pick for actual audio — not just a
  200, since a dead mount often answers cheerfully and then sends nothing. It
  gives each station a second try before calling it dead, because the first
  run reported one down that answered three times in a row a moment later.
  Rule R8 asks for a re-check every six months and had no tool behind it. It
  also checks that every `terms.source` page still resolves, since a Pick is
  only auditable while the page that justified it is still there.
- `docs/RELEASING.md`, the maintainer's runbook: backing up the signing key,
  the GitHub secrets, bumping the version in three files, the draft-then-
  publish step that keeps a bad build from ever reaching anyone, how to prove
  the updater works, and what can and cannot be undone when it goes wrong.
- **108 stations across 28 genres**, up from 39 across 16, and nothing is left
  in the "planned" list — space, solo piano, nature, bossa, house, techno,
  trance, IDM, post-rock, metal, blues and hip-hop all have stations now. This
  follows a deliberate loosening of the station rules, and the trade is worth
  stating plainly. **Radio France** (FIP's eleven channels and five from France
  Musique), **NRK** and **laut.fm** are played while their permission requests
  are still unanswered rather than held back until a reply arrives; a no means
  immediate removal. And a station no longer needs its terms page read before
  it ships. Those carry a new `terms.status` of **`unreviewed`** — the stream
  was verified, nothing else was — so the weaker footing is recorded in the
  data instead of being dressed up as something stronger. Sixteen **NTS
  Infinite Mixtapes** and both live channels came in on NTS's own published
  API. Every one of the 70 new streams was checked for real audio first; 19
  candidates were dropped for answering 404 or silence.
  **The denylist did not move.** SomaFM and zeno.fm said no, and a no is not a
  pending question.
- **Lofi, with a station worth vouching for.** The genre had been dropped because
  every 24/7 lofi stream is either a commercial network whose terms forbid a
  player like this or an anonymous rotation with nobody to ask — and lofi is
  the most AI-saturated genre there is. **NTS Low Key** gets round the problem
  from the other side: NTS Radio has broadcast from London since 2011, and its
  Infinite Mixtapes are cut from its own archive of presenter-hosted shows, so
  the music was chosen by named people on air before it was ever a stream. Its
  stream URL comes from NTS's own public API. One wrinkle: the mixtapes send no
  track metadata, so the app shows the station name and nothing else while it
  plays.
- Two genres, **Freeform & eclectic** and **World**. The genre list had been
  built around one broadcaster's channel lineup; with that broadcaster gone it
  described a catalog that no longer existed, and the best stations left are
  deliberately not single-genre. Calling WFMU "Indie" was simply inaccurate.

### Changed

- **Search can reach the whole community directory.** It used to look only
  through Picks and genres already opened this session, so most of Radio
  Browser was unfindable however precisely you typed a station's name — an app
  reaching fifteen tag-sets of sixty out of tens of thousands. With the
  directory on, the search box now asks Radio Browser by name **and by tag**,
  debounced, with superseded requests cancelled. Both, because the directory's
  name search matches station names only — typing "lofi" missed every station
  called "Lo-Fi" or "Chillhop", which matters most for the genres that have no
  Picks and so are not offered as genres at all. It also accepts a staler
  liveness check than genre browsing does: the directory re-polls a station
  every few days, and searching for WFMU was returning one of the nine WFMU
  entries it holds because the other eight had been checked 80 hours ago
  rather than 70. Results appear under their own "Community
  directory" heading so there is never doubt about which stations anyone has
  vouched for, and they go through the same filters as the genre listing —
  including the denylist, so searching for a denied broadcaster still finds
  nothing. With the directory off nothing changes and nothing you type leaves
  the machine; `PRIVACY.md` says so.

- **Renamed to Focus AMP.** Settings saved under the two earlier names are
  migrated on first launch rather than lost.
- **The catalog is much smaller and now defensible.** 33 Picks were removed
  because their broadcasters' terms do not permit a player like this one —
  SomaFM alone accounted for 30 of them. Nine more are parked pending
  permission, and five pending the no-AI review. Twenty-nine replacements were
  found and vetted, every one of them an institution — public broadcasters
  (Radio Swiss, Český rozhlas), college stations (WFMU, KFJC, KALX, WMBR,
  KZSU, KEXP, WXPN), listener-supported non-profits (WBGO, WCPE, Alpha Boys
  School Radio) and foundations (Concertzender's eleven channels) — leaving 38
  Picks across 16 genres.
- **Twelve genres were removed for 1.0** — space, piano, nature, bossa,
  house, techno, trance, idm, post-rock, metal, blues and hip-hop. None found a single
  station anyone could vouch for: their long-running stations are
  overwhelmingly commercial networks whose terms forbid a player like this, or
  anonymous streams with no operator to ask. They keep their tag sets in
  `PLANNED_GENRES` and come back one at a time as Picks are found. The build
  now refuses to offer a genre that has none.
- Nightwave Plaza is listed under Synthwave only. It is a vaporwave station —
  its own stream says so — and it had been left under Lofi as well, where the
  app ended up describing it as "Vaporwave and mallsoft" directly beneath the
  Lofi heading.
- **Album art is off by default**, and the cover now links to the track on
  Apple Music, which is the condition Apple's terms place on showing it.
- The About screen's description of what the app contacts is now accurate; it
  previously omitted Apple and Google.

### Fixed

- **The local audio proxy is no longer an open relay.** It served any URL to
  any caller with `Access-Control-Allow-Origin: *`, which let any program — and
  any web page that guessed the port — make requests through the app and read
  the replies, including to `127.0.0.1`, the local network and cloud metadata
  endpoints. It now requires a per-run token, grants CORS only to the app's own
  window, and refuses to fetch private or loopback addresses, re-checking the
  address actually connected to so DNS rebinding does not get around it.
- `npm run notices` crashed in any directory with a space in its name.
- Favourites survived a rename of the app instead of being silently reset.
