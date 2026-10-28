<!--
Thanks for working on Focus AMP.

Small and focused lands faster than large and sweeping. If you are about to
spend real time on something, open an issue first — not for permission, but so
you don't write a change the project has already decided against.
-->

## What this changes

<!-- One or two sentences. What is different after this, from a user's side? -->

## Why

<!-- The problem, not the patch. Link an issue if there is one. -->

## How it was checked

<!-- Delete what doesn't apply. "I ran it and played a station" is a real
     answer and often the most useful one. -->

- [ ] `npm run build` passes (this runs `check:stations` and `tsc`)
- [ ] `cargo test` and `cargo clippy -- -D warnings` pass in `src-tauri`
- [ ] Ran the app and played a station
- [ ] Checked it at the minimum window size (880×560)

---

### If this adds or changes a station

Picks carry a burden of proof — see `docs/EXECUTION.md` §3.2. The build will
reject a Pick without a `terms` record, so please fill this in:

- **Who runs it?** <!-- A named person or organisation. Not "a Discord". -->
- **Terms link:** <!-- Where they state what third-party players may do. -->
- **Do their terms allow a player like this one?** <!-- Quote the sentence. -->
- **Why is the music real?** <!-- How you satisfied yourself it is not AI-generated. -->

A station whose operator cannot be identified is not rejected because it is bad.
It is rejected because nobody can vouch for it, which is a different thing and
worth saying plainly if you are the one proposing it.

### If you are a broadcaster asking to be removed

You do not need a pull request, or a reason. Open an issue using the
"Station removal" template, or email the address in `SECURITY.md`, and it will
be done.
