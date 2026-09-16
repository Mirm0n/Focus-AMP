import { drawScanlines, persist, type VizInstance, type Visualizer } from "../types";

/**
 * Scope — a phosphor oscilloscope.
 *
 * Two things make a CRT trace read as a CRT rather than a polyline: the beam
 * leaves a decaying afterglow rather than clearing each frame, and it is
 * brightest where it moves slowest. The stroke is drawn in short segments whose
 * alpha falls with velocity, which is what produces the bright turning points
 * and dim fast sweeps of a real scope.
 */

export const scope: Visualizer = {
  id: "scope",
  name: "Scope",
  blurb: "Phosphor trace with afterglow, the Winamp window",
  supports: ["density", "glow", "scanlines"],

  create(): VizInstance {
    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;

        // Slower decay than the bar displays — the afterglow is the effect.
        persist(ctx, view, 0.18);

        // Graticule: the etched grid on the tube face.
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 1; i < 4; i++) {
          const y = Math.round((h * i) / 4) + 0.5;
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        for (let i = 1; i < 8; i++) {
          const x = Math.round((w * i) / 8) + 0.5;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        const wave = frame.wave;
        const n = wave.length;
        if (n < 2) return;

        // Window the sweep so more density shows a shorter, larger slice.
        const span = Math.round(n * (1 - opts.density * 0.6));
        const start = Math.max(0, Math.floor((n - span) / 2));

        // Trigger on a rising zero crossing so the trace stands still instead
        // of sliding across the screen every frame.
        let trigger = start;
        for (let i = start; i < start + span - 1 && i < n - 1; i++) {
          if (wave[i] <= 128 && wave[i + 1] > 128) {
            trigger = i;
            break;
          }
        }

        const count = Math.min(span, n - trigger);
        const amp = h * 0.42;
        const mid = h / 2;

        ctx.lineWidth = Math.max(1.4, 1.6 * dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (opts.glow) {
          ctx.shadowColor = theme.lo;
          ctx.shadowBlur = 8 * dpr;
        }

        let prevX = 0;
        let prevY = mid;
        for (let i = 0; i < count; i++) {
          const x = (i / (count - 1)) * w;
          const y = mid - ((wave[trigger + i] - 128) / 128) * amp;
          if (i === 0) {
            prevX = x;
            prevY = y;
            continue;
          }
          // Beam brightness falls with how fast it travelled this step.
          const speed = Math.hypot(x - prevX, y - prevY) / dpr;
          ctx.globalAlpha = Math.max(0.18, 1 - speed / 14);
          ctx.strokeStyle = theme.lo;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
          prevX = x;
          prevY = y;
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        if (opts.scanlines) drawScanlines(ctx, view);
      },
    };
  },
};
