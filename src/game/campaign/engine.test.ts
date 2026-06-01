import { expect, test } from "bun:test";
import { createFactsStore } from "../facts";
import { tickCampaignEvents } from "./engine";
import type { CampaignEvent } from "./types";

const events: CampaignEvent[] = [
  {
    id: "b_later_event",
    day: 1,
    time: "10:30",
    effects: [{ type: "post_message", channelId: "general", messageId: "later" }],
  },
  {
    id: "a_due_event",
    day: 1,
    time: "09:30",
    conditions: { key: "day1_kuba_access_check_clean", equals: true },
    effects: [{ type: "post_message", channelId: "general", messageId: "due" }],
  },
];

test("campaign event tick returns due effects once in deterministic order", () => {
  const result = tickCampaignEvents({
    day: 1,
    elapsedTodaySeconds: 60,
    dayDurationSeconds: 480,
    deliveredEventIds: new Set(),
    facts: createFactsStore({ day1_kuba_access_check_clean: true }),
    events,
  });

  expect(result.effectsByEvent).toEqual([
    {
      eventId: "a_due_event",
      effects: [{ type: "post_message", channelId: "general", messageId: "due" }],
    },
  ]);
  expect(result.newQuarantineIds).toEqual([]);
});

test("campaign event tick skips delivered events", () => {
  const result = tickCampaignEvents({
    day: 1,
    elapsedTodaySeconds: 480,
    dayDurationSeconds: 480,
    deliveredEventIds: new Set(["a_due_event", "b_later_event"]),
    facts: createFactsStore({ day1_kuba_access_check_clean: true }),
    events,
  });

  expect(result.effectsByEvent).toEqual([]);
  expect(result.newQuarantineIds).toEqual([]);
});

test("campaign event tick quarantines late events instead of silently dropping them", () => {
  const result = tickCampaignEvents({
    day: 4,
    elapsedTodaySeconds: 1,
    dayDurationSeconds: 480,
    deliveredEventIds: new Set(),
    facts: createFactsStore({ day1_kuba_access_check_clean: true }),
    events,
  });

  expect(result.effectsByEvent).toEqual([]);
  expect(result.newQuarantineIds).toEqual(["b_later_event", "a_due_event"]);
});
