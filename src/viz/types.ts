/**
 * The visualizer contract.
 *
 * A visualizer is a draw function over one audio frame plus a factory for
 * whatever state it needs to carry between frames (falling peak caps, a
 * needle's momentum, a scrolling buffer). It owns no audio setup and no React
 * lifecycle — the host canvas hands it everything.
 *
 * Adding one means a single file in `units/` and a line in `registry.ts`.
 */

export interface VizFrame {
  /** getByteFrequencyData — 0..255 mapped across minDecibels..maxDecibels. */
  freq: Uint8Array;
  /** getByteTimeDomainData — 128 is silence. */
  wave: Uint8Array;
  sampleRate: number;
  fftSize: number;
  /** Seconds since the previous frame, clamped. */
  dt: number;
  /** Seconds since the host mounted. */
  time: number;
  playing: boolean;
}

/** Colours resolved from the active theme, in device-independent CSS strings. */
export interface VizTheme {
  /** The display's own ground — dark glass even under a light app theme. */
  ground: string;
  /** Unlit segments, graticule lines, the off state. */
  grid: string;
  /** Low, middle and high on the level ladder. */
  lo: string;
  mid: string;
  hi: string;
  /** Text and needles drawn on the display. */
  ink: string;
  /** The app's accent, for anything that should agree with the chrome. */
  accent: string;
}

/**
 * Appearance controls. Every visualizer receives all of them but declares which
 * it honours, so the settings panel only offers the ones that do something.
 */
export interface VizOptions {
  /** 0..1, scales element counts. 0.5 is the designed default. */
  density: number;
  /** Bloom around lit elements. */
  glow: boolean;
  /** Floating hold markers. */
  peaks: boolean;
  /** Mirror the display into a reflection below. */
  mirror: boolean;
  /** CRT scanline overlay. */
  scanlines: boolean;
}

export const DEFAULT_OPTIONS: VizOptions = {
  density: 0.5,
  glow: true,
  peaks: true,
  mirror: false,
  scanlines: false,
};

export type VizOptionKey = keyof VizOptions;

export interface VizView {
  /** Device pixels, not CSS pixels — drawing happens untransformed. */
  w: number;
  h: number;
  dpr: number;
  theme: VizTheme;
}

export interface VizInstance {
  draw(ctx: CanvasRenderingContext2D, frame: VizFrame, view: VizView, opts: VizOptions): void;
}

export interface Visualizer {
  id: string;
  name: string;
  /** One line for the picker — what it is, and where it comes from. */
  blurb: string;
  supports: VizOptionKey[];
  create(): VizInstance;
}

// ── Shared helpers ──────────────────────────────────────────────────────────

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Log-spaced bin ranges. FFT bins are linearly spaced while hearing is not, so
 * mapping bins straight onto bars piles every visible movement into the
 * leftmost tenth and leaves the rest of the display dead.
 */
export function logBands(
  bandCount: number,
  binCount: number,
  sampleRate: number,
  minHz = 32,
  maxHz = 16000,
): Array<[number, number]> {
  const nyquist = sampleRate / 2;
  const top = Math.min(maxHz, nyquist);
  const out: Array<[number, number]> = [];
  for (let i = 0; i < bandCount; i++) {
    const f0 = minHz * Math.pow(top / minHz, i / bandCount);
    const f1 = minHz * Math.pow(top / minHz, (i + 1) / bandCount);
    let b0 = Math.floor((f0 / nyquist) * binCount);
    let b1 = Math.ceil((f1 / nyquist) * binCount);
    b0 = clamp(b0, 0, binCount - 1);
    b1 = clamp(b1, b0 + 1, binCount);
    out.push([b0, b1]);
  }
  return out;
}

/**
 * Peak energy in a band, tilted upward with frequency. Treble carries far less
 * energy than bass, so an untilted reading leaves the right half permanently
 * flat no matter what is playing.
 */
export function bandLevel(
  freq: Uint8Array,
  range: [number, number],
  index: number,
  total: number,
): number {
  let max = 0;
  for (let b = range[0]; b < range[1]; b++) if (freq[b] > max) max = freq[b];
  const tilt = 1 + (index / Math.max(1, total)) * 0.55;
  return Math.min(1, (max / 255) * tilt);
}

/** RMS of the time-domain buffer, 0..1. */
export function waveRms(wave: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < wave.length; i++) {
    const v = (wave[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / Math.max(1, wave.length));
}

/** Fast attack, slow release — real meter ballistics. Symmetric reads as jelly. */
export function ballistic(current: number, target: number, dt: number, fall = 1.5): number {
  return target > current ? target : Math.max(target, current - dt * fall);
}

/** Paint the ground at partial alpha so the previous frame decays behind it. */
export function persist(
  ctx: CanvasRenderingContext2D,
  view: VizView,
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = view.theme.ground;
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.globalAlpha = 1;
}

export function drawScanlines(ctx: CanvasRenderingContext2D, view: VizView) {
  const pitch = Math.max(2, Math.round(3 * view.dpr));
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#000";
  for (let y = 0; y < view.h; y += pitch) {
    ctx.fillRect(0, y, view.w, Math.max(1, Math.round(view.dpr)));
  }
  ctx.globalAlpha = 1;
}

/** Colour for a position on the level ladder, keyed to absolute height. */
export function ladderColor(frac: number, theme: VizTheme): string {
  return frac >= 0.86 ? theme.hi : frac >= 0.62 ? theme.mid : theme.lo;
}
