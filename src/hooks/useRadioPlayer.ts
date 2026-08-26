import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The playback graph, with automatic stream health built in.
 *
 * One audio element for the lifetime of the app, because
 * `createMediaElementSource()` may only be called once per element — every
 * later station swaps `src` on the same element and keeps the graph intact.
 *
 * Radio stations fail in three different ways and each needs its own catch:
 *
 *   1. the element errors outright (bad response, undecodable codec)
 *   2. nothing ever arrives and `play()` simply never settles
 *   3. audio arrives, but it is silence — dead air or a stalled feed
 *
 * The caller decides what to do; App moves to the next station in the genre.
 */

/** Backstop for a stream that hangs without ever erroring. */
const DEAD_AFTER_MS = 10_000;
/** Playing, but the graph is carrying nothing. */
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

/** MediaError codes, phrased to read inside "<Station> …". */
const MEDIA_ERROR: Record<number, string> = {
  1: "stopped unexpectedly",
  2: "could not be reached",
  3: "sent audio this device cannot decode",
  4: "is unavailable",
};

export function useRadioPlayer(opts: UseRadioPlayerOptions = {}): RadioPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const watchRef = useRef<number | null>(null);
  /** True between play() and stop(). Guards against a late event from a
      previous station tripping the watchdog for the current one. */
  const activeRef = useRef(false);
  /** Set once per attempt, so two failure paths can't both advance the list. */
  const failedRef = useRef(false);

  // Held in refs so listeners registered once never close over stale values.
  const onFailedRef = useRef(opts.onFailed);
  onFailedRef.current = opts.onFailed;
  const failRef = useRef<(reason: string) => void>(() => {});

  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const stopWatchdog = useCallback(() => {
    if (watchRef.current !== null) {
      window.clearInterval(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const ensureGraph = useCallback(() => {
    const existing = ctxRef.current;
    if (audioRef.current && existing && existing.state !== "closed") return;

    // A closed AudioContext cannot be revived, and the element attached to it
    // is permanently bound — `createMediaElementSource` may only ever be called
    // once per element — so both get replaced.
    //
    // This fires in dev on every Fast Refresh: the unmount cleanup closes the
    // context while React preserves the refs, so an `if (audioRef.current)`
    // guard would keep handing back a dead graph. It can also happen in the
    // wild when the platform tears a context down, so the recovery is real and
    // not just a dev workaround.
    if (existing) existing.close().catch(() => {});
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
    }

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
    gain.gain.value = volumeRef.current;
    gainRef.current = gain;

    // Analyser sits ahead of the gain, so volume never affects what it reads.
    source.connect(an);
    an.connect(gain);
    gain.connect(ctx.destination);

    audio.addEventListener("playing", () => {
      if (!activeRef.current) return;
      setStatus("playing");
      setError(null);
    });
    audio.addEventListener("waiting", () => {
      if (activeRef.current) setStatus("loading");
    });
    // Failure mode 1. Without this a bad response is silently swallowed and
    // the UI sits on "connecting…" forever.
    audio.addEventListener("error", () => {
      if (!activeRef.current) return;
      const code = audio.error?.code;
      failRef.current((code && MEDIA_ERROR[code]) || "could not be played");
    });

    setAnalyser(an);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Give up on the current stream and tell the caller why. */
  const fail = useCallback(
    (reason: string) => {
      if (!activeRef.current || failedRef.current) return;
      failedRef.current = true;
      activeRef.current = false;
      stopWatchdog();
      audioRef.current?.pause();
      setStatus("error");
      setError(reason);
      onFailedRef.current?.(reason);
    },
    [stopWatchdog],
  );
  failRef.current = fail;

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
      if (!audio || !analyserNode || !activeRef.current) return;

      if (audio.readyState >= 2) sawAudio = true;

      // Failure mode 2: nothing ever arrived.
      if (!sawAudio) {
        if (performance.now() - startedAt > DEAD_AFTER_MS) {
          fail("did not respond");
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
      // Failure mode 3: playing, but carrying silence.
      if (silentSince === null) {
        silentSince = performance.now();
      } else if (performance.now() - silentSince > SILENT_AFTER_MS) {
        fail("is playing silence");
      }
    }, 500);
  }, [fail, stopWatchdog]);

  const play = useCallback(
    async (url: string) => {
      ensureGraph();
      const audio = audioRef.current!;
      const ctx = ctxRef.current!;

      if (ctx.state === "suspended") await ctx.resume();

      activeRef.current = true;
      failedRef.current = false;
      setStatus("loading");
      setError(null);
      audio.src = url;

      // Armed BEFORE play() is awaited. A stream that connects and then stalls
      // leaves that promise pending forever, so anything waiting on it to start
      // the timer would wait forever too.
      startWatchdog();

      try {
        await audio.play();
      } catch (e) {
        const name = (e as Error)?.name ?? String(e);
        // An autoplay block is the browser's doing, not the station's — never
        // let it get counted against the stream.
        if (name === "NotAllowedError") {
          activeRef.current = false;
          stopWatchdog();
          setStatus("error");
          setError("Click anywhere to enable audio");
          return;
        }
        fail("could not be played");
      }
    },
    [ensureGraph, fail, startWatchdog, stopWatchdog],
  );

  const stop = useCallback(() => {
    activeRef.current = false;
    failedRef.current = false;
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
      activeRef.current = false;
      stopWatchdog();
      audioRef.current?.pause();
      ctxRef.current?.close().catch(() => {});
      // Cleared so the next `ensureGraph` builds fresh. Without this, React
      // Fast Refresh keeps the refs alive across a reload and the hook would
      // reuse the context this line just closed.
      audioRef.current = null;
      ctxRef.current = null;
      analyserRef.current = null;
      gainRef.current = null;
    };
  }, [stopWatchdog]);

  return { status, error, volume, setVolume, play, stop, analyser };
}
