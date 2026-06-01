import { create } from "zustand";
import type { TaskSubmission } from "../game/tasks/taskTypes";

/**
 * Long-term store of every SEND attempt across all tasks.
 *
 * Why a separate store?
 *  - chat messages reference submissions by id (`submissionId` on
 *    `TaskSubmissionMessage`); the chat itself stays small and
 *    serialization-friendly.
 *  - submissions are append-only; never edited after the fact.
 *  - persisting to localStorage today means the chat "Pokaż kod / wynik"
 *    buttons survive a refresh. The same shape will move to a Dexie
 *    `submissions` table per the architecture doc, with the store reduced
 *    to a hot cache.
 */
interface SubmissionsState {
  byId: Record<string, TaskSubmission>;
  add(submission: TaskSubmission): void;
  get(id: string): TaskSubmission | undefined;
  replace(submissions: readonly TaskSubmission[]): void;
  /** Wipe everything. Useful for the dev "reset run" flow. */
  reset(): void;
}

export const useSubmissionsStore = create<SubmissionsState>((set, getState) => ({
  byId: {},
  add: submission => set(state => ({ byId: { ...state.byId, [submission.id]: submission } })),
  get: id => getState().byId[id],
  replace: submissions =>
    set({ byId: Object.fromEntries(submissions.map(submission => [submission.id, submission])) }),
  reset: () => set({ byId: {} }),
}));

/** Module-level helper for callers that don't want to subscribe. */
export function getSubmission(id: string): TaskSubmission | undefined {
  return useSubmissionsStore.getState().byId[id];
}
