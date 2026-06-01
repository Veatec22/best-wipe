import type { EmojiId } from "./emoji";
import type { PersonId } from "./people";

export type MessageReactions = Record<EmojiId, PersonId[]>;

export type ReactionsByMessage = Record<string, MessageReactions>;

export function toggleReaction(
  state: ReactionsByMessage,
  messageId: string,
  emojiId: EmojiId,
  by: PersonId,
): ReactionsByMessage {
  const forMessage: MessageReactions = { ...(state[messageId] ?? {}) };
  const current = forMessage[emojiId] ?? [];
  const next = current.includes(by) ? current.filter(p => p !== by) : [...current, by];

  if (next.length === 0) {
    delete forMessage[emojiId];
  } else {
    forMessage[emojiId] = next;
  }

  const result: ReactionsByMessage = { ...state };
  if (Object.keys(forMessage).length === 0) {
    delete result[messageId];
  } else {
    result[messageId] = forMessage;
  }
  return result;
}
