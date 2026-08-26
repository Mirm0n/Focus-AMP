import { useEffect, useRef } from "react";

/**
 * The LED spectrum.
 *
 * Band and segment counts are derived from the canvas size rather than fixed,
 * so the display gets denser as it gets bigger instead of turning into a grid
 * of large blocks. Everything is snapped to whole device pixels — fractional
 * rects get antialiased on both edges, which reads as blur at this scale.
 *
 * The frequency mapping is logarithmic. FFT bins are linearly spaced while
 * hearing is not, so a straight bin-to-bar mapping piles every visible movement
 * into the leftmost tenth and leaves the rest dead.
 */

/** Rough pixel budget per column and per segment, including its gap. */
const COL_PITCH = 11;
const SEG_PITCH = 7;

const MIN_BANDS = 16;
const MAX_BANDS = 128;
const MIN_SEGMENTS = 14;
const MAX_SEGMENTS = 80;

const MIN_HZ = 32;
const MAX_HZ = 16000;

/** Where the colour ladder changes, as a fraction of column height. */
const AMBER_AT = 0.62;
const RED_AT = 0.86;

interface SpectrumProps {
  analyser: AnalyserNode | null;
  /** A pixel height, or "fill" to take whatever the parent gives it. */
  height?: number | "fill";
  className?: string;
}

interface Colors {
  ground: string;
  gridOff: string;
  lo: string;
  mid: string;
  hi: string;
  cap: string;
}

function readColors(el: HTMLElement): Colors {
  const s = getComputedStyle(el);
  const v = (n: string, fallback: string) => s.getPropertyValue(n).trim() || fallback;
  return {
    ground: v("--app-bg-overlay", "#1a1a1a"),
    gridOff: v("--app-border-subtle", "#272727"),
    lo: v("--viz-led-lo", "#4fbf83"),
    mid: v("--viz-led-mid", "#f0a52c"),
    hi: v("--viz-led-hi", "#e2543c"),
    cap: v("--app-text-muted", "rgba(255,255,255,.7)"),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Log-spaced bin ranges, one per band. */
function buildBands(bandCount: number, binCount: number, sampleRate: number): Array<[number, number]> {
  const nyquist = sampleRate / 2;
  const top = Math.min(MAX_HZ, nyquist);
  const out: Array<[number, number]> = [];
  for (let i = 0; i < bandCount; i++) {
    const f0 = MIN_HZ * Math.pow(top / MIN_HZ, i / bandCount);
    const f1 = MIN_HZ * Math.pow(top / MIN_HZ, (i + 1) / bandCount);
    let b0 = Math.floor((f0 / nyquist) * binCount);
    let b1 = Math.ceil((f1 / nyquist) * binCount);
    b0 = clamp(b0, 0, binCount - 1);
    b1 = clamp(b1, b0 + 1, binCount);
    out.push([b0, b1]);
  }
  return out;
}

export function Spectrum({ analyser, height = "fill", className }: SpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let colors = readColors(canvas);

    // Sized on demand: band count follows the canvas width, and the bin ranges
    // follow both that and the analyser's FFT size.
    let bandCount = 0;
    let segmentCount = 0;
    let binCount = 0;
    let bands: Array<[number, number]> = [];
    let bins = new Uint8Array(0);
    let levels = new Float32Array(0);
    let peaks = new Float32Array(0);
    let holds = new Float32Array(0);

    // dpr capped at 2 — past that the fill cost outruns any visible gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      // Draw in device pixels so every rect can land on a whole one.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      colors = readColors(canvas);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const w = canvas.width;
      const h = canvas.height;
      if (w < 4 || h < 4) return;

      // ── Geometry, recomputed only when the size actually changes ──────────
      const wantBands = clamp(Math.round(cssW / COL_PITCH), MIN_BANDS, MAX_BANDS);
      const wantSegments = clamp(Math.round(cssH / SEG_PITCH), MIN_SEGMENTS, MAX_SEGMENTS);

      if (wantBands !== bandCount) {
        bandCount = wantBands;
        levels = new Float32Array(bandCount);
        peaks = new Float32Array(bandCount);
        holds = new Float32Array(bandCount);
        bands = [];
      }
      segmentCount = wantSegments;

      if (analyser) {
        if (binCount !== analyser.frequencyBinCount) {
          binCount = analyser.frequencyBinCount;
          bins = new Uint8Array(binCount);
          bands = [];
        }
        if (bands.length !== bandCount && binCount > 0) {
          bands = buildBands(bandCount, binCount, analyser.context.sampleRate);
        }
        analyser.getByteFrequencyData(bins);
      }

      // Phosphor persistence — decay the last frame instead of clearing it.
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = colors.ground;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      const colGap = Math.max(1, Math.round(1.5 * dpr));
      const segGap = Math.max(1, Math.round(1 * dpr));
      const colPitch = w / bandCount;
      const colW = Math.max(1, Math.round(colPitch - colGap));
      const segPitch = h / segmentCount;
      const segH = Math.max(1, Math.round(segPitch - segGap));

      for (let i = 0; i < bandCount; i++) {
        let target = 0;
        if (analyser && bands.length === bandCount) {
          const [b0, b1] = bands[i];
          let max = 0;
          for (let b = b0; b < b1; b++) if (bins[b] > max) max = bins[b];
          // Lift the top end: treble carries far less energy than bass, so a
          // raw reading leaves the right half permanently flat.
          const tilt = 1 + (i / bandCount) * 0.55;
          target = Math.min(1, (max / 255) * tilt);
        }

        // Asymmetric ballistics — snap up, sink slowly. Symmetric smoothing
        // reads as jelly rather than as a meter.
        levels[i] = target > levels[i] ? target : Math.max(target, levels[i] - dt * 1.5);

        if (levels[i] >= peaks[i]) {
          peaks[i] = levels[i];
          holds[i] = 0.5;
        } else if (holds[i] > 0) {
          holds[i] -= dt;
        } else {
          peaks[i] = Math.max(levels[i], peaks[i] - dt * 0.85);
        }

        const x = Math.round(i * colPitch);
        const lit = Math.round(levels[i] * segmentCount);

        for (let s = 0; s < segmentCount; s++) {
          const frac = s / (segmentCount - 1);
          const y = Math.round(h - (s + 1) * segPitch);
          const on = s < lit;

          if (on) {
            // Colour keyed to the segment's height in the column, never to how
            // tall this particular bar happens to be.
            ctx.fillStyle = frac >= RED_AT ? colors.hi : frac >= AMBER_AT ? colors.mid : colors.lo;
          } else {
            ctx.fillStyle = colors.gridOff;
          }
          ctx.fillRect(x, y, colW, segH);
        }

        if (peaks[i] > 0.02) {
          const ps = Math.min(segmentCount - 1, Math.round(peaks[i] * segmentCount));
          const py = Math.round(h - (ps + 1) * segPitch);
          ctx.fillStyle = colors.cap;
          ctx.fillRect(x, py, colW, Math.max(1, Math.round(segH * 0.4)));
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: height === "fill" ? "100%" : height,
        display: "block",
        borderRadius: "var(--app-radius-sm)",
        background: "var(--app-bg-overlay)",
      }}
    />
  );
}
