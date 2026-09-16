import {
  bandLevel,
  ballistic,
  clamp,
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
 *   · unlit segments are a dim tint of the colour they would light, not grey —
 *     an LED that is off still shows you where it is
 *   · the ladder colour is keyed to height in the column, never to the height
 *     of its own bar
 *   · peak caps are a whole lit segment, not a hairline
 *
 * The legend and dB scale appear only when the panel is tall enough to carry
 * them, so the preview tile stays clean.
 */

const COL_PITCH = 13;
const SEG_PITCH = 8;

/** Matches logBands' defaults — the legend has to agree with the mapping. */
const MIN_HZ = 32;
const MAX_HZ = 16000;

const LEGEND: Array<[number, string]> = [
  [31, "31"],
  [63, "63"],
  [125, "125"],
  [250, "250"],
  [500, "500"],
  [1000, "1K"],
  [2000, "2K"],
  [4000, "4K"],
  [8000, "8K"],
  [16000, "16K"],
];

const DB_MARKS: Array<[number, string]> = [
  [1.0, "0"],
  [0.75, "-6"],
  [0.5, "-12"],
  [0.25, "-24"],
];

/** Where a frequency sits across a log-scaled panel, 0..1. */
function freqX(hz: number): number {
  return Math.log(hz / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ);
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  theme: VizTheme,
  w: number,
  y: number,
  dpr: number,
) {
  const size = Math.max(7, Math.round(7.5 * dpr));
  ctx.font = `500 ${size}px "Chivo Mono", ui-monospace, monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = withAlpha(theme.ink, 0.38);

  let lastRight = -Infinity;
  for (const [hz, text] of LEGEND) {
    const x = freqX(hz) * w;
    const half = ctx.measureText(text).width / 2;
    // Drop a label rather than let two collide.
    if (x - half < lastRight + 6 * dpr) continue;
    ctx.textAlign = "center";
    ctx.fillText(text, x, y + 3 * dpr);
    lastRight = x + half;

    ctx.fillStyle = withAlpha(theme.ink, 0.16);
    ctx.fillRect(Math.round(x), y, Math.max(1, Math.round(dpr)), 2 * dpr);
    ctx.fillStyle = withAlpha(theme.ink, 0.38);
  }
}

function drawDbScale(
  ctx: CanvasRenderingContext2D,
  theme: VizTheme,
  x: number,
  panelH: number,
  dpr: number,
) {
  const size = Math.max(7, Math.round(7.5 * dpr));
  ctx.font = `500 ${size}px "Chivo Mono", ui-monospace, monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const [frac, text] of DB_MARKS) {
    const y = panelH - frac * panelH + (frac === 1 ? size * 0.7 : 0);
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

        const wantBands = clamp(Math.round(bodyW / (COL_PITCH * dpr * scale)), 8, 128);
        const wantSegs = clamp(Math.round(panelH / (SEG_PITCH * dpr * scale)), 8, 72);

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

        const colGap = Math.max(1, Math.round(2 * dpr));
        const segGap = Math.max(1, Math.round(1.5 * dpr));
        const colPitch = bodyW / bandCount;
        const colW = Math.max(1, Math.round(colPitch - colGap));
        const segPitch = panelH / wantSegs;
        const segH = Math.max(1, Math.round(segPitch - segGap));

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

          const x = Math.round(i * colPitch);
          const lit = Math.round(levels[i] * wantSegs);
          const peakSeg =
            opts.peaks && peaks[i] > 0.02
              ? Math.min(wantSegs - 1, Math.round(peaks[i] * wantSegs) - 1)
              : -1;

          for (let s = 0; s < wantSegs; s++) {
            const frac = s / Math.max(1, wantSegs - 1);
            const y = Math.round(panelH - (s + 1) * segPitch);
            const color = ladderColor(frac, theme);

            if (s < lit) {
              ctx.fillStyle = color;
            } else if (s === peakSeg) {
              ctx.fillStyle = theme.ink;
            } else {
              // An unlit lamp, not an empty cell.
              ctx.fillStyle = withAlpha(color, 0.12);
            }
            ctx.fillRect(x, y, colW, segH);
          }
        }

        if (gutter > 0) drawDbScale(ctx, theme, w - 4 * dpr, panelH, dpr);

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
          drawLegend(ctx, theme, bodyW, fullH, dpr);
        }

        if (opts.scanlines) drawScanlines(ctx, view);
      },
    };
  },
};
