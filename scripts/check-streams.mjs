/**
 * Is every Pick still on the air?
 *
 *   npm run check:streams
 *
 * Deliberately **not** part of `npm run build`. It talks to three dozen radio
 * stations over the open internet, so it is slow, it fails on a train, and a
 * station being down for an hour is not a reason a build should fail. The
 * build-time gate is `check:stations`, which asks a different question: does
 * every Pick have a terms record, a real genre and a host that is not denied.
 *
 * This one is for rule R8 in docs/EXECUTION.md §3.2 — "every Pick carries its
 * check date and is re-checked every six months" — which until now had no tool
 * behind it and therefore depended on somebody remembering. Run it before a
 * release, and when a `terms.checked` date starts looking old.
 *
 * A station passes only if it answers 200, says it is audio, *and* actually
 * hands over some bytes. A 200 on its own means very little here: a dead mount
 * often answers cheerfully and then sends nothing, which is exactly the
 * failure the player struggles to tell from a slow connection.
 *
 * Exits non-zero if any Pick fails, so it can gate a release script.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = readFileSync(join(root, "src/data/stations.ts"), "utf8");

/** pick("Name", "artist", url, …) — the same shape check-stations.mjs reads. */
const RE = /const (\w+) = pick\(\s*"([^"]+)",\s*"[^"]*",\s*"([^"]+)"/g;
const picks = [...src.matchAll(RE)].map((m) => ({
  id: m[1],
  // The source escapes non-ASCII, so · and friends come back as literals.
  name: m[2].replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
  url: m[3],
}));

if (picks.length === 0) {
  console.error("check:streams — could not read any Picks. Has pick() changed shape?");
  process.exit(1);
}

const HEADER_TIMEOUT = 12000;
const BODY_WINDOW = 2500;
const ENOUGH = 40000;
const MIN_BYTES = 2000;

async function check(pick) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), HEADER_TIMEOUT);
  try {
    const res = await fetch(pick.url, {
      headers: { "Icy-MetaData": "1", "User-Agent": "FocusAMP/2.0" },
      signal: ctl.signal,
      redirect: "follow",
    });
    const type = res.headers.get("content-type") || "";
    const icy = res.headers.get("icy-name") || "";

    // Take a little audio. Bounded two ways, because this is an endless stream
    // and neither "enough bytes" nor "enough time" can be relied on alone.
    let bytes = 0;
    const reader = res.body && res.body.getReader();
    if (reader) {
      const stop = setTimeout(() => reader.cancel().catch(() => {}), BODY_WINDOW);
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > ENOUGH) break;
        }
      } catch {
        /* cancelled by the timer above, which is the normal path */
      }
      clearTimeout(stop);
      reader.cancel().catch(() => {});
    }
    return { ...pick, status: res.status, type, icy, bytes };
  } catch (e) {
    const why = e.name === "AbortError" ? "no response in time" : String(e.message).slice(0, 48);
    return { ...pick, status: 0, type: "", icy: "", bytes: 0, error: why };
  } finally {
    clearTimeout(timer);
  }
}

const healthy = (r) =>
  r.status === 200 && /audio|ogg|mpeg|aac/i.test(r.type) && r.bytes > MIN_BYTES;

// Six at a time: enough to keep this under a minute, few enough that we are
// not opening three dozen simultaneous connections to volunteer-run servers.
const results = [];
for (let i = 0; i < picks.length; i += 6) {
  results.push(...(await Promise.all(picks.slice(i, i + 6).map(check))));
}

// One second chance each, for the same reason the proxy gives stations one
// (see UPSTREAM_RETRIES in src-tauri/src/proxy.rs): a CDN edge refuses a
// single connection, TLS stalls once, and the station is perfectly fine. This
// was not hypothetical — the first run of this script reported a station down
// that answered three times in a row a moment later. A checker that cries
// wolf is worse than no checker, because a release gate nobody trusts gets
// skipped.
const shaky = results.filter((r) => !healthy(r));
if (shaky.length) {
  console.log(`\n  … ${shaky.length} did not answer; giving each one a second try\n`);
  await new Promise((r) => setTimeout(r, 2000));
  const retried = await Promise.all(shaky.map(check));
  for (const r of retried) {
    const i = results.findIndex((x) => x.url === r.url);
    if (i >= 0 && healthy(r)) results[i] = r;
  }
}

const failed = results.filter((r) => !healthy(r));
for (const r of results) {
  console.log(
    `  ${healthy(r) ? "ok  " : "FAIL"} ${String(r.status).padStart(3)} ` +
      `${String(r.bytes).padStart(6)}B  ${r.name.slice(0, 30).padEnd(31)} ` +
      `${(r.error || r.icy).slice(0, 34)}`,
  );
}

console.log(
  `\ncheck:streams — ${results.length} Picks, ${results.length - failed.length} on the air, ` +
    `${failed.length} not`,
);

// ── The terms records' own sources ──────────────────────────────────────────
// Every Pick is justified by a page somebody read, and that justification is
// only auditable while the page is still there. A broadcaster quietly dropping
// the page that said "use your own player" is exactly the change we would want
// to notice, and it is invisible from the stream itself.
const sources = [...new Set([...src.matchAll(/source: "(https:\/\/[^"]+)"/g)].map((m) => m[1]))];

async function reachable(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    // Some of these refuse HEAD, so ask for the page and read nothing.
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "User-Agent": "FocusAMP/2.0 terms-check" },
    });
    res.body?.cancel().catch(() => {});
    return { url, status: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (e) {
    return { url, status: 0, ok: false, error: e.name === "AbortError" ? "timed out" : String(e.message).slice(0, 44) };
  } finally {
    clearTimeout(timer);
  }
}

console.log(`\n  terms sources (${sources.length} distinct):`);
const sourceResults = [];
for (let i = 0; i < sources.length; i += 5) {
  sourceResults.push(...(await Promise.all(sources.slice(i, i + 5).map(reachable))));
}
const goneSources = sourceResults.filter((r) => !r.ok);
for (const r of sourceResults) {
  console.log(`  ${r.ok ? "ok  " : "GONE"} ${String(r.status).padStart(3)}  ${r.url.slice(0, 62)}`);
}

if (failed.length) {
  console.error("\nNot answering with audio:");
  for (const f of failed) {
    console.error(`  - ${f.name}: ${f.error || `HTTP ${f.status}, ${f.bytes} bytes, "${f.type}"`}`);
    console.error(`      ${f.url}`);
  }
  console.error(
    "\nA station can be down for an hour, so check by hand before removing one.\n" +
      "If it is really gone, replace it and record the change in docs/EXECUTION.md Part 4.",
  );
}

if (goneSources.length) {
  console.error(`\n${goneSources.length} terms source(s) no longer reachable:`);
  for (const g of goneSources) console.error(`  - ${g.error || `HTTP ${g.status}`}  ${g.url}`);
  console.error(
    "\nThis does not mean the station is out. It means the evidence for keeping it\n" +
      "cannot be re-read, so somebody has to find where those terms live now and\n" +
      "update the record — or, if they are gone for good, re-decide.",
  );
}

if (failed.length || goneSources.length) process.exit(1);
