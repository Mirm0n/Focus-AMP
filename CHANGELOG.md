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

### Changed

- **Renamed to Focus AMP.** Settings saved under the two earlier names are
  migrated on first launch rather than lost.
- **The catalog is much smaller and now defensible.** 33 Picks were removed
  because their broadcasters' terms do not permit a player like this one —
  SomaFM alone accounted for 30 of them. Nine more are parked pending
  permission, and five pending the no-AI review. Twelve genres have Picks;
  fourteen are hidden until the community directory is switched on. Filling
  them back up honestly is in progress.
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
