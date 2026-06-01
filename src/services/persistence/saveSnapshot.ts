import type { ChatItem } from "../../data/messages";
import type { ReactionsByMessage } from "../../data/reactions";
import type { GameClock } from "../../game/clock";
import { type RunState, readRuntimeRunState, snapshotFromRunState } from "./runState";
import {
  DEFAULT_SNAPSHOT_RETENTION,
  db,
  type SaveSnapshot,
  type SaveSnapshotRecord,
} from "./schema";

export interface CreateSnapshotInput {
  clock: GameClock;
  activeChannel: string;
  badges: Record<string, number>;
  reactions: ReactionsByMessage;
  deliveredEventIds: ReadonlySet<string>;
  threads: Record<string, ChatItem[]>;
}

export async function saveSnapshot(
  runId: string,
  input: CreateSnapshotInput,
  retention = DEFAULT_SNAPSHOT_RETENTION,
): Promise<SaveSnapshotRecord> {
  const snapshot = createSaveSnapshot(readRuntimeRunState(input));
  const sequence = Date.now();
  const record: SaveSnapshotRecord = {
    id: `${runId}:snapshot:${sequence}`,
    runId,
    sequence,
    createdAt: new Date(sequence).toISOString(),
    snapshot,
  };

  await db.transaction("rw", db.save_snapshots, db.runs, async () => {
    await db.save_snapshots.add(record);
    await pruneSnapshots(runId, retention);
    await db.runs.update(runId, { updatedAt: record.createdAt });
  });

  return record;
}

export function createSaveSnapshot(state: RunState): SaveSnapshot {
  return snapshotFromRunState(state);
}

export async function loadLatestSnapshot(runId: string): Promise<SaveSnapshotRecord | undefined> {
  const records = (await db.save_snapshots.where("runId").equals(runId).toArray()).sort(
    (a, b) => b.sequence - a.sequence,
  );
  return records[0];
}

async function pruneSnapshots(runId: string, retention: number): Promise<void> {
  const records = (await db.save_snapshots.where("runId").equals(runId).toArray())
    .sort((a, b) => b.sequence - a.sequence)
    .slice(retention);
  if (records.length > 0) await db.save_snapshots.bulkDelete(records.map(record => record.id));
}
