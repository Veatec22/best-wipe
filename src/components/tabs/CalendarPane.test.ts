import { expect, test } from "bun:test";
import type { GameClock } from "../../game/clock";
import { getMeetingJoinState } from "./CalendarPane";

const baseClock: GameClock = {
  day: 1,
  dayDurationSeconds: 480,
  elapsedTodaySeconds: 0,
  isPaused: false,
  isTimeFrozen: false,
  isDayEnded: false,
};

test("calendar meeting join window is active during the scheduled time", () => {
  expect(
    getMeetingJoinState(
      { ...baseClock, elapsedTodaySeconds: 93 },
      { day: 1, start: "10:30", end: "10:45" },
    ),
  ).toBe("active");
});

test("calendar meeting join window is ended after the scheduled time", () => {
  expect(
    getMeetingJoinState(
      { ...baseClock, elapsedTodaySeconds: 115 },
      { day: 1, start: "10:30", end: "10:45" },
    ),
  ).toBe("ended");
});
