import { gameTimeToElapsedSeconds } from "../clock";
import { evaluateFactCondition } from "../facts";
import type { CampaignEvent, CampaignTickInput, CampaignTickResult } from "./types";

export function tickCampaignEvents(input: CampaignTickInput): CampaignTickResult {
  const dueEvents = input.events
    .filter(event => isEventDue(event, input))
    .sort((a, b) => a.id.localeCompare(b.id));
  const lateEvents = input.events.filter(event => isEventLate(event, input));

  return {
    effectsByEvent: dueEvents.map(event => ({
      eventId: event.id,
      effects: event.effects,
    })),
    newQuarantineIds: lateEvents.map(event => event.id),
  };
}

function isEventDue(event: CampaignEvent, input: CampaignTickInput): boolean {
  if (event.day !== input.day) return false;
  if (input.deliveredEventIds.has(event.id)) return false;
  if (input.quarantinedEventIds?.has(event.id)) return false;

  const revealSecond = gameTimeToElapsedSeconds(event.time, input.dayDurationSeconds);
  if (input.elapsedTodaySeconds < revealSecond) return false;

  return evaluateFactCondition(event.conditions, input.facts);
}

function isEventLate(event: CampaignEvent, input: CampaignTickInput): boolean {
  if (event.day >= input.day) return false;
  if (input.deliveredEventIds.has(event.id)) return false;
  if (input.quarantinedEventIds?.has(event.id)) return false;
  return evaluateFactCondition(event.conditions, input.facts);
}
