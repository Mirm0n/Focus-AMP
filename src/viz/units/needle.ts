import {
  ballistic,
  clamp,
  waveRms,
  withAlpha,
  type VizInstance,
  type VizTheme,
  type Visualizer,
} from "../types";

/**
 * Needle — a pair of moving-coil meters.
 *
 * Every other display here shows the spectrum. This one shows the only thing a
 * meter bridge ever showed: how loud it is, right now. It is the calmest thing
 * to have on screen while working, which is the point of it.
 *
 * The stream reaches the analyser as one channel, so rather than fake a left
 * and a right the two meters are the two instruments a broadcast desk really
 * carried side by side:
 *   · VU — average level. A VU needle is a mass on a spring, so it is modelled
 *     as one: it takes about 300 ms to arrive and overshoots by a hair. Easing
 *     toward the target gives a needle with no weight
 *   · PEAK — instant attack, slow fall-back, which catches the transients the
 *     VU needle is too heavy to show
 *
 * The scale is laid out the way a VU scale is — linear in voltage, not in
 * decibels — which is why the marks bunch up on the left and 0 sits at 71%.
 */

/** RMS that reads 0 VU, and the sample peak that reads 0 on the peak meter. */
const VU_REF = 0.25; // −12 dBFS, about where a modern master averages
const PEAK_REF = 0.708; // −3 dBFS

/** +3 is full scale, and the scale is linear in voltage. */
const FULL_SCALE = Math.pow(10, 3 / 20);
const MARKS: Array<[number, string]> = [
  [-20, "20"],
  [-10, "10"],
  [-7, "7"],
  [-5, "5"],
  [-3, "3"],
  [-2, ""],
  [-1, ""],
  [0, "0"],
  [1, ""],
  [2, ""],
  [3, "3"],
];

const SWEEP = (42 * Math.PI) / 180;

