import {
  bandEnergy,
  bandLevel,
  ballistic,
  clamp,
  ladderColor,
  logBands,
  persist,
  withAlpha,
  type VizInstance,
  type Visualizer,
} from "../types";

/**
 * Spikes — the radial burst from Windows Media Player's Battery set.
 *
 * Spokes run out from a centre disc, one per band, mirrored so the left half
 * matches the right. That mirroring is why it reads as an object rather than a
 * chart wrapped into a circle: WMP's radial visualizers were all symmetric, and
 * an asymmetric version just looks like a bar graph someone bent.
 *
 * The whole figure rotates slowly and the centre disc breathes with the bass.
 */

export const spikes: Visualizer = {
  id: "spikes",
  name: "Spikes",
  blurb: "Radial burst, mirrored — Media Player's Battery set",
  supports: ["density", "glow", "peaks"],

  create(): VizInstance {
    let half = 0;
    let binCount = 0;
    let bands: Array<[number, number]> = [];
    let levels = new Float32Array(0);
    let peaks = new Float32Array(0);
    let rotation = 0;
    let bass = 0;

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;
        const wantHalf = clamp(Math.round(16 + opts.density * 46), 10, 72);

        if (wantHalf !== half) {
          half = wantHalf;
          levels = new Float32Array(half);
          peaks = new Float32Array(half);
          bands = [];
        }
        if (binCount !== frame.freq.length) {
          binCount = frame.freq.length;
          bands = [];
        }
        if (bands.length !== half && binCount > 0) {
          bands = logBands(half, binCount, frame.sampleRate);
        }

        persist(ctx, view, 0.3);

        bass = ballistic(bass, bandEnergy(frame.freq, 0, 0.08), frame.dt, 2.2);

        rotation += frame.dt * 0.12;
        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.min(w, h) * 0.47;
        const inner = maxR * (0.16 + bass * 0.1);

        // Centre disc — the thing the spokes appear to grow out of.
        ctx.beginPath();
        ctx.arc(cx, cy, inner, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(theme.lo, 0.1 + bass * 0.25);
        ctx.fill();
        ctx.strokeStyle = withAlpha(theme.ink, 0.22);
        ctx.lineWidth = Math.max(1, dpr);
        ctx.stroke();

        const total = half * 2;
        ctx.lineCap = "round";

        for (let i = 0; i < half; i++) {
          const target = bands.length === half ? bandLevel(frame.freq, bands[i], i, half) : 0;
          levels[i] = ballistic(levels[i], target, frame.dt, 1.8);
          peaks[i] =
            levels[i] >= peaks[i] ? levels[i] : Math.max(levels[i], peaks[i] - frame.dt * 0.9);

          const len = inner + levels[i] * (maxR - inner);
          const color = ladderColor(levels[i], theme);
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1.5, (maxR * 2 * Math.PI) / total / dpr) * dpr * 0.5;
          if (opts.glow) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 9 * dpr;
          }

          // Each band draws twice, mirrored across the vertical axis.
          for (const side of [1, -1] as const) {
            const a = rotation + side * ((i / total) * Math.PI * 2 + Math.PI / total);
            const sin = Math.sin(a);
            const cos = Math.cos(a);
            ctx.beginPath();
            ctx.moveTo(cx + sin * inner, cy - cos * inner);
            ctx.lineTo(cx + sin * len, cy - cos * len);
            ctx.stroke();

            if (opts.peaks && peaks[i] > 0.04) {
              const pr = inner + peaks[i] * (maxR - inner);
              ctx.beginPath();
              ctx.arc(cx + sin * pr, cy - cos * pr, Math.max(1.2, 1.6 * dpr), 0, Math.PI * 2);
              ctx.fillStyle = theme.ink;
              ctx.fill();
            }
          }
        }

        ctx.shadowBlur = 0;
      },
    };
  },
};
