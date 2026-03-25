import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PomodoroConfig {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLong: number;
}

export type PomodoroPhase = "focus" | "short_break" | "long_break";

export interface PomodoroState {
  secondsRemaining: number;
  phase: PomodoroPhase;
  currentSession: number;   // which focus session we're on (increments after each break)
  totalSessions: number;    // total focus sessions completed
  isRunning: boolean;
  progress: number;         // 0 → 1 (fills left to right)
}

export interface UsePomodoroReturn {
  state: PomodoroState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  reset: () => void;
  onPhaseChange: (callback: (phase: string, message: string) => void) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULTS: PomodoroConfig = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLong: 4,
};

function phaseTotal(phase: PomodoroPhase, cfg: PomodoroConfig): number {
  if (phase === "focus") return cfg.focusMinutes * 60;
  if (phase === "short_break") return cfg.shortBreakMinutes * 60;
  return cfg.longBreakMinutes * 60;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePomodoro(config?: Partial<PomodoroConfig>): UsePomodoroReturn {
  const cfg = useRef<PomodoroConfig>({ ...DEFAULTS, ...config });

  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(
    () => phaseTotal("focus", cfg.current)
  );
  const [isRunning, setIsRunning] = useState(false);

  // Mutable refs — always in sync with latest state for use inside closures
  const phaseRef = useRef<PomodoroPhase>("focus");
  const currentSessionRef = useRef(1);
  const isRunningRef = useRef(false);
  phaseRef.current = phase;
  currentSessionRef.current = currentSession;
  isRunningRef.current = isRunning;

  // Registered phase-change callback
  const callbackRef = useRef<((phase: string, message: string) => void) | null>(null);

  // Break overtime warning timer
  const overtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whether we're mid-transition (prevents double-fire when seconds = 0 lingers)
  const transitioningRef = useRef(false);

  // ── Phase transition logic ─────────────────────────────────────────────────

  const transition = useCallback((fromPhase: PomodoroPhase, fromSession: number) => {
    // Clear any pending overtime warning
    if (overtimeTimerRef.current) {
      clearTimeout(overtimeTimerRef.current);
      overtimeTimerRef.current = null;
    }

    if (fromPhase === "focus") {
      // Focus ended → pick break type
      const isLong = fromSession % cfg.current.sessionsBeforeLong === 0;
      const nextPhase: PomodoroPhase = isLong ? "long_break" : "short_break";
      const breakMinutes = isLong
        ? cfg.current.longBreakMinutes
        : cfg.current.shortBreakMinutes;

      setPhase(nextPhase);
      setSecondsRemaining(phaseTotal(nextPhase, cfg.current));
      setTotalSessions((t) => t + 1);

      callbackRef.current?.(
        nextPhase,
        `Nice work! Time for a ${breakMinutes}-minute break. You've earned it! 🌟`
      );

      // Warn if student ignores the break for 2 minutes
      overtimeTimerRef.current = setTimeout(() => {
        if (
          isRunningRef.current &&
          (phaseRef.current === "short_break" || phaseRef.current === "long_break")
        ) {
          callbackRef.current?.(
            "break_overtime",
            "Seriously, your brain needs this. Even a quick stretch helps! 🧠"
          );
        }
      }, 2 * 60 * 1000);
    } else {
      // Break ended → start next focus session
      const nextSession = fromSession + 1;
      setPhase("focus");
      setCurrentSession(nextSession);
      setSecondsRemaining(phaseTotal("focus", cfg.current));
      callbackRef.current?.("focus", "Break's over! Ready to dive back in? Let's go! 💪");
    }

    transitioningRef.current = false;
  }, []);

  // ── Countdown ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(() => {
      setSecondsRemaining((prev) => {
        // Trigger transition when we hit 1 (so 0 appears cleanly before phase switch)
        if (prev === 1 && !transitioningRef.current) {
          transitioningRef.current = true;
          const capturedPhase = phaseRef.current;
          const capturedSession = currentSessionRef.current;
          // Defer to avoid calling setState inside setState
          setTimeout(() => transition(capturedPhase, capturedSession), 0);
          return 0;
        }
        // Guard: don't go below 0
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning, transition]);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (overtimeTimerRef.current) clearTimeout(overtimeTimerRef.current);
    };
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => setIsRunning(true), []);

  const skip = useCallback(() => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    const capturedPhase = phaseRef.current;
    const capturedSession = currentSessionRef.current;
    setIsRunning(false);
    // Short delay so the pause is visible and state has settled
    setTimeout(() => {
      transition(capturedPhase, capturedSession);
      setIsRunning(true);
    }, 50);
  }, [transition]);

  const reset = useCallback(() => {
    if (overtimeTimerRef.current) {
      clearTimeout(overtimeTimerRef.current);
      overtimeTimerRef.current = null;
    }
    transitioningRef.current = false;
    setIsRunning(false);
    setPhase("focus");
    setCurrentSession(1);
    setTotalSessions(0);
    setSecondsRemaining(phaseTotal("focus", cfg.current));
  }, []);

  const onPhaseChange = useCallback(
    (cb: (phase: string, message: string) => void) => {
      callbackRef.current = cb;
    },
    []
  );

  // ── Derived ───────────────────────────────────────────────────────────────

  const total = phaseTotal(phase, cfg.current);
  const progress = total > 0 ? 1 - secondsRemaining / total : 0;

  return {
    state: {
      secondsRemaining,
      phase,
      currentSession,
      totalSessions,
      isRunning,
      progress,
    },
    start,
    pause,
    resume,
    skip,
    reset,
    onPhaseChange,
  };
}
