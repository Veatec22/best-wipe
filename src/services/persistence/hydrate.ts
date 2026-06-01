import type { ActionRequest, ChatItem } from "../../data/messages";
import { gameTimeToElapsedSeconds } from "../../game/clock";
import { FACTS, type FactKey, type FactValueOf, type SerializedFacts } from "../../game/facts";
import { SCHEDULED_MESSAGE_EVENTS } from "../../game/scheduledMessages";
import { TASK_DEFINITIONS } from "../../game/tasks/registry";
import { rebuildDataset } from "../duckdb/datasetLoader";
import { getDuckDB } from "../duckdb/duckdbClient";
import { applyRunStateToStores, type RunState } from "./runState";
import { getOrCreateActiveRun } from "./runs";
import { loadLatestSnapshot } from "./saveSnapshot";
import {
  type ActionRequestRecord,
  CONTENT_VERSION,
  db,
  type RunRecord,
  type SaveSnapshot,
} from "./schema";

export interface HydratedRun {
  run: RunRecord;
  snapshot?: SaveSnapshot;
  state?: RunState;
  warnings: string[];
}

export async function hydrateActiveRun(): Promise<HydratedRun> {
  const run = await getOrCreateActiveRun();
  const snapshotRecord = await loadLatestSnapshot(run.id);
  const snapshot = snapshotRecord?.snapshot;
  const warnings: string[] = [];

  if (snapshot) {
    if (snapshot.contentVersion !== CONTENT_VERSION) {
      warnings.push(
        `contentVersion mismatch: snapshot=${snapshot.contentVersion}, current=${CONTENT_VERSION}`,
      );
    }
  }

  const [messages, actionRequests, submissions, tasks] = await Promise.all([
    db.messages.where("runId").equals(run.id).sortBy("createdAt"),
    db.action_requests.where("runId").equals(run.id).toArray(),
    db.submissions.where("runId").equals(run.id).sortBy("createdAt"),
    db.tasks.where("runId").equals(run.id).sortBy("updatedAt"),
  ]);

  const state = snapshot
    ? ({
        contentVersion: CONTENT_VERSION,
        clock: { ...snapshot.clock, isPaused: true },
        facts: sanitizeFacts(snapshot.facts, warnings),
        scoring: snapshot.scoring,
        deliveredEventIds: pruneDeliveredEventIds(
          new Set(snapshot.deliveredEventIds),
          snapshot,
          warnings,
        ),
        workspace: snapshot.workspace,
        tasks: Object.fromEntries(
          tasks
            .filter(record => {
              const known = Boolean(TASK_DEFINITIONS[record.taskId]);
              if (!known) warnings.push(`Unknown task skipped during hydrate: ${record.taskId}`);
              return known;
            })
            .map(record => [record.taskId, record.task]),
        ),
        submissions: Object.fromEntries(
          submissions.map(record => [record.submission.id, record.submission]),
        ),
        threads: overlayActionRequestStatuses(groupMessages(messages), actionRequests),
      } satisfies RunState)
    : undefined;

  if (state) {
    applyRunStateToStores(state);
  }

  const handle = await getDuckDB();
  await rebuildDataset({
    handle,
    day: state?.clock.day ?? 1,
    facts: {
      get: key => state?.facts[key] as FactValueOf<typeof key> | undefined,
    },
  });

  return { run, snapshot, state, warnings };
}

function pruneDeliveredEventIds(
  deliveredIds: Set<string>,
  snapshot: SaveSnapshot,
  warnings: string[],
): Set<string> {
  const knownEvents = new Map(SCHEDULED_MESSAGE_EVENTS.map(event => [event.id, event]));
  const pruned = new Set<string>();
  for (const id of deliveredIds) {
    const event = knownEvents.get(id);
    if (!event) {
      warnings.push(`Unknown delivered event dropped during hydrate: ${id}`);
      continue;
    }
    if (event.day < snapshot.clock.day) {
      pruned.add(id);
      continue;
    }
    if (
      event.day === snapshot.clock.day &&
      gameTimeToElapsedSeconds(event.time, snapshot.clock.dayDurationSeconds) <=
        snapshot.clock.elapsedTodaySeconds
    ) {
      pruned.add(id);
    }
  }
  return pruned;
}

function overlayActionRequestStatuses(
  threads: Record<string, ChatItem[]>,
  actionRequests: ActionRequestRecord[],
): Record<string, ChatItem[]> {
  const statuses = new Map(actionRequests.map(record => [record.actionId, record.status]));
  return Object.fromEntries(
    Object.entries(threads).map(([channelId, items]) => [
      channelId,
      items.map(item => {
        if (!("kind" in item) || item.kind !== "action_request") return item;
        const status = statuses.get(item.id);
        if (!status) return item;
        return { ...item, status } satisfies ActionRequest;
      }),
    ]),
  );
}

function sanitizeFacts(facts: SerializedFacts, warnings: string[]): SerializedFacts {
  const known: SerializedFacts = {};
  for (const [key, value] of Object.entries(facts)) {
    if (key in FACTS) {
      known[key as FactKey] = value;
    } else {
      warnings.push(`Unknown fact dropped during hydrate: ${key}`);
    }
  }
  return known;
}

function groupMessages(
  records: { channelId: string; item: ChatItem }[],
): Record<string, ChatItem[]> {
  const grouped: Record<string, ChatItem[]> = {};
  for (const record of records) {
    grouped[record.channelId] = [...(grouped[record.channelId] ?? []), record.item];
  }
  return grouped;
}
