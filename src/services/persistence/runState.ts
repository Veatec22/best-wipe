import type { ChatItem } from "../../data/messages";
import type { ReactionsByMessage } from "../../data/reactions";
import { formatGameTime, type GameClock } from "../../game/clock";
import type { SerializedFacts } from "../../game/facts";
import type { ScoringEvent, Stats } from "../../game/scoring/scoringTypes";
import type { TaskInstance, TaskSubmission } from "../../game/tasks/taskTypes";
import { useFactsStore } from "../../store/factsStore";
import { useScoringStore } from "../../store/scoringStore";
import { useSqlWorkspaceStore } from "../../store/sqlWorkspaceStore";
import { useSubmissionsStore } from "../../store/submissionsStore";
import { useTasksStore } from "../../store/tasksStore";
import type { QueryResult } from "../duckdb/queryRunner";
import { CONTENT_VERSION, type SaveSnapshot } from "./schema";

export interface RunState {
  contentVersion: string;
  clock: GameClock;
  facts: SerializedFacts;
  scoring: {
    stats: Stats;
    reputationByPerson: Record<string, number>;
    events: ScoringEvent[];
  };
  deliveredEventIds: Set<string>;
  workspace: {
    activeChannel: string;
    badges: Record<string, number>;
    reactions: ReactionsByMessage;
    sqlScratchpad: {
      sql: string;
      result: QueryResult | null;
    };
    activeTaskId: string | null;
  };
  tasks: Record<string, TaskInstance>;
  submissions: Record<string, TaskSubmission>;
  threads: Record<string, ChatItem[]>;
}

export interface ReadRunStateInput {
  clock: GameClock;
  activeChannel: string;
  badges: Record<string, number>;
  reactions: ReactionsByMessage;
  deliveredEventIds: ReadonlySet<string>;
  threads: Record<string, ChatItem[]>;
}

export function readRuntimeRunState(input: ReadRunStateInput): RunState {
  const scoring = useScoringStore.getState();
  const sqlWorkspace = useSqlWorkspaceStore.getState();
  const tasks = useTasksStore.getState();
  return {
    contentVersion: CONTENT_VERSION,
    clock: { ...input.clock, isPaused: true },
    facts: useFactsStore.getState().values,
    scoring: {
      stats: scoring.stats,
      reputationByPerson: scoring.reputationByPerson,
      events: scoring.events,
    },
    deliveredEventIds: new Set(input.deliveredEventIds),
    workspace: {
      activeChannel: input.activeChannel,
      badges: input.badges,
      reactions: input.reactions,
      sqlScratchpad: {
        sql: sqlWorkspace.sql,
        result: sqlWorkspace.result,
      },
      activeTaskId: tasks.activeTaskId,
    },
    tasks: tasks.tasks,
    submissions: useSubmissionsStore.getState().byId,
    threads: input.threads,
  };
}

export function applyRunStateToStores(state: RunState): void {
  useFactsStore.getState().replace(state.facts);
  useScoringStore.getState().replace({
    stats: state.scoring.stats,
    reputationByPerson: state.scoring.reputationByPerson,
    events: state.scoring.events,
  });
  useSqlWorkspaceStore.getState().replace(state.workspace.sqlScratchpad);
  useTasksStore.getState().replace({
    tasks: state.tasks,
    activeTaskId: state.workspace.activeTaskId,
  });
  useSubmissionsStore.getState().replace(Object.values(state.submissions));
}

export function snapshotFromRunState(state: RunState): SaveSnapshot {
  return {
    contentVersion: state.contentVersion,
    currentDay: state.clock.day,
    currentTime: formatGameTime(state.clock),
    clock: state.clock,
    facts: state.facts,
    scoring: state.scoring,
    deliveredEventIds: [...state.deliveredEventIds],
    workspace: state.workspace,
  };
}
