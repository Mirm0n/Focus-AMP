import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The playback graph, with automatic stream health built in.
 *
 * One audio element for the lifetime of the app, because
 * `createMediaElementSource()` may only be called once per element — every
 * later station swaps `src` on the same element and keeps the graph intact.
 *
 * Radio stations die quietly: the URL still resolves, the element still reports
 * healthy playback, and nothing comes out. So the player watches two things and
 * reports a failure rather than sitting there looking fine —
 *
 *   1. no decodable audio at all within DEAD_AFTER_MS
 *   2. decodable audio, but the analyser reads silence for SILENT_AFTER_MS
 *
 * The caller decides what to do about it; App moves to the next station.
 */

/** No decodable audio at all — the station is unreachable. */
const DEAD_AFTER_MS = 12_000;
/** Playing, but the graph is carrying nothing — dead air or a stalled feed. */
const SILENT_AFTER_MS = 8_000;
/** Analyser byte value at or below which we call it silence. */
const SILENCE_FLOOR = 3;

export type PlayerStatus = "idle" | "loading" | "playing" | "error";

export interface UseRadioPlayerOptions {
  /** Fired when the current stream fails to start or goes silent. */
  onFailed?: (reason: string) => void;
}

export interface RadioPlayer {
  status: PlayerStatus;
  error: string | null;
  volume: number;
  setVolume: (v: number) => void;
  play: (url: string) => Promise<void>;
  stop: () => void;
  analyser: AnalyserNode | null;
}

export function useRadioPlayer(opts: UseRadioPlayerOptions = {}): RadioPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const watchRef = useRef<number | null>(null);

  // Held in a ref so the watchdog never closes over a stale handler.
  const onFailedRef = useRef(opts.onFailed);
  onFailedRef.current = opts.onFailed;

  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const stopWatchdog = useCallback(() => {
    if (watchRef.current !== null) {
      window.clearInterval(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const ensureGraph = useCallback(() => {
    if (audioRef.current) return;

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const source = ctx.createMediaElementSource(audio);

    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    an.smoothingTimeConstant = 0.8;
    an.minDecibels = -85;
    an.maxDecibels = -20;
    analyserRef.current = an;

    const gain = ctx.createGain();
    gain.gain.value = volume;
    gainRef.current = gain;

    // Analyser sits ahead of the gain, so volume never affects what it reads.
    source.connect(an);
    an.connect(gain);
    gain.connect(ctx.destination);

    audio.addEventListener("playing", () => {
      setStatus("playing");
      setError(null);
    });
    audio.addEventListener("waiting", () => setStatus("loading"));

    setAnalyser(an);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Give up on the current stream and tell the caller why. */
  const fail = useCallback(
    (reason: string) => {
      stopWatchdog();
      audioRef.current?.pause();
      setStatus("error");
      setError(reason);
      onFailedRef.current?.(reason);
    },
    [stopWatchdog],
  );

  const startWatchdog = useCallback(() => {
    stopWatchdog();
    const an = analyserRef.current;
    if (!an) return;

    const startedAt = performance.now();
    const bins = new Uint8Array(an.frequencyBinCount);
    let sawAudio = false;
    let silentSince: number | null = null;

    watchRef.current = window.setInterval(() => {
      const audio = audioRef.current;
      const analyserNode = analyserRef.current;
      if (!audio || !analyserNode || audio.paused) return;

      if (audio.readyState >= 2) sawAudio = true;

      if (!sawAudio) {
        if (performance.now() - startedAt > DEAD_AFTER_MS) {
          fail("station did not respond");
        }
        return;
      }

      analyserNode.getByteFrequencyData(bins);
      let max = 0;
      for (let i = 0; i < bins.length; i++) if (bins[i] > max) max = bins[i];

      if (max > SILENCE_FLOOR) {
        silentSince = null;
        return;
      }
      if (silentSince === null) {
        silentSince = performance.now();
      } else if (performance.now() - silentSince > SILENT_AFTER_MS) {
        fail("station is playing silence");
      }
    }, 500);
  }, [fail, stopWatchdog]);

  const play = useCallback(
    async (url: string) => {
      ensureGraph();
      const audio = audioRef.current!;
      const ctx = ctxRef.current!;

      if (ctx.state === "suspended") await ctx.resume();

      stopWatchdog();
      setStatus("loading");
      setError(null);
      audio.src = url;

      try {
        await audio.play();
        startWatchdog();
      } catch (e) {
        const name = (e as Error)?.name ?? String(e);
        // An autoplay block is the browser's doing, not the station's — never
        // let it get counted against the stream.
        if (name === "NotAllowedError") {
          setStatus("error");
          setError("Click anywhere to enable audio");
          return;
        }
        fail("could not start playback");
      }
    },
    [ensureGraph, fail, startWatchdog, stopWatchdog],
  );

  const stop = useCallback(() => {
    stopWatchdog();
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setStatus("idle");
    setError(null);
  }, [stopWatchdog]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (gain && ctx) {
      // Ramped, never assigned — a direct write zippers audibly.
      gain.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopWatchdog();
      audioRef.current?.pause();
      ctxRef.current?.close().catch(() => {});
    };
  }, [stopWatchdog]);

  return { status, error, volume, setVolume, play, stop, analyser };
}
