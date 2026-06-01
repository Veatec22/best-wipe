import type { ActionRequest, ChatMessage } from "../../data/messages";
import type { PersonId } from "../../data/people";
import type { FactCondition, FactsStore, SetFactEffect } from "../facts";

export interface CampaignEvent {
  id: string;
  day: number;
  /** In-game wall-clock "HH:MM". */
  time: string;
  conditions?: FactCondition;
  effects: CampaignEffect[];
}

export type CampaignEffect =
  | { type: "post_message"; channelId: string; messageId: MessageContentId }
  | SetFactEffect
  | { type: "update_org"; patchId: string }
  | { type: "rebuild_duckdb" }
  | { type: "open_review"; reviewId: string };

export type MessageContentId = string;

export interface MessageContent {
  id: MessageContentId;
  default: ChatMessage | ActionRequest;
  variants?: MessageVariant[];
}

export interface MessageVariant {
  when: FactCondition;
  message: ChatMessage | ActionRequest;
}

export interface CampaignTickInput {
  day: number;
  elapsedTodaySeconds: number;
  dayDurationSeconds: number;
  deliveredEventIds: ReadonlySet<string>;
  quarantinedEventIds?: ReadonlySet<string>;
  facts: Pick<FactsStore, "get">;
  events: readonly CampaignEvent[];
}

export interface CampaignTickResult {
  effectsByEvent: EventEffects[];
  newQuarantineIds: string[];
}

export interface EventEffects {
  eventId: string;
  effects: CampaignEffect[];
}

export interface ScheduledMessage {
  id: string;
  day: number;
  channelId: string;
  revealAt: string;
  typingLeadSeconds: number;
  message: ChatMessage | ActionRequest;
}

export interface ActiveTyping {
  channelId: string;
  personId: PersonId;
}
