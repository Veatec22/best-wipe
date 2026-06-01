import { useTranslation } from "react-i18next";
import bestWipeLogoUrl from "../assets/brand/best-wipe-logo.png";
import { CHANNEL_GROUPS, CHANNELS } from "../data/channels";
import { PEOPLE, type Person } from "../data/people";
import { dayLabel, type GameClock } from "../game/clock";
import { Avatar } from "../ui/components/Avatar";

function PersonChannelAvatar({
  person,
  playerAvatarUrl,
}: {
  person: Person;
  playerAvatarUrl?: string;
}) {
  if (person.id === "you" && playerAvatarUrl) {
    return (
      <img
        src={playerAvatarUrl}
        alt={person.name}
        width={16}
        height={16}
        className="df-avatar-img sm"
        draggable={false}
      />
    );
  }
  if (person.avatar) {
    return <Avatar avatar={person.avatar} alt={person.name} size={16} />;
  }
  return <span className="df-avatar sm" data-persona={person.persona} />;
}

interface Props {
  activeId: string;
  badges: Record<string, number>;
  clock: GameClock;
  playerAvatarUrl?: string;
  onSelect(id: string): void;
  onEditPlayerAvatar(): void;
}

export function Sidebar({
  activeId,
  badges,
  clock,
  playerAvatarUrl,
  onSelect,
  onEditPlayerAvatar,
}: Props) {
  const { t } = useTranslation();
  return (
    <nav className="df-sidebar">
      <div className="brand">
        <img src={bestWipeLogoUrl} alt="" draggable={false} />
        <span>
          {t("app.brandLine1")}
          <br />
          {t("app.brandLine2")}
          <span className="blink" />
        </span>
      </div>
      <div className="lvl">
        {dayLabel(clock)} · {t("sidebar.company")} · {t("sidebar.weekday")}
      </div>
      {CHANNEL_GROUPS.map(group => {
        const items = CHANNELS.filter(c => c.group === group.name);
        if (items.length === 0) return null;
        return (
          <div className="group" key={group.name}>
            <h4>{t(`sidebar.groups.${group.name === "DM" ? "dm" : "channels"}`)}</h4>
            {items.map(c => {
              const person = c.with ? PEOPLE[c.with] : undefined;
              const badge = badges[c.id] ?? 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`df-channel${c.id === activeId ? " active" : ""}`}
                  onClick={() => onSelect(c.id)}
                >
                  <span className="hash">{c.kind === "channel" ? "#" : "@"}</span>
                  <span className="name">{c.label}</span>
                  {c.urgent && <span className="urgent">!</span>}
                  {badge > 0 && <span className="badge">{badge}</span>}
                  {person && (
                    <PersonChannelAvatar person={person} playerAvatarUrl={playerAvatarUrl} />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
      <div className="group" style={{ marginTop: "auto" }}>
        <h4>{t("sidebar.groups.you")}</h4>
        <button type="button" className="df-channel" onClick={onEditPlayerAvatar}>
          {playerAvatarUrl ? (
            <img
              src={playerAvatarUrl}
              alt=""
              width={16}
              height={16}
              className="df-avatar-img sm"
              draggable={false}
            />
          ) : (
            <span className="df-avatar sm" data-persona="you" />
          )}
          <span className="name">{t("sidebar.youLabel")}</span>
        </button>
      </div>
    </nav>
  );
}
