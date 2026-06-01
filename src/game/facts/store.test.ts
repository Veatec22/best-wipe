import { expect, test } from "bun:test";
import { createFactsStore } from "./store";

test("boolean facts use presence semantics and ignore false writes", () => {
  const facts = createFactsStore();

  facts.set("aov_clean", false);
  expect(facts.has("aov_clean")).toBe(false);
  expect(facts.get("aov_clean")).toBeUndefined();

  facts.set("aov_clean", true);
  facts.set("aov_clean", false);
  expect(facts.get("aov_clean")).toBe(true);
});

test("typed facts can replace their value", () => {
  const facts = createFactsStore();

  facts.set("missed_avatar_reminders", 1);
  facts.set("missed_avatar_reminders", 2);

  expect(facts.get("missed_avatar_reminders")).toBe(2);
});
