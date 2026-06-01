import type { PersonId } from "../../data/people";
import type { QueryResult } from "../../services/duckdb/queryRunner";
import type { BooleanFactKey } from "../facts";
import type { ReportChartConfig } from "../reports/reportTypes";

/* -------------------------------------------------------------------------- */
/*  Task lifecycle                                                            */
/* -------------------------------------------------------------------------- */

export type TaskStatus = "accepted" | "submitted_ok" | "submitted_bad";

export interface TaskInstance {
  id: string;
  status: TaskStatus;
  draftSql: string;
  lastResult: QueryResult | null;
  reportConfig: ReportChartConfig | null;
  /** Submission ids in chronological order (most recent last). */
  submissionIds: string[];
  /**
   * Total real-time seconds since run-start when the player accepted this
   * task. Drives the speed bucket at submit time. `null` when the instance
   * is hydrated from persistence and we don't know the original accept
   * moment any more — scoring then falls back to "on_time".
   */
  acceptedAtTotalSeconds: number | null;
}

/* -------------------------------------------------------------------------- */
/*  Validation primitives                                                     */
/*                                                                            */
/*  Mirrors the model in `.context/data_fever_init_discussion.md`:            */
/*    1. result profile (rowCount, columns)                                   */
/*    2. SQL profile  (tables touched — heuristic, no full parser)            */
/*    3. semantic checks (per-task `ValidatorRule`s)                          */
/*    4. severity levels driving NPC reaction + retry cost                    */
/* -------------------------------------------------------------------------- */

export type ValidationSeverity =
  | "success"
  | "minor_issue"
  | "major_issue"
  | "wrong_request"
  | "critical_fail";

/** Cheap structural read of the last query result. */
export interface ResultProfile {
  rowCount: number;
  columns: string[];
}

/**
 * Cheap heuristic read of the SQL the player sent — no full parser.
 *  - `tables` are bare identifiers found after FROM / JOIN.
 *  - `sql` stays raw so heuristics can grep it directly.
 */
export interface SqlProfile {
  sql: string;
  tables: string[];
}

export interface ValidationContext {
  result: QueryResult;
  resultProfile: ResultProfile | null;
  sqlProfile: SqlProfile;
}

export interface ReportValidationContext extends ValidationContext {
  reportConfig: ReportChartConfig | null;
}

export interface ValidatorRule {
  id: string;
  severityOnFail: ValidationSeverity;
  /** NPC line shown if this rule is the first / worst to fail. */
  replyOnFail: string;
  /** Hidden story facts to record on failure (e.g. `sent_users_metric_with_test_accounts`). */
  factsOnFail?: BooleanFactKey[];
  check(ctx: ValidationContext): boolean;
}

export interface ReportValidatorRule {
  id: string;
  severityOnFail: ValidationSeverity;
  /** NPC line shown if this rule is the first / worst to fail. */
  replyOnFail: string;
  /** Hidden story facts to record on failure. */
  factsOnFail?: BooleanFactKey[];
  check(ctx: ReportValidationContext): boolean;
}

export interface ValidationOutcome {
  severity: ValidationSeverity;
  reply: string;
  /** Story facts collected from failed validators (and `factsOnSuccess` if applicable). */
  facts: BooleanFactKey[];
  failedValidatorIds: string[];
  branchId: string;
}

/* -------------------------------------------------------------------------- */
/*  Task definition                                                           */
/* -------------------------------------------------------------------------- */

export interface TaskDefinition {
  id: string;
  kind?: "sql" | "sql_report";
  /** Action request message id in the chat thread that gives this task. */
  fromActionId: string;
  /** Person who requested the task (will post the reply). */
  fromPersonId: PersonId;
  /** Channel where reply goes (usually the requester's DM). */
  channelId: string;
  /** Short title for the task tab. */
  title: string;
  /** Brief shown above the SQL editor. */
  brief: string;
  /** Pre-filled SQL when the task is opened for the first time. */
  initialSql: string;
  /** Branches are tested in insertion order; every task must end with `default`. */
  branches: Record<string, BranchDefinition>;
  /** Per-task tuning for the scoring engine. Defaults are applied if absent. */
  scoring?: TaskScoring;
}

export interface BranchMatcher {
  id: string;
  comment?: string;
  check(ctx: ValidationContext): boolean;
}

export interface BranchDefinition {
  match: BranchMatcher;
  /** Ordered list — engine returns the worst-severity failure. */
  validators: ValidatorRule[];
  /** Extra report checks, evaluated only for `sql_report` tasks. */
  reportValidators?: ReportValidatorRule[];
  /** Reply when this branch matched and every validator passes. */
  successReply: string;
  /** Facts fired whenever this branch is selected, regardless of severity. */
  factsOnBranch?: BooleanFactKey[];
  /** Story facts to set when this branch is completed cleanly. */
  factsOnSuccess?: BooleanFactKey[];
}

/**
 * Scoring tuning attached to a task. All fields optional — a task with no
 * `scoring` block uses the engine defaults (weight 1, expected ~4 min,
 * reputation goes to the requester).
 */
export interface TaskScoring {
  /** Multiplier applied to accuracy + reputation deltas. CEO 2x, lead 1.2x, etc. */
  weight?: number;
  /**
   * Real-world seconds the task is "expected" to take from accept → submit.
   * Below 0.5× = `fast`, ≤ 1× = `on_time`, ≤ 1.75× = `slow`, beyond = `late`.
   */
  expectedSeconds?: number;
  /**
   * Person whose individual reputation should move on submit. Defaults to
   * `fromPersonId`. Useful when a task is delegated through a third party
   * (e.g. PM forwarding a CEO request — rep with the CEO is what counts).
   */
  reputationTarget?: PersonId;
}

/* -------------------------------------------------------------------------- */
/*  Submission record (persisted)                                             */
/* -------------------------------------------------------------------------- */

/**
 * A single SEND attempt. Stored long-term so chat history can always replay
 * exactly what the player sent — independent of subsequent edits to the
 * draft SQL.
 *
 * Currently lives in zustand (with `persist` middleware → localStorage).
 * Future: migrate to Dexie `submissions` table per the architecture doc.
 */
export interface TaskSubmission {
  id: string;
  taskId: string;
  /** Real wall-clock ISO timestamp — for stable ordering across reloads. */
  submittedAt: string;
  /** Game-clock label (e.g. "Day 01 · 09:42") if the caller can compute one. */
  gameTimeLabel?: string;
  /** Exact SQL the player sent. */
  sql: string;
  /** Snapshot of the result at SEND time (rows already truncated by the runner). */
  result: QueryResult;
  /** Snapshot of the chart config sent with a report task. */
  reportConfig?: ReportChartConfig | null;
  outcome: ValidationOutcome;
}
