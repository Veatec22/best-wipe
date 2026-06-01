import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PEOPLE, type PersonId } from "../../data/people";
import { gameTimeToElapsedSeconds, type GameClock } from "../../game/clock";
import { initialsAvatar } from "../../game/campaign/avatarTypes";
import {
  playWebSpeechMumble,
  type MumblePlayback,
  type MumbleVoiceProfile,
} from "../../services/audio";
import { Avatar, Button } from "../../ui/components";

export interface MeetingDefinition {
  id: string;
  day: number;
  start: string;
  end: string;
  ownerId: PersonId;
  participantIds: PersonId[];
}

export type JoinState = "not_started" | "active" | "ended";
type VoiceProfileId = "calmLead" | "sharpPm" | "nervousJunior";

const WORKDAY_START_HOUR = 9;
const WORKDAY_END_HOUR = 17;
const WORKDAY_HOURS = WORKDAY_END_HOUR - WORKDAY_START_HOUR;
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const RETRO_MEETING = {
  id: "week1_retro_intro",
  day: 1,
  start: "10:30",
  end: "10:45",
  ownerId: "lead_kuba",
  participantIds: ["you", "lead_kuba", "pm_ola", "jr_bartek"],
} as const satisfies MeetingDefinition;

interface MeetingLine {
  id: string;
  speakerId: Exclude<PersonId, "you">;
  textKey: string;
  voiceProfileId: VoiceProfileId;
}

const VOICE_PROFILES = {
  calmLead: {
    id: "calmLead",
    baseFrequencyHz: 250,
    frequencyRangeHz: 62,
    syllablesPerSecond: 5.6,
    syllableDurationMs: 132,
    pitchJitter: 0.16,
    formantShift: 0.92,
    brightness: 0.42,
    breathiness: 0.1,
    vibratoDepth: 0.009,
  },
  sharpPm: {
    id: "sharpPm",
    baseFrequencyHz: 360,
    frequencyRangeHz: 96,
    syllablesPerSecond: 7.2,
    syllableDurationMs: 106,
    pitchJitter: 0.28,
    formantShift: 1.08,
    brightness: 0.68,
    breathiness: 0.14,
    vibratoDepth: 0.014,
  },
  nervousJunior: {
    id: "nervousJunior",
    baseFrequencyHz: 315,
    frequencyRangeHz: 120,
    syllablesPerSecond: 8.3,
    syllableDurationMs: 92,
    pitchJitter: 0.38,
    formantShift: 1.02,
    brightness: 0.58,
    breathiness: 0.18,
    vibratoDepth: 0.018,
  },
} as const satisfies Record<VoiceProfileId, MumbleVoiceProfile>;

const RETRO_LINES: MeetingLine[] = [
  {
    id: "retro_01",
    speakerId: "lead_kuba",
    textKey: "calendar.dialog.retro.line1",
    voiceProfileId: "calmLead",
  },
  {
    id: "retro_02",
    speakerId: "pm_ola",
    textKey: "calendar.dialog.retro.line2",
    voiceProfileId: "sharpPm",
  },
  {
    id: "retro_03",
    speakerId: "jr_bartek",
    textKey: "calendar.dialog.retro.line3",
    voiceProfileId: "nervousJunior",
  },
  {
    id: "retro_04",
    speakerId: "lead_kuba",
    textKey: "calendar.dialog.retro.line4",
    voiceProfileId: "calmLead",
  },
  {
    id: "retro_05",
    speakerId: "pm_ola",
    textKey: "calendar.dialog.retro.line5",
    voiceProfileId: "sharpPm",
  },
  {
    id: "retro_06",
    speakerId: "jr_bartek",
    textKey: "calendar.dialog.retro.line6",
    voiceProfileId: "nervousJunior",
  },
  {
    id: "retro_07",
    speakerId: "lead_kuba",
    textKey: "calendar.dialog.retro.line7",
    voiceProfileId: "calmLead",
  },
];

interface Props {
  clock: GameClock;
  playerAvatarUrl?: string;
}

