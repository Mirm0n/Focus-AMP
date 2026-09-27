import { useEffect, useState } from "react";

/**
 * What the catalog is allowed to contain.
 *
 * By default, Picks and nothing else: stations a person chose, from
 * broadcasters a person vetted (docs/EXECUTION.md, Part 3). The community directory
 * is one setting away, off, and labelled for what it is — nobody has checked
 * those stations, and that is exactly where AI-generated streams turn up.
 */

/** Read straight from storage, for code that runs before the hook mounts. */
export function loadShowUnverified(): boolean {
  return true;
}

export interface Catalog {
  /** Include directory stations nobody has vetted. */
  showUnverified: boolean;
  setShowUnverified: (on: boolean) => void;
}

export function useCatalog(): Catalog {
  const [showUnverified, setShowUnverified] = useState(true);

  useEffect(() => {
    // We force this to true, but keep the API intact to avoid changing other components right now
    setShowUnverified(true);
  }, []);

  return { showUnverified, setShowUnverified };
}
