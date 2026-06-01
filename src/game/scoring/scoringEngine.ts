import type { PersonId } from "../../data/people";
import type { TaskDefinition, ValidationSeverity } from "../tasks/taskTypes";
import type { ScoringDelta, SpeedBucket } from "./scoringTypes";

/* -------------------------------------------------------------------------- */
/*  Tunables                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Per-severity baseline. `accuracy` and `reputation` move on quality;
 * `speed` is layered on top from the speed bucket.
 *
 * Numbers are intentionally small and additive — over a 7-day Week 1 run
 * we expect roughly ±50 swing on each axis, well within the descriptive
 * band ranges shown at Day 7 review.
 */
const BASE_BY_SEVERITY: Record<ValidationSeverity, { accuracy: number; reputation: number }> = {
  success: { accuracy: +5, reputation: +3 },
  minor_issue: { accuracy: +2, reputation: +1 },
  major_issue: { accuracy: -3, reputation: -1 },
  wrong_request: { accuracy: -5, reputation: -3 },
  critical_fail: { accuracy: -12, reputation: -8 },
};

/**
 * Speed delta per bucket. We deliberately decouple speed from quality: a
 * fast wrong answer still hurts accuracy, but the speed axis acknowledges
 * the player at least closed the loop quickly.
 */
const SPEED_BY_BUCKET: Record<SpeedBucket, number> = {
  fast: +3,
  on_time: +1,
  slow: -1,
  late: -3,
};

/** Default expected duration if a task didn't declare one (in seconds). */
export const DEFAULT_EXPECTED_SECONDS = 240; // ~4 min real time

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function computeSpeedBucket(elapsedSeconds: number, expectedSeconds: number): SpeedBucket {
  if (expectedSeconds <= 0) return "on_time";
  const ratio = elapsedSeconds / expectedSeconds;
  if (ratio <= 0.5) return "fast";
  if (ratio <= 1.0) return "on_time";
  if (ratio <= 1.75) return "slow";
  return "late";
}

interface ComputeDeltaInput {
  def: TaskDefinition;
  severity: ValidationSeverity;
  elapsedSeconds: number;
}

/**
 * Pure function — same inputs produce the same delta. The caller is
 * responsible for actually applying it to the scoring store. This keeps
 * the engine deterministic / unit-testable.
 */
export function computeScoringDelta({
  def,
  severity,
  elapsedSeconds,
}: ComputeDeltaInput): ScoringDelta {
  const weight = def.scoring?.weight ?? 1;
  const expectedSeconds = def.scoring?.expectedSeconds ?? DEFAULT_EXPECTED_SECONDS;
  const targetPerson: PersonId = def.scoring?.reputationTarget ?? def.fromPersonId;

  const base = BASE_BY_SEVERITY[severity];
  const bucket = computeSpeedBucket(elapsedSeconds, expectedSeconds);
  const speedBase = SPEED_BY_BUCKET[bucket];

  const accuracy = round1(base.accuracy * weight);
  const reputationGlobal = round1(base.reputation * weight);
  const reputationPerson = round1(base.reputation * weight);
  // Speed is not weighted: a fast bad answer is still fast. Penalty for
  // bad answers comes through accuracy/reputation channels.
  const speed = speedBase;

  return {
    accuracy,
    speed,
    reputationGlobal,
    reputationPersonId: targetPerson,
    reputationPerson,
    speedBucket: bucket,
    reason:
      `severity=${severity} ×${weight} · ` +
      `speed=${bucket} (${Math.round(elapsedSeconds)}s / expected ${expectedSeconds}s)`,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
