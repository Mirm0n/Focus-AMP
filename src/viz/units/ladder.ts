import {
  bandLevel,
  ballistic,
  clamp,
  drawScanlines,
  ladderColor,
  logBands,
  persist,
  type VizInstance,
  type Visualizer,
} from "../types";

/**
 * Ladder — a rack-mount LED spectrum analyser.
 *
 * Discrete stacked segments with dark gaps, a green-amber-red ladder keyed to
 * height in the column rather than height of the bar, and peak caps that snap
 * up, hold, and fall under gravity. The four details that separate a real
 * analyser from a bar chart.
 */

const COL_PITCH = 11;
const SEG_PITCH = 7;

export const ladder: Visualizer = {
  id: "ladder",
  name: "Ladder",
  blurb: "Segmented LED analyser, the rack-mount classic",
  supports: ["density", "glow", "peaks", "mirror", "scanlines"],

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
        const panelH = opts.mirror ? Math.round(h * 0.66) : h;

        const wantBands = clamp(Math.round(w / (COL_PITCH * dpr * scale)), 12, 160);
        const wantSegs = clamp(Math.round(panelH / (SEG_PITCH * dpr * scale)), 10, 90);

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
          bands = logBands(bandCount, binCount, frame.sampleRate);
        }

        persist(ctx, view, 0.32);

        const colGap = Math.max(1, Math.round(1.5 * dpr));
        const segGap = Math.max(1, Math.round(1 * dpr));
        const colPitch = w / bandCount;
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

          for (let s = 0; s < wantSegs; s++) {
            const frac = s / Math.max(1, wantSegs - 1);
            const y = Math.round(panelH - (s + 1) * segPitch);
            if (s < lit) {
              ctx.fillStyle = ladderColor(frac, theme);
              if (opts.glow && s >= lit - 2) {
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 6 * dpr;
              }
            } else {
              ctx.fillStyle = theme.grid;
            }
            ctx.fillRect(x, y, colW, segH);
            ctx.shadowBlur = 0;
          }

          if (opts.peaks && peaks[i] > 0.02) {
            const ps = Math.min(wantSegs - 1, Math.round(peaks[i] * wantSegs));
            const py = Math.round(panelH - (ps + 1) * segPitch);
            ctx.fillStyle = theme.ink;
            ctx.fillRect(x, py, colW, Math.max(1, Math.round(segH * 0.4)));
          }
        }

        if (opts.mirror) {
          // Reflected, squashed and faded — a display sitting on glass.
          ctx.save();
          ctx.globalAlpha = 0.24;
          ctx.translate(0, panelH * 2);
          ctx.scale(1, -0.5);
          ctx.drawImage(ctx.canvas, 0, 0, w, panelH, 0, 0, w, panelH);
          ctx.restore();
        }

        if (opts.scanlines) drawScanlines(ctx, view);
      },
    };
  },
};
