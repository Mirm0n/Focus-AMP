import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pomodoro, deadline-based.
 *
 * The remaining time is derived from a stored end timestamp rather than
 * decremented on a tick. Background tabs and sleeping machines throttle timers
 * hard, so a counter that subtracts one second per tick drifts badly over a
 * 25-minute session; recomputing from wall-clock never does.
 */

export type Phase = "focus" | "short" | "long";

export interface PomodoroSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  /** A long break replaces the short one after this many focus sessions. */
  longEvery: number;
  /** Roll straight into the next phase instead of waiting for a click. */
  autoStart: boolean;
  /** Stop the radio during breaks, resume it when focus starts. */
  pauseOnBreak: boolean;
  chime: boolean;
  notify: boolean;
}

export const DEFAULTS: PomodoroSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStart: true,
  pauseOnBreak: false,
  chime: true,
  notify: true,
};

export const PHASE_LABEL: Record<Phase, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

const STORAGE_KEY = "tunescape:pomodoro";

function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    // Merged over defaults so a settings shape added later can't strand an
    // older stored object with missing keys.
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PomodoroSettings>) };
  } catch {
    return DEFAULTS;
  }
}

function minutesFor(phase: Phase, s: PomodoroSettings): number {
  return phase === "focus" ? s.focusMin : phase === "short" ? s.shortMin : s.longMin;
}

/** Two-note chime, synthesised — rising into focus, falling into a break. */
function playChime(intoBreak: boolean) {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const t = ctx.currentTime;

    const [a, b] = intoBreak ? [659.25, 523.25] : [523.25, 783.99];
    for (const [i, freq] of [a, b].entries()) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + i * 0.28);
      g.gain.linearRampToValueAtTime(0.18, t + i * 0.28 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.28 + 0.9);
      osc.connect(g);
      g.connect(gain);
      osc.start(t + i * 0.28);
      osc.stop(t + i * 0.28 + 1);
    }
    // Free the hardware once the tail has rung out.
    window.setTimeout(() => ctx.close().catch(() => {}), 2000);
  } catch {
    /* AudioContext unavailable */
  }
}

export interface UsePomodoroOptions {
  /** Fired on every phase transition, so the caller can steer the radio. */
  onPhaseChange?: (next: Phase, previous: Phase) => void;
}

export interface Pomodoro {
  phase: Phase;
  running: boolean;
  /** Seconds left in the current phase. */
  remaining: number;
  /** Seconds in the current phase in total. */
  total: number;
  /** Focus sessions finished since the last reset. */
  completed: number;
  settings: PomodoroSettings;
  update: (patch: Partial<PomodoroSettings>) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  /** Jump to the next phase without finishing this one. */
  skip: () => void;
}

export function usePomodoro(opts: UsePomodoroOptions = {}): Pomodoro {
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [remaining, setRemaining] = useState(() => loadSettings().focusMin * 60);

  /** Wall-clock deadline while running; null while paused. */
  const endsAtRef = useRef<number | null>(null);
  const onPhaseChangeRef = useRef(opts.onPhaseChange);
  onPhaseChangeRef.current = opts.onPhaseChange;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const completedRef = useRef(completed);
  completedRef.current = completed;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* private mode, or storage disabled */
    }
  }, [settings]);

  const announce = useCallback((next: Phase) => {
    const s = settingsRef.current;
    if (s.chime) playChime(next !== "focus");
    if (s.notify) {
      // Imported lazily so a machine that denies notifications never blocks
      // the transition itself.
      import("@tauri-apps/plugin-notification")
        .then(async ({ isPermissionGranted, requestPermission, sendNotification }) => {
          let granted = await isPermissionGranted();
          if (!granted) granted = (await requestPermission()) === "granted";
          if (!granted) return;
          sendNotification({
            title: PHASE_LABEL[next],
            body:
              next === "focus"
                ? `${minutesFor("focus", s)} minutes. Back to it.`
                : `${minutesFor(next, s)} minutes. Step away.`,
          });
        })
        .catch(() => {});
    }
  }, []);

  /** Move to whichever phase follows the current one. */
  const advance = useCallback(
    (from: Phase, autoStart: boolean) => {
      const s = settingsRef.current;
      let next: Phase;
      let nextCompleted = completedRef.current;

      if (from === "focus") {
        nextCompleted = completedRef.current + 1;
        setCompleted(nextCompleted);
        next = nextCompleted % s.longEvery === 0 ? "long" : "short";
      } else {
        next = "focus";
      }

      setPhase(next);
      const seconds = minutesFor(next, s) * 60;
      setRemaining(seconds);

      if (autoStart) {
        endsAtRef.current = Date.now() + seconds * 1000;
        setRunning(true);
      } else {
        endsAtRef.current = null;
        setRunning(false);
      }

      announce(next);
      onPhaseChangeRef.current?.(next, from);
    },
    [announce],
  );

  // The tick only reads the clock; it never owns the count.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const endsAt = endsAtRef.current;
      if (endsAt === null) return;
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) advance(phase, settingsRef.current.autoStart);
    }, 250);
    return () => window.clearInterval(id);
  }, [running, phase, advance]);

  const start = useCallback(() => {
    endsAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);

  const pause = useCallback(() => {
    const endsAt = endsAtRef.current;
    if (endsAt !== null) setRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    endsAtRef.current = null;
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    endsAtRef.current = null;
    setRunning(false);
    setPhase("focus");
    setCompleted(0);
    setRemaining(settingsRef.current.focusMin * 60);
  }, []);

  const skip = useCallback(() => advance(phase, settingsRef.current.autoStart), [advance, phase]);

  const update = useCallback((patch: Partial<PomodoroSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      // Retime the current phase to match a duration the user just changed,
      // but only while idle — rewriting a running clock underfoot is hostile.
      if (!endsAtRef.current) {
        setPhase((p) => {
          setRemaining(minutesFor(p, next) * 60);
          return p;
        });
      }
      return next;
    });
  }, []);

  const total = minutesFor(phase, settings) * 60;

  return {
    phase,
    running,
    remaining,
    total,
    completed,
    settings,
    update,
    start,
    pause,
    reset,
    skip,
  };
}
