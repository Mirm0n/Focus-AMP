# Releasing Focus AMP

A runbook for the maintainer. Most of this is ordinary; the parts that are not
are marked, and they are marked because they cannot be undone.

---

## 0. The signing key, before anything else

Focus AMP updates itself. An installed copy will only accept a release signed
by one specific key, and that key is:

```
~/.tauri/focus-amp.key          the private half — this is the one that matters
~/.tauri/focus-amp.key.pub      the public half, already in tauri.conf.json
```

**If the private key is lost, every installed copy is stranded on its current
version forever.** Not inconvenienced — stranded. There is no override, no
re-issue, and no way to reach those users again except asking them to
uninstall and download a new build by hand, which most will never see. Tauri's
own documentation is blunt about it, and it is the single least recoverable
thing in this project.

So, before the first release:

1. **Copy the key somewhere off this machine.** A password manager's secure
   note, an encrypted archive on another drive, a printed copy in a drawer —
   any two of those. Not the repository, and not the same disk as the only
   other copy.
2. Confirm the backup actually contains the key and not an empty file.

**Never print it.** Not `cat`, not `head`, not into a terminal you are sharing,
a screen recording, a chat, or an AI assistant's transcript. It is one line of
base64 and it ends up in scrollback and logs the moment it is displayed. Copy
the *file*. This key was already regenerated once during development for
exactly that reason — which was free then, because nothing had been released.
After the first release it would not have been.

It was generated with no password. If you would rather it had one — or if the
key is ever exposed — generate a new keypair, but **only before the first
release**. Rotating costs nothing while no build is in anyone's hands. After
that, changing the key is the same as losing it: the new one is simply not the
key those installs trust.

```bash
npx tauri signer generate -w ~/.tauri/focus-amp.key
```

Then put the new `.pub` contents into `plugins.updater.pubkey` in
`src-tauri/tauri.conf.json`, and the password into the secret named below.

---

## 1. One-time setup

### The repository URL, in two places

Both carry the same URL and neither can be guessed at build time:

| Where | What it does |
|---|---|
| `SOURCE` in `src/data/maker.ts` | The About screen's source, removal and privacy links |
| `plugins.updater.endpoints` in `src-tauri/tauri.conf.json` | Where installed copies look for new releases |

The endpoint is the one to get right first time. **The only address a build
will ever check is the one compiled into it**, so a wrong endpoint cannot be
corrected from the outside for anyone who already installed that version.

`npm run check:release` refuses to build until both are set, both are https,
and both point at the same repository. It fails today, on purpose.

### GitHub secrets

Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | The entire contents of `~/.tauri/focus-amp.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The key's password, or omit it if there is none |

Paste the file's contents, not its path. `GITHUB_TOKEN` is provided
automatically and needs nothing from you.

### The repository must be public

The updater fetches `latest.json` with no credentials. A private repository
returns 404 to it, and the app simply never finds an update — silently, which
is the worst way for this to fail.

---

## 2. Cutting a release

### Bump the version in three files

```
package.json                 "version"
src-tauri/tauri.conf.json    "version"
src-tauri/Cargo.toml         version under [package]
```

They must match each other and the tag. `check:release` fails on drift and, in
CI, on a tag that disagrees with the files — because the version in
`tauri.conf.json` is what a built app reports about itself, and that is what
gets compared against `latest.json`. Drift there means the updater either never
offers anything or offers the same release forever, and both look like "the
updater is broken" long after the release that caused it.

### Check locally, then tag

```bash
npm run build          # catalog, types, bundle
npm run check:release  # versions, endpoint, source URL
cd src-tauri && cargo fmt --check && cargo clippy --no-default-features --all-targets -- -D warnings && cargo test --no-default-features
```

Then:

```bash
git tag v0.9.0
git push origin v0.9.0
```

The Release workflow builds the Windows installers, signs the update
artifacts, writes `latest.json`, and opens a **draft** release.

### Publish the draft

Edit the release notes, then press Publish. **Nothing reaches existing users
until you do** — `releases/latest` skips drafts and pre-releases, so the
updater cannot see a draft. That is the safety net: a bad build can be deleted
while it is still a draft and nobody will ever have seen it.

---

## 3. Proving the updater actually works

This has never been tested end to end, because it cannot be until two signed
releases exist. Do it deliberately, once:

1. Release **v0.9.0** and publish it.
2. Install it from the published installer — not a dev build.
3. Bump to **v0.9.1**, tag, let it build, publish it.
4. Open the installed v0.9.0 and wait about ten seconds. A banner should offer
   v0.9.1. Press **Install and restart**, and confirm the About screen shows
   0.9.1 afterwards.

If no banner appears, in order of likelihood: the release is still a draft; the
endpoint points at the wrong repository; the repository is private;
`latest.json` is missing from the release assets (the signing secrets were not
set, so no `.sig` files were produced); or the versions disagree.

Until step 4 has passed, the updater is built but unproven, and the README says
so rather than claiming otherwise.

---

## 4. When something goes wrong

**A bad release, still a draft.** Delete it. Nobody saw it.

**A bad release, already published.** Delete the release *and* its tag, then
publish a higher version immediately. Anyone who already updated is on the bad
build and the only way to move them is forward — there is no downgrade path.
This is why the draft step exists.

**The endpoint was wrong in a published build.** Every copy of that version is
beyond reach. Fix the endpoint, publish a correct version, and tell people
where to download it by hand. Then re-read §1.

**The signing key is lost.** Every installed copy is stranded. Generate a new
keypair, ship a new version with the new public key, and accept that it reaches
only people who install it manually. There is no recovering the old installs.

---

## 5. Signing the installers (separate from the above)

The updater key proves a release came from you. It does **not** stop Windows
SmartScreen warning about an unsigned installer — that needs Authenticode, via
the SignPath Foundation application (task U5). The two are unrelated and both
are worth having; neither substitutes for the other.

On macOS the equivalent is a Developer ID certificate plus notarization, which
needs a paid Apple Developer account. Until then macOS users must right-click →
Open on every install *and every update*. See the platform note in
`docs/EXECUTION.md`.
