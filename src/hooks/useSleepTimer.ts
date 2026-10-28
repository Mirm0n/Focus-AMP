import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Sleep timer — stop the radio after a set time, separate from the Pomodoro.
 *
 * Over the last stretch the output fades to nothing rather than cutting off,
 * so falling asleep to it never ends with a jolt. The fade is a gain stage of
 * its own in the player, so the volume slider never moves under the user.
 */

/** How long the fade-out takes, and so how early before the end it starts. */
export const SLEEP_FADE_SECONDS = 30;

export const SLEEP_CHOICES = [15, 30, 45, 60, 90] as const;

export interface SleepTimer {
  /** Epoch ms when playback stops, or null when no timer is set. */
  endsAt: number | null;
  /** Whole seconds left, recomputed every second while set. */
  remaining: number;
  start: (minutes: number) => void;
  cancel: () => void;
}

interface Options {
  /** Begin the fade: ramp the output to silence over `seconds`. */
  onFadeStart: (seconds: number) => void;
  /** Undo a fade that had started, when the timer is cancelled. */
  onFadeCancel: () => void;
  /** Time's up. */
  onExpire: () => void;
}

export function useSleepTimer(opts: Options): SleepTimer {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const fadingRef = useRef(false);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const left = (endsAt - t) / 1000;
      if (left <= 0) {
        fadingRef.current = false;
        setEndsAt(null);
        optsRef.current.onExpire();
        return;
      }
      if (!fadingRef.current && left <= SLEEP_FADE_SECONDS) {
        fadingRef.current = true;
        optsRef.current.onFadeStart(left);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const cancel = useCallback(() => {
    if (fadingRef.current) optsRef.current.onFadeCancel();
    fadingRef.current = false;
    setEndsAt(null);
  }, []);

  const start = useCallback((minutes: number) => {
    // Restarting mid-fade brings the sound back up first.
    if (fadingRef.current) optsRef.current.onFadeCancel();
    fadingRef.current = false;
    const t = Date.now();
    setNow(t);
    setEndsAt(t + minutes * 60_000);
  }, []);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  return { endsAt, remaining, start, cancel };
}
