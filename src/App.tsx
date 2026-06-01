import { Calendar } from "pixelarticons/react/Calendar";
import { Clock } from "pixelarticons/react/Clock";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import track2Url from "./assets/music/untitled_2.mp3";
import { AvatarUploadModal } from "./components/AvatarUploadModal";
import { ChatPanel } from "./components/ChatPanel";
import { GameMenu } from "./components/GameMenu";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { WorkArea } from "./components/WorkArea";
import { CHANNELS } from "./data/channels";
import type { EmojiId } from "./data/emoji";
import { type ActionRequest, type ChatItem, type ChatMessage, THREADS } from "./data/messages";
import { type ReactionsByMessage, toggleReaction } from "./data/reactions";
import { CinematicHost } from "./features/cinematics";
import {
  clockTotalElapsedSeconds,
  dayLabel,
  formatGameTime,
  gameTimeToElapsedSeconds,
  useGameClock,
} from "./game/clock";
import {
  detectIgnored,
  handleAccept as handleCoreAccept,
  handleIgnore as handleCoreIgnore,
  handleReject as handleCoreReject,
  handleSubmission,
} from "./game/coreLoop/coreLoop";
import { getActiveTyping, getDueScheduledMessages } from "./game/scheduledMessages";
import {
  applyGameSettings,
  type GameSettings,
  loadGameSettings,
  saveGameSettings,
} from "./game/settings";
import { findTaskByActionId, getTaskDefinition } from "./game/tasks/registry";
import { useAiStore } from "./services/ai";
import { rebuildDataset } from "./services/duckdb/datasetLoader";
import { getDuckDB } from "./services/duckdb/duckdbClient";
import { runQuery } from "./services/duckdb/queryRunner";
import { hydrateActiveRun } from "./services/persistence/hydrate";
import {
  persistActionStatus,
  persistMessage,
  persistScoringEvent,
  persistSubmission,
  persistTask,
} from "./services/persistence/records";
import { saveSnapshot } from "./services/persistence/saveSnapshot";
import { playSfx } from "./services/sfx";
import { useFactsStore } from "./store/factsStore";
import { useScoringStore } from "./store/scoringStore";
import { useSubmissionsStore } from "./store/submissionsStore";
import { useTasksStore } from "./store/tasksStore";

const PLAYER_AVATAR_KEY = "data-fever:player-avatar";
const MAX_STORY_DAY = 7;
const ACTION_IGNORE_TIMEOUT_SECONDS = 8 * 60;

type AppScreen = "menu" | "cinematic" | "story";

function stampActionRequest(item: ChatItem, deliveredAtTotalSeconds: number): ChatItem {
  if (!("kind" in item) || item.kind !== "action_request") return item;
  return {
    ...item,
    deliveredAtTotalSeconds: item.deliveredAtTotalSeconds ?? deliveredAtTotalSeconds,
    hiddenExpiresAfterSeconds: item.hiddenExpiresAfterSeconds ?? ACTION_IGNORE_TIMEOUT_SECONDS,
  };
}

function stampThreads(
  threads: Record<string, ChatItem[]>,
  deliveredAtTotalSeconds: number,
): Record<string, ChatItem[]> {
  return Object.fromEntries(
    Object.entries(threads).map(([channelId, items]) => [
      channelId,
      items.map(item => stampActionRequest(item, deliveredAtTotalSeconds)),
    ]),
  );
}

