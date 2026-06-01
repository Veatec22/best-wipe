import { expect, test } from "bun:test";
import type { ChatItem } from "../../data/messages";
import { createFactsStore } from "../facts";
import { applyEffects } from "./applyEffects";

test("applyEffects quarantines a failed event and rolls back fact changes", () => {
  const facts = createFactsStore();
  const messages: ChatItem[] = [];

  const report = applyEffects({
    effects: [
      {
        eventId: "broken_event",
        effects: [
          { type: "set_fact", key: "aov_clean", value: true },
          { type: "post_message", channelId: "general", messageId: "missing_message" },
        ],
      },
    ],
    facts,
    messages: {},
    appendMessage: (_channelId, message) => messages.push(message),
  });

  expect(report.deliveredEventIds).toEqual([]);
  expect(report.quarantineIds).toEqual(["broken_event"]);
  expect(facts.has("aov_clean")).toBe(false);
  expect(messages).toEqual([]);
});

test("applyEffects reports delivered event ids after successful grouped effects", () => {
  const facts = createFactsStore();
  const messages: ChatItem[] = [];

  const report = applyEffects({
    effects: [
      {
        eventId: "ok_event",
        effects: [
          { type: "set_fact", key: "aov_clean", value: true },
          { type: "post_message", channelId: "general", messageId: "hello" },
        ],
      },
    ],
    facts,
    messages: {
      hello: {
        id: "hello",
        default: { id: "hello", who: "lead_kuba", time: "09:30", text: "Hej" },
      },
    },
    appendMessage: (_channelId, message) => messages.push(message),
  });

  expect(report.deliveredEventIds).toEqual(["ok_event"]);
  expect(report.quarantineIds).toEqual([]);
  expect(facts.get("aov_clean")).toBe(true);
  expect(messages).toHaveLength(1);
});
