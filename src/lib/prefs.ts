import { useCallback, useState } from "react";

/**
 * Window behaviour preferences that aren't about how anything looks.
 */

const CLOSE_TO_TRAY_KEY = "focusamp:closeToTray";

/** Read at the moment the close button is pressed, so it never goes stale. */
export function loadCloseToTray(): boolean {
  try {
    return localStorage.getItem(CLOSE_TO_TRAY_KEY) === "1";
  } catch {
    return false;
  }
}

export function useCloseToTray(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(loadCloseToTray);
  const set = useCallback((next: boolean) => {
    setOn(next);
    try {
      localStorage.setItem(CLOSE_TO_TRAY_KEY, next ? "1" : "0");
    } catch {
      /* private mode, or storage disabled */
    }
  }, []);
  return [on, set];
}
