import {
  bandLevel,
  clamp,
  drawScanlines,
  logBands,
  withAlpha,
  type VizInstance,
  type VizTheme,
  type Visualizer,
} from "../types";

/**
 * Waterfall — a scrolling spectrogram, the sonar and shortwave display.
 *
 * The only display here with a memory. Frequency runs across, time runs down,
 * and level is colour, so a bass line shows up as a column of beads and a held
 * chord as vertical stripes. Every other display forgets the last bar the
 * moment the next one arrives.
 *
 * The history lives in a small offscreen canvas, one pixel per cell. Each new
 * row is one putImageData and the scroll is one self-copy, so the cost per
 * frame doesn't grow with the size of the window; the visible display is that
 * canvas scaled up with smoothing off, which is what keeps the cells square-
 * edged rather than smeared.
 *
 * Rows are laid down on a clock, not per frame — otherwise the same song
 * scrolls more than twice as fast on a 144 Hz monitor as on a 60 Hz one.
 */

const CELL = 5;
const ROWS_PER_SECOND = 28;

/** 256 colours from silence to full level: ground, lo, mid, hi, ink. */
function buildPalette(theme: VizTheme): Uint8ClampedArray {
  const probe = document.createElement("canvas");
  probe.width = 256;
  probe.height = 1;
  const p = probe.getContext("2d")!;
  const ramp = p.createLinearGradient(0, 0, 256, 0);
  ramp.addColorStop(0, theme.ground);
  // Held near the ground for the first stretch so the noise floor stays dark
  // and the display doesn't sit under a permanent haze.
  ramp.addColorStop(0.12, theme.ground);
  ramp.addColorStop(0.45, theme.lo);
  ramp.addColorStop(0.72, theme.mid);
  ramp.addColorStop(0.9, theme.hi);
  ramp.addColorStop(1, theme.ink);
  p.fillStyle = ramp;
  p.fillRect(0, 0, 256, 1);
  return p.getImageData(0, 0, 256, 1).data;
}

export const waterfall: Visualizer = {
  id: "waterfall",
  name: "Waterfall",
  blurb: "Scrolling spectrogram, the sonar and shortwave display",
  supports: ["density", "scanlines"],

  create(): VizInstance {
    const store = document.createElement("canvas");
    const sctx = store.getContext("2d")!;
    let cols = 0;
    let rows = 0;
    let binCount = 0;
    let bands: Array<[number, number]> = [];
    let row: ImageData | null = null;
    let palette: Uint8ClampedArray | null = null;
    let paletteFor: VizTheme | null = null;
    let clock = 0;

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;
        const cell = Math.max(2, Math.round((CELL * dpr) / (0.6 + opts.density * 0.8)));
        const wantCols = clamp(Math.ceil(w / cell), 8, 512);
        const wantRows = clamp(Math.ceil(h / cell), 4, 512);

        // A new theme repaints from empty: rows already laid down are baked in
        // the old colours and would scroll through as a band of the wrong ones.
        const stale = paletteFor !== theme;
        if (stale) {
          palette = buildPalette(theme);
          paletteFor = theme;
        }
        if (stale || wantCols !== cols || wantRows !== rows) {
          cols = wantCols;
          rows = wantRows;
          store.width = cols;
          store.height = rows;
          sctx.fillStyle = theme.ground;
          sctx.fillRect(0, 0, cols, rows);
          row = sctx.createImageData(cols, 1);
          bands = [];
        }
        if (binCount !== frame.freq.length) {
          binCount = frame.freq.length;
          bands = [];
        }
        if (bands.length !== cols && binCount > 0) {
          bands = logBands(cols, binCount, frame.sampleRate);
        }

        clock += frame.dt * ROWS_PER_SECOND;
        // At most a few rows of catch-up, so a long stall doesn't loop here.
        let due = Math.min(4, Math.floor(clock));
        clock -= Math.floor(clock);

        if (due > 0 && row && palette && bands.length === cols) {
          const px = row.data;
          for (let i = 0; i < cols; i++) {
            const level = bandLevel(frame.freq, bands[i], i, cols);
            const c = Math.round(level * 255) * 4;
            px[i * 4] = palette[c];
            px[i * 4 + 1] = palette[c + 1];
            px[i * 4 + 2] = palette[c + 2];
            px[i * 4 + 3] = 255;
          }
          while (due-- > 0) {
            sctx.drawImage(store, 0, 1);
            sctx.putImageData(row, 0, 0);
          }
        }

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(store, 0, 0, cols, rows, 0, 0, cols * cell, rows * cell);
        ctx.imageSmoothingEnabled = true;

        // The newest row is "now": a hairline under it, as on a chart recorder.
        ctx.fillStyle = withAlpha(theme.ink, 0.35);
        ctx.fillRect(0, cell, w, Math.max(1, Math.round(dpr)));

        if (opts.scanlines) drawScanlines(ctx, view);
      },
    };
  },
};
