import type { ActionRequest, ChatItem } from "../../data/messages";
import type { QueryResult } from "../../services/duckdb/queryRunner";
import type { CampaignEffect } from "../campaign/types";
import { clockTotalElapsedSeconds, dayLabel, formatGameTime, type GameClock } from "../clock";
import type { BooleanFactKey } from "../facts";
import { computeScoringDelta } from "../scoring/scoringEngine";
import type { ScoringEvent } from "../scoring/scoringTypes";
import type { TaskDefinition, TaskInstance, TaskStatus, TaskSubmission } from "../tasks/taskTypes";
import { isPassingOutcome, runValidation } from "../tasks/validationEngine";

const DEFAULT_IGNORE_EXPIRES_AFTER_SECONDS = 8 * 60;

export interface CoreLoopIdGenerator {
  submission(taskId: string, nowMs: number): string;
  submissionMessage(taskId: string, nowMs: number): string;
  replyMessage(taskId: string, nowMs: number): string;
  scoringEvent(submissionId: string): string;
}

export const defaultCoreLoopIdGenerator: CoreLoopIdGenerator = {
  submission: (taskId, nowMs) => `sub_${taskId}_${nowMs}`,
  submissionMessage: (taskId, nowMs) => `${taskId}:send:${nowMs}`,
  replyMessage: (taskId, nowMs) => `${taskId}:reply:${nowMs + 1}`,
  scoringEvent: submissionId => `score_${submissionId}`,
};

export interface AcceptInput {
  actionId: string;
  channelId: string;
  replyText: string;
  acceptedAtTotalSeconds: number;
  taskDefinition?: TaskDefinition;
  now: () => number;
}

export interface AcceptResult {
  action: {
    actionId: string;
    channelId: string;
    status: "accepted";
    replyText: string;
    replyTime: string;
  };
  acceptedTask?: {
    id: string;
    initialSql: string;
    acceptedAtTotalSeconds: number;
  };
  worldEffects: CampaignEffect[];
}

export interface RejectInput {
  actionId: string;
  channelId: string;
  replyText: string;
  now: () => number;
}

export interface RejectResult {
  action: {
    actionId: string;
    channelId: string;
    status: "rejected";
    replyText: string;
    replyTime: string;
  };
  worldEffects: CampaignEffect[];
}

export interface IgnoreInput {
  actionId: string;
  channelId: string;
  ignoredAtTotalSeconds: number;
}

export interface IgnoreResult {
  action: {
    actionId: string;
    channelId: string;
    status: "ignored";
    ignoredAtTotalSeconds: number;
  };
  worldEffects: CampaignEffect[];
}

export interface ActiveActionRequest {
  channelId: string;
  action: ActionRequest;
}

export interface SubmissionInput {
  taskId: string;
  def: TaskDefinition;
  task: TaskInstance;
  clock: GameClock;
  runQuery(sql: string): Promise<QueryResult>;
  now: () => number;
  idGen?: CoreLoopIdGenerator;
  submissionCoverText: string;
}

export interface ChatAppend {
  channelId: string;
  message: ChatItem;
}

export interface SubmitResult {
  taskId: string;
  submission: TaskSubmission;
  newTaskStatus: TaskStatus;
  scoringEvent: ScoringEvent;
  lastResult: QueryResult;
  chatAppends: ChatAppend[];
  worldEffects: CampaignEffect[];
}

export function handleAccept(input: AcceptInput): AcceptResult {
  return {
    action: {
      actionId: input.actionId,
      channelId: input.channelId,
      status: "accepted",
      replyText: input.replyText,
      replyTime: formatRealTimeHHMM(input.now()),
    },
    acceptedTask: input.taskDefinition
      ? {
          id: input.taskDefinition.id,
          initialSql: input.taskDefinition.initialSql,
          acceptedAtTotalSeconds: input.acceptedAtTotalSeconds,
        }
      : undefined,
    worldEffects: [],
  };
}

