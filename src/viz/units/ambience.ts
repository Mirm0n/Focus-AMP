import {
  bandEnergy,
  ballistic,
  clamp,
  withAlpha,
  type VizInstance,
  type Visualizer,
} from "../types";

/**
 * Ambience — the drifting colour field from Media Player's Ambience presets.
 *
 * Soft radial blobs orbiting on Lissajous paths, composited additively so
 * overlaps bloom into new colours. Each blob is tied to a slice of the spectrum
 * and swells with it, which is what keeps the drift tethered to the music
 * instead of running as a screensaver behind it.
 *
 * There is no persistence pass here: the field is redrawn whole every frame,
 * because trails turn the soft gradients into smears.
 */

interface Blob {
  /** Lissajous frequencies and phase, fixed at creation so paths never repeat. */
  fx: number;
  fy: number;
  phase: number;
  /** Which slice of the spectrum drives this one. */
  from: number;
  to: number;
  base: number;
  color: (t: { lo: string; mid: string; hi: string }) => string;
}

function makeBlobs(count: number): Blob[] {
  const out: Blob[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    out.push({
      fx: 0.06 + (i % 3) * 0.031 + t * 0.05,
      fy: 0.048 + ((i + 1) % 4) * 0.027 + t * 0.041,
      phase: (i * Math.PI * 2) / count,
      from: t * 0.7,
      to: t * 0.7 + 0.16,
      base: 0.26 + (i % 3) * 0.07,
      color: (c) => (i % 3 === 0 ? c.lo : i % 3 === 1 ? c.mid : c.hi),
    });
  }
  return out;
}

export const ambience: Visualizer = {
  id: "ambience",
  name: "Ambience",
  blurb: "Drifting colour field — Media Player's Ambience",
  supports: ["density", "glow", "mirror"],

  create(): VizInstance {
    let blobs: Blob[] = [];
    let count = 0;
    let levels: number[] = [];

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, theme } = view;
        const want = clamp(Math.round(4 + opts.density * 9), 3, 14);

        if (want !== count) {
          count = want;
          blobs = makeBlobs(count);
          levels = new Array(count).fill(0);
        }

        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = "lighter";
        const span = Math.max(w, h);
        const t = frame.time;

        blobs.forEach((blob, i) => {
          const energy = bandEnergy(frame.freq, blob.from, Math.min(1, blob.to));
          levels[i] = ballistic(levels[i], energy, frame.dt, 0.9);

          // Lissajous drift, kept inside the frame with a margin.
          const cx = w * (0.5 + 0.34 * Math.sin(t * blob.fx * Math.PI * 2 + blob.phase));
          const cy = h * (0.5 + 0.34 * Math.cos(t * blob.fy * Math.PI * 2 + blob.phase * 1.3));
          const radius = span * (blob.base + levels[i] * 0.3);
          const alpha = (opts.glow ? 0.34 : 0.22) * (0.32 + levels[i] * 0.85);

          const color = blob.color(theme);
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          g.addColorStop(0, withAlpha(color, alpha));
          g.addColorStop(0.45, withAlpha(color, alpha * 0.4));
          g.addColorStop(1, withAlpha(color, 0));
          ctx.fillStyle = g;
          ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        });

        ctx.globalCompositeOperation = "source-over";

        if (opts.mirror) {
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.translate(0, h * 2);
          ctx.scale(1, -0.5);
          ctx.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, w, h);
          ctx.restore();
        }
      },
    };
  },
};
