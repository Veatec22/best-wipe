import type { ActionStatus, ChatItem } from "../../data/messages";
import type { AppliedEffectLogEntry } from "../../game/coreLoop/applyEffects";
import type { ScoringEvent } from "../../game/scoring/scoringTypes";
import type { TaskInstance, TaskSubmission } from "../../game/tasks/taskTypes";
import type { QueryResult } from "../duckdb/queryRunner";
import { touchRun } from "./runs";
import { db } from "./schema";

export async function persistMessage(
  runId: string,
  channelId: string,
  item: ChatItem,
): Promise<void> {
  const now = new Date().toISOString();
  await db.messages.put({
    id: `${runId}:message:${channelId}:${item.id}`,
    runId,
    channelId,
    messageId: item.id,
    createdAt: now,
    item,
  });
  if ("kind" in item && item.kind === "action_request") {
    await db.action_requests.put({
      id: `${runId}:action:${item.id}`,
      runId,
      channelId,
      actionId: item.id,
      status: item.status ?? "pending",
      updatedAt: now,
    });
  }
}

export async function persistActionStatus(
  runId: string,
  channelId: string,
  actionId: string,
  status: Exclude<ActionStatus, "pending">,
): Promise<void> {
  await db.action_requests.put({
    id: `${runId}:action:${actionId}`,
    runId,
    channelId,
    actionId,
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function persistTask(runId: string, task: TaskInstance): Promise<void> {
  await db.tasks.put({
    id: `${runId}:task:${task.id}`,
    runId,
    taskId: task.id,
    updatedAt: new Date().toISOString(),
    task,
  });
}

export async function persistSubmission(runId: string, submission: TaskSubmission): Promise<void> {
  await db.submissions.add({
    id: `${runId}:submission:${submission.id}`,
    runId,
    taskId: submission.taskId,
    createdAt: submission.submittedAt,
    submission,
  });
}

export async function persistScoringEvent(runId: string, event: ScoringEvent): Promise<void> {
  await db.events.add({
    id: `${runId}:event:${event.id}`,
    runId,
    type: "scoring_event",
    createdAt: event.appliedAt,
    payload: { event },
  });
  await touchRun(runId);
}

export async function persistAppliedEffect(
  runId: string,
  event: AppliedEffectLogEntry,
): Promise<void> {
  const now = new Date().toISOString();
  await db.events.add({
    id: `${runId}:event:${crypto.randomUUID()}`,
    runId,
    type: `effect:${event.type}`,
    createdAt: now,
    payload: { event },
  });
}

export async function persistQueryRun(
  runId: string,
  input: { sql: string; result: QueryResult; taskId?: string },
): Promise<void> {
  const now = new Date().toISOString();
  const queryRunId = crypto.randomUUID();
  const previewId = `${queryRunId}:preview`;
  await db.transaction("rw", db.query_runs, db.query_result_previews, async () => {
    await db.query_runs.add({
      id: queryRunId,
      runId,
      taskId: input.taskId,
      sql: input.sql,
      createdAt: now,
      resultPreviewId: previewId,
    });
    await db.query_result_previews.add({
      id: previewId,
      runId,
      queryRunId,
      createdAt: now,
      result: input.result,
    });
  });
}
