import { useCallback, useState } from "react";

/**
 * What the catalog is allowed to contain.
 *
 * By default, Picks and nothing else: stations a person chose, from
 * broadcasters a person vetted (docs/EXECUTION.md, Part 3). The community
 * directory is one setting away, off, and labelled for what it is — nobody has
 * checked those stations, and that is exactly where AI-generated streams turn
 * up.
 *
 * This was previously hardcoded to `true` with a note to fix it later, which
 * made the app's own description of itself false: the About screen says
 * stations are hand-checked, and the privacy policy says the directory is off
 * until you ask for it. Both are true again (task L4).
 */

const STORAGE_KEY = "focusamp:showUnverified";

/**
 * Read straight from storage, for code that runs before the hook mounts —
 * `loadLast` in App.tsx needs it to decide whether a remembered directory
 * station may still be the one that is on.
 */
export function loadShowUnverified(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode, or storage disabled. The safe answer is the strict one.
    return false;
  }
}

export interface Catalog {
  /** Include directory stations nobody has vetted. */
  showUnverified: boolean;
  setShowUnverified: (on: boolean) => void;
}

export function useCatalog(): Catalog {
  const [showUnverified, setState] = useState(loadShowUnverified);

  const setShowUnverified = useCallback((on: boolean) => {
    setState(on);
    try {
      localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
      /* nothing to persist to; the session still honours the choice */
    }
  }, []);

  return { showUnverified, setShowUnverified };
}
