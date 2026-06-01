import { Brackets } from "pixelarticons/react/Brackets";
import { Bulletlist } from "pixelarticons/react/Bulletlist";
import { Cancel } from "pixelarticons/react/Cancel";
import { Check } from "pixelarticons/react/Check";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CHANNELS } from "../data/channels";
import type { EmojiId } from "../data/emoji";
import type { ActionRequest, ChatItem, TaskSubmissionMessage } from "../data/messages";
import { PEOPLE, type Person } from "../data/people";
import type { ReactionsByMessage } from "../data/reactions";
import { resolveAvatar } from "../services/avatars";
import { useSubmissionsStore } from "../store/submissionsStore";
import { Avatar, Button } from "../ui/components";
import { EmojiText } from "./EmojiText";
import { MessageReactionsBar } from "./MessageReactions";
import { SubmissionModal } from "./SubmissionModal";

function PersonAvatar({
  person,
  playerAvatarUrl,
  size = 22,
}: {
  person: Person;
  playerAvatarUrl?: string;
  size?: number;
}) {
  if (person.id === "you" && playerAvatarUrl) {
    return (
      <img
        src={playerAvatarUrl}
        alt={person.name}
        width={size}
        height={size}
        className="df-avatar-img"
        draggable={false}
      />
    );
  }
  if (person.avatar) {
    return <Avatar avatar={person.avatar} alt={person.name} size={size} />;
  }
  return <span className="df-avatar" data-persona={person.persona} />;
}

interface Props {
  channelId: string;
  thread: ChatItem[];
  reactions: ReactionsByMessage;
  playerAvatarUrl?: string;
  typingPersonId?: Person["id"];
  onEditPlayerAvatar(): void;
  onAccept(actionId: string): void;
  onReject(actionId: string): void;
  onToggleReaction(messageId: string, emojiId: EmojiId): void;
}

function isSystem(item: ChatItem): item is { id: string; kind: "system"; text: string } {
  return (item as { kind?: string }).kind === "system";
}

function isAction(item: ChatItem): item is ActionRequest {
  return (item as { kind?: string }).kind === "action_request";
}

function isSubmission(item: ChatItem): item is TaskSubmissionMessage {
  return (item as { kind?: string }).kind === "task_submission";
}

