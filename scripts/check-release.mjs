/**
 * Refuse to cut a release that is wired to nowhere.
 *
 *   npm run check:release
 *
 * Runs in the release workflow, before anything is built. Two settings have to
 * carry the repository URL and neither can be guessed at build time, so both
 * ship as blanks and both are easy to forget:
 *
 *   - `plugins.updater.endpoints` in tauri.conf.json. Wrong here and the app
 *     is built with an updater that can never find an update, for everybody
 *     who installs that version. There is no fixing it afterwards from the
 *     outside: those installs only learn about new releases from the endpoint
 *     compiled into them.
 *   - `SOURCE` in src/data/maker.ts. Blank means the About screen shows no
 *     source link, no way for a broadcaster to ask to be removed, and no
 *     privacy policy — on a GPL app whose own screen promises all three.
 *
 * Neither matters while developing, which is exactly why this runs at the
 * point where it starts to.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(root, p), "utf8");

const errors = [];
const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
const makerSrc = read("src/data/maker.ts");

// ── The updater endpoint ────────────────────────────────────────────────────
const updater = conf.plugins?.updater;
if (!updater) {
  errors.push("tauri.conf.json has no plugins.updater — the built app cannot update itself");
} else {
  const endpoints = updater.endpoints ?? [];
  if (endpoints.length === 0) errors.push("plugins.updater.endpoints is empty");
  for (const e of endpoints) {
    if (/PUT-YOUR-REPO-HERE|example\.com|<.*>/.test(e)) {
      errors.push(`updater endpoint is still a placeholder: ${e}`);
    } else if (!/^https:\/\//.test(e)) {
      errors.push(`updater endpoint must be https: ${e}`);
    }
  }
  if (!updater.pubkey || updater.pubkey.length < 40) {
    errors.push("plugins.updater.pubkey is missing or too short to be a real key");
  }
  if (conf.bundle?.createUpdaterArtifacts !== true) {
    errors.push("bundle.createUpdaterArtifacts is not true — no .sig files, so no update manifest");
  }
}

// ── The repository URL in the app ───────────────────────────────────────────
const source = /const SOURCE = "([^"]*)"/.exec(makerSrc)?.[1];
if (source === undefined) {
  errors.push("could not find SOURCE in src/data/maker.ts — has it been renamed?");
} else if (!source) {
  errors.push(
    "SOURCE in src/data/maker.ts is blank, so the About screen would ship with no source " +
      "link, no removal route and no privacy link",
  );
} else if (!/^https:\/\//.test(source)) {
  errors.push(`SOURCE must be https: ${source}`);
}

// ── They should agree ───────────────────────────────────────────────────────
const slug = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(source ?? "")?.[1];
const endpoint = updater?.endpoints?.[0] ?? "";
if (slug && endpoint && !endpoint.includes(slug)) {
  errors.push(
    `the updater endpoint and SOURCE point at different repositories:\n` +
      `      endpoint: ${endpoint}\n      source:   ${slug}`,
  );
}

if (errors.length) {
  console.error(`check:release — ${errors.length} problem${errors.length === 1 ? "" : "s"}:`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nThese only matter when publishing. Fix them before tagging a release.");
  process.exit(1);
}

console.log(`check:release — updater points at ${endpoint}`);
console.log(`check:release — About screen links to ${source}`);
