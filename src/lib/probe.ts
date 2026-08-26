/**
 * The Phase 1 spike.
 *
 * Plays a stream twice — once straight at the station, once through the local
 * Rust proxy — and reports, for each, whether audio actually reached the
 * element AND whether an `AnalyserNode` attached to it sees anything.
 *
 * That second measurement is the whole point. A cross-origin stream with no
 * `Access-Control-Allow-Origin` header makes `createMediaElementSource()` emit
 * silence, so the element reports healthy playback while the graph carries
 * nothing. V1 could not distinguish that from a dead station.
 */

/** Analyser byte value below which we call it silence (V1 used 2). */
const SILENCE_FLOOR = 3;

export interface ProbeResult {
  /** The element got far enough to have decodable audio. */
  audioReached: boolean;
  /** Highest analyser reading seen across the probe window. */
  peak: number;
  /** Peak cleared the silence floor — the graph is carrying real signal. */
  analyserAlive: boolean;
  /** Milliseconds until the first non-silent sample, if any. */
  timeToSignal: number | null;
  error: string | null;
}

export type Verdict =
  | "ok-direct"        // plays and analyses without the proxy
  | "cors-silenced"    // element plays, graph is silent — the proxy fixes it
  | "proxy-only"       // only reachable through the proxy at all
  | "dead"             // nothing works
  | "degraded";        // proxy did not fix it — needs a look

export interface StationReport {
  direct: ProbeResult;
  proxy: ProbeResult;
  verdict: Verdict;
}

let ctx: AudioContext | null = null;

function audioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Resume the shared context. Must be called from a user gesture. */
export async function unlockAudio(): Promise<void> {
  const c = audioContext();
  if (c.state === "suspended") await c.resume();
}

export interface ProbeOptions {
  /** How long to listen before giving up. */
  windowMs?: number;
  /** Play out loud instead of probing silently. */
  audible?: boolean;
  /** Fired with each analyser sample, for live meters. */
  onSample?: (peak: number) => void;
  signal?: AbortSignal;
}

/**
 * Attach a fresh audio element to the graph and watch it for `windowMs`.
 *
 * A new element every time is deliberate: `createMediaElementSource()` may only
 * be called once per element for the lifetime of the page, so reusing one would
 * make the second probe meaningless.
 */
export async function probeStream(url: string, opts: ProbeOptions = {}): Promise<ProbeResult> {
  const { windowMs = 8000, audible = false, onSample, signal } = opts;

  const c = audioContext();
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* reported through the peak staying at zero */
    }
  }

  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  audio.preload = "auto";
  audio.autoplay = false;

  let source: MediaElementAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let gain: GainNode | null = null;
  let poll: number | null = null;

  const result: ProbeResult = {
    audioReached: false,
    peak: 0,
    analyserAlive: false,
    timeToSignal: null,
    error: null,
  };

  const cleanup = () => {
    if (poll !== null) window.clearInterval(poll);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    try {
      source?.disconnect();
      analyser?.disconnect();
      gain?.disconnect();
    } catch {
      /* already torn down */
    }
  };

  try {
    source = c.createMediaElementSource(audio);
    analyser = c.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyser.minDecibels = -85;
    analyser.maxDecibels = -20;

    gain = c.createGain();
    // Silent probing still measures a real signal: the analyser taps the graph
    // ahead of the gain, so muting the output does not mute the measurement.
    gain.gain.value = audible ? 1 : 0;

    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(c.destination);
  } catch (e) {
    result.error = `graph setup failed: ${String(e)}`;
    cleanup();
    return result;
  }

  const bins = new Uint8Array(analyser.frequencyBinCount);
  const started = performance.now();

  audio.src = url;

  return new Promise<ProbeResult>((resolve) => {
    const finish = () => {
      cleanup();
      result.analyserAlive = result.peak > SILENCE_FLOOR;
      resolve(result);
    };

    const timer = window.setTimeout(finish, windowMs);

    const stopEarly = () => {
      window.clearTimeout(timer);
      finish();
    };

    signal?.addEventListener("abort", stopEarly, { once: true });

    audio.addEventListener("error", () => {
      const code = audio.error?.code;
      const names: Record<number, string> = {
        1: "aborted",
        2: "network error",
        3: "decode error",
        4: "source not supported",
      };
      result.error = code ? names[code] ?? `media error ${code}` : "media error";
      window.clearTimeout(timer);
      finish();
    });

    audio.addEventListener("canplay", () => {
      result.audioReached = true;
    });

    audio.addEventListener("playing", () => {
      result.audioReached = true;
    });

    audio.play().catch((e) => {
      // An autoplay rejection is not a station failure — surface it distinctly.
      result.error = `play() rejected: ${e?.name ?? String(e)}`;
    });

    poll = window.setInterval(() => {
      if (!analyser) return;
      analyser.getByteFrequencyData(bins);
      let max = 0;
      for (let i = 0; i < bins.length; i++) if (bins[i] > max) max = bins[i];
      if (max > result.peak) result.peak = max;
      if (result.timeToSignal === null && max > SILENCE_FLOOR) {
        result.timeToSignal = Math.round(performance.now() - started);
      }
      onSample?.(max);
    }, 100);
  });
}

export function verdictFor(direct: ProbeResult, proxy: ProbeResult): Verdict {
  if (direct.analyserAlive && proxy.analyserAlive) return "ok-direct";
  if (!direct.analyserAlive && proxy.analyserAlive) {
    return direct.audioReached ? "cors-silenced" : "proxy-only";
  }
  if (!proxy.audioReached && !direct.audioReached) return "dead";
  return "degraded";
}

export const VERDICT_COPY: Record<Verdict, { label: string; detail: string; tone: "good" | "warn" | "bad" }> = {
  "ok-direct": {
    label: "Sends CORS",
    detail: "Plays and analyses with or without the proxy.",
    tone: "good",
  },
  "cors-silenced": {
    label: "Was CORS-silenced",
    detail: "The element played but the graph was silent. The proxy fixes it.",
    tone: "good",
  },
  "proxy-only": {
    label: "Proxy-only",
    detail: "Unreachable from the webview directly. The proxy fixes it.",
    tone: "good",
  },
  degraded: {
    label: "Still broken",
    detail: "The proxy did not recover it. Needs a look before shipping.",
    tone: "warn",
  },
  dead: {
    label: "Dead",
    detail: "No audio through either path. Prune it from the catalog.",
    tone: "bad",
  },
};