export default function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<AppScreen>("menu");
  const [resumeAfterCinematic, setResumeAfterCinematic] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => loadGameSettings());
  const menuMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    applyGameSettings(settings);
    saveGameSettings(settings);
  }, [settings]);

  useEffect(() => {
    const audio = menuMusicRef.current;
    if (!audio) return;
    audio.volume = settings.musicEnabled && screen !== "story" ? settings.musicVolume : 0;
    if (!settings.musicEnabled || screen === "story") {
      audio.pause();
      return;
    }
    void audio.play().catch(() => undefined);
  }, [screen, settings.musicEnabled, settings.musicVolume]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreen = Boolean(document.fullscreenElement);
      setSettings(prev => (prev.fullscreen === fullscreen ? prev : { ...prev, fullscreen }));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t("menu.exitConfirm");
      return t("menu.exitConfirm");
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [t]);

  function handleChangeSettings(nextSettings: GameSettings) {
    setSettings(nextSettings);
  }

  function startMenuMusic() {
    const audio = menuMusicRef.current;
    if (!audio || !settings.musicEnabled || screen === "story") return;
    void audio.play().catch(() => undefined);
  }

  const menuMusic = screen !== "story" && (
    /** biome-ignore lint/a11y/useMediaCaption: instrumental menu and intro background music */
    <audio ref={menuMusicRef} src={track2Url} loop preload="auto" />
  );

  if (screen === "menu") {
    return (
      <>
        {menuMusic}
        <GameMenu
          settings={settings}
          onChangeSettings={handleChangeSettings}
          onStartMusic={startMenuMusic}
          onStartStory={() => {
            setResumeAfterCinematic(true);
            setScreen("cinematic");
          }}
        />
      </>
    );
  }

  if (screen === "cinematic") {
    return (
      <>
        {menuMusic}
        <CinematicHost sceneId="new_game_intro" onComplete={() => setScreen("story")} />
      </>
    );
  }

  return <GameApp settings={settings} autoResumeOnHydrate={resumeAfterCinematic} />;
}

