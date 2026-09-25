import { useEffect, useState } from "react";

import { findAlbumArt } from "../lib/albumArt";

/**
 * The cover for the current track title, or null — while looking, when there
 * is no confident match, when the lookup fails, or when the setting is off.
 */
export function useAlbumArt(title: string | null, enabled: boolean): string | null {
  const [art, setArt] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    if (!enabled || !title) return;
    const abort = new AbortController();
    // Streams often re-send or correct their metadata within a second of a
    // track change; wait that out rather than look up a title twice.
    const timer = setTimeout(() => {
      findAlbumArt(title, abort.signal).then(
        (url) => !abort.signal.aborted && setArt(url ? { title, url } : null),
        () => {
          /* offline or rate-limited: no art, and nothing worth saying about it */
        },
      );
    }, 900);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [title, enabled]);

  // Matched against the live title so the last track's cover never lingers
  // over the next track while its own lookup is still out.
  return enabled && art && art.title === title ? art.url : null;
}
