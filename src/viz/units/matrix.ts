import {
  bandLevel,
  ballistic,
  clamp,
  ladderColor,
  logBands,
  type VizInstance,
  type Visualizer,
} from "../types";

/**
 * Matrix — a dot-matrix LCD level display.
 *
 * The one from the front of a mini system or a car head unit. The detail that
 * sells it is that unlit dots stay faintly visible: a real LCD cell does not
 * disappear when it is off, it just stops being dark. Drawing only the lit dots
 * gives you a starfield instead of a panel.
 */

const DOT_PITCH = 13;

export const matrix: Visualizer = {
  id: "matrix",
  name: "Matrix",
  blurb: "Dot-matrix LCD, the front of a mini system",
  supports: ["density", "glow", "peaks"],

  create(): VizInstance {
    let cols = 0;
    let binCount = 0;
    let bands: Array<[number, number]> = [];
    let levels = new Float32Array(0);
    let peaks = new Float32Array(0);
    let holds = new Float32Array(0);

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;
        const scale = 0.6 + opts.density * 0.85;
        const pitch = DOT_PITCH * dpr * scale;

        const wantCols = clamp(Math.round(w / pitch), 10, 90);
        const rows = clamp(Math.round(h / pitch), 6, 44);

        if (wantCols !== cols) {
          cols = wantCols;
          levels = new Float32Array(cols);
          peaks = new Float32Array(cols);
          holds = new Float32Array(cols);
          bands = [];
        }
        if (binCount !== frame.freq.length) {
          binCount = frame.freq.length;
          bands = [];
        }
        if (bands.length !== cols && binCount > 0) {
          bands = logBands(cols, binCount, frame.sampleRate);
        }

        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, 0, w, h);

        const colPitch = w / cols;
        const rowPitch = h / rows;
        const radius = Math.max(1, Math.min(colPitch, rowPitch) * 0.33);

        for (let i = 0; i < cols; i++) {
          const target = bands.length === cols ? bandLevel(frame.freq, bands[i], i, cols) : 0;
          levels[i] = ballistic(levels[i], target, frame.dt, 1.4);

          if (levels[i] >= peaks[i]) {
            peaks[i] = levels[i];
            holds[i] = 0.45;
          } else if (holds[i] > 0) {
            holds[i] -= frame.dt;
          } else {
            peaks[i] = Math.max(levels[i], peaks[i] - frame.dt * 0.8);
          }

          const lit = Math.round(levels[i] * rows);
          const peakRow = opts.peaks ? Math.min(rows - 1, Math.round(peaks[i] * rows) - 1) : -1;
          const cx = i * colPitch + colPitch / 2;

          for (let r = 0; r < rows; r++) {
            const frac = r / Math.max(1, rows - 1);
            const cy = h - (r + 0.5) * rowPitch;
            const on = r < lit;
            const isPeak = r === peakRow && peakRow >= lit;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);

            if (on) {
              ctx.fillStyle = ladderColor(frac, theme);
              if (opts.glow && r >= lit - 1) {
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 7 * dpr;
              }
            } else if (isPeak) {
              ctx.fillStyle = theme.ink;
            } else {
              // The off cell — present, not absent.
              ctx.globalAlpha = 0.3;
              ctx.fillStyle = theme.grid;
            }
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }
        }
      },
    };
  },
};
