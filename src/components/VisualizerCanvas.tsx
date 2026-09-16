import { useEffect, useRef } from "react";

import type { VizFrame, VizOptions, VizTheme, VizView, Visualizer } from "../viz/types";

/**
 * The canvas host.
 *
 * Owns the one requestAnimationFrame loop, the device-pixel sizing, and the
 * audio frame. Visualizers are pure draw functions over that frame — swapping
 * one costs a factory call, not a remount.
 *
 * Drawing happens in device pixels with no transform, so every visualizer can
 * snap its rects to whole pixels. A dpr transform leaves fractional edges that
 * get antialiased on both sides, which reads as blur on hard-edged displays.
 */

interface VisualizerCanvasProps {
  analyser: AnalyserNode | null;
  visualizer: Visualizer;
  options: VizOptions;
  theme: VizTheme;
  playing: boolean;
  /** Smaller previews skip the expensive passes. */
  preview?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function VisualizerCanvas({
  analyser,
  visualizer,
  options,
  theme,
  playing,
  preview = false,
  className,
  style,
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live values the loop reads without being torn down and rebuilt.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const analyserRef = useRef(analyser);
  analyserRef.current = analyser;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const instance = visualizer.create();
    const dpr = Math.min(window.devicePixelRatio || 1, preview ? 1.5 : 2);

    let raf = 0;
    let freq = new Uint8Array(0);
    let wave = new Uint8Array(0);
    const startedAt = performance.now();
    let last = startedAt;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const w = canvas.width;
      const h = canvas.height;
      if (w < 4 || h < 4) return;

      const an = analyserRef.current;
      if (an) {
        if (freq.length !== an.frequencyBinCount) {
          freq = new Uint8Array(an.frequencyBinCount);
          wave = new Uint8Array(an.fftSize);
        }
        an.getByteFrequencyData(freq);
        an.getByteTimeDomainData(wave);
      } else if (freq.length === 0) {
        // No graph yet — hand the visualizer a silent frame so it still paints
        // its resting state rather than leaving an empty canvas.
        freq = new Uint8Array(1024);
        wave = new Uint8Array(2048).fill(128);
      }

      const view: VizView = { w, h, dpr, theme: themeRef.current };
      const frame: VizFrame = {
        freq,
        wave,
        sampleRate: an?.context.sampleRate ?? 48000,
        fftSize: an?.fftSize ?? 2048,
        dt,
        time: (now - startedAt) / 1000,
        playing: playingRef.current,
      };

      instance.draw(ctx, frame, view, optionsRef.current);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // A different visualizer needs a fresh instance; everything else is a ref.
  }, [visualizer, preview]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
