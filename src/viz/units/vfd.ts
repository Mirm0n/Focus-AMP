import {
  bandLevel,
  ballistic,
  clamp,
  drawFreqLegend,
  drawScanlines,
  logBands,
  withAlpha,
  type VizInstance,
  type Visualizer,
} from "../types";

/**
 * VFD — the vacuum fluorescent spectrum display of a 90s mini system.
 *
 * Where the Ladder is a rack of separate lamps, a VFD is one sheet of glass
 * with the segments printed on it, and the look follows from that:
 *   · bars grow both ways from a lit spine, because the display was a
 *     decorative band across the fascia rather than an instrument
 *   · a bar is a stack of whole segments. The level snaps to a segment count;
 *     a segment is on or off, never half lit. Letting the bar end wherever the
 *     level falls and cutting slits across it afterwards leaves a sliver of a
 *     segment at every tip, which is the tell that it is a drawn bar
 *   · the colour is printed on the glass in zones, so it is fixed to position
 *     and changes on a segment boundary: a segment is one colour, and a bar
 *     doesn't change colour as it grows, it uncovers more of what is there
 *   · unlit segments show faintly, as the phosphor pattern does on a real one,
 *     and so do the legend marks — on this kind of display the lettering is
 *     part of the same glass
 *   · in the bass there are more columns than FFT bins, so several neighbours
 *     would read the same bin and move as one block. Those columns read
 *     between bins instead, which turns the staircase back into a slope
 *
 * Each colour zone goes down as one path and one fill. That is what makes Glow
 * affordable here — three blurred fills, not one per bar.
 */

const COL_PITCH = 16;
const SEG_PITCH = 4;

/** Matches logBands' defaults — the legend and the centres have to agree. */
const MIN_HZ = 32;
const MAX_HZ = 16000;

