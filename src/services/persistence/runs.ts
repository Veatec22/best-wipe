import { CONTENT_VERSION, db, type RunRecord } from "./schema";

const ACTIVE_RUN_SETTING_ID = "global:activeRunId";
let activeRunId: string | null = null;

export async function getOrCreateActiveRun(): Promise<RunRecord> {
  const setting = await db.settings.get(ACTIVE_RUN_SETTING_ID);
  if (typeof setting?.value === "string") {
    const existing = await db.runs.get(setting.value);
    if (existing?.status === "active") {
      activeRunId = existing.id;
      return existing;
    }
  }
  return createRun("Week 1");
}

export async function createRun(label: string): Promise<RunRecord> {
  const now = new Date().toISOString();
  const run: RunRecord = {
    id: crypto.randomUUID(),
    label,
    status: "active",
    contentVersion: CONTENT_VERSION,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction("rw", db.runs, db.settings, async () => {
    await db.runs.add(run);
    await db.settings.put({
      id: ACTIVE_RUN_SETTING_ID,
      runId: run.id,
      key: "activeRunId",
      value: run.id,
      updatedAt: now,
    });
  });
  activeRunId = run.id;
  return run;
}

export async function archiveRun(runId: string): Promise<void> {
  await db.runs.update(runId, { status: "archived", updatedAt: new Date().toISOString() });
}

export async function touchRun(runId: string): Promise<void> {
  await db.runs.update(runId, { updatedAt: new Date().toISOString() });
}

export function getActiveRunId(): string | null {
  return activeRunId;
}