export function handleReject(input: RejectInput): RejectResult {
  return {
    action: {
      actionId: input.actionId,
      channelId: input.channelId,
      status: "rejected",
      replyText: input.replyText,
      replyTime: formatRealTimeHHMM(input.now()),
    },
    worldEffects: [],
  };
}

export function handleIgnore(input: IgnoreInput): IgnoreResult {
  return {
    action: {
      actionId: input.actionId,
      channelId: input.channelId,
      status: "ignored",
      ignoredAtTotalSeconds: input.ignoredAtTotalSeconds,
    },
    worldEffects: [],
  };
}

export function detectIgnored(
  activeRequests: readonly ActiveActionRequest[],
  clock: GameClock,
): IgnoreInput[] {
  const now = clockTotalElapsedSeconds(clock);
  return activeRequests.flatMap(({ channelId, action }) => {
    if (action.status && action.status !== "pending") return [];
    if (action.deliveredAtTotalSeconds === undefined) return [];
    const expiresAfter = action.hiddenExpiresAfterSeconds ?? DEFAULT_IGNORE_EXPIRES_AFTER_SECONDS;
    if (now < action.deliveredAtTotalSeconds + expiresAfter) return [];
    return [{ actionId: action.id, channelId, ignoredAtTotalSeconds: now }];
  });
}

export async function handleSubmission(input: SubmissionInput): Promise<SubmitResult> {
  const idGen = input.idGen ?? defaultCoreLoopIdGenerator;
  const sentSql = input.task.draftSql;
  const result = await input.runQuery(sentSql);
  const outcome = runValidation(input.def, result, sentSql, input.task.reportConfig);
  const nowMs = input.now();
  const submittedAt = new Date(nowMs).toISOString();
  const gameTimeLabel = `${dayLabel(input.clock)} · ${formatGameTime(input.clock)}`;
  const submissionId = idGen.submission(input.taskId, nowMs);

  const submission: TaskSubmission = {
    id: submissionId,
    taskId: input.taskId,
    submittedAt,
    gameTimeLabel,
    sql: sentSql,
    result,
    reportConfig: input.task.reportConfig,
    outcome,
  };

  const acceptedAt = input.task.acceptedAtTotalSeconds;
  const elapsedSeconds =
    acceptedAt === null ? 0 : Math.max(0, clockTotalElapsedSeconds(input.clock) - acceptedAt);
  const expectedSeconds = input.def.scoring?.expectedSeconds ?? 240;
  const delta = computeScoringDelta({
    def: input.def,
    severity: outcome.severity,
    elapsedSeconds,
  });
  const scoringEvent: ScoringEvent = {
    ...delta,
    id: idGen.scoringEvent(submission.id),
    taskId: input.taskId,
    taskTitle: input.def.title,
    submissionId: submission.id,
    severity: outcome.severity,
    appliedAt: submittedAt,
    gameTimeLabel,
    elapsedSeconds,
    expectedSeconds,
  };

  return {
    taskId: input.taskId,
    submission,
    newTaskStatus: isPassingOutcome(outcome) ? "submitted_ok" : "submitted_bad",
    scoringEvent,
    lastResult: result,
    chatAppends: [
      {
        channelId: input.def.channelId,
        message: {
          id: idGen.submissionMessage(input.def.id, nowMs),
          kind: "task_submission",
          who: "you",
          time: formatRealTimeHHMM(nowMs),
          text: input.submissionCoverText,
          submissionId: submission.id,
        },
      },
      {
        channelId: input.def.channelId,
        message: {
          id: idGen.replyMessage(input.def.id, nowMs),
          who: input.def.fromPersonId,
          time: formatRealTimeHHMM(nowMs),
          text: outcome.reply,
        },
      },
    ],
    worldEffects: outcome.facts.map(createBooleanFactEffect),
  };
}

function createBooleanFactEffect(key: BooleanFactKey): CampaignEffect {
  return { type: "set_fact", key, value: true } as Extract<CampaignEffect, { type: "set_fact" }>;
}

function formatRealTimeHHMM(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}
