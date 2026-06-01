import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EMOJI, EMOJI_LIST, type EmojiId } from "../data/emoji";
import type { PersonId } from "../data/people";
import type { MessageReactions } from "../data/reactions";

interface Props {
  messageId: string;
  reactions: MessageReactions | undefined;
  viewer: PersonId;
  onToggle(messageId: string, emojiId: EmojiId): void;
}

export function MessageReactionsBar({ messageId, reactions, viewer, onToggle }: Props) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [pickerOpen]);

  const entries = reactions ? Object.entries(reactions).filter(([, by]) => by.length > 0) : [];

  if (entries.length === 0 && !pickerOpen) {
    return (
      <div className="df-reactions" ref={wrapRef}>
        <button
          type="button"
          className="df-react-add df-react-add-empty"
          aria-label={t("chat.reactions.add")}
          title={t("chat.reactions.add")}
          onClick={() => setPickerOpen(true)}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="df-reactions" ref={wrapRef}>
      {entries.map(([emojiId, by]) => {
        const def = EMOJI[emojiId];
        const mine = by.includes(viewer);
        return (
          <button
            key={emojiId}
            type="button"
            className={`df-react-chip${mine ? " mine" : ""}`}
            aria-label={t("chat.reactions.chipAria", { emoji: emojiId, count: by.length })}
            aria-pressed={mine}
            title={emojiId}
            onClick={() => onToggle(messageId, emojiId)}
          >
            {def ? (
              <img src={def.src} alt="" className="df-react-img" />
            ) : (
              <span className="df-react-img df-react-img-missing">?</span>
            )}
            <span className="df-react-count">{by.length}</span>
          </button>
        );
      })}
      <button
        type="button"
        className="df-react-add"
        aria-label={t("chat.reactions.add")}
        title={t("chat.reactions.add")}
        onClick={() => setPickerOpen(o => !o)}
      >
        +
      </button>
      {pickerOpen && (
        <div className="df-react-picker" role="dialog" aria-label={t("chat.reactions.title")}>
          <div className="df-react-picker-grid">
            {EMOJI_LIST.map(emoji => (
              <button
                key={emoji.id}
                type="button"
                className="df-react-picker-btn"
                aria-label={emoji.id}
                title={emoji.id}
                onClick={() => {
                  onToggle(messageId, emoji.id);
                  setPickerOpen(false);
                }}
              >
                <img src={emoji.src} alt="" className="df-react-img" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
