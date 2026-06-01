import type { PersonId } from "../../data/people";
import type { ValidationSeverity } from "../tasks/taskTypes";

/**
 * Hidden run-wide stats. Per spec they stay invisible until the cyclic
 * review (Day 7 for MVP) — so the player only ever reads descriptive bands
 * in-fiction. Numbers exist for the engine and for the debug / admin panel.
 *
 * `reputation` is the *global* aggregate. Per-person reputation lives in
 * `ScoringState.reputationByPerson` because tribe / individual relationships
 * matter independently (Kuba ≠ Ola ≠ CEO).
 */
export interface Stats {
  accuracy: number;
  speed: number;
  reputation: number;
}

export const ZERO_STATS: Stats = { accuracy: 0, speed: 0, reputation: 0 };

/**
 * Speed bucket derived from `(elapsedSinceAcceptSeconds / expectedSeconds)`.
 * Per the design doc, "speed" is one of the hidden axes that NPC patience
 * and weekly review depend on — but the player never sees the raw number.
 */
export type SpeedBucket = "fast" | "on_time" | "slow" | "late";

export interface ScoringDelta {
  accuracy: number;
  speed: number;
  /** Applied to the global `Stats.reputation`. */
  reputationGlobal: number;
  /** Applied to `reputationByPerson[reputationTarget]`. Defaults to requester. */
  reputationPersonId: PersonId;
  reputationPerson: number;
  speedBucket: SpeedBucket;
  /** Free-text breakdown for the admin panel ("severity=major_issue ×1.2"). */
  reason: string;
}

export interface ScoringEvent extends ScoringDelta {
  id: string;
  taskId: string;
  taskTitle: string;
  submissionId: string;
  severity: ValidationSeverity;
  /** Real-world wall-clock at apply time. */
  appliedAt: string;
  /** Optional in-game label ("DAY 01 · 09:42"). */
  gameTimeLabel?: string;
  /** Real seconds between accept and submit. */
  elapsedSeconds: number;
  /** What the task expected (seconds). */
  expectedSeconds: number;
}
