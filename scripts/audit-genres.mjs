/**
 * Station yield per genre, against the live directory.
 *
 *   npm run audit:genres
 *
 * A genre is a hand-written set of tags, and the directory's tags drift. This
 * runs the app's own listing code for every genre and reports how many
 * playable stations each one ends up with, so a tag set that has quietly dried
 * up gets caught. Exits non-zero if any genre is below MIN.
 */
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const MIN = 8;

const dir = mkdtempSync(join(tmpdir(), "tunescape-genres-"));
const out = join(dir, "catalog.mjs");
await build({
  stdin: {
    contents: `export { GENRES } from "./src/data/genres"; export { listGenre, removedForAI, pendingProvenance } from "./src/lib/radioBrowser";`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  outfile: out,
  format: "esm",
  platform: "node",
  logLevel: "error",
});
const { GENRES, listGenre, removedForAI, pendingProvenance } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let thin = 0;
for (const genre of GENRES) {
  let line;
  try {
    const stations = await listGenre(genre);
    const picks = stations.filter((s) => s.pick).length;
    const count = (v) => stations.filter((s) => s.vocals === v).length;
    const known = stations.filter((s) => s.vocalsFrom !== "genre").length;
    const low = stations.length < MIN;
    if (low) thin++;
    line =
      `${String(stations.length).padStart(3)} stations  ${String(picks).padStart(2)} picks  ` +
      `inst ${String(count("instrumental")).padStart(2)} · mixed ${String(count("mixed")).padStart(2)} · ` +
      `vocal ${String(count("vocal")).padStart(2)}  (${known} known)${low ? "   << THIN" : ""}`;
  } catch (e) {
    thin++;
    line = `FAILED: ${e.message}`;
  }
  console.log(`${genre.name.padEnd(24)} ${line}`);
}
const pending = new Map();
for (const p of pendingProvenance) pending.set(`${p.genre}: ${p.name}`, p);
const byGenre = {};
for (const p of pending.values()) (byGenre[p.genre] ??= []).push(p);
console.log(`
excluded pending provenance (high-risk genres): ${pending.size}`);
for (const [genre, list] of Object.entries(byGenre)) {
  const reasons = {};
  for (const p of list) reasons[p.reason] = (reasons[p.reason] ?? 0) + 1;
  console.log(`  ${genre.padEnd(10)} ${String(list.length).padStart(3)}  ` + Object.entries(reasons).map(([r, n]) => `${n} ${r}`).join(' · '));
}
if (process.argv.includes('--names')) for (const p of pending.values()) console.log(`    ${p.genre}: ${p.name}  [${p.reason}]`);
const gone = [...new Set(removedForAI)];
console.log(`
removed for AI or royalty-free wording: ${gone.length}`);
for (const name of gone) console.log(`  ${name}`);
console.log(thin ? `\n${thin} genre(s) need attention` : `\nall ${GENRES.length} genres healthy`);
process.exit(thin ? 1 : 0);
