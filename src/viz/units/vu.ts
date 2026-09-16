import { clamp, waveRms, type VizInstance, type Visualizer } from "../types";

/**
 * VU — an analogue volume unit meter.
 *
 * The needle is a damped spring rather than a smoothed value. A real VU
 * movement is specified to reach 99% in 300ms and to overshoot by about 1%,
 * and that small overshoot and settle is the whole character of the thing; a
 * lerp gives you a slider that happens to be rotated.
 *
 * The face stays ivory under every app theme, because a VU meter is a specific
 * object and recolouring it would just make it a gauge. The theme shows up in
 * the lamp behind the dial.
 */

/** Needle travel, in radians either side of vertical. */
const SWEEP = 0.82;
/** Spring constant and damping, tuned for ~300ms rise with a touch of overshoot. */
const STIFFNESS = 120;
const DAMPING = 17;

const FACE = "#e9e0c9";
const FACE_EDGE = "#cbbf9f";
const MARK = "#2a251c";
const RED = "#b4321f";

const TICKS: Array<[number, string | null]> = [
  [-20, "20"],
  [-10, "10"],
  [-7, "7"],
  [-5, "5"],
  [-3, "3"],
  [-1, null],
  [0, "0"],
  [1, null],
  [2, "2"],
  [3, "3"],
];

const DB_MIN = -20;
const DB_MAX = 3;

/** dB to needle angle, where 0 rad is straight up. */
function angleFor(db: number): number {
  const t = (clamp(db, DB_MIN, DB_MAX) - DB_MIN) / (DB_MAX - DB_MIN);
  return -SWEEP + t * SWEEP * 2;
}

export const vu: Visualizer = {
  id: "vu",
  name: "VU",
  blurb: "Analogue needle with true meter ballistics",
  supports: ["density", "glow", "peaks"],

  create(): VizInstance {
    let pos = angleFor(DB_MIN);
    let vel = 0;
    let peakDb = DB_MIN;
    let peakHold = 0;

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;

        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, 0, w, h);

        const rms = frame.playing ? waveRms(frame.wave) : 0;
        const db = rms > 0.0001 ? 20 * Math.log10(rms) + 12 : DB_MIN;
        const target = angleFor(db);

        // Damped spring, integrated with the real frame delta.
        const accel = (target - pos) * STIFFNESS - vel * DAMPING;
        vel += accel * frame.dt;
        pos += vel * frame.dt;
        pos = clamp(pos, -SWEEP * 1.04, SWEEP * 1.04);

        if (db >= peakDb) {
          peakDb = db;
          peakHold = 1.2;
        } else if (peakHold > 0) {
          peakHold -= frame.dt;
        } else {
          peakDb = Math.max(db, peakDb - frame.dt * 14);
        }

        // ── Face geometry ───────────────────────────────────────────────────
        const size = 0.62 + opts.density * 0.5;
        const faceW = Math.min(w * 0.86, h * 1.9) * size;
        const faceH = faceW * 0.52;
        const cx = w / 2;
        const top = (h - faceH) / 2;
        // Pivot sits below the face, so the arc reads as part of a larger circle.
        const pivotY = top + faceH * 1.08;
        const radius = faceH * 0.92;

        if (opts.glow) {
          const lamp = ctx.createRadialGradient(cx, top + faceH * 0.5, 0, cx, top + faceH * 0.5, faceW * 0.8);
          lamp.addColorStop(0, theme.mid);
          lamp.addColorStop(1, "transparent");
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = lamp;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
        }

        // Ivory plate
        const r = 3 * dpr;
        ctx.beginPath();
        ctx.roundRect(cx - faceW / 2, top, faceW, faceH, r);
        ctx.fillStyle = FACE;
        ctx.fill();
        ctx.strokeStyle = FACE_EDGE;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cx - faceW / 2, top, faceW, faceH, r);
        ctx.clip();

        // Red zone, 0 dB and above
        ctx.beginPath();
        ctx.arc(cx, pivotY, radius, -Math.PI / 2 + angleFor(0), -Math.PI / 2 + angleFor(DB_MAX));
        ctx.strokeStyle = RED;
        ctx.lineWidth = Math.max(2, 2.5 * dpr);
        ctx.stroke();

        // Scale arc
        ctx.beginPath();
        ctx.arc(cx, pivotY, radius, -Math.PI / 2 + angleFor(DB_MIN), -Math.PI / 2 + angleFor(0));
        ctx.strokeStyle = MARK;
        ctx.lineWidth = Math.max(1, 1.2 * dpr);
        ctx.stroke();

        // Ticks and numerals
        ctx.fillStyle = MARK;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        const numeral = Math.max(7, Math.round(faceH * 0.13));
        ctx.font = `500 ${numeral}px "Chivo Mono", ui-monospace, monospace`;

        for (const [db_, text] of TICKS) {
          const a = -Math.PI / 2 + angleFor(db_);
          const long = text !== null;
          const inner = radius - (long ? faceH * 0.1 : faceH * 0.06);
          const x1 = cx + Math.cos(a) * inner;
          const y1 = pivotY + Math.sin(a) * inner;
          const x2 = cx + Math.cos(a) * radius;
          const y2 = pivotY + Math.sin(a) * radius;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = db_ >= 0 ? RED : MARK;
          ctx.lineWidth = Math.max(1, (long ? 1.4 : 0.9) * dpr);
          ctx.stroke();

          if (text) {
            const tr = radius - faceH * 0.2;
            ctx.fillStyle = db_ >= 0 ? RED : MARK;
            ctx.fillText(text, cx + Math.cos(a) * tr, pivotY + Math.sin(a) * tr + numeral * 0.35);
          }
        }

        ctx.fillStyle = MARK;
        ctx.font = `600 ${Math.max(8, Math.round(faceH * 0.15))}px "Chivo", system-ui, sans-serif`;
        ctx.fillText("VU", cx, top + faceH * 0.88);

        // Peak marker rides the arc
        if (opts.peaks && peakDb > DB_MIN) {
          const a = -Math.PI / 2 + angleFor(peakDb);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * (radius + faceH * 0.03), pivotY + Math.sin(a) * (radius + faceH * 0.03), Math.max(1.4, 1.8 * dpr), 0, Math.PI * 2);
          ctx.fillStyle = peakDb >= 0 ? RED : MARK;
          ctx.fill();
        }

        // Needle
        const na = -Math.PI / 2 + pos;
        ctx.beginPath();
        ctx.moveTo(cx, pivotY);
        ctx.lineTo(cx + Math.cos(na) * radius * 1.02, pivotY + Math.sin(na) * radius * 1.02);
        ctx.strokeStyle = MARK;
        ctx.lineWidth = Math.max(1.2, 1.6 * dpr);
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.restore();

        // Pivot cap, drawn outside the clip so it overlaps the plate edge
        ctx.beginPath();
        ctx.arc(cx, pivotY, Math.max(3, faceH * 0.05), 0, Math.PI * 2);
        ctx.fillStyle = MARK;
        ctx.fill();
      },
    };
  },
};
