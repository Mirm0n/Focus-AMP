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
 * It also checks that the version agrees in all three places that carry one,
 * and with the tag being released. The version in tauri.conf.json is what a
 * built app reports about itself, and the version in latest.json is what it
 * gets compared against. If those two drift apart the updater either never
 * offers anything or offers the same release forever, and both failures look
 * like "the updater is broken" long after the release that caused them.
 *
 * None of this matters while developing, which is exactly why it runs at the
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
const pkg = JSON.parse(read("package.json"));
const cargoSrc = read("src-tauri/Cargo.toml");

// ── One version, in all the places that carry it ────────────────────────────
const cargoVersion = /^version = "([^"]+)"/m.exec(cargoSrc)?.[1];
const versions = {
  "package.json": pkg.version,
  "src-tauri/tauri.conf.json": conf.version,
  "src-tauri/Cargo.toml": cargoVersion,
};
const distinct = [...new Set(Object.values(versions))];
if (distinct.length !== 1) {
  const lines = Object.entries(versions).map(
    ([file, v]) => `      ${v ?? "(unreadable)"}  ${file}`,
  );
  errors.push(["the version differs between files:", ...lines].join("\n"));
}

// In CI on a tag, the tag is the release, so it has to agree too.
const ref = process.env.GITHUB_REF_NAME ?? "";
if (/^v\d/.test(ref)) {
  const tagVersion = ref.slice(1);
  if (distinct.length === 1 && tagVersion !== distinct[0]) {
    errors.push(
      `the tag is ${ref} but the app is version ${distinct[0]}. The build would be ` +
        `published as ${ref} while reporting ${distinct[0]} about itself, and the updater ` +
        `compares those two.`,
    );
  }
}

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

console.log(`check:release — version ${distinct[0]} in all three files`);
console.log(`check:release — updater points at ${endpoint}`);
console.log(`check:release — About screen links to ${source}`);
