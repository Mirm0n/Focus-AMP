/**
 * Contrast audit over every theme variant.
 *
 *   npm run audit:themes
 *
 * themes.ts derives its structural colours against contrast targets, so this
 * should always pass — it is here to catch a new seed or an `override` that
 * quietly breaks one. Exits non-zero on any miss.
 */
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "tunescape-themes-"));
const out = join(dir, "themes.mjs");
await build({ entryPoints: ["src/theme/themes.ts"], outfile: out, format: "esm", logLevel: "error" });
const { THEMES, contrast } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

// [label, foreground token, background token, minimum ratio]
const CHECKS = [
  ["primary on base", "--app-text-primary", "--app-bg-base", 7],
  ["muted on surface", "--app-text-muted", "--app-bg-surface", 4.5],
  ["muted on overlay", "--app-text-muted", "--app-bg-overlay", 4.5],
  ["faint on base", "--app-text-faint", "--app-bg-base", 4.5],
  ["faint on surface", "--app-text-faint", "--app-bg-surface", 4.5],
  ["faint on header", "--app-text-faint", "--app-bg-header", 4.5],
  ["faint on overlay", "--app-text-faint", "--app-bg-overlay", 4.5],
  ["accent on base", "--app-accent", "--app-bg-base", 4.5],
  ["accent on surface", "--app-accent", "--app-bg-surface", 4.5],
  ["accent on overlay", "--app-accent", "--app-bg-overlay", 4.5],
  ["accent ink on accent", "--app-accent-ink", "--app-accent", 4.5],
  ["danger on base", "--app-danger", "--app-bg-base", 4.5],
  ["danger on header", "--app-danger", "--app-bg-header", 4.5],
  ["default border on surface", "--app-border-default", "--app-bg-surface", 3],
  ["muted border on base", "--app-border-muted", "--app-bg-base", 1.8],
  ["subtle border on surface", "--app-border-subtle", "--app-bg-surface", 1.35],
  ["surface off base", "--app-bg-surface", "--app-bg-base", 1.1],
  ["overlay off surface", "--app-bg-overlay", "--app-bg-surface", 1.1],
  ["unlit cell on glass", "--viz-grid", "--viz-ground", 1.25],
  ["lit cell on glass", "--viz-lo", "--viz-ground", 4.5],
  ["lit cell off unlit", "--viz-lo", "--viz-grid", 3],
  ["display ink on glass", "--viz-ink", "--viz-ground", 7],
];

let misses = 0;
for (const theme of THEMES) {
  for (const mode of ["dark", "light"]) {
    const t = theme[mode].tokens;
    const bad = CHECKS.flatMap(([label, fg, bg, min]) => {
      const ratio = contrast(t[fg], t[bg]);
      return ratio < min ? [`${label} ${ratio.toFixed(2)} < ${min}`] : [];
    });
    misses += bad.length;
    console.log(`${`${theme.id}/${mode}`.padEnd(16)} ${bad.length ? bad.join(" | ") : "ok"}`);
  }
}
console.log(misses ? `\n${misses} miss(es)` : `\nall ${THEMES.length * 2} variants pass`);
process.exit(misses ? 1 : 0);
