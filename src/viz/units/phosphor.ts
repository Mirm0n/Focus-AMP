import {
  clamp,
  drawScanlines,
  type VizInstance,
  type VizView,
  type Visualizer,
} from "../types";

/**
 * Phosphor — a CRT oscilloscope tube.
 *
 * What makes a CRT trace read as a CRT rather than a polyline is that the beam
 * is brightest where it moves slowest, and that it glides rather than jumps.
 *
 * There is deliberately no afterglow. Fading the previous frames instead of
 * clearing them is the obvious way to get the glide, and it looks wrong: the
 * trace moves a few pixels a frame, so its history shows up as a fan of
 * separate ghost lines rather than a glow, and an 8-bit canvas never fades the
 * faintest of them all the way out, which leaves a stain behind the beam. The
 * glide comes from easing the trace itself, and each frame starts clean.
 *
 * A raw sweep of the analyser buffer is hard to look at, though. Every frame is
 * a different 46 ms of audio, so the treble lands at a random phase each time
 * and the trace flickers. Three things calm it:
 *   · the sweep is a fixed length behind the trigger. Letting a late trigger
 *     shorten it stretches the trace sideways by a different amount each frame
 *   · the trace eases toward each new sweep instead of jumping to it. Triggered
 *     bass is phase-coherent between frames and survives; treble is not, and
 *     averages itself out — which is what a slow phosphor does anyway
 *   · gain rides the programme, so a hot master doesn't slam the rails and a
 *     quiet one isn't a flat line
 *
 * Everything time-based is keyed to dt, so the tube looks the same at 60 and
 * 144 Hz.
 */

/** Seconds for the trace's easing toward a new sweep to fall to 1/e. */
const EASE = 0.09;

/** CSS pixels between trace points. Finer than this only draws more fuzz. */
const POINT_PITCH = 3;

/** Width of each point's averaging window, in points. */
const SMOOTH_POINTS = 6;

/** How far below centre the signal must dip before a rising crossing counts. */
const TRIGGER_HYST = 6;

/** Fraction of the half-height the loudest part of the trace is steered to. */
const HEADROOM = 0.6;

/** Samples in the trigger's running mean — long enough to see only the bass. */
const TRIGGER_WINDOW = 32;

/**
 * Rising zero crossing of a running mean, so the sweep locks to the bass line
 * and the rest of the mix rides on it — triggering on the raw signal fires on
 * whichever overtone crosses first, a different one every frame. Hysteresis
 * keeps hiss on the centre line from firing it. Only looks where a full sweep
 * still fits afterwards.
 */
function findTrigger(wave: Uint8Array, limit: number): number {
  const end = Math.min(limit, wave.length - TRIGGER_WINDOW);
  if (end <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < TRIGGER_WINDOW; i++) sum += wave[i];
  let armed = false;
  for (let i = 0; i < end; i++) {
    const mean = sum / TRIGGER_WINDOW;
    if (mean < 128 - TRIGGER_HYST) armed = true;
    else if (armed && mean >= 128) return Math.min(limit, i + TRIGGER_WINDOW / 2);
    sum += wave[i + TRIGGER_WINDOW] - wave[i];
  }
  return 0;
}

/** The etched grid on the tube face: faint divisions, a firmer centre cross. */
function drawGraticule(ctx: CanvasRenderingContext2D, view: VizView) {
  const { w, h, dpr, theme } = view;
  const px = Math.max(1, Math.round(dpr));
  ctx.fillStyle = theme.grid;

  ctx.globalAlpha = 0.4;
  for (let i = 1; i < 4; i++) if (i !== 2) ctx.fillRect(0, Math.round((h * i) / 4), w, px);
  for (let i = 1; i < 8; i++) if (i !== 4) ctx.fillRect(Math.round((w * i) / 8), 0, px, h);

  ctx.globalAlpha = 0.8;
  const cy = Math.round(h / 2);
  const cx = Math.round(w / 2);
  ctx.fillRect(0, cy, w, px);
  ctx.fillRect(cx, 0, px, h);

  // Minor ticks along the centre cross, only where there is room for them.
  if (h > 150 * dpr) {
    const tick = Math.round(3 * dpr);
    for (let i = 1; i < 40; i++) {
      if (i % 5 === 0) continue;
      ctx.fillRect(Math.round((w * i) / 40), cy - tick, px, tick * 2 + px);
    }
    for (let i = 1; i < 20; i++) {
      if (i % 5 === 0) continue;
      ctx.fillRect(cx - tick, Math.round((h * i) / 20), tick * 2 + px, px);
    }
  }
  ctx.globalAlpha = 1;
}

