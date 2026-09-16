import {
  bandEnergy,
  ballistic,
  clamp,
  ladderColor,
  persist,
  withAlpha,
  type VizInstance,
  type Visualizer,
} from "../types";

/**
 * Rings — expanding pulses, after Media Player's Battery: Sync.
 *
 * Rings are spawned on bass transients rather than on a timer, which is the
 * difference between a screensaver and something that looks like it is
 * listening. Detection is a rising edge against a slow-moving average, so a
 * loud passage does not spawn continuously and a quiet one still registers its
 * hits.
 */

interface Ring {
  /** 0 at the centre, 1 at the edge. */
  r: number;
  strength: number;
  color: string;
}

const MAX_RINGS = 48;

export const rings: Visualizer = {
  id: "rings",
  name: "Rings",
  blurb: "Pulses on the beat — Media Player's Battery: Sync",
  supports: ["density", "glow", "mirror"],

  create(): VizInstance {
    const pool: Ring[] = [];
    let average = 0;
    let armed = true;
    let level = 0;
    let treble = 0;

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;

        persist(ctx, view, 0.22);

        const bass = bandEnergy(frame.freq, 0, 0.07);
        const mid = bandEnergy(frame.freq, 0.07, 0.3);
        treble = ballistic(treble, bandEnergy(frame.freq, 0.3, 0.8), frame.dt, 2);
        level = ballistic(level, bass, frame.dt, 2.4);

        // Slow average as the moving threshold.
        average += (bass - average) * Math.min(1, frame.dt * 1.6);

        const over = bass > average * 1.35 + 0.02;
        if (over && armed && frame.playing && pool.length < MAX_RINGS) {
          pool.push({ r: 0, strength: clamp(bass * 1.6, 0.25, 1), color: ladderColor(bass, theme) });
          armed = false;
        }
        if (!over) armed = true;

        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.hypot(w, h) * 0.5;
        const speed = 0.28 + opts.density * 0.5;

        for (let i = pool.length - 1; i >= 0; i--) {
          const ring = pool[i];
          ring.r += frame.dt * speed;
          if (ring.r >= 1) {
            pool.splice(i, 1);
            continue;
          }
          const fade = 1 - ring.r;
          ctx.beginPath();
          ctx.arc(cx, cy, ring.r * maxR, 0, Math.PI * 2);
          ctx.strokeStyle = withAlpha(ring.color, fade * fade * ring.strength * 0.9);
          ctx.lineWidth = Math.max(1, (1 + ring.strength * 3.5) * dpr * fade);
          if (opts.glow) {
            ctx.shadowColor = ring.color;
            ctx.shadowBlur = 12 * dpr * fade;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Core: a disc on the bass with a mid-driven halo, so there is always
        // something at the centre between beats.
        const coreR = Math.min(w, h) * (0.04 + level * 0.1);
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3.2);
        halo.addColorStop(0, withAlpha(theme.mid, 0.5 + mid * 0.4));
        halo.addColorStop(1, withAlpha(theme.mid, 0));
        ctx.fillStyle = halo;
        ctx.fillRect(cx - coreR * 3.2, cy - coreR * 3.2, coreR * 6.4, coreR * 6.4);

        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(theme.hi, 0.55 + level * 0.45);
        ctx.fill();

        // Treble sparks around the core, so the high end is represented at all.
        const sparks = Math.round(10 + opts.density * 26);
        ctx.fillStyle = withAlpha(theme.ink, 0.5 * treble);
        for (let i = 0; i < sparks; i++) {
          const a = (i / sparks) * Math.PI * 2 + frame.time * 0.5;
          const r = coreR * (2.4 + Math.sin(frame.time * 2 + i) * 0.5) + treble * maxR * 0.28;
          ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, dpr * 1.6, dpr * 1.6);
        }

        if (opts.mirror) {
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.translate(0, h * 2);
          ctx.scale(1, -0.5);
          ctx.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, w, h);
          ctx.restore();
        }
      },
    };
  },
};
