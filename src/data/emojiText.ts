import type { EmojiId } from "./emoji";

export type EmojiTextToken =
  | { kind: "text"; value: string }
  | { kind: "emoji"; id: EmojiId; raw: string; offset: number };

const EMOJI_SHORTCODE = /:([a-z0-9_-]+):/gi;

export function tokenizeEmojiText(
  text: string,
  isKnown: (id: string) => boolean,
): EmojiTextToken[] {
  const tokens: EmojiTextToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(EMOJI_SHORTCODE)) {
    const raw = match[0];
    const id = match[1];
    const index = match.index ?? 0;

    if (!isKnown(id)) continue;
    if (index > lastIndex) {
      tokens.push({ kind: "text", value: text.slice(lastIndex, index) });
    }
    tokens.push({ kind: "emoji", id, raw, offset: index });
    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ kind: "text", value: text }];
}