const markPos = (db: number) => Math.pow(10, db / 20) / FULL_SCALE;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function drawMeter(
  ctx: CanvasRenderingContext2D,
  theme: VizTheme,
  box: Box,
  dpr: number,
  pos: number,
  name: string,
  lamp: number,
  glow: boolean,
) {
  const { x, y, w, h } = box;
  const cx = x + w / 2;
  const pivotY = y + h * 1.05;
  const radius = h * 0.86;
  const detailed = w > 150 * dpr;
  const px = Math.max(1, Math.round(dpr));

  // The face: barely lifted off the glass, lit from the bottom by the bulb.
  ctx.fillStyle = withAlpha(theme.ink, 0.06);
  ctx.fillRect(x, y, w, h);
  if (glow) {
    const bulb = ctx.createRadialGradient(cx, y + h, 0, cx, y + h, h * 1.1);
    bulb.addColorStop(0, withAlpha(theme.mid, 0.26));
    bulb.addColorStop(1, withAlpha(theme.mid, 0));
    ctx.fillStyle = bulb;
    ctx.fillRect(x, y, w, h);
  }

  const at = (p: number, r: number): [number, number] => {
    const a = -SWEEP + p * 2 * SWEEP;
    return [cx + Math.sin(a) * r, pivotY - Math.cos(a) * r];
  };
  const arc = (from: number, to: number, r: number) => {
    ctx.beginPath();
    ctx.arc(cx, pivotY, r, -Math.PI / 2 - SWEEP + from * 2 * SWEEP, -Math.PI / 2 - SWEEP + to * 2 * SWEEP);
    ctx.stroke();
  };

  // Scale: a hairline up to 0, a heavy band above it.
  const zero = markPos(0);
  ctx.lineCap = "butt";
  ctx.strokeStyle = withAlpha(theme.ink, 0.75);
  ctx.lineWidth = px;
  arc(0, zero, radius);
  ctx.strokeStyle = theme.hi;
  ctx.lineWidth = Math.max(2, h * 0.035);
  arc(zero, 1, radius - ctx.lineWidth / 2 + px / 2);

  const size = Math.max(7, Math.round(h * 0.075));
  ctx.font = `500 ${size}px "Chivo Mono", ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [db, text] of MARKS) {
    const p = markPos(db);
    const long = text !== "";
    const [x0, y0] = at(p, radius);
    const [x1, y1] = at(p, radius + h * (long ? 0.07 : 0.04));
    ctx.strokeStyle = db > 0 ? theme.hi : withAlpha(theme.ink, 0.75);
    ctx.lineWidth = px;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (long && detailed) {
      const [tx, ty] = at(p, radius + h * 0.15);
      ctx.fillStyle = db > 0 ? theme.hi : withAlpha(theme.ink, 0.7);
      ctx.fillText(text, tx, ty);
    }
  }

  if (detailed) {
    ctx.fillStyle = withAlpha(theme.ink, 0.5);
    ctx.font = `600 ${Math.max(8, Math.round(h * 0.09))}px "Chivo", ui-sans-serif, sans-serif`;
    ctx.fillText(name, cx, y + h * 0.6);
  }

  // The needle, clipped to the face so it can't swing out over the bezel.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const [nx, ny] = at(clamp(pos, -0.02, 1.04), radius + h * 0.05);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = Math.max(1.25, 1.4 * dpr);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, pivotY);
  ctx.lineTo(nx, ny);
  ctx.stroke();
  ctx.restore();

  // The cover over the pivot, and the bezel.
  const coverY = Math.round(y + h * 0.8);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(x, coverY, w, y + h - coverY);
  // A plate, not a hole: lifted a shade off the glass so the meter reads as
  // one object instead of a face floating over an empty box.
  ctx.fillStyle = withAlpha(theme.grid, 0.6);
  ctx.fillRect(x, coverY, w, y + h - coverY);
  ctx.fillStyle = theme.grid;
  ctx.fillRect(x, coverY, w, px);
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = px;
  ctx.strokeRect(x + px / 2, y + px / 2, w - px, h - px);

  // Overload lamp, top right.
  if (lamp >= 0) {
    const r = Math.max(2, h * 0.03);
    const lx = x + w - r * 3.2;
    const ly = y + r * 3.2;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fillStyle = lamp > 0 ? theme.hi : theme.grid;
    if (lamp > 0 && glow) {
      ctx.shadowColor = theme.hi;
      ctx.shadowBlur = 8 * dpr;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export const needle: Visualizer = {
  id: "needle",
  name: "Needle",
  blurb: "Twin moving-coil meters, VU and peak, the broadcast desk",
  supports: ["glow", "peaks"],

  create(): VizInstance {
    // VU needle: position and velocity of a damped spring.
    let vu = 0;
    let vuVel = 0;
    let peak = 0;
    let lampVu = 0;
    let lampPeak = 0;

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;

        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, 0, w, h);

        const wave = frame.wave;
        let top = 0;
        for (let i = 0; i < wave.length; i++) {
          const v = Math.abs(wave[i] - 128) / 128;
          if (v > top) top = v;
        }
        const vuTarget = waveRms(wave) / VU_REF / FULL_SCALE;
        const peakTarget = Math.min(1.04, top / PEAK_REF / FULL_SCALE);

        // Stepped finely: the spring is stiff enough to blow up on one long
        // frame after the window has been in the background.
        const steps = Math.max(1, Math.ceil(frame.dt / 0.008));
        const dt = frame.dt / steps;
        const omega = 13;
        for (let i = 0; i < steps; i++) {
          vuVel += (omega * omega * (Math.min(1.1, vuTarget) - vu) - 2 * 0.78 * omega * vuVel) * dt;
          vu += vuVel * dt;
        }
        peak = ballistic(peak, peakTarget, frame.dt, 0.55);

        const zero = markPos(0);
        lampVu = vu > zero ? 0.5 : Math.max(0, lampVu - frame.dt);
        lampPeak = peak > zero ? 0.5 : Math.max(0, lampPeak - frame.dt);

        // Two meters where there is room for them, one where there isn't.
        const twin = w > 380 * dpr && w / h > 1.7;
        const margin = Math.round(Math.min(w, h) * 0.08);
        const gap = twin ? margin : 0;
        const count = twin ? 2 : 1;
        const mw = Math.floor(
          Math.min((w - margin * 2 - gap) / count, (h - margin * 2) / 0.62),
        );
        const mh = Math.floor(mw * 0.62);
        const x0 = Math.floor((w - (mw * count + gap)) / 2);
        const y0 = Math.floor((h - mh) / 2);

        drawMeter(
          ctx,
          theme,
          { x: x0, y: y0, w: mw, h: mh },
          dpr,
          vu,
          "VU",
          opts.peaks ? lampVu : -1,
          opts.glow,
        );
        if (twin) {
          drawMeter(
            ctx,
            theme,
            { x: x0 + mw + gap, y: y0, w: mw, h: mh },
            dpr,
            peak,
            "PEAK",
            opts.peaks ? lampPeak : -1,
            opts.glow,
          );
        }
      },
    };
  },
};
