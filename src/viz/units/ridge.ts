import {
  bandLevel,
  clamp,
  logBands,
  type VizInstance,
  type Visualizer,
} from "../types";

/**
 * Ridge — stacked spectrum traces, the pulsar chart.
 *
 * The plot of CP 1919 that ended up on a record sleeve: successive traces
 * stacked up the page, each one hiding whatever is behind it. Here each trace
 * is the spectrum a moment ago, so the stack is the last few seconds receding
 * up the display.
 *
 * Three things make it read as that plot rather than as a line chart:
 *   · hidden-line removal. Each trace is filled with the ground below itself
 *     before it is stroked, back to front, so a peak in front blanks the
 *     traces behind it. Without this it is a tangle
 *   · the traces are pinched flat at both ends, which puts the activity in a
 *     column down the middle with quiet margins either side
 *   · the stack drifts upward continuously instead of jumping a row at a time.
 *     A new trace is captured on a clock, and every trace is drawn offset by
 *     how far through the interval we are
 */

const POINTS = 72;
const INTERVAL = 0.085;

export const ridge: Visualizer = {
  id: "ridge",
  name: "Ridge",
  blurb: "Stacked traces receding up the page, the pulsar chart",
  supports: ["density", "glow"],

  create(): VizInstance {
    let lineCount = 0;
    let lines: Float32Array[] = [];
    /** Index of the most recently captured trace. */
    let head = 0;
    const live = new Float32Array(POINTS);
    let binCount = 0;
    let bands: Array<[number, number]> = [];
    let clock = 0;

    // Flat at the edges, full in the middle.
    const pinch = new Float32Array(POINTS);
    for (let i = 0; i < POINTS; i++) {
      pinch[i] = Math.pow(Math.sin((Math.PI * i) / (POINTS - 1)), 1.3);
    }

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;

        const want = clamp(Math.round((h / dpr / 15) * (0.55 + opts.density * 0.9)), 6, 60);
        if (want !== lineCount) {
          lineCount = want;
          lines = Array.from({ length: lineCount }, () => new Float32Array(POINTS));
          head = 0;
        }
        if (binCount !== frame.freq.length) {
          binCount = frame.freq.length;
          bands = binCount > 0 ? logBands(POINTS, binCount, frame.sampleRate, 40, 12000) : [];
        }

        // The front trace follows the audio every frame; it is what gets
        // captured into the stack when the clock comes round.
        const ease = 1 - Math.exp(-frame.dt / 0.05);
        for (let i = 0; i < POINTS; i++) {
          const target = bands.length === POINTS ? bandLevel(frame.freq, bands[i], i, POINTS) : 0;
          live[i] += (target * pinch[i] - live[i]) * ease;
        }

        clock += frame.dt / INTERVAL;
        if (clock >= 1) {
          clock = Math.min(clock - 1, 0.99);
          head = (head + 1) % lineCount;
          lines[head].set(live);
        }

        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, 0, w, h);

        const marginX = Math.round(w * 0.06);
        const top = h * 0.1;
        const bottom = h * 0.93;
        const spacing = (bottom - top) / lineCount;
        const height = spacing * 4.2;
        const step = (w - marginX * 2) / (POINTS - 1);

        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(1, 1.2 * dpr);

        // Back to front. Slot 0 is the live trace at the bottom; slot k is the
        // trace captured k intervals ago, lifted by the part-interval elapsed.
        for (let k = lineCount; k >= 0; k--) {
          const data = k === 0 ? live : lines[(head - (k - 1) + lineCount * 2) % lineCount];
          const lift = k === 0 ? 0 : k - 1 + clock;
          const y0 = bottom - lift * spacing;
          if (y0 < top - spacing) continue;

          const trace = new Path2D();
          trace.moveTo(0, y0);
          trace.lineTo(marginX, y0);
          for (let i = 1; i < POINTS - 1; i++) {
            const x = marginX + i * step;
            const y = y0 - data[i] * height;
            const nx = x + step / 2;
            const ny = y0 - ((data[i] + data[i + 1]) / 2) * height;
            trace.quadraticCurveTo(x, y, nx, ny);
          }
          trace.lineTo(w - marginX, y0);
          trace.lineTo(w, y0);

          // Blank everything behind and below this trace. A copy, so the
          // closing edges are filled but never stroked.
          const blank = new Path2D(trace);
          blank.lineTo(w, h);
          blank.lineTo(0, h);
          blank.closePath();
          ctx.fillStyle = theme.ground;
          ctx.fill(blank);

          // …then draw it, fading with distance up the page.
          const depth = clamp(lift / lineCount, 0, 1);
          // The last factor fades the top trace out over its final interval,
          // so it leaves instead of vanishing.
          ctx.globalAlpha = k === 0 ? 1 : (0.9 - depth * 0.7) * clamp(lineCount - lift, 0, 1);
          ctx.strokeStyle = k === 0 ? theme.ink : theme.lo;
          if (opts.glow && k < 3) {
            ctx.shadowColor = theme.lo;
            ctx.shadowBlur = 8 * dpr;
          }
          ctx.stroke(trace);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      },
    };
  },
};