export function CalendarPane({ clock, playerAvatarUrl }: Props) {
  const { t } = useTranslation();
  const [joinedMeetingId, setJoinedMeetingId] = useState<string | null>(null);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const playbackRef = useRef<MumblePlayback | null>(null);
  const joinState = getMeetingJoinState(clock, RETRO_MEETING);
  const isMeetingOpen = joinedMeetingId === RETRO_MEETING.id && joinState === "active";
  const activeLine = RETRO_LINES[activeLineIndex];

  useEffect(() => {
    return () => {
      playbackRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!isMeetingOpen || !activeLine) return;
    playLine(activeLine, t, playbackRef);
  }, [activeLine, isMeetingOpen, t]);

  useEffect(() => {
    if (isMeetingOpen) return;
    playbackRef.current?.stop();
    playbackRef.current = null;
  }, [isMeetingOpen]);

  if (isMeetingOpen) {
    return (
      <section className="df-calendar df-meeting-room" aria-labelledby="meeting-room-title">
        <div className="df-calendar-head">
          <div>
            <div className="df-calendar-kicker">{t("calendar.room.kicker")}</div>
            <h3 id="meeting-room-title">{t("calendar.retro.title")}</h3>
          </div>
          <Button size="compact" onClick={() => setJoinedMeetingId(null)}>
            {t("calendar.room.leave")}
          </Button>
        </div>
        <div className="df-meeting-grid">
          {RETRO_MEETING.participantIds.map(personId => (
            <ParticipantTile
              key={personId}
              personId={personId}
              playerAvatarUrl={playerAvatarUrl}
              isPlayer={personId === "you"}
            />
          ))}
        </div>
        <section className="df-meeting-dialog" aria-label={t("calendar.dialog.label")}>
          <div className="df-meeting-dialog-active">
            <span className="df-calendar-kicker">{PEOPLE[activeLine.speakerId].name}</span>
            <p>{t(activeLine.textKey)}</p>
          </div>
          <div className="df-meeting-dialog-actions">
            <Button size="compact" onClick={() => playLine(activeLine, t, playbackRef)}>
              {t("calendar.dialog.replay")}
            </Button>
            <Button
              size="compact"
              variant="primary"
              onClick={() =>
                setActiveLineIndex(index => Math.min(index + 1, RETRO_LINES.length - 1))
              }
              disabled={activeLineIndex >= RETRO_LINES.length - 1}
            >
              {t("calendar.dialog.next")}
            </Button>
          </div>
          <ol className="df-meeting-dialog-list">
            {RETRO_LINES.map((line, index) => (
              <li key={line.id} className={index === activeLineIndex ? "active" : undefined}>
                <button type="button" onClick={() => setActiveLineIndex(index)}>
                  <strong>{PEOPLE[line.speakerId].name}</strong>
                  <span>{t(line.textKey)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </section>
    );
  }

  return (
    <section className="df-calendar" aria-labelledby="calendar-title">
      <div className="df-calendar-head">
        <div>
          <div className="df-calendar-kicker">{t("calendar.kicker")}</div>
          <h3 id="calendar-title">{t("calendar.title")}</h3>
        </div>
      </div>
      <div className="df-calendar-layout">
        <div className="df-calendar-week" aria-label={t("calendar.timelineLabel")}>
          <div className="df-calendar-week-corner" />
          {WEEK_DAYS.map(day => (
            <div key={day} className={day === clock.day ? "df-calendar-week-head active" : "df-calendar-week-head"}>
              {t("calendar.week.day", { day })}
            </div>
          ))}
          <div className="df-calendar-time-rail">
            {Array.from({ length: WORKDAY_HOURS + 1 }, (_, idx) => {
              const hour = WORKDAY_START_HOUR + idx;
              return (
                <div className="df-calendar-hour" key={hour}>
                  <span>{hour.toString().padStart(2, "0")}:00</span>
                </div>
              );
            })}
          </div>
          {WEEK_DAYS.map(day => (
            <div key={day} className={day === clock.day ? "df-calendar-week-day active" : "df-calendar-week-day"}>
              {day === RETRO_MEETING.day && (
                <button
                  type="button"
                  className="df-calendar-event"
                  style={meetingBlockStyle(RETRO_MEETING)}
                  aria-label={t("calendar.retro.aria")}
                >
                  <strong>{t("calendar.retro.title")}</strong>
                  <span>
                    {RETRO_MEETING.start}-{RETRO_MEETING.end}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
        <aside className="df-calendar-detail" aria-label={t("calendar.detailsLabel")}>
          <div className="df-calendar-kicker">{t("calendar.detailsKicker")}</div>
          <h4>{t("calendar.retro.title")}</h4>
          <dl>
            <div>
              <dt>{t("calendar.fields.time")}</dt>
              <dd>
                {RETRO_MEETING.start}-{RETRO_MEETING.end}
              </dd>
            </div>
            <div>
              <dt>{t("calendar.fields.owner")}</dt>
              <dd>{PEOPLE[RETRO_MEETING.ownerId].name}</dd>
            </div>
            <div>
              <dt>{t("calendar.fields.participants")}</dt>
              <dd>{RETRO_MEETING.participantIds.map(id => PEOPLE[id].name).join(", ")}</dd>
            </div>
          </dl>
          <p>{t("calendar.retro.description")}</p>
          <Button variant="primary" onClick={() => setJoinedMeetingId(RETRO_MEETING.id)}>
            {t("calendar.join")}
          </Button>
          {joinState !== "active" && (
            <div className="df-calendar-block" role="status">
              {t(`calendar.block.${joinState}`)}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function playLine(
  line: MeetingLine,
  t: (key: string) => string,
  playbackRef: MutableRefObject<MumblePlayback | null>,
) {
  playbackRef.current?.stop();
  playbackRef.current = playWebSpeechMumble({
    text: t(line.textKey),
    profile: VOICE_PROFILES[line.voiceProfileId],
  });
}

function ParticipantTile({
  personId,
  playerAvatarUrl,
  isPlayer,
}: {
  personId: PersonId;
  playerAvatarUrl?: string;
  isPlayer: boolean;
}) {
  const person = PEOPLE[personId];
  return (
    <article className="df-meeting-tile">
      {isPlayer && playerAvatarUrl ? (
        <img
          src={playerAvatarUrl}
          alt={person.name}
          width={92}
          height={92}
          className="df-meeting-avatar"
          draggable={false}
        />
      ) : (
        <Avatar avatar={person.avatar ?? initialsAvatar(person.name)} alt={person.name} size={92} />
      )}
      <strong>{person.name}</strong>
      <span>{person.role}</span>
    </article>
  );
}

export function getMeetingJoinState(
  clock: GameClock,
  meeting: Pick<MeetingDefinition, "day" | "start" | "end">,
): JoinState {
  if (clock.day < meeting.day) return "not_started";
  if (clock.day > meeting.day) return "ended";

  const start = gameTimeToElapsedSeconds(meeting.start, clock.dayDurationSeconds);
  const end = gameTimeToElapsedSeconds(meeting.end, clock.dayDurationSeconds);

  if (clock.elapsedTodaySeconds < start) return "not_started";
  if (clock.elapsedTodaySeconds > end) return "ended";
  return "active";
}

function meetingBlockStyle(meeting: MeetingDefinition) {
  const startMinutes = hhmmToMinutes(meeting.start);
  const endMinutes = hhmmToMinutes(meeting.end);
  const workdayStartMinutes = WORKDAY_START_HOUR * 60;
  const workdayMinutes = WORKDAY_HOURS * 60;
  const top = ((startMinutes - workdayStartMinutes) / workdayMinutes) * 100;
  const height = ((endMinutes - startMinutes) / workdayMinutes) * 100;

  return {
    top: `${top}%`,
    height: `${height}%`,
  };
}

function hhmmToMinutes(value: string): number {
  const [hourRaw, minuteRaw] = value.split(":");
  return Number(hourRaw) * 60 + Number(minuteRaw);
}
