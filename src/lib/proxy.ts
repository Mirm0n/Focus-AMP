import { invoke } from "@tauri-apps/api/core";

import { pickMirror } from "./radioBrowser";

/**
 * Where the audio proxy is, and the token that admits us to it.
 *
 * The port alone is not a secret — a loopback port can be found by anything on
 * the machine, including a web page in a browser. The token can only be had by
 * asking Tauri, which a web page cannot do. See `src-tauri/src/proxy.rs`.
 */
export interface ProxyAccess {
  port: number;
  token: string;
}

let cached: ProxyAccess | null = null;

export async function getProxyAccess(): Promise<ProxyAccess> {
  if (cached !== null) return cached;
  cached = await invoke<ProxyAccess>("proxy_access");
  return cached;
}

/** Wrap an upstream stream URL so it reaches the webview CORS-clean. */
export function proxied({ port, token }: ProxyAccess, upstream: string): string {
  const q = new URLSearchParams({ url: upstream, t: token });
  return `http://127.0.0.1:${port}/stream?${q}`;
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
