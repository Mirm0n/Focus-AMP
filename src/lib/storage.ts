/**
 * One-time move of saved settings from the app's older names.
 *
 * Everything the app remembers — themes, favourites, pinned genres, the timer,
 * the last station — lives under a `focusamp:` prefix in localStorage. That
 * prefix was `tunescape:` before 2026-10-23 and `radiodoro:` before
 * 2026-10-28. Renaming the app without this would silently reset every one of
 * those on the next launch.
 *
 * Runs before the first render, copies rather than moves (so a downgrade still
 * finds its data), and never overwrites a key the new name already has. The
 * old prefixes are tried newest first, so someone who ran both earlier builds
 * carries over the more recent of the two.
 */

const OLD = ["radiodoro:", "tunescape:"];
const NEW = "focusamp:";

export function migrateStorage() {
  try {
    for (const old of OLD) {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(old)) keys.push(key);
      }
      for (const key of keys) {
        const moved = NEW + key.slice(old.length);
        if (localStorage.getItem(moved) !== null) continue;
        const value = localStorage.getItem(key);
        if (value !== null) localStorage.setItem(moved, value);
      }
    }
  } catch {
    /* private mode, or storage disabled: nothing to carry over */
  }
}
