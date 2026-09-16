import { useEffect, useRef, useState } from "react";

import type { ButterchurnVisualizer } from "butterchurn";

import type { VizComponentProps, Visualizer } from "../types";

/**
 * Milkdrop — Winamp's visualizer, by way of Butterchurn.
 *
 * Butterchurn (MIT) is a WebGL reimplementation of Milkdrop 2, and the preset
 * pack is the original community library: Geiss, Aderrasi, Royal and the rest.
 * This is the real article from the era rather than an impression of it, which
 * is why it is worth a WebGL context and a megabyte of presets.
 *
 * Both modules are UMD browser bundles that touch `window` at load, so they are
 * imported dynamically — a static import would break any non-browser build step
 * and would put the whole pack in the startup path.
 */

/** Preset names, published once the pack has loaded, for the settings picker. */
let presetNames: string[] = [];
const nameListeners = new Set<(names: string[]) => void>();

export function getPresetNames(): string[] {
  return presetNames;
}

export function onPresetNames(cb: (names: string[]) => void): () => void {
  nameListeners.add(cb);
  if (presetNames.length) cb(presetNames);
  return () => nameListeners.delete(cb);
}

type PresetMap = Record<string, unknown>;

let presetsPromise: Promise<PresetMap> | null = null;

function loadPresets(): Promise<PresetMap> {
  if (!presetsPromise) {
    presetsPromise = import("butterchurn-presets").then((mod) => {
      const raw = mod.default ?? mod;
      // The pack has shipped both shapes across versions: a bare map, and one
      // behind getPresets(). Handle either rather than pinning to a version.
      const map = typeof raw.getPresets === "function" ? raw.getPresets() : (raw as PresetMap);
      presetNames = Object.keys(map).sort((a, b) => a.localeCompare(b));
      nameListeners.forEach((cb) => cb(presetNames));
      return map;
    });
  }
  return presetsPromise;
}

function MilkdropView({ source, options, preview, theme }: VizComponentProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live values the render loop reads without being rebuilt.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    let disposed = false;
    let raf = 0;
    let viz: ButterchurnVisualizer | null = null;
    let ro: ResizeObserver | null = null;
    /** Our own node between the analyser and Butterchurn, so teardown can cut
        exactly one edge. Calling disconnect() on the analyser itself would drop
        every outgoing connection it has — including the path to the speakers. */
    let tap: GainNode | null = null;
    let tapSource: AnalyserNode | null = null;
    let presets: PresetMap = {};
    let currentPreset = "";
    let sinceSwitch = 0;
    let last = performance.now();

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    holder.appendChild(canvas);

    const pickRandom = () => {
      const names = Object.keys(presets);
      if (!names.length) return "";
      return names[Math.floor(Math.random() * names.length)];
    };

    const apply = (name: string, blend: number) => {
      const preset = presets[name];
      if (!preset || !viz) return;
      viz.loadPreset(preset, blend);
      currentPreset = name;
      sinceSwitch = 0;
    };

    (async () => {
      try {
        const [bcMod, presetMap] = await Promise.all([
          import("butterchurn"),
          loadPresets(),
        ]);
        if (disposed) return;

        const butterchurn = bcMod.default ?? bcMod;
        presets = presetMap;

        const analyser = sourceRef.current;
        if (!analyser) {
          setError("Start a station to run Milkdrop.");
          return;
        }

        const rect = holder.getBoundingClientRect();
        // Presets are shader-heavy; a preview at full device resolution costs
        // as much as the main stage for a tile the size of a stamp.
        const pixelRatio = preview ? 0.6 : Math.min(window.devicePixelRatio || 1, 1.5);

        viz = butterchurn.createVisualizer(analyser.context as AudioContext, canvas, {
          width: Math.max(64, Math.round(rect.width)),
          height: Math.max(48, Math.round(rect.height)),
          pixelRatio,
          textureRatio: preview ? 0.5 : 1,
        });
        if (!viz || disposed) return;

        // Fan-out through a node we own. Butterchurn only reads — it never
        // routes to the destination — so this cannot double the audio.
        tap = analyser.context.createGain();
        analyser.connect(tap);
        tapSource = analyser;
        viz.connectAudio(tap);

        apply(optionsRef.current.preset ?? pickRandom(), 0);

        const resize = () => {
          const r = holder.getBoundingClientRect();
          viz?.setRendererSize(Math.max(64, Math.round(r.width)), Math.max(48, Math.round(r.height)));
        };
        resize();
        ro = new ResizeObserver(resize);
        ro.observe(holder);

        const tick = (now: number) => {
          raf = requestAnimationFrame(tick);
          const dt = Math.min((now - last) / 1000, 0.1);
          last = now;

          const opts = optionsRef.current;
          // A pinned preset wins; shuffling only happens when none is pinned.
          if (opts.preset && opts.preset !== currentPreset) {
            apply(opts.preset, 2);
          } else if (!opts.preset && opts.cycleSeconds > 0) {
            sinceSwitch += dt;
            if (sinceSwitch >= opts.cycleSeconds) apply(pickRandom(), 2.7);
          }

          viz?.render();
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        if (!disposed) setError(`Milkdrop could not start: ${String(e)}`);
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      // Butterchurn has no dispose; dropping the canvas releases the WebGL
      // context. Cut only our own edge — never the analyser's other outputs.
      try {
        if (tapSource && tap) tapSource.disconnect(tap);
        tap?.disconnect();
      } catch {
        /* the graph may already be torn down */
      }
      canvas.remove();
      viz = null;
    };
  }, [preview, source]);

  return (
    <div
      ref={holderRef}
      style={{ width: "100%", height: "100%", position: "relative", background: theme.ground }}
    >
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 16,
            textAlign: "center",
            fontSize: 12,
            color: theme.ink,
            opacity: 0.7,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export const milkdrop: Visualizer = {
  id: "milkdrop",
  name: "Milkdrop",
  blurb: "Winamp's visualizer — 100 original presets, via Butterchurn",
  supports: ["preset", "cycleSeconds"],
  Component: MilkdropView,
};
