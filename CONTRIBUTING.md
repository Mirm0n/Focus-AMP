# Contributing to Focus AMP

Thanks for looking. Focus AMP is a free, open-source internet radio player for the desktop.

## The licence

Focus AMP is **GPL-3.0-or-later**. Anything you contribute comes in under the same licence —
there is no separate contributor agreement. By opening a pull request you are saying you wrote
the change, or that you have the right to submit it under GPL-3.0-or-later.

## Building it

You need [Node](https://nodejs.org) 20+, [Rust](https://rustup.rs) 1.77+, and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```bash
npm install
npm run tauri dev
```

Checks worth running before you push:

```bash
npm run build          # type-check and bundle the front end
npm run notices        # regenerate THIRD-PARTY-NOTICES.md if dependencies changed
npm run audit:themes   # contrast, every theme variant
npm run audit:genres   # station yield per genre, against the live directory
```

`audit:genres` talks to the Radio Browser directory, so it needs a network connection and takes
a couple of minutes.

## The two rules that are not style preferences

**1. Stations are not added casually.** A station only ships as a "Pick" after somebody has
checked who runs it, who chooses its music, and whether the artists it plays are real. The
rules, and the record of what was checked, are in [`docs/EXECUTION.md`](docs/EXECUTION.md),
Part 3. A pull request that adds a station without that record will be asked for it.

**2. A station's own terms come first.** If a broadcaster says its stream may not be used in
third-party players, it is not in Focus AMP — not as a Pick, not through the directory. Part
3.1 of the same document records what each broadcaster publishes. If you are a broadcaster and
want your station removed, see below; you do not have to justify it.

## Removing a station

Open a **Station removal request** issue. No reason is required, and we aim to act within seven
days. If you would rather not use GitHub, say so in an issue and we will find another way.

## Style

There is no linter config to argue with. Match the file you are editing:

- Comments explain **why**, not what. Most of this codebase's comments record a decision and the
  thing that went wrong before it.
- Prefer a boring, obvious change over a clever one.
- No new dependency without a reason in the pull request. Every one lands in the notices file
  and in someone's download.

## What is welcome

Bug reports with steps. Platform fixes, especially Linux and macOS, which are barely tested.
Accessibility fixes. New visualizers — one file in `src/viz/units/` and a line in `registry.ts`.
Stations, with their provenance record.

## What is not

Features that turn a radio player into something else, anything that tracks listeners, and
anything that makes the app harder to give away.
