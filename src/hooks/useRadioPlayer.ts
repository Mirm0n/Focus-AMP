import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The persistent playback graph.
 *
 * One audio element for the lifetime of the app, because
 * `createMediaElementSource()` may only be called once per element — every
 * later station swaps `src` on the same element and keeps the graph intact.
 *
 * This is the seed of the Phase 2 player; the probe harness uses throwaway
 * elements instead, since it needs a fresh graph per measurement.
 */

export type PlayerStatus = "idle" | "loading" | "playing" | "error";

export interface RadioPlayer {
  status: PlayerStatus;
  error: string | null;
  volume: number;
  setVolume: (v: number) => void;
  play: (url: string) => Promise<void>;
  stop: () => void;
  analyser: AnalyserNode | null;
}

export function useRadioPlayer(): RadioPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

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

    source.connect(an);
    an.connect(gain);
    gain.connect(ctx.destination);

    audio.addEventListener("playing", () => {
      setStatus("playing");
      setError(null);
    });
    audio.addEventListener("waiting", () => setStatus("loading"));
    audio.addEventListener("error", () => {
      const names: Record<number, string> = {
        1: "aborted",
        2: "network error",
        3: "decode error",
        4: "source not supported",
      };
      const code = audio.error?.code;
      setError(code ? names[code] ?? `media error ${code}` : "media error");
      setStatus("error");
    });

    setAnalyser(an);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback(
    async (url: string) => {
      ensureGraph();
      const audio = audioRef.current!;
      const ctx = ctxRef.current!;

      if (ctx.state === "suspended") await ctx.resume();

      setStatus("loading");
      setError(null);
      audio.src = url;
      try {
        await audio.play();
      } catch (e) {
        setError(`play() rejected: ${(e as Error)?.name ?? String(e)}`);
        setStatus("error");
      }
    },
    [ensureGraph],
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setStatus("idle");
  }, []);

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
      audioRef.current?.pause();
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return { status, error, volume, setVolume, play, stop, analyser };
}
