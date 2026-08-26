import { useEffect, useRef } from "react";

/**
 * A preview of the Phase 3 hero, built here for one reason: it proves the
 * analyser data is *musical*, not merely non-zero. A peak reading above the
 * silence floor could be a single stuck bin; bars moving across the whole
 * width cannot be.
 *
 * It also settles the plan's #1 craft detail early. FFT bins are linearly
 * spaced while hearing is logarithmic, so a straight bin-to-bar mapping piles
 * every visible movement into the leftmost tenth and leaves the rest dead.
 * These bands are log-spaced.
 */

const BANDS = 28;
const SEGMENTS = 22;
const MIN_HZ = 32;
const MAX_HZ = 16000;

/** Where the colour ladder changes, as a fraction of column height. */
const AMBER_AT = 0.62;
const RED_AT = 0.86;

interface SpectrumProps {
  analyser: AnalyserNode | null;
  height?: number;
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

/** Log-spaced bin ranges, one per band. Recomputed only when the FFT changes. */
function buildBands(binCount: number, sampleRate: number): Array<[number, number]> {
  const nyquist = sampleRate / 2;
  const top = Math.min(MAX_HZ, nyquist);
  const out: Array<[number, number]> = [];
  for (let i = 0; i < BANDS; i++) {
    const f0 = MIN_HZ * Math.pow(top / MIN_HZ, i / BANDS);
    const f1 = MIN_HZ * Math.pow(top / MIN_HZ, (i + 1) / BANDS);
    let b0 = Math.floor((f0 / nyquist) * binCount);
    let b1 = Math.ceil((f1 / nyquist) * binCount);
    b0 = Math.max(0, Math.min(binCount - 1, b0));
    b1 = Math.max(b0 + 1, Math.min(binCount, b1));
    out.push([b0, b1]);
  }
  return out;
}

export function Spectrum({ analyser, height = 150, className }: SpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let colors = readColors(canvas);
    let bands: Array<[number, number]> = [];
    let bins = new Uint8Array(0);

    const levels = new Float32Array(BANDS);
    const peaks = new Float32Array(BANDS);
    const holds = new Float32Array(BANDS);

    // dpr capped at 2 — beyond that the fill cost outruns the visible gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w < 2 || h < 2) return;

      if (analyser) {
        if (bins.length !== analyser.frequencyBinCount) {
          bins = new Uint8Array(analyser.frequencyBinCount);
          bands = buildBands(analyser.frequencyBinCount, analyser.context.sampleRate);
        }
        analyser.getByteFrequencyData(bins);
      }

      // Phosphor persistence — decay the last frame instead of clearing it.
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = colors.ground;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      const gap = 2;
      const colW = (w - gap * (BANDS - 1)) / BANDS;
      const segGap = 2;
      const segH = (h - segGap * (SEGMENTS - 1)) / SEGMENTS;

      for (let i = 0; i < BANDS; i++) {
        let target = 0;
        if (analyser && bands.length) {
          const [b0, b1] = bands[i];
          let max = 0;
          for (let b = b0; b < b1; b++) if (bins[b] > max) max = bins[b];
          // Lift the top end: treble carries far less energy than bass, so a
          // raw reading leaves the right half of the display permanently flat.
          const tilt = 1 + (i / BANDS) * 0.55;
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

        const x = i * (colW + gap);
        const lit = Math.round(levels[i] * SEGMENTS);

        for (let s = 0; s < SEGMENTS; s++) {
          const frac = s / (SEGMENTS - 1);
          const y = h - (s + 1) * segH - s * segGap;
          const on = s < lit;

          if (on) {
            // Colour keyed to the segment's height in the column, never to how
            // tall this particular bar happens to be.
            ctx.fillStyle = frac >= RED_AT ? colors.hi : frac >= AMBER_AT ? colors.mid : colors.lo;
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 5;
          } else {
            ctx.fillStyle = colors.gridOff;
            ctx.shadowBlur = 0;
          }
          ctx.fillRect(x, y, colW, segH);
        }
        ctx.shadowBlur = 0;

        if (peaks[i] > 0.02) {
          const ps = Math.min(SEGMENTS - 1, Math.round(peaks[i] * SEGMENTS));
          const py = h - (ps + 1) * segH - ps * segGap;
          ctx.fillStyle = colors.cap;
          ctx.fillRect(x, py, colW, Math.max(1.5, segH * 0.35));
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
        height,
        display: "block",
        borderRadius: "var(--app-radius-sm)",
        background: "var(--app-bg-overlay)",
      }}
    />
  );
}
