/**
 * Refuse to build a catalog that cannot account for itself.
 *
 *   npm run check:stations
 *
 * Runs first in `npm run build`. The rule it enforces is the one from
 * docs/EXECUTION.md §1.5: a station is a Pick only if somebody read its terms,
 * wrote down where, and dated it. That is a promise the app makes on its About
 * screen, and a promise nothing checks is a promise that rots.
 *
 * Fails the build when a Pick:
 *   - has no `terms` record, or one with an unknown status
 *   - has a `terms.source` that is not a URL, or a `checked` that is not a date
 *   - is on the denylist, or shares a host with something on it
 *   - names a genre that does not exist
 *
 * Warns, without failing, about genres with no Picks — that is the open L3
 * work, and a warning keeps it visible without blocking a release on it.
 *
 * Reads the TypeScript sources as text rather than importing them: this runs
 * before the build, so there is nothing compiled to import yet, and a checker
 * that needs the build to pass first cannot gate the build.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(root, p), "utf8");

const VALID_STATUS = new Set(["allows-players", "silent", "permission"]);

const stationsSrc = read("src/data/stations.ts");
const genresSrc = read("src/data/genres.ts");
const denySrc = read("src/data/denylist.ts");

const errors = [];
const warnings = [];

// ── The genres that exist ───────────────────────────────────────────────────
// Only the ones the app actually offers. `PLANNED_GENRES` sits in the same
// file with its tag sets kept whole, and must not be mistaken for a genre
// that is missing its Picks — that is the whole reason it was moved out.
const genresArray = genresSrc.slice(
  genresSrc.indexOf("export const GENRES: GenreDef[] = ["),
  genresSrc.indexOf("export const PLANNED_GENRES"),
);
const genreIds = new Set([...genresArray.matchAll(/^\s*id: "([^"]+)",/gm)].map((m) => m[1]));
if (genreIds.size === 0) errors.push("could not read any genre ids from src/data/genres.ts");

const plannedSrc = genresSrc.slice(genresSrc.indexOf("export const PLANNED_GENRES"));
const plannedIds = [...plannedSrc.matchAll(/^\s*id: "([^"]+)",/gm)].map((m) => m[1]);
for (const id of plannedIds) {
  if (genreIds.has(id)) errors.push(`genre "${id}" is in both GENRES and PLANNED_GENRES`);
}

// ── The terms records, by const name ────────────────────────────────────────
const terms = new Map();
for (const m of stationsSrc.matchAll(
  /const (\w+_TERMS): StationTerms = \{([\s\S]*?)\n\};/g,
)) {
  const body = m[2];
  const field = (name) => body.match(new RegExp(`${name}: "([^"]*)"`))?.[1];
  terms.set(m[1], { status: field("status"), source: field("source"), checked: field("checked") });
}

for (const [name, t] of terms) {
  if (!VALID_STATUS.has(t.status)) {
    errors.push(`${name}: status ${JSON.stringify(t.status)} is not one of ${[...VALID_STATUS].join(", ")}`);
  }
  if (!/^https?:\/\/\S+$/.test(t.source ?? "")) {
    errors.push(`${name}: source ${JSON.stringify(t.source)} is not a URL`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.checked ?? "")) {
    errors.push(`${name}: checked ${JSON.stringify(t.checked)} is not an ISO date`);
  }
}

// ── The stations ────────────────────────────────────────────────────────────
// pick("Name", "artist", url, "vocals", TERMS_CONST, "home")
const stations = new Map();
for (const m of stationsSrc.matchAll(
  /const (\w+) = pick\(\s*"((?:[^"\\]|\\.)*)",\s*"(?:[^"\\]|\\.)*",\s*"([^"]+)",\s*"(\w+)",\s*(\w+),\s*"([^"]*)",?\s*\)/g,
)) {
  stations.set(m[1], { name: m[2], url: m[3], vocals: m[4], terms: m[5], home: m[6] });
}
if (stations.size === 0) errors.push("could not read any Picks from src/data/stations.ts — has pick() changed shape?");

for (const [constName, s] of stations) {
  if (!terms.has(s.terms)) {
    errors.push(`${constName} (${s.name}): no terms record named ${s.terms}`);
  }
  if (!/^https?:\/\/\S+$/.test(s.url)) {
    errors.push(`${constName} (${s.name}): stream URL ${JSON.stringify(s.url)} is not http(s)`);
  }
  if (s.home && !/^https?:\/\/\S+$/.test(s.home)) {
    errors.push(`${constName} (${s.name}): home ${JSON.stringify(s.home)} is not a URL`);
  }
}

// ── The denylist ────────────────────────────────────────────────────────────
const deniedHosts = [...denySrc.matchAll(/host: "([^"]+)"/g)].map((m) => m[1]);
const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
};
for (const [constName, s] of stations) {
  const host = hostOf(s.url);
  const hit = deniedHosts.find((d) => host === d || host.endsWith(`.${d}`));
  if (hit) errors.push(`${constName} (${s.name}): host ${host} is on the denylist (${hit})`);
}

// ── The genre map ───────────────────────────────────────────────────────────
const picksBlock = stationsSrc.slice(
  stationsSrc.indexOf("export const PICKS"),
  stationsSrc.indexOf("const PICK_URLS"),
);
const perGenre = [];
for (const m of picksBlock.matchAll(/^\s{2}(\w+): \[([^\]]*)\]/gm)) {
  const ids = m[2].split(",").map((x) => x.trim()).filter(Boolean);
  perGenre.push([m[1], ids]);
  if (!genreIds.has(m[1])) errors.push(`PICKS has "${m[1]}", which is not a genre in genres.ts`);
  for (const id of ids) {
    if (!stations.has(id)) errors.push(`PICKS.${m[1]} names ${id}, which is not a station`);
  }
}
for (const id of genreIds) {
  if (!perGenre.some(([g]) => g === id)) errors.push(`genre "${id}" has no entry in PICKS`);
}

// ── Report ──────────────────────────────────────────────────────────────────
const empty = perGenre.filter(([, ids]) => ids.length === 0).map(([g]) => g);
const filled = perGenre.filter(([, ids]) => ids.length > 0);
// An offered genre with no Picks is now an error, not a warning: the twelve
// that had none were moved to PLANNED_GENRES, so a new one appearing here
// means a genre was added to GENRES before it had a station to show.
if (empty.length) {
  errors.push(
    `${empty.length} offered genre(s) have no Picks: ${empty.join(", ")}. ` +
      `Either add a Pick, or move it to PLANNED_GENRES in genres.ts.`,
  );
}

// One host holding too much of the catalog is the SomaFM shape of fragility,
// whatever the terms say. See docs/EXECUTION.md Part 4.
const hosts = new Map();
for (const s of stations.values()) {
  const h = hostOf(s.url);
  if (h) hosts.set(h, (hosts.get(h) ?? 0) + 1);
}
for (const [host, n] of [...hosts].sort((a, b) => b[1] - a[1])) {
  if (n / stations.size > 0.25) {
    warnings.push(
      `${host} is ${n} of ${stations.size} Picks (${Math.round((n / stations.size) * 100)}%) — ` +
        `one host going away would take all of them. Prefer breadth in the next addition.`,
    );
  }
}

console.log(
  `check:stations — ${stations.size} Picks across ${filled.length} genres, ` +
    `${terms.size} terms records, ${plannedIds.length} genres planned`,
);
for (const [genre, ids] of filled) {
  console.log(`  ${genre.padEnd(12)} ${ids.length}`);
}
for (const w of warnings) console.log(`\n  warning: ${w}`);

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? "" : "s"}:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\nEvery Pick has a terms record, a real genre and a host that is not denied.");
