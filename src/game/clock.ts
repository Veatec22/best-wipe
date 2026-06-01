import { useEffect, useRef, useState } from "react";

export interface GameClock {
  day: number;
  dayDurationSeconds: number;
  elapsedTodaySeconds: number;
  isPaused: boolean;
  isTimeFrozen: boolean;
  isDayEnded: boolean;
}

// In-game workday: 09:00 → 17:00 (classic nine-to-five = 8 in-game hours).
// Mapped to 8 minutes real-time, so 1 in-game hour = 1 real minute.
export const DAY_START_HOUR = 9;
export const DAY_END_HOUR = 17;
export const IN_GAME_HOURS_PER_DAY = DAY_END_HOUR - DAY_START_HOUR;
const DEFAULT_DAY_SECONDS = IN_GAME_HOURS_PER_DAY * 60;

export interface ClockApi {
  clock: GameClock;
  pause(): void;
  resume(): void;
  togglePause(): void;
  freezeTime(): void;
  unfreezeTime(): void;
  toggleTimeFreeze(): void;
  endCurrentDay(): void;
  nextDay(): void;
  setGameTime(day: number, hhmm: string): void;
  /** Skip ahead — debug only, not user-facing in v1. */
  fastForwardSeconds(s: number): void;
  replace(clock: GameClock): void;
}

/**
 * Real-time game clock. Ticks once per second, advances elapsedTodaySeconds.
 * When elapsed >= dayDurationSeconds, day increments and elapsed resets.
 *
 * Pause is observed by the tick loop so the timer halts cleanly without
 * leaking interval drift.
 */
export function useGameClock(opts?: {
  startDay?: number;
  dayDurationSeconds?: number;
  startElapsedSeconds?: number;
  startPaused?: boolean;
}): ClockApi {
  const [clock, setClock] = useState<GameClock>(() => ({
    day: opts?.startDay ?? 1,
    dayDurationSeconds: opts?.dayDurationSeconds ?? DEFAULT_DAY_SECONDS,
    elapsedTodaySeconds: opts?.startElapsedSeconds ?? 0,
    isPaused: opts?.startPaused ?? false,
    isTimeFrozen: false,
    isDayEnded:
      (opts?.startElapsedSeconds ?? 0) >= (opts?.dayDurationSeconds ?? DEFAULT_DAY_SECONDS),
  }));

  const lastTickRef = useRef<number>(performance.now());

  useEffect(() => {
    lastTickRef.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setClock(prev => {
        if (prev.isPaused || prev.isTimeFrozen || prev.isDayEnded) return prev;
        const elapsed = prev.elapsedTodaySeconds + dt;
        if (elapsed >= prev.dayDurationSeconds) {
          return { ...prev, elapsedTodaySeconds: prev.dayDurationSeconds, isDayEnded: true };
        }
        return { ...prev, elapsedTodaySeconds: elapsed };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return {
    clock,
    pause: () => setClock(c => ({ ...c, isPaused: true })),
    resume: () => setClock(c => (c.isDayEnded ? c : { ...c, isPaused: false })),
    togglePause: () => setClock(c => (c.isDayEnded ? c : { ...c, isPaused: !c.isPaused })),
    freezeTime: () => setClock(c => (c.isDayEnded ? c : { ...c, isTimeFrozen: true })),
    unfreezeTime: () => setClock(c => (c.isDayEnded ? c : { ...c, isTimeFrozen: false })),
    toggleTimeFreeze: () =>
      setClock(c => (c.isDayEnded ? c : { ...c, isTimeFrozen: !c.isTimeFrozen })),
    endCurrentDay: () =>
      setClock(c => ({ ...c, elapsedTodaySeconds: c.dayDurationSeconds, isDayEnded: true })),
    nextDay: () =>
      setClock(c => ({
        ...c,
        day: c.day + 1,
        elapsedTodaySeconds: 0,
        isPaused: false,
        isTimeFrozen: false,
        isDayEnded: false,
      })),
    setGameTime: (day, hhmm) =>
      setClock(c => {
        const nextDay = Math.max(1, day);
        const elapsedTodaySeconds = gameTimeToElapsedSeconds(hhmm, c.dayDurationSeconds);
        return {
          ...c,
          day: nextDay,
          elapsedTodaySeconds,
          isDayEnded: elapsedTodaySeconds >= c.dayDurationSeconds,
        };
      }),
    fastForwardSeconds: s =>
      setClock(c => {
        if (c.isDayEnded) return c;
        const elapsed = c.elapsedTodaySeconds + s;
        if (elapsed >= c.dayDurationSeconds) {
          return { ...c, elapsedTodaySeconds: c.dayDurationSeconds, isDayEnded: true };
        }
        return { ...c, elapsedTodaySeconds: elapsed };
      }),
    replace: next => setClock({ ...next, isPaused: true }),
  };
}

export function formatRemaining(clock: GameClock): string {
  const remaining = Math.max(0, clock.dayDurationSeconds - clock.elapsedTodaySeconds);
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * In-game wall-clock between 09:00 and 17:00, scaled from real elapsed seconds.
 */
export function formatGameTime(clock: GameClock): string {
  const ratio = Math.min(1, clock.elapsedTodaySeconds / clock.dayDurationSeconds);
  const totalMinutes = Math.floor(ratio * IN_GAME_HOURS_PER_DAY * 60);
  const h = DAY_START_HOUR + Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function dayLabel(clock: GameClock): string {
  return `DAY ${clock.day.toString().padStart(2, "0")}`;
}

/**
 * Total real-world seconds since the run started (day 1, 09:00). Useful as
 * a monotonic timestamp for scoring / submission ordering — independent of
 * day boundaries and pause state at read time.
 */
export function clockTotalElapsedSeconds(clock: GameClock): number {
  return (clock.day - 1) * clock.dayDurationSeconds + clock.elapsedTodaySeconds;
}

export function gameTimeToElapsedSeconds(
  hhmm: string,
  dayDurationSeconds = DEFAULT_DAY_SECONDS,
): number {
  const [hourRaw, minuteRaw] = hhmm.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  const minutesSinceStart = (hour - DAY_START_HOUR) * 60 + minute;
  const totalGameMinutes = IN_GAME_HOURS_PER_DAY * 60;
  return Math.max(0, Math.min(1, minutesSinceStart / totalGameMinutes)) * dayDurationSeconds;
}
