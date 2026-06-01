import { EMOJI, isKnownEmoji } from "../data/emoji";
import { tokenizeEmojiText } from "../data/emojiText";

interface Props {
  text: string;
}

export function EmojiText({ text }: Props) {
  return (
    <>
      {tokenizeEmojiText(text, isKnownEmoji).map(token => {
        if (token.kind === "text") return token.value;
        const emoji = EMOJI[token.id];
        return (
          <img
            key={`${token.raw}-${token.offset}`}
            src={emoji.src}
            alt={token.raw}
            title={token.raw}
            className="df-inline-emoji"
            draggable={false}
          />
        );
      })}
    </>
  );
}