export const vfd: Visualizer = {
  id: "vfd",
  name: "VFD",
  blurb: "Fluorescent segments mirrored about a lit spine, the 90s mini system",
  supports: ["density", "glow", "peaks", "scanlines"],

  create(): VizInstance {
    let bandCount = 0;
    let binCount = 0;
    let bands: Array<[number, number]> = [];
    let levels = new Float32Array(0);
    let peaks = new Float32Array(0);
    let holds = new Float32Array(0);
    let lit = new Uint16Array(0);
    /** Each band's centre as a fractional bin index. */
    let centres = new Float32Array(0);

    return {
      draw(ctx, frame, view, opts) {
        const { w, h, dpr, theme } = view;
        const scale = 0.6 + opts.density * 0.8;

        // Whole-pixel pitches, as on the Ladder, so every bar, segment and gap
        // is identical and nothing shimmers as the counts change.
        const colGap = Math.max(2, Math.round(3 * dpr));
        const colPitch = Math.max(colGap + 3, Math.round((COL_PITCH * dpr) / scale));
        const colW = colPitch - colGap;
        const slit = Math.max(1, Math.round(dpr));
        const segPitch = Math.max(slit + 2, Math.round(SEG_PITCH * dpr));
        const segH = segPitch - slit;

        const legendH = h > 150 * dpr ? Math.round(14 * dpr) : 0;
        const panelH = h - legendH;

        const want = clamp(Math.floor((w - colGap) / colPitch), 4, 200);
        if (want !== bandCount) {
          bandCount = want;
          levels = new Float32Array(bandCount);
          peaks = new Float32Array(bandCount);
          holds = new Float32Array(bandCount);
          lit = new Uint16Array(bandCount);
          bands = [];
        }
        if (binCount !== frame.freq.length) {
          binCount = frame.freq.length;
          bands = [];
        }
        if (bands.length !== bandCount && binCount > 0) {
          bands = logBands(bandCount, binCount, frame.sampleRate, MIN_HZ, MAX_HZ);
          const nyquist = frame.sampleRate / 2;
          const top = Math.min(MAX_HZ, nyquist);
          centres = new Float32Array(bandCount);
          for (let i = 0; i < bandCount; i++) {
            const hz = MIN_HZ * Math.pow(top / MIN_HZ, (i + 0.5) / bandCount);
            centres[i] = (hz / nyquist) * binCount;
          }
        }

        const levelOf = (i: number): number => {
          if (bands.length !== bandCount) return 0;
          const [b0, b1] = bands[i];
          if (b1 - b0 > 1) return bandLevel(frame.freq, bands[i], i, bandCount);
          // One bin or less to itself: read between the two nearest bins, with
          // the same treble tilt bandLevel applies.
          const at = clamp(centres[i] - 0.5, 0, binCount - 1);
          const lo = Math.floor(at);
          const hi = Math.min(binCount - 1, lo + 1);
          const v = frame.freq[lo] + (frame.freq[hi] - frame.freq[lo]) * (at - lo);
          return Math.min(1, (v / 255) * (1 + (i / bandCount) * 0.55));
        };

        ctx.fillStyle = theme.ground;
        ctx.fillRect(0, 0, w, h);

        // The spine is segment 0, centred; `rows` more stack above and below.
        const rows = Math.max(2, Math.floor((panelH * 0.46 - segH / 2) / segPitch));
        const spineTop = Math.round(panelH / 2 - segH / 2);
        const spineBottom = spineTop + segH;
        const gridW = colPitch * bandCount - colGap;
        const originX = Math.floor((w - gridW) / 2);

        // Segments a..b (1-based, counted out from the spine) as one rect on
        // each side. Slits are cut afterwards, so a run is drawn solid.
        const run = (x: number, a: number, b: number) => {
          const height = (b - a + 1) * segPitch - slit;
          ctx.rect(x, spineTop - b * segPitch, colW, height);
          ctx.rect(x, spineBottom + (a - 1) * segPitch + slit, colW, height);
        };

        // The unlit pattern: the whole stack, every column.
        ctx.beginPath();
        for (let i = 0; i < bandCount; i++) {
          const x = originX + i * colPitch;
          ctx.rect(x, spineTop - rows * segPitch, colW, segH + rows * segPitch * 2);
        }
        // Fainter than the Ladder's unlit lamps: this is a printed pattern
        // catching the light, not a lamp that is off.
        ctx.fillStyle = theme.grid;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;

        for (let i = 0; i < bandCount; i++) {
          levels[i] = ballistic(levels[i], levelOf(i), frame.dt, 1.7);

          if (levels[i] >= peaks[i]) {
            peaks[i] = levels[i];
            holds[i] = 0.45;
          } else if (holds[i] > 0) {
            holds[i] -= frame.dt;
          } else {
            peaks[i] = Math.max(levels[i], peaks[i] - frame.dt * 0.9);
          }
          lit[i] = Math.round(levels[i] * rows);
        }

        // Colour zones, on segment boundaries. The spine belongs to the first.
        const midFrom = Math.round(rows * 0.62) + 1;
        const hiFrom = Math.round(rows * 0.86) + 1;
        const zones: Array<[number, number, string]> = [
          [1, midFrom - 1, theme.lo],
          [midFrom, hiFrom - 1, theme.mid],
          [hiFrom, rows, theme.hi],
        ];
        for (const [from, to, color] of zones) {
          if (to < from) continue;
          ctx.beginPath();
          for (let i = 0; i < bandCount; i++) {
            const x = originX + i * colPitch;
            // Never fully dark: the spine is the display's idle state.
            if (from === 1) ctx.rect(x, spineTop, colW, segH);
            const top = Math.min(lit[i], to);
            if (top >= from) run(x, from, top);
          }
          ctx.fillStyle = color;
          if (opts.glow) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 9 * dpr;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Peak hold: one whole segment, floating clear of the bar.
        if (opts.peaks) {
          ctx.beginPath();
          for (let i = 0; i < bandCount; i++) {
            const p = Math.min(rows, Math.round(peaks[i] * rows));
            if (p > lit[i] && p >= 1) run(originX + i * colPitch, p, p);
          }
          ctx.fillStyle = theme.ink;
          ctx.fill();
        }

        // The slits between segments, cut through lit and unlit alike.
        ctx.fillStyle = theme.ground;
        for (let k = 1; k <= rows; k++) {
          ctx.fillRect(originX, spineTop - (k - 1) * segPitch - slit, gridW, slit);
          ctx.fillRect(originX, spineBottom + (k - 1) * segPitch, gridW, slit);
        }

        if (legendH > 0) {
          ctx.fillStyle = withAlpha(theme.lo, 0.18);
          ctx.fillRect(originX, panelH, gridW, Math.max(1, Math.round(dpr)));
          // Lettering in the display's own colour: it is printed on the glass.
          drawFreqLegend(ctx, theme.lo, originX, gridW, panelH, dpr, MIN_HZ, MAX_HZ);
        }

        if (opts.scanlines) drawScanlines(ctx, view);
      },
    };
  },
};
