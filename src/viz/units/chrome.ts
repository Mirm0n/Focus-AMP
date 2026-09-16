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
 * Chrome — glossy gel bars with a reflection.
 *
 * The 2001 look: Aqua and the Windows Media Player skins of the same moment.
 * What makes it read as gel rather than a gradient is the hard break at the
 * vertical midpoint — bright above, abruptly darker below — plus a specular
 * cap floating over the top third. A smooth top-to-bottom ramp reads as a
 * modern chart; the discontinuity is the period detail.
 */

const COL_PITCH = 22;

function parseHex(hex: string): [number, number, number] {
  const s = hex.replace("#", "");
  const n =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  return [
    parseInt(n.slice(0, 2), 16) || 0,
    parseInt(n.slice(2, 4), 16) || 0,
    parseInt(n.slice(4, 6), 16) || 0,
  ];
}

/** amount > 0 lightens toward white, < 0 darkens toward black. */
function shade(hex: string, amount: number, alpha = 1): string {
  const [r, g, b] = parseHex(hex);
  const mix = (c: number) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgba(${mix(r)}, ${mix(g)}, ${mix(b)}, ${alpha})`;
}

export const chrome: Visualizer = {
  id: "chrome",
  name: "Chrome",
  blurb: "Glossy gel bars and a reflection, circa 2001",
  supports: ["density", "glow", "peaks", "mirror"],

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

        const wantBands = clamp(Math.round(w / (COL_PITCH * dpr * scale)), 6, 72);
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

        // Opaque clear — gloss needs a clean ground, not an afterglow.
        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, 0, w, h);

        const reflect = opts.mirror;
        const baseline = reflect ? Math.round(h * 0.7) : h;
        const colPitch = w / bandCount;
        const gap = Math.max(2, colPitch * 0.18);
        const barW = Math.max(2, colPitch - gap);
        const radius = Math.min(barW / 2, 7 * dpr);

        const drawBar = (x: number, level: number, flip: boolean) => {
          const barH = Math.max(2, level * baseline * 0.94);
          const top = flip ? baseline : baseline - barH;
          const base = ladderColor(level, theme);

          const g = ctx.createLinearGradient(0, top, 0, top + barH);
          if (flip) {
            g.addColorStop(0, shade(base, -0.1));
            g.addColorStop(0.5, shade(base, -0.35));
            g.addColorStop(1, shade(base, -0.6));
          } else {
            g.addColorStop(0, shade(base, 0.5));
            g.addColorStop(0.48, shade(base, 0.12));
            // The gel break — a hard step, not a ramp.
            g.addColorStop(0.5, shade(base, -0.22));
            g.addColorStop(1, shade(base, -0.02));
          }

          ctx.beginPath();
          ctx.roundRect(x, top, barW, barH, radius);
          if (opts.glow && !flip) {
            ctx.shadowColor = base;
            ctx.shadowBlur = 12 * dpr;
          }
          ctx.fillStyle = g;
          ctx.fill();
          ctx.shadowBlur = 0;

          if (!flip && barH > 8 * dpr) {
            // Specular cap over the top third.
            const hl = ctx.createLinearGradient(0, top, 0, top + barH * 0.34);
            hl.addColorStop(0, shade(base, 0.85, 0.75));
            hl.addColorStop(1, shade(base, 0.85, 0));
            ctx.beginPath();
            ctx.roundRect(x + barW * 0.14, top + barH * 0.05, barW * 0.72, barH * 0.3, radius * 0.7);
            ctx.fillStyle = hl;
            ctx.fill();
          }
        };

        for (let i = 0; i < bandCount; i++) {
          const target =
            bands.length === bandCount ? bandLevel(frame.freq, bands[i], i, bandCount) : 0;
          levels[i] = ballistic(levels[i], target, frame.dt, 1.2);

          if (levels[i] >= peaks[i]) {
            peaks[i] = levels[i];
            holds[i] = 0.55;
          } else if (holds[i] > 0) {
            holds[i] -= frame.dt;
          } else {
            peaks[i] = Math.max(levels[i], peaks[i] - frame.dt * 0.7);
          }

          const x = i * colPitch + gap / 2;
          drawBar(x, levels[i], false);

          if (opts.peaks && peaks[i] > 0.03) {
            const py = baseline - peaks[i] * baseline * 0.94;
            ctx.beginPath();
            ctx.roundRect(x, py - 3 * dpr, barW, Math.max(2, 3 * dpr), 2 * dpr);
            ctx.fillStyle = shade(theme.ink, 0, 0.85);
            ctx.fill();
          }
        }

        if (reflect) {
          ctx.save();
          ctx.globalAlpha = 0.3;
          for (let i = 0; i < bandCount; i++) {
            drawBar(i * colPitch + gap / 2, levels[i] * 0.55, true);
          }
          ctx.restore();

          // Fade the reflection out into the ground.
          const fade = ctx.createLinearGradient(0, baseline, 0, h);
          fade.addColorStop(0, shade(theme.ground, 0, 0));
          fade.addColorStop(1, shade(theme.ground, 0, 1));
          ctx.fillStyle = fade;
          ctx.fillRect(0, baseline, w, h - baseline);

          // The shelf line the bars appear to stand on.
          ctx.fillStyle = shade(theme.ink, 0, 0.18);
          ctx.fillRect(0, baseline, w, Math.max(1, dpr));
        }
      },
    };
  },
};