function GameApp({
  settings,
  autoResumeOnHydrate,
}: {
  settings: GameSettings;
  autoResumeOnHydrate: boolean;
}) {
  const { t } = useTranslation();
  const clockApi = useGameClock({
    startElapsedSeconds: getDebugStartElapsedSeconds(),
  });
  const { clock, nextDay, togglePause } = clockApi;
  const aiUsed = useAiStore(state => state.used);
  const aiTotal = useAiStore(state => state.total);
  const [activeChannel, setActiveChannel] = useState("lead_kuba");
  const [threads, setThreads] = useState<Record<string, ChatItem[]>>(() =>
    stampThreads(THREADS, 0),
  );
  const [deliveredScheduledIds, setDeliveredScheduledIds] = useState<Set<string>>(() => new Set());
  const [reactions, setReactions] = useState<ReactionsByMessage>({});
  const [playerAvatarUrl, setPlayerAvatarUrl] = useState<string | undefined>(() => {
    return localStorage.getItem(PLAYER_AVATAR_KEY) ?? undefined;
  });
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>(() =>
    Object.fromEntries(CHANNELS.filter(c => c.badge && c.badge > 0).map(c => [c.id, c.badge ?? 0])),
  );
  const dayEndAlarmDayRef = useRef<number | null>(null);
  const runIdRef = useRef<string | null>(null);
  const autoResumeOnHydrateRef = useRef(autoResumeOnHydrate);
  const replaceClockRef = useRef(clockApi.replace);
  const resumeClockRef = useRef(clockApi.resume);
  const snapshotInputRef = useRef({
    clock,
    activeChannel,
    badges,
    reactions,
    deliveredEventIds: deliveredScheduledIds,
    threads,
  });
  autoResumeOnHydrateRef.current = autoResumeOnHydrate;
  replaceClockRef.current = clockApi.replace;
  resumeClockRef.current = clockApi.resume;
  snapshotInputRef.current = {
    clock,
    activeChannel,
    badges,
    reactions,
    deliveredEventIds: deliveredScheduledIds,
    threads,
  };

  function handleToggleReaction(messageId: string, emojiId: EmojiId) {
    setReactions(prev => toggleReaction(prev, messageId, emojiId, "you"));
  }

  function handleSavePlayerAvatar(url: string) {
    localStorage.setItem(PLAYER_AVATAR_KEY, url);
    setPlayerAvatarUrl(url);
    setIsAvatarEditorOpen(false);
  }

  const channelLabel = useMemo(() => {
    const c = CHANNELS.find(x => x.id === activeChannel);
    if (!c) return activeChannel;
    return (c.kind === "channel" ? "#" : "@") + c.label;
  }, [activeChannel]);

  function resolveAction(
    channelId: string,
    actionId: string,
    status: "accepted" | "rejected",
    replyText: string,
    replyTime: string,
  ) {
    setThreads(prev => {
      const list = prev[channelId];
      if (!list) return prev;
      const idx = list.findIndex(
        it => it.id === actionId && (it as { kind?: string }).kind === "action_request",
      );
      if (idx === -1) return prev;
      const cur = list[idx] as ActionRequest;
      if (cur.status && cur.status !== "pending") return prev;
      const updated: ActionRequest = { ...cur, status };
      const reply: ChatMessage = {
        id: `${actionId}:reply`,
        who: "you",
        time: replyTime,
        text: replyText,
      };
      return {
        ...prev,
        [channelId]: [...list.slice(0, idx), updated, ...list.slice(idx + 1), reply],
      };
    });
  }

  function markActionIgnored(channelId: string, actionId: string, ignoredAtTotalSeconds: number) {
    setThreads(prev => {
      const list = prev[channelId];
      if (!list) return prev;
      return {
        ...prev,
        [channelId]: list.map(item => {
          if (!("kind" in item) || item.kind !== "action_request" || item.id !== actionId) {
            return item;
          }
          if (item.status && item.status !== "pending") return item;
          return { ...item, status: "ignored", ignoredAtTotalSeconds };
        }),
      };
    });
  }

  function appendMessage(channelId: string, message: ChatItem) {
    const stamped = stampActionRequest(message, clockTotalElapsedSeconds(clock));
    setThreads(prev => ({
      ...prev,
      [channelId]: [...(prev[channelId] ?? []), stamped],
    }));
    const runId = runIdRef.current;
    if (runId) void persistMessage(runId, channelId, stamped);
  }

  function handleAccept(actionId: string) {
    const def = findTaskByActionId(actionId);
    const result = handleCoreAccept({
      actionId,
      channelId: activeChannel,
      replyText: t("chat.autoReply.accept"),
      acceptedAtTotalSeconds: clockTotalElapsedSeconds(clock),
      taskDefinition: def,
      now: Date.now,
    });
    resolveAction(
      result.action.channelId,
      result.action.actionId,
      result.action.status,
      result.action.replyText,
      result.action.replyTime,
    );
    const runId = runIdRef.current;
    if (runId) {
      void persistActionStatus(runId, result.action.channelId, result.action.actionId, "accepted");
    }
    if (result.acceptedTask) {
      // In player mode the editor starts empty — pre-filled SQL is an admin
      // convenience for fast task testing, never shown to the player.
      const acceptedTask =
        __APP_MODE__ === "admin" ? result.acceptedTask : { ...result.acceptedTask, initialSql: "" };
      useTasksStore.getState().acceptTask(acceptedTask);
      const task = useTasksStore.getState().tasks[acceptedTask.id];
      if (runId && task) void persistTask(runId, task);
    }
    useFactsStore.getState().applyCampaignEffects(result.worldEffects);
  }

  function handleReject(actionId: string) {
    const result = handleCoreReject({
      actionId,
      channelId: activeChannel,
      replyText: t("chat.autoReply.reject"),
      now: Date.now,
    });
    resolveAction(
      result.action.channelId,
      result.action.actionId,
      result.action.status,
      result.action.replyText,
      result.action.replyTime,
    );
    const runId = runIdRef.current;
    if (runId) {
      void persistActionStatus(runId, result.action.channelId, result.action.actionId, "rejected");
    }
    useFactsStore.getState().applyCampaignEffects(result.worldEffects);
  }

  function handleIgnore(actionId: string, channelId: string, ignoredAtTotalSeconds: number) {
    const result = handleCoreIgnore({ actionId, channelId, ignoredAtTotalSeconds });
    markActionIgnored(
      result.action.channelId,
      result.action.actionId,
      result.action.ignoredAtTotalSeconds,
    );
    const runId = runIdRef.current;
    if (runId) {
      void persistActionStatus(runId, result.action.channelId, result.action.actionId, "ignored");
    }
    useFactsStore.getState().applyCampaignEffects(result.worldEffects);
  }

  async function handleSubmitTask(taskId: string) {
    const def = getTaskDefinition(taskId);
    const inst = useTasksStore.getState().tasks[taskId];
    if (!def || !inst) return;

    const result = await handleSubmission({
      taskId,
      def,
      task: inst,
      clock,
      runQuery,
      now: Date.now,
      submissionCoverText: t("chat.submission.cover"),
    });

    useTasksStore.getState().setLastResult(taskId, result.lastResult);
    useSubmissionsStore.getState().add(result.submission);
    useTasksStore.getState().recordSubmission(taskId, result.submission.id);
    for (const item of result.chatAppends) appendMessage(item.channelId, item.message);
    useTasksStore.getState().setStatus(taskId, result.newTaskStatus);
    useScoringStore.getState().apply(result.scoringEvent);
    useFactsStore.getState().applyCampaignEffects(result.worldEffects);
    const runId = runIdRef.current;
    if (runId) {
      const task = useTasksStore.getState().tasks[taskId];
      void persistSubmission(runId, result.submission);
      if (task) void persistTask(runId, task);
      void persistScoringEvent(runId, result.scoringEvent);
    }
  }

  const thread = threads[activeChannel] ?? [];
  const typing = getActiveTyping(clock, deliveredScheduledIds).find(
    event => event.channelId === activeChannel,
  );

  useEffect(() => {
    setBadges(prev => {
      if (!prev[activeChannel]) return prev;
      const next = { ...prev };
      delete next[activeChannel];
      return next;
    });
  }, [activeChannel]);

  useEffect(() => {
    if (!clock.isPaused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clock.isPaused, togglePause]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore detection runs from current thread state on each clock tick.
  useEffect(() => {
    const ignored = detectIgnored(
      Object.entries(threads).flatMap(([channelId, items]) =>
        items.flatMap(item => {
          if (!("kind" in item) || item.kind !== "action_request") return [];
          return [{ channelId, action: item }];
        }),
      ),
      clock,
    );
    for (const item of ignored) {
      handleIgnore(item.actionId, item.channelId, item.ignoredAtTotalSeconds);
    }
  }, [clock, threads]);

  useEffect(() => {
    if (clock.isPaused) return;
    const due = getDueScheduledMessages(clock, deliveredScheduledIds);
    if (due.length === 0) return;

    setThreads(prev => {
      const next = { ...prev };
      const deliveredAtTotalSeconds = clockTotalElapsedSeconds(clock);
      for (const event of due) {
        next[event.channelId] = [
          ...(next[event.channelId] ?? []),
          stampActionRequest(event.message, deliveredAtTotalSeconds),
        ];
      }
      return next;
    });
    setBadges(prev => {
      const next = { ...prev };
      for (const event of due) {
        if (event.channelId === activeChannel) continue;
        next[event.channelId] = (next[event.channelId] ?? 0) + 1;
      }
      return next;
    });
    playSfx("chatNewMessage");
    const runId = runIdRef.current;
    if (runId) {
      const deliveredAtTotalSeconds = clockTotalElapsedSeconds(clock);
      for (const event of due) {
        void persistMessage(
          runId,
          event.channelId,
          stampActionRequest(event.message, deliveredAtTotalSeconds),
        );
      }
    }
    setDeliveredScheduledIds(prev => {
      const next = new Set(prev);
      for (const event of due) next.add(event.id);
      return next;
    });
  }, [activeChannel, clock, deliveredScheduledIds]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hydrated = await hydrateActiveRun();
      if (cancelled) return;
      runIdRef.current = hydrated.run.id;
      if (hydrated.state) {
        replaceClockRef.current(hydrated.state.clock);
        if (autoResumeOnHydrateRef.current) resumeClockRef.current();
        setActiveChannel(hydrated.state.workspace.activeChannel);
        setBadges(hydrated.state.workspace.badges);
        setReactions(hydrated.state.workspace.reactions);
        setDeliveredScheduledIds(hydrated.state.deliveredEventIds);
      }
      if (hydrated.state?.threads && Object.keys(hydrated.state.threads).length > 0) {
        setThreads(hydrated.state.threads);
      } else {
        seedInitialMessages(hydrated.run.id, stampThreads(THREADS, 0));
      }
      if (hydrated.warnings.length > 0)
        console.warn("Persistence hydrate warnings", hydrated.warnings);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clock.isDayEnded || dayEndAlarmDayRef.current === clock.day) return;
    dayEndAlarmDayRef.current = clock.day;
    playSfx("dayEndAlarm");
    const runId = runIdRef.current;
    if (runId) void saveSnapshot(runId, snapshotInputRef.current);
  }, [clock.day, clock.isDayEnded]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const handle = await getDuckDB();
      if (cancelled) return;
      await rebuildDataset({ handle, day: clock.day, facts: useFactsStore.getState() });
      const runId = runIdRef.current;
      if (runId) {
        await saveSnapshot(runId, snapshotInputRef.current);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clock.day]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const runId = runIdRef.current;
      if (runId) {
        void saveSnapshot(runId, snapshotInputRef.current);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <div className="df-app">
      <header className="df-titlebar">
        <div className="title">
          <span>
            {t("app.brandLine1")} {t("app.brandLine2")}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 1,
              opacity: 0.7,
            }}
          >
            {t("app.subtitle")}
          </span>
        </div>
        <div className="meta">
          <span className="meta-item">
            <Calendar width={14} height={14} aria-hidden="true" />
            <span>{dayLabel(clock)}</span>
          </span>
          <span className="meta-item">
            <Clock width={14} height={14} aria-hidden="true" />
            <span>{formatGameTime(clock)}</span>
          </span>
          <span className="meta-item">{t("header.askAi", { used: aiUsed, total: aiTotal })}</span>
        </div>
      </header>
      <main className="df-main">
        <Sidebar
          activeId={activeChannel}
          badges={badges}
          clock={clock}
          playerAvatarUrl={playerAvatarUrl}
          onSelect={setActiveChannel}
          onEditPlayerAvatar={() => setIsAvatarEditorOpen(true)}
        />
        <ChatPanel
          channelId={activeChannel}
          thread={thread}
          reactions={reactions}
          playerAvatarUrl={playerAvatarUrl}
          onEditPlayerAvatar={() => setIsAvatarEditorOpen(true)}
          onAccept={handleAccept}
          onReject={handleReject}
          onToggleReaction={handleToggleReaction}
          typingPersonId={typing?.personId}
        />
        <WorkArea
          clockApi={clockApi}
          playerAvatarUrl={playerAvatarUrl}
          onSubmitTask={handleSubmitTask}
        />
      </main>
      <StatusBar
        clock={clock}
        channelLabel={channelLabel}
        settings={settings}
        onTogglePause={togglePause}
      />
      {isAvatarEditorOpen && (
        <AvatarUploadModal
          currentAvatarUrl={playerAvatarUrl}
          onClose={() => setIsAvatarEditorOpen(false)}
          onSave={handleSavePlayerAvatar}
        />
      )}
      {clock.isPaused && !clock.isDayEnded && (
        <button
          type="button"
          className="df-overlay df-pause"
          onClick={togglePause}
          aria-label={t("status.resume")}
        >
          <span className="df-pause-title">{t("status.pausedTitle")}</span>
          <span className="df-pause-sub">{t("status.pausedHint")}</span>
          <span className="df-pause-resume">{t("status.resume")}</span>
        </button>
      )}
      {clock.isDayEnded && (
        <div className="df-modal-backdrop" role="presentation">
          <section className="df-day-end-modal" role="dialog" aria-modal="true">
            <div className="df-day-end-kicker">{dayLabel(clock)}</div>
            <h2>{t("dayEnd.title")}</h2>
            <p>{clock.day < MAX_STORY_DAY ? t("dayEnd.subtitle") : t("dayEnd.weekComplete")}</p>
            {clock.day < MAX_STORY_DAY ? (
              <button type="button" className="df-day-end-next" onClick={nextDay}>
                {t("dayEnd.nextDay")}
              </button>
            ) : (
              <span className="df-day-end-next is-disabled">{t("dayEnd.weekLocked")}</span>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function getDebugStartElapsedSeconds(): number | undefined {
  const debugTime = new URLSearchParams(window.location.search).get("debugTime");
  if (!debugTime) return undefined;
  return gameTimeToElapsedSeconds(debugTime);
}

function seedInitialMessages(runId: string, threads: Record<string, ChatItem[]>): void {
  for (const [channelId, items] of Object.entries(threads)) {
    for (const item of items) void persistMessage(runId, channelId, item);
  }
}
