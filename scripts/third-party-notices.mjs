/**
 * Regenerate THIRD-PARTY-NOTICES.md.
 *
 *   npm run notices
 *
 * Lists every package Focus AMP ships with — the npm runtime tree and the
 * Rust crates in the built binary — with the licence each one declares.
 * Development-only tooling is left out: it is not distributed.
 *
 * Declared licences are taken from each package's own metadata. That is what
 * the authors published, not a legal opinion, and a handful of packages carry
 * dual licences ("MIT OR Apache-2.0"), which this reproduces verbatim.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// `fileURLToPath`, not `.pathname`: a URL percent-encodes the path, so a
// checkout in a directory with a space in its name ("Focus AMP") would be
// looked for as "Focus%20AMP" and nothing would be found.
const root = fileURLToPath(new URL("..", import.meta.url));

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/**
 * The runtime tree, walked straight off disk. Asking npm for it would mean
 * spawning `npm.cmd`, which Node refuses to run without a shell, and a shell
 * here would be a needless place for a path to be mis-parsed.
 */
function npmPackages() {
  const modules = join(root, "node_modules");

  /** npm hoists, so a dependency is either nested or at the top. */
  const resolve = (from, name) => {
    for (const dir of [join(from, "node_modules", ...name.split("/")), join(modules, ...name.split("/"))]) {
      try {
        return { dir, pkg: readJson(join(dir, "package.json")) };
      } catch {
        /* try the next place */
      }
    }
    return null;
  };

  const found = new Map();
  const walk = (dir, pkg) => {
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      const hit = resolve(dir, name);
      if (!hit) continue;
      const key = `${name}@${hit.pkg.version}`;
      if (found.has(key)) continue;
      const declared =
        hit.pkg.license ??
        (Array.isArray(hit.pkg.licenses) ? hit.pkg.licenses.map((l) => l.type).join(" OR ") : null);
      found.set(key, {
        name,
        version: hit.pkg.version ?? "(unknown)",
        license: declared ?? "(not declared)",
      });
      walk(hit.dir, hit.pkg);
    }
  };
  walk(root, readJson(join(root, "package.json")));
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function cargoPackages() {
  const raw = execFileSync("cargo", ["metadata", "--format-version", "1"], {
    cwd: join(root, "src-tauri"),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const meta = JSON.parse(raw);
  // The resolve graph covers dev and build deps too. Everything here can end
  // up linked into the binary, so all of it is listed except this crate.
  return meta.packages
    .filter((p) => p.name !== "focus-amp")
    .map((p) => ({ name: p.name, version: p.version, license: p.license ?? "(not declared)" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const table = (rows) =>
  ["| Package | Version | Licence |", "| --- | --- | --- |"]
    .concat(rows.map((r) => `| ${r.name} | ${r.version} | ${r.license} |`))
    .join("\n");

const npm = npmPackages();
const cargo = cargoPackages();

const out = `# Third-party notices

Focus AMP is licensed GPL-3.0-or-later (see \`LICENSE\`). It is built on the packages below,
each under its own licence, held by its own authors.

Regenerate this file with \`npm run notices\`. Last generated ${new Date().toISOString().slice(0, 10)}.

## Fonts

**Chivo** and **Chivo Mono**, by Omnibus-Type — SIL Open Font License 1.1, whose text is in
\`src/styles/fonts/OFL.txt\` as that licence requires. Focus AMP redistributes them: the woff2
subsets in \`src/styles/fonts/\` are bundled into the app and declared by
\`src/styles/fonts.css\`. Nothing is fetched from Google Fonts at runtime.

## npm packages (${npm.length})

The runtime dependency tree, excluding development tooling.

${table(npm)}

## Rust crates (${cargo.length})

Everything the Cargo resolver pulls in for this workspace.

${table(cargo)}
`;

writeFileSync(join(root, "THIRD-PARTY-NOTICES.md"), out);
console.log(`wrote THIRD-PARTY-NOTICES.md — ${npm.length} npm packages, ${cargo.length} crates`);