export function ChatPanel({
  channelId,
  thread,
  reactions,
  playerAvatarUrl,
  typingPersonId,
  onEditPlayerAvatar,
  onAccept,
  onReject,
  onToggleReaction,
}: Props) {
  const { t } = useTranslation();
  const channel = CHANNELS.find(c => c.id === channelId);
  const headerLabel = channel ? channel.label : channelId;
  const headerPerson = channel?.with ? PEOPLE[channel.with] : undefined;
  const [zoomedAvatarUrl, setZoomedAvatarUrl] = useState<string | null>(null);
  const [openSubmission, setOpenSubmission] = useState<{
    id: string;
    view: "code" | "result";
  } | null>(null);
  const submissionsById = useSubmissionsStore(state => state.byId);
  const openSubmissionRecord = openSubmission ? submissionsById[openSubmission.id] : null;

  useEffect(() => {
    if (!zoomedAvatarUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedAvatarUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomedAvatarUrl]);

  const openZoom = (person: Person) => {
    if (person.id === "you") {
      onEditPlayerAvatar();
      return;
    }
    if (!person.avatar) return;
    setZoomedAvatarUrl(resolveAvatar(person.avatar).url);
  };

  return (
    <section className="df-chat">
      <header className="df-chat-head">
        <h2 className={headerPerson ? "df-chat-person-title" : undefined}>
          {headerPerson && (
            <button
              type="button"
              className={`df-avatar-trigger${headerPerson.avatar ? "" : " is-disabled"}`}
              onClick={() => openZoom(headerPerson)}
              aria-label={
                headerPerson.avatar ? `Pokaż avatar: ${headerPerson.name}` : headerPerson.name
              }
              disabled={!headerPerson.avatar}
            >
              <PersonAvatar person={headerPerson} playerAvatarUrl={playerAvatarUrl} size={72} />
            </button>
          )}
          <span>{headerPerson ? headerPerson.name : `# ${headerLabel}`}</span>
        </h2>
      </header>
      <div className="df-chat-body">
        {thread.length === 0 && !typingPersonId && (
          <div className="df-empty" style={{ padding: 40 }}>
            <span>—</span>
            <small>{t("chat.empty")}</small>
          </div>
        )}
        {thread.map(item => {
          if (isSystem(item)) {
            return (
              <div key={item.id} className="df-msg system">
                <div className="text">{item.text}</div>
              </div>
            );
          }
          if (isAction(item)) {
            const p = PEOPLE[item.who];
            return (
              <div key={item.id} className="df-msg">
                <PersonAvatar person={p} playerAvatarUrl={playerAvatarUrl} />
                <div className="body">
                  <div className="head">
                    <span className="who">{p.name}</span>
                    <span className="role">{p.role}</span>
                    <span className="time">{item.time}</span>
                  </div>
                  <div className="text">
                    <EmojiText text={item.text} />
                  </div>
                  {item.status === "accepted" ||
                  item.status === "rejected" ||
                  item.status === "ignored" ? (
                    <div className={`df-action-status status-${item.status}`}>
                      {item.status === "accepted" && (
                        <>
                          <Check width={12} height={12} aria-hidden="true" />
                          <span>{t("chat.actions.accepted")}</span>
                        </>
                      )}
                      {item.status === "rejected" && (
                        <>
                          <Cancel width={12} height={12} aria-hidden="true" />
                          <span>{t("chat.actions.rejected")}</span>
                        </>
                      )}
                      {item.status === "ignored" && (
                        <>
                          <Cancel width={12} height={12} aria-hidden="true" />
                          <span>{t("chat.actions.ignored")}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="df-action">
                      <Button variant="primary" onClick={() => onAccept(item.id)}>
                        <Check width={14} height={14} aria-hidden="true" />
                        <span>{t("chat.actions.accept")}</span>
                      </Button>
                      <Button onClick={() => onReject(item.id)}>
                        <Cancel width={14} height={14} aria-hidden="true" />
                        <span>{t("chat.actions.reject")}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          if (isSubmission(item)) {
            const p = PEOPLE[item.who];
            const exists = Boolean(submissionsById[item.submissionId]);
            return (
              <div key={item.id} className={`df-msg${item.who === "you" ? " self" : ""}`}>
                {item.who === "you" ? (
                  <button
                    type="button"
                    className="df-avatar-trigger df-avatar-trigger-sm"
                    onClick={onEditPlayerAvatar}
                    aria-label="Zmień swój avatar"
                  >
                    <PersonAvatar person={p} playerAvatarUrl={playerAvatarUrl} />
                  </button>
                ) : (
                  <PersonAvatar person={p} playerAvatarUrl={playerAvatarUrl} />
                )}
                <div className="body">
                  <div className="head">
                    <span className="who">{p.name}</span>
                    <span className="role">{p.role}</span>
                    <span className="time">{item.time}</span>
                  </div>
                  <div className="text">
                    <EmojiText text={item.text} />
                  </div>
                  <div className="df-action df-submission-actions">
                    <Button
                      onClick={() => setOpenSubmission({ id: item.submissionId, view: "code" })}
                      disabled={!exists}
                    >
                      <Brackets width={14} height={14} aria-hidden="true" />
                      <span>{t("submission.code")}</span>
                    </Button>
                    <Button
                      onClick={() => setOpenSubmission({ id: item.submissionId, view: "result" })}
                      disabled={!exists}
                    >
                      <Bulletlist width={14} height={14} aria-hidden="true" />
                      <span>{t("submission.result")}</span>
                    </Button>
                  </div>
                  {!exists && (
                    <div className="df-submission-missing">{t("submission.missing")}</div>
                  )}
                </div>
              </div>
            );
          }
          const p = PEOPLE[item.who];
          return (
            <div key={item.id} className={`df-msg${item.who === "you" ? " self" : ""}`}>
              {item.who === "you" ? (
                <button
                  type="button"
                  className="df-avatar-trigger df-avatar-trigger-sm"
                  onClick={onEditPlayerAvatar}
                  aria-label="Zmień swój avatar"
                >
                  <PersonAvatar person={p} playerAvatarUrl={playerAvatarUrl} />
                </button>
              ) : (
                <PersonAvatar person={p} playerAvatarUrl={playerAvatarUrl} />
              )}
              <div className="body">
                <div className="head">
                  <span className="who">{p.name}</span>
                  <span className="role">{p.role}</span>
                  <span className="time">{item.time}</span>
                </div>
                <div className="text">
                  <EmojiText text={item.text} />
                </div>
                <MessageReactionsBar
                  messageId={item.id}
                  reactions={reactions[item.id]}
                  viewer="you"
                  onToggle={onToggleReaction}
                />
              </div>
            </div>
          );
        })}
        {typingPersonId && (
          <TypingIndicator person={PEOPLE[typingPersonId]} playerAvatarUrl={playerAvatarUrl} />
        )}
      </div>
      {zoomedAvatarUrl && (
        <button
          type="button"
          className="df-overlay df-avatar-zoom"
          onClick={() => setZoomedAvatarUrl(null)}
          aria-label="Zamknij"
        >
          <img src={zoomedAvatarUrl} alt="" draggable={false} />
        </button>
      )}
      {openSubmissionRecord && openSubmission && (
        <SubmissionModal
          submission={openSubmissionRecord}
          initialView={openSubmission.view}
          onClose={() => setOpenSubmission(null)}
        />
      )}
    </section>
  );
}

function TypingIndicator({
  person,
  playerAvatarUrl,
}: {
  person: Person;
  playerAvatarUrl?: string;
}) {
  return (
    <div className="df-msg df-typing" aria-live="polite">
      <PersonAvatar person={person} playerAvatarUrl={playerAvatarUrl} />
      <div className="body">
        <div className="head">
          <span className="who">{person.name}</span>
          <span className="role">{person.role}</span>
        </div>
        <div className="df-typing-bubble">
          <span>{person.name.split(" ")[0]} is typing</span>
          <span className="df-typing-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    </div>
  );
}
