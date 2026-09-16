import {
  bandEnergy,
  ballistic,
  drawScanlines,
  withAlpha,
  type VizFrame,
  type VizInstance,
  type VizTheme,
  type VizView,
  type Visualizer,
} from "../types";

/**
 * Tide — mirrored waveform over a gradient wash, after Media Player's Ocean
 * Mist and the Bars and Waves set.
 *
 * Three copies of the waveform at different amplitudes and time offsets, filled
 * and stacked with additive blending. One layer reads as an audio editor; the
 * layers drifting against each other are what gave those WMP presets their
 * sense of depth.
 */

const LAYERS: Array<{ amp: number; lag: number; alpha: number }> = [
  { amp: 1.0, lag: 0, alpha: 0.5 },
  { amp: 0.72, lag: 0.16, alpha: 0.36 },
  { amp: 0.48, lag: 0.34, alpha: 0.26 },
];

function drawLayer(
  ctx: CanvasRenderingContext2D,
  frame: VizFrame,
  view: VizView,
  color: string,
  amp: number,
  lag: number,
  alpha: number,
  smooth: number,
) {
  const { w, h } = view;
  const wave = frame.wave;
  const n = wave.length;
  if (n < 4) return;

  const mid = h / 2;
  const reach = h * 0.44 * amp;
  const offset = Math.floor(n * lag);
  const steps = Math.max(24, Math.floor(w / smooth));

  ctx.beginPath();
  ctx.moveTo(0, mid);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const idx = (offset + Math.floor(t * (n - 1))) % n;
    const v = (wave[idx] - 128) / 128;
    ctx.lineTo(t * w, mid - v * reach);
  }
  // Close down the right edge, back along the mirror, and up the left.
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const idx = (offset + Math.floor(t * (n - 1))) % n;
    const v = (wave[idx] - 128) / 128;
    ctx.lineTo(t * w, mid + v * reach);
  }
  ctx.closePath();

  ctx.fillStyle = withAlpha(color, alpha);
  ctx.fill();
}

function wash(ctx: CanvasRenderingContext2D, view: VizView, theme: VizTheme, energy: number) {
  const { w, h } = view;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, withAlpha(theme.hi, 0.1 + energy * 0.14));
  g.addColorStop(0.5, withAlpha(theme.mid, 0.04 + energy * 0.08));
  g.addColorStop(1, withAlpha(theme.lo, 0.1 + energy * 0.14));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export const tide: Visualizer = {
  id: "tide",
  name: "Tide",
  blurb: "Layered mirrored waveform — Ocean Mist, 2001",
  supports: ["density", "glow", "scanlines"],

  create(): VizInstance {
    let energy = 0;

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;

        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, 0, w, h);

        energy = ballistic(energy, bandEnergy(frame.freq, 0, 0.35), frame.dt, 1.6);
        wash(ctx, view, theme, energy);

        // Additive, so overlaps brighten the way the originals did.
        ctx.globalCompositeOperation = "lighter";
        const smooth = (5 - opts.density * 3.2) * dpr;
        const colors = [theme.lo, theme.mid, theme.hi];

        LAYERS.forEach((layer, i) => {
          if (opts.glow) {
            ctx.shadowColor = colors[i];
            ctx.shadowBlur = 16 * dpr;
          }
          drawLayer(
            ctx,
            frame,
            view,
            colors[i],
            layer.amp * (0.55 + energy * 0.7),
            layer.lag,
            layer.alpha,
            smooth,
          );
          ctx.shadowBlur = 0;
        });

        ctx.globalCompositeOperation = "source-over";

        // The waterline the mirror folds around.
        ctx.fillStyle = withAlpha(theme.ink, 0.16);
        ctx.fillRect(0, Math.round(h / 2), w, Math.max(1, dpr));

        if (opts.scanlines) drawScanlines(ctx, view);
      },
    };
  },
};
