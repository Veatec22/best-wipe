import { expect, test } from "bun:test";
import { planMumbleLine, type MumbleVoiceProfile } from "./mumblePlanner";

const profile: MumbleVoiceProfile = {
  id: "test",
  baseFrequencyHz: 420,
  frequencyRangeHz: 80,
  syllablesPerSecond: 8,
  syllableDurationMs: 58,
  pitchJitter: 0.25,
};

test("mumble planner creates deterministic syllable events from text length", () => {
  const first = planMumbleLine({ text: "Dobra, szybki sync.", profile });
  const second = planMumbleLine({ text: "Dobra, szybki sync.", profile });

  expect(first).toEqual(second);
  expect(first.events.length).toBeGreaterThan(5);
  expect(first.events.every(event => ["a", "e", "i", "o", "u"].includes(event.vowel))).toBe(true);
  expect(first.durationMs).toBeGreaterThan(first.events.at(-1)?.startMs ?? 0);
});

test("mumble planner assigns varied pseudo-vowels across a line", () => {
  const plan = planMumbleLine({ text: "Ryzyko revenue review", profile });
  const vowels = new Set(plan.events.map(event => event.vowel));

  expect(vowels.size).toBeGreaterThan(1);
});

test("mumble planner adds larger gaps after punctuation", () => {
  const plan = planMumbleLine({ text: "Ok. Jedziemy dalej", profile });
  const gaps = plan.events.slice(1).map((event, index) => event.startMs - plan.events[index].startMs);

  expect(Math.max(...gaps)).toBeGreaterThan(200);
});

test("mumble planner clamps very short and very long lines", () => {
  expect(planMumbleLine({ text: "OK", profile }).events.length).toBeGreaterThanOrEqual(2);
  expect(planMumbleLine({ text: "x".repeat(800), profile }).durationMs).toBeLessThanOrEqual(6500);
});
