import { invoke } from "@tauri-apps/api/core";

import { pickMirror } from "./radioBrowser";

let cachedPort: number | null = null;

/** Loopback port the Rust audio proxy bound at startup. */
export async function getProxyPort(): Promise<number> {
  if (cachedPort !== null) return cachedPort;
  cachedPort = await invoke<number>("proxy_port");
  return cachedPort;
}

/** Wrap an upstream stream URL so it reaches the webview CORS-clean. */
export function proxied(port: number, upstream: string): string {
  return `http://127.0.0.1:${port}/stream?url=${encodeURIComponent(upstream)}`;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const uuidCache = new Map<string, string>();

/**
 * Turn a `resolve:<uuid>` catalog entry into a real stream URL.
 * Plain URLs pass through untouched.
 */
export async function resolveStationUrl(url: string): Promise<string> {
  if (!url.startsWith("resolve:")) return url;
  const uuid = url.slice("resolve:".length);

  const hit = uuidCache.get(uuid);
  if (hit) return hit;

  const mirror = await pickMirror();
  const res = await fetch(`${mirror}/json/stations/byuuid/${uuid}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Radio Browser returned ${res.status}`);

  const data = (await res.json()) as Array<{ url_resolved?: string; url?: string }>;
  const resolved = data[0]?.url_resolved || data[0]?.url;
  if (!resolved) throw new Error("Radio Browser had no URL for that station");

  uuidCache.set(uuid, resolved);
  return resolved;
}
