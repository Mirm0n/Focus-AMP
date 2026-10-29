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
- Two genres, **Freeform & eclectic** and **World**. The genre list had been
  built around one broadcaster's channel lineup; with that broadcaster gone it
  described a catalog that no longer existed, and the best stations left are
  deliberately not single-genre. Calling WFMU "Indie" was simply inaccurate.

### Changed

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
- **Twelve genres were removed for 1.0** — space, piano, nature, bossa, house,
  techno, trance, idm, post-rock, metal, blues and hip-hop. None found a single
  station anyone could vouch for: their long-running stations are
  overwhelmingly commercial networks whose terms forbid a player like this, or
  anonymous streams with no operator to ask. They keep their tag sets in
  `PLANNED_GENRES` and come back one at a time as Picks are found. The build
  now refuses to offer a genre that has none.
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
