/**
 * Checking GitHub for a newer release.
 *
 * The app cannot push anything to anyone: it asks, on launch, whether a newer
 * release exists, and tells you if one does. Someone who never reopens it
 * never updates, and nothing can be made to happen on their machine remotely.
 *
 * This is the third thing the app contacts, after the station you are playing
 * and (if you turn them on) the directory and Apple. It is a plain anonymous
 * HTTPS request to a public release file — no account, no identifier, nothing
 * about you beyond the IP any request carries. It is on by default because a
 * player that cannot be patched is worse for you than one that asks GitHub a
 * question once a launch, and the proxy's own history says so. It is a setting
 * because that is your call and not ours, and it is written down in PRIVACY.md
 * either way.
 *
 * Updates are signed. The public half of the key is compiled into the app and
 * the private half never leaves the maintainer's machine, so a release this
 * app will install has to have been signed by whoever holds that key —
 * compromising the GitHub account alone is not enough.
 */

import { isTauri } from "./proxy";

const PREF_KEY = "focusamp:checkForUpdates";

/** Default on. Only an explicit "0" turns it off. */
export function loadCheckForUpdates(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setCheckForUpdates(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? "1" : "0");
  } catch {
    /* nothing to persist to; the session still honours the choice */
  }
}

export interface AvailableUpdate {
  version: string;
  notes?: string;
  /** Downloads and installs it, then the app must restart to run it. */
  install: () => Promise<void>;
}

/**
 * Asks once. Returns null when up to date, when the setting is off, when the
 * app is not running under Tauri, or when the check simply fails — being
 * offline is not an error worth putting in front of someone.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isTauri() || !loadCheckForUpdates()) return null;
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return null;
    return {
      version: update.version,
      notes: update.body,
      install: async () => {
        await update.downloadAndInstall();
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      },
    };
  } catch {
    // Offline, GitHub down, a release with no manifest yet, or a signature
    // that did not verify. None of those is the listener's problem.
    return null;
  }
}
