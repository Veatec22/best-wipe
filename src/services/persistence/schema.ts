import Dexie, { type Table } from "dexie";
import type { ChatItem } from "../../data/messages";
import type { ReactionsByMessage } from "../../data/reactions";
import type { GameClock } from "../../game/clock";
import type { SerializedFacts } from "../../game/facts";
import type { ScoringEvent, Stats } from "../../game/scoring/scoringTypes";
import type { TaskInstance, TaskSubmission } from "../../game/tasks/taskTypes";
import type { QueryResult } from "../duckdb/queryRunner";

export const CONTENT_VERSION = "week1-mvp-v1";
export const DEFAULT_SNAPSHOT_RETENTION = 7;

export interface RunRecord {
  id: string;
  label: string;
  status: "active" | "archived";
  contentVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSnapshotRecord {
  id: string;
  runId: string;
  createdAt: string;
  sequence: number;
  snapshot: SaveSnapshot;
}

export interface SaveSnapshot {
  contentVersion: string;
  currentDay: number;
  currentTime: string;
  clock: GameClock;
  facts: SerializedFacts;
  scoring: {
    stats: Stats;
    reputationByPerson: Record<string, number>;
    events: ScoringEvent[];
  };
  deliveredEventIds: string[];
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
}

export interface ChannelRecord {
  id: string;
  runId: string;
  channelId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  runId: string;
  channelId: string;
  messageId: string;
  createdAt: string;
  item: ChatItem;
}

export interface ActionRequestRecord {
  id: string;
  runId: string;
  channelId: string;
  actionId: string;
  status: "pending" | "accepted" | "rejected" | "ignored";
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  runId: string;
  taskId: string;
  updatedAt: string;
  task: TaskInstance;
}

export interface WorkspaceTabRecord {
  id: string;
  runId: string;
  tabId: string;
  updatedAt: string;
  state: Record<string, unknown>;
}

export interface QueryRunRecord {
  id: string;
  runId: string;
  taskId?: string;
  sql: string;
  createdAt: string;
  resultPreviewId?: string;
}

export interface QueryResultPreviewRecord {
  id: string;
  runId: string;
  queryRunId: string;
  createdAt: string;
  result: QueryResult;
}

export interface SubmissionRecord {
  id: string;
  runId: string;
  taskId: string;
  createdAt: string;
  submission: TaskSubmission;
}

export interface SavedQueryRecord {
  id: string;
  runId: string;
  title: string;
  sql: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: string;
  runId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRecord {
  id: string;
  runId: string;
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface SettingRecord {
  id: string;
  runId: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

export class DataFeverDatabase extends Dexie {
  runs!: Table<RunRecord, string>;
  save_snapshots!: Table<SaveSnapshotRecord, string>;
  channels!: Table<ChannelRecord, string>;
  messages!: Table<MessageRecord, string>;
  action_requests!: Table<ActionRequestRecord, string>;
  tasks!: Table<TaskRecord, string>;
  workspace_tabs!: Table<WorkspaceTabRecord, string>;
  query_runs!: Table<QueryRunRecord, string>;
  query_result_previews!: Table<QueryResultPreviewRecord, string>;
  submissions!: Table<SubmissionRecord, string>;
  saved_queries!: Table<SavedQueryRecord, string>;
  notes!: Table<NoteRecord, string>;
  events!: Table<EventRecord, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super("data-fever");
    this.version(1).stores({
      runs: "id, status, updatedAt, contentVersion",
      save_snapshots: "id, runId, [runId+sequence], createdAt",
      channels: "id, runId, channelId, [runId+channelId]",
      messages: "id, runId, channelId, messageId, createdAt, [runId+channelId]",
      action_requests: "id, runId, actionId, status, [runId+actionId]",
      tasks: "id, runId, taskId, [runId+taskId]",
      workspace_tabs: "id, runId, tabId, [runId+tabId]",
      query_runs: "id, runId, taskId, createdAt",
      query_result_previews: "id, runId, queryRunId, createdAt",
      submissions: "id, runId, taskId, createdAt",
      saved_queries: "id, runId, title, updatedAt",
      notes: "id, runId, title, updatedAt",
      events: "id, runId, type, createdAt",
      settings: "id, runId, key, [runId+key]",
    });
  }
}

export const db = new DataFeverDatabase();
