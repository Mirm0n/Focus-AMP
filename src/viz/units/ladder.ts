import {
  bandLevel,
  ballistic,
  clamp,
  drawFreqLegend,
  drawScanlines,
  ladderColor,
  logBands,
  persist,
  withAlpha,
  type VizInstance,
  type VizTheme,
  type Visualizer,
} from "../types";

/**
 * Ladder — a rack-mount LED spectrum analyser.
 *
 * Deliberately unglowed. Bloom flatters a screenshot but it fills the gaps
 * between segments, and those gaps are the entire reason the panel reads as
 * discrete lamps rather than a painted bar. Everything here is hard-edged and
 * snapped to whole device pixels.
 *
 * Four details do the work:
 *   · segments are wider than they are tall, as real bargraph lamps are
 *   · unlit segments are one flat colour across the whole panel. Tinting them
 *     toward the colour they would light seems right and is not: it bands the
 *     background at the ladder's own thresholds, so the panel picks up two
 *     horizontal seams that have nothing to do with the audio
 *   · the ladder colour is keyed to height in the column, never to the height
 *     of its own bar
 *   · peak caps are a whole lit segment, not a hairline
 *   · the pitch is a whole number of device pixels, so every cell and every
 *     gap is identical. Deriving cell counts from the available width gives a
 *     fractional pitch, and rounding positions against a constant cell size
 *     dumps the leftover fraction into the gaps — which are continuous
 *     channels down the panel, so a one-pixel wobble in them is obvious
 *
 * The legend and dB scale appear only when the panel is tall enough to carry
 * them, so the preview tile stays clean.
 */

const COL_PITCH = 13;
const SEG_PITCH = 8;

/** Matches logBands' defaults — the legend has to agree with the mapping. */
const MIN_HZ = 32;
const MAX_HZ = 16000;

const DB_MARKS: Array<[number, string]> = [
  [1.0, "0"],
  [0.75, "-6"],
  [0.5, "-12"],
  [0.25, "-24"],
];

function drawDbScale(
  ctx: CanvasRenderingContext2D,
  theme: VizTheme,
  x: number,
  baseY: number,
  gridH: number,
  dpr: number,
) {
  const size = Math.max(7, Math.round(7.5 * dpr));
  ctx.font = `500 ${size}px "Chivo Mono", ui-monospace, monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const [frac, text] of DB_MARKS) {
    const y = baseY - frac * gridH + (frac === 1 ? size * 0.7 : 0);
    ctx.fillStyle = withAlpha(theme.ink, 0.3);
    ctx.fillText(text, x, y);
  }
}

export const ladder: Visualizer = {
  id: "ladder",
  name: "Ladder",
  blurb: "Segmented LED analyser, the rack-mount classic",
  // No glow here on purpose — see the note above.
  supports: ["density", "peaks", "mirror", "scanlines"],

  create(): VizInstance {
    let bandCount = 0;
    let binCount = 0;
    let bands: Array<[number, number]> = [];
    let levels = new Float32Array(0);
    let peaks = new Float32Array(0);
    let holds = new Float32Array(0);

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;
        const scale = 0.55 + opts.density * 0.9;

        // Chrome only where there is room for it; the preview tile gets none.
        const legendH = h > 150 * dpr ? Math.round(14 * dpr) : 0;
        const gutter = w > 300 * dpr && legendH > 0 ? Math.round(24 * dpr) : 0;

        const bodyW = w - gutter;
        const fullH = h - legendH;
        const panelH = opts.mirror ? Math.round(fullH * 0.66) : fullH;

        // Pitch first, as whole pixels; counts follow from it. The reverse —
        // counts first, pitch as the remainder — is what makes the grid uneven.
        const colGap = Math.max(1, Math.round(2 * dpr));
        const segGap = Math.max(1, Math.round(1.5 * dpr));
        const colPitch = Math.max(colGap + 2, Math.round(COL_PITCH * dpr * scale));
        const segPitch = Math.max(segGap + 2, Math.round(SEG_PITCH * dpr * scale));

        const wantBands = clamp(Math.floor(bodyW / colPitch), 4, 160);
        const wantSegs = clamp(Math.floor(panelH / segPitch), 4, 96);

        if (wantBands !== bandCount) {
          bandCount = wantBands;
          levels = new Float32Array(bandCount);
          peaks = new Float32Array(bandCount);
          holds = new Float32Array(bandCount);
          bands = [];
        }
        if (binCount !== frame.freq.length) {
          binCount = frame.freq.length;
          bands = [];
        }
        if (bands.length !== bandCount && binCount > 0) {
          bands = logBands(bandCount, binCount, frame.sampleRate, MIN_HZ, MAX_HZ);
        }

        persist(ctx, view, 0.4);

        // Exact, because the pitch is exact. No rounding anywhere below.
        const colW = colPitch - colGap;
        const segH = segPitch - segGap;
        const gridW = colPitch * bandCount;
        const gridH = segPitch * wantSegs;
        // Leftover becomes a margin rather than an uneven edge column: centred
        // across, and at the top of the panel since a bargraph sits on its floor.
        const originX = Math.floor((bodyW - gridW) / 2);
        const baseY = panelH;

        for (let i = 0; i < bandCount; i++) {
          const target =
            bands.length === bandCount ? bandLevel(frame.freq, bands[i], i, bandCount) : 0;
          levels[i] = ballistic(levels[i], target, frame.dt);

          if (levels[i] >= peaks[i]) {
            peaks[i] = levels[i];
            holds[i] = 0.5;
          } else if (holds[i] > 0) {
            holds[i] -= frame.dt;
          } else {
            peaks[i] = Math.max(levels[i], peaks[i] - frame.dt * 0.85);
          }

          const x = originX + i * colPitch;
          const lit = Math.round(levels[i] * wantSegs);
          const peakSeg =
            opts.peaks && peaks[i] > 0.02
              ? Math.min(wantSegs - 1, Math.round(peaks[i] * wantSegs) - 1)
              : -1;

          for (let s = 0; s < wantSegs; s++) {
            const y = baseY - (s + 1) * segPitch;

            if (s < lit) {
              // Ladder colour is resolved only for lit cells — most of the
              // panel is unlit, and this runs for every cell every frame.
              ctx.fillStyle = ladderColor(s / Math.max(1, wantSegs - 1), theme);
            } else if (s === peakSeg) {
              ctx.fillStyle = theme.ink;
            } else {
              ctx.fillStyle = theme.grid;
            }
            ctx.fillRect(x, y, colW, segH);
          }
        }

        if (gutter > 0) drawDbScale(ctx, theme, w - 4 * dpr, baseY, gridH, dpr);

        if (opts.mirror) {
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.translate(0, panelH * 2);
          ctx.scale(1, -0.5);
          ctx.drawImage(ctx.canvas, 0, 0, bodyW, panelH, 0, 0, bodyW, panelH);
          ctx.restore();
        }

        if (legendH > 0) {
          ctx.fillStyle = withAlpha(theme.ink, 0.09);
          ctx.fillRect(0, fullH, w, Math.max(1, Math.round(dpr)));
          drawFreqLegend(ctx, theme.ink, originX, gridW, fullH, dpr, MIN_HZ, MAX_HZ);
        }

        if (opts.scanlines) drawScanlines(ctx, view);
      },
    };
  },
};
