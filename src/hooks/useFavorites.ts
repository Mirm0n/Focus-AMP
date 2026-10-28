import { useCallback, useEffect, useMemo, useState } from "react";

import type { Station } from "../data/stations";
import { isDenied } from "../data/denylist";

/**
 * Starred stations.
 *
 * The whole station is stored, not just its URL: most of the catalog comes from
 * a directory listing that is fetched per genre and can change between
 * sessions, so a bare URL could not be turned back into a row — or played —
 * until its genre happened to be opened again.
 */

const STORAGE_KEY = "focusamp:favorites";

function load(): Station[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is Station => !!s && typeof s.name === "string" && typeof s.url === "string")
      // A broadcaster who refuses players, or who asked to be removed, does not
      // keep playing just because somebody starred them before that was known.
      .filter((s) => !isDenied(s.url));
  } catch {
    return [];
  }
}

export interface Favorites {
  /** Oldest first — a list you build, so it keeps the order you built it in. */
  stations: Station[];
  has: (station: Station) => boolean;
  toggle: (station: Station) => void;
}

export function useFavorites(): Favorites {
  const [stations, setStations] = useState<Station[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stations));
    } catch {
      /* private mode, or storage disabled */
    }
  }, [stations]);

  const urls = useMemo(() => new Set(stations.map((s) => s.url)), [stations]);
  const has = useCallback((station: Station) => urls.has(station.url), [urls]);
  const toggle = useCallback(
    (station: Station) =>
      setStations((list) =>
        list.some((s) => s.url === station.url)
          ? list.filter((s) => s.url !== station.url)
          : [...list, station],
      ),
    [],
  );

  return { stations, has, toggle };
}
