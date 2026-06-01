import { expect, test } from "bun:test";
import { toPseudoSpeechText } from "./pseudoSpeechText";

test("pseudo speech text is deterministic and does not preserve real words", () => {
  const input = "Dobra, szybki sync. Revenue ASAP.";
  const first = toPseudoSpeechText(input, "calmLead");
  const second = toPseudoSpeechText(input, "calmLead");

  expect(first).toBe(second);
  expect(first.toLocaleLowerCase("pl-PL")).not.toContain("revenue");
  expect(first).toContain(",");
  expect(first).toContain(".");
});

test("pseudo speech text varies by voice profile", () => {
  expect(toPseudoSpeechText("Dobra szybki sync", "calmLead")).not.toBe(
    toPseudoSpeechText("Dobra szybki sync", "sharpPm"),
  );
});
