/**
 * Opens a URL in the real browser.
 *
 * The webview must never navigate away from the app, and `https` only: the
 * capability allows opening a URL, and nothing in this app has a reason to
 * hand the OS anything else.
 *
 * Lived in the About screen until the player bar needed it too, for the
 * Apple Music link beside a cover.
 */
export async function openExternal(url: string) {
  if (!url.startsWith("https://")) return;
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    /* outside Tauri, or the user declined: nothing useful to say */
  }
}
