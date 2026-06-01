import { create } from "zustand";
import type { ReportChartConfig } from "../game/reports/reportTypes";
import type { TaskInstance, TaskStatus } from "../game/tasks/taskTypes";
import type { QueryResult } from "../services/duckdb/queryRunner";

interface TasksState {
  /** Accepted task instances, keyed by task definition id. */
  tasks: Record<string, TaskInstance>;
  /** Currently focused task tab inside the Zadania pane (null = scratchpad). */
  activeTaskId: string | null;
  acceptTask(input: { id: string; initialSql: string; acceptedAtTotalSeconds: number }): void;
  setActive(id: string | null): void;
  setDraftSql(id: string, sql: string): void;
  setLastResult(id: string, result: QueryResult | null): void;
  setReportConfig(id: string, config: ReportChartConfig | null): void;
  setStatus(id: string, status: TaskStatus): void;
  /** Append a submission id to the task's history. */
  recordSubmission(id: string, submissionId: string): void;
  replace(input: { tasks: Record<string, TaskInstance>; activeTaskId: string | null }): void;
}

const blankInstance = (
  id: string,
  initialSql: string,
  acceptedAtTotalSeconds: number,
): TaskInstance => ({
  id,
  status: "accepted",
  draftSql: initialSql,
  lastResult: null,
  reportConfig: null,
  submissionIds: [],
  acceptedAtTotalSeconds,
});

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: {},
  activeTaskId: null,
  acceptTask: ({ id, initialSql, acceptedAtTotalSeconds }) => {
    const existing = get().tasks[id];
    if (existing) {
      set({ activeTaskId: id });
      return;
    }
    set(state => ({
      tasks: {
        ...state.tasks,
        [id]: blankInstance(id, initialSql, acceptedAtTotalSeconds),
      },
      activeTaskId: id,
    }));
  },
  setActive: id => set({ activeTaskId: id }),
  setDraftSql: (id, sql) =>
    set(state => {
      const t = state.tasks[id];
      if (!t) return state;
      return { tasks: { ...state.tasks, [id]: { ...t, draftSql: sql } } };
    }),
  setLastResult: (id, result) =>
    set(state => {
      const t = state.tasks[id];
      if (!t) return state;
      return { tasks: { ...state.tasks, [id]: { ...t, lastResult: result } } };
    }),
  setReportConfig: (id, config) =>
    set(state => {
      const t = state.tasks[id];
      if (!t) return state;
      return { tasks: { ...state.tasks, [id]: { ...t, reportConfig: config } } };
    }),
  setStatus: (id, status) =>
    set(state => {
      const t = state.tasks[id];
      if (!t) return state;
      return { tasks: { ...state.tasks, [id]: { ...t, status } } };
    }),
  recordSubmission: (id, submissionId) =>
    set(state => {
      const t = state.tasks[id];
      if (!t) return state;
      return {
        tasks: {
          ...state.tasks,
          [id]: { ...t, submissionIds: [...t.submissionIds, submissionId] },
        },
      };
    }),
  replace: input => set(input),
}));
