import type { ChatItem } from "../../data/messages";
import type { CampaignEffect, EventEffects, MessageContent } from "../campaign/types";
import { evaluateFactCondition, type FactsStore, type SetFactEffect } from "../facts";

export interface ApplyEffectsInput {
  effects: readonly CampaignEffect[] | readonly EventEffects[];
  facts: FactsStore;
  messages: Record<string, MessageContent>;
  appendMessage(channelId: string, message: ChatItem): void;
  updateOrg?(patchId: string): void;
  rebuildDuckDb?(): void;
  openReview?(reviewId: string): void;
  logEvent?(event: AppliedEffectLogEntry): void;
}

export type AppliedEffectLogEntry =
  | SetFactEffect
  | { type: "post_message"; channelId: string; messageId: string }
  | { type: "update_org"; patchId: string }
  | { type: "rebuild_duckdb" }
  | { type: "open_review"; reviewId: string };

export interface ApplyEffectsReport {
  deliveredEventIds: string[];
  quarantineIds: string[];
}

export function applyEffects(input: ApplyEffectsInput): ApplyEffectsReport {
  const groups = normalizeEffectGroups(input.effects);
  const deliveredEventIds: string[] = [];
  const quarantineIds: string[] = [];

  for (const group of groups) {
    if (applyEventEffects(group, input)) {
      if (group.eventId) deliveredEventIds.push(group.eventId);
    } else if (group.eventId) {
      quarantineIds.push(group.eventId);
    }
  }

  return { deliveredEventIds, quarantineIds };
}

interface EffectGroup {
  eventId?: string;
  effects: readonly CampaignEffect[];
}

function normalizeEffectGroups(effects: ApplyEffectsInput["effects"]): EffectGroup[] {
  if (effects.length === 0) return [];
  if ("effects" in effects[0]) return effects as EventEffects[];
  return [{ effects: effects as readonly CampaignEffect[] }];
}

function applyEventEffects(group: EffectGroup, input: ApplyEffectsInput): boolean {
  const snapshot = input.facts.snapshot();
  try {
    preflightEventEffects(group.effects, input);
    for (const effect of group.effects) {
      applyEffect(effect, input);
    }
    return true;
  } catch {
    input.facts.restore(snapshot);
    return false;
  }
}

function preflightEventEffects(
  effects: readonly CampaignEffect[],
  input: Pick<ApplyEffectsInput, "messages">,
): void {
  for (const effect of effects) {
    if (effect.type === "post_message" && !input.messages[effect.messageId]) {
      throw new Error(`Missing message content: ${effect.messageId}`);
    }
  }
}

function applyEffect(effect: CampaignEffect, input: ApplyEffectsInput): void {
  switch (effect.type) {
    case "set_fact": {
      input.facts.apply(effect);
      input.logEvent?.(effect);
      return;
    }
    case "post_message": {
      const content = input.messages[effect.messageId];
      if (!content) throw new Error(`Missing message content: ${effect.messageId}`);
      input.appendMessage(effect.channelId, resolveMessage(content, input.facts));
      input.logEvent?.({
        type: "post_message",
        channelId: effect.channelId,
        messageId: effect.messageId,
      });
      return;
    }
    case "update_org":
      input.updateOrg?.(effect.patchId);
      input.logEvent?.({ type: "update_org", patchId: effect.patchId });
      return;
    case "rebuild_duckdb":
      input.rebuildDuckDb?.();
      input.logEvent?.({ type: "rebuild_duckdb" });
      return;
    case "open_review":
      input.openReview?.(effect.reviewId);
      input.logEvent?.({ type: "open_review", reviewId: effect.reviewId });
      return;
  }
}

function resolveMessage(content: MessageContent, facts: Pick<FactsStore, "get">): ChatItem {
  for (const variant of content.variants ?? []) {
    if (evaluateFactCondition(variant.when, facts)) return variant.message;
  }
  return content.default;
}