export const phosphor: Visualizer = {
  id: "phosphor",
  name: "Phosphor",
  blurb: "Oscilloscope tube, one steady gliding beam",
  supports: ["density", "glow", "scanlines"],

  create(): VizInstance {
    // The displayed trace, -1..1, eased between sweeps.
    let pts = new Float32Array(0);
    let ys = new Float32Array(0);
    let gain = 1;

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;

        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, 0, w, h);
        drawGraticule(ctx, view);

        const wave = frame.wave;
        const n = wave.length;
        if (n < 8) return;

        // Density sets the timebase: more of it shows a shorter, larger slice.
        const span = clamp(Math.round(n * (0.75 - opts.density * 0.5)), 8, n);
        const trigger = findTrigger(wave, n - span);

        const want = clamp(Math.round(w / (POINT_PITCH * dpr)), 32, 480);
        if (want !== pts.length) {
          pts = new Float32Array(want);
          ys = new Float32Array(want);
        }

        // Each point is the mean of the samples around it, eased toward. The
        // window is wider than the point's own share of the sweep: a box that
        // size is the low-pass that takes the hash off the trace, and tying it
        // to the point pitch means a shorter timebase shows finer detail.
        const per = span / want;
        const reach = (per * SMOOTH_POINTS) / 2;
        const ease = 1 - Math.exp(-frame.dt / EASE);
        let peak = 0;
        for (let p = 0; p < want; p++) {
          const centre = trigger + (p + 0.5) * per;
          const a = Math.max(0, Math.floor(centre - reach));
          const b = Math.min(n, Math.max(a + 1, Math.ceil(centre + reach)));
          let sum = 0;
          for (let i = a; i < b; i++) sum += wave[i];
          const v = (sum / (b - a) - 128) / 128;
          pts[p] += (v - pts[p]) * ease;
          const m = Math.abs(pts[p]);
          if (m > peak) peak = m;
        }

        // Ride the gain: back off quickly, creep up slowly, and hold through
        // near-silence rather than magnifying the noise floor.
        if (peak > 0.02) {
          const target = clamp(HEADROOM / peak, 0.6, 3);
          const tau = target < gain ? 0.15 : 1.5;
          gain += (target - gain) * (1 - Math.exp(-frame.dt / tau));
        }

        const mid = h / 2;
        const amp = h * 0.42 * gain;
        const step = w / (want - 1);
        for (let p = 0; p < want; p++) ys[p] = mid - pts[p] * amp;

        // Curves through the midpoints, so the trace has no corners to catch
        // the eye. `from`/`to` are point indices; the dwell pass below reuses
        // this one point at a time so both passes share exact geometry.
        const path = (from: number, to: number) => {
          ctx.beginPath();
          if (from === 0) ctx.moveTo(0, ys[0]);
          else ctx.moveTo((from - 0.5) * step, (ys[from - 1] + ys[from]) / 2);
          for (let p = Math.max(1, from); p <= to && p < want - 1; p++) {
            ctx.quadraticCurveTo(p * step, ys[p], (p + 0.5) * step, (ys[p] + ys[p + 1]) / 2);
          }
          if (to >= want - 1) ctx.lineTo(w, ys[want - 1]);
        };

        ctx.strokeStyle = theme.lo;
        ctx.lineJoin = "round";
        ctx.lineCap = "butt";

        // A soft halo stands in for bloom at a fraction of the cost, so the
        // beam isn't a bare hairline with Glow off.
        path(0, want - 1);
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 7 * dpr;
        ctx.stroke();

        const core = Math.max(1.25, 1.5 * dpr);
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = core;
        if (opts.glow) {
          ctx.shadowColor = theme.lo;
          ctx.shadowBlur = 10 * dpr;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Dwell: the beam is brighter the slower it travels, which is what
        // gives a real scope its bright turning points and dim fast sweeps.
        for (let p = 1; p < want - 1; p++) {
          const slope = (ys[p + 1] - ys[p - 1]) / (2 * step);
          const slow = clamp(1 - (Math.hypot(1, slope) - 1) / 3, 0, 1);
          if (slow < 0.05) continue;
          ctx.globalAlpha = slow * slow * 0.6;
          path(p, p);
          ctx.stroke();
        }

        ctx.globalAlpha = 1;

        if (opts.scanlines) drawScanlines(ctx, view);
      },
    };
  },
};
