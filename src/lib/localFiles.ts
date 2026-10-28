import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import type { Station } from "../data/stations";
import { isTauri, type ProxyAccess } from "./proxy";

/**
 * Your own audio files, played alongside the radio.
 *
 * A local track is a `Station` whose url is `local:<absolute path>`, so it
 * travels through the same queue, sidebar and transport as everything else.
 * The bytes are served by the Rust proxy — but only for paths this app has
 * explicitly registered, because the proxy listens on a loopback port that
 * any web page in a browser could also reach.
 */

export const LOCAL_PREFIX = "local:";
const STORAGE_KEY = "focusamp:local";

export const AUDIO_EXTENSIONS = ["mp3", "flac", "wav", "ogg", "oga", "opus", "m4a", "aac", "webm"];

export function isLocal(station: Station): boolean {
  return station.url.startsWith(LOCAL_PREFIX);
}

export function localPath(station: Station): string {
  return station.url.slice(LOCAL_PREFIX.length);
}

export function localUrl({ port, token }: ProxyAccess, path: string): string {
  const q = new URLSearchParams({ path, t: token });
  return `http://127.0.0.1:${port}/file?${q}`;
}

function fileName(path: string): { name: string; ext: string } {
  const base = path.split(/[\\/]/).pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot > 0
    ? { name: base.slice(0, dot), ext: base.slice(dot + 1).toUpperCase() }
    : { name: base, ext: "" };
}

export function localStation(path: string): Station {
  const { name, ext } = fileName(path);
  return {
    name,
    artist: ext ? `Local file · ${ext}` : "Local file",
    url: LOCAL_PREFIX + path,
    vocals: "mixed",
    vocalsFrom: "genre",
  };
}

function load(): Station[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p: unknown): p is string => typeof p === "string" && p.length > 0)
      .map(localStation);
  } catch {
    return [];
  }
}

async function allow(paths: string[]): Promise<void> {
  if (!isTauri() || paths.length === 0) return;
  await invoke("allow_local_files", { paths });
}

export interface LocalLibrary {
  stations: Station[];
  /** Open the system file picker and add whatever is chosen. */
  pick: () => Promise<void>;
  remove: (station: Station) => void;
}

export function useLocalLibrary(): LocalLibrary {
  const [stations, setStations] = useState<Station[]>(load);

  // The proxy's allowlist lives in memory, so it is refilled on every launch.
  useEffect(() => {
    allow(load().map(localPath)).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stations.map(localPath)));
    } catch {
      /* private mode, or storage disabled */
    }
  }, [stations]);

  const pick = useCallback(async () => {
    if (!isTauri()) return;
    const { open } = await import("@tauri-apps/plugin-dialog");
    const chosen = await open({
      multiple: true,
      directory: false,
      title: "Add audio files",
      filters: [{ name: "Audio", extensions: AUDIO_EXTENSIONS }],
    });
    const paths = (Array.isArray(chosen) ? chosen : chosen ? [chosen] : []).filter(Boolean);
    if (paths.length === 0) return;
    await allow(paths);
    setStations((prev) => {
      const have = new Set(prev.map((s) => s.url));
      const added = paths.map(localStation).filter((s) => !have.has(s.url));
      return [...prev, ...added];
    });
  }, []);

  const remove = useCallback((station: Station) => {
    setStations((prev) => prev.filter((s) => s.url !== station.url));
  }, []);

  return { stations, pick, remove };
}
