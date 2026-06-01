import type { QueryResult } from "../../services/duckdb/queryRunner";
import { isValidReportConfig } from "../reports/reportModel";
import type { ReportChartConfig } from "../reports/reportTypes";
import { profileResult, profileSql } from "./sqlProfile";
import type {
  BranchDefinition,
  ReportValidatorRule,
  TaskDefinition,
  ValidationContext,
  ValidationOutcome,
  ValidationSeverity,
  ValidatorRule,
} from "./taskTypes";

/**
 * Severity ranking — higher index = worse outcome. The engine returns the
 * worst-severity failed validator. Mirrors the model in
 * `.context/data_fever_init_discussion.md` ("Proponowany model walidacji").
 */
const SEVERITY_RANK: Record<ValidationSeverity, number> = {
  success: 0,
  minor_issue: 1,
  major_issue: 2,
  wrong_request: 3,
  critical_fail: 4,
};

export function isPassingOutcome(outcome: ValidationOutcome): boolean {
  // Per design: minor_issue still completes the task (NPC accepted, soft flag).
  return outcome.severity === "success" || outcome.severity === "minor_issue";
}

/**
 * Run the first matching branch's validators, returning the worst-severity
 * failure or that branch's `successReply` if everything passes.
 *
 * Why "worst severity" rather than "first failure"? Because validators can
 * be re-ordered freely without changing what the player sees — only the
 * actual badness of the issue matters. Within the same severity, the first
 * matching reply wins (deterministic).
 */
export function runValidation(
  def: TaskDefinition,
  result: QueryResult,
  sql: string,
  reportConfig: ReportChartConfig | null = null,
): ValidationOutcome {
  const ctx: ValidationContext = {
    result,
    resultProfile: profileResult(result),
    sqlProfile: profileSql(sql),
  };

  const [branchId, branch] = selectBranch(def, ctx);

  const failed: ValidatorRule[] = [];
  for (const rule of branch.validators) {
    let passed = false;
    try {
      passed = rule.check(ctx);
    } catch {
      passed = false;
    }
    if (!passed) failed.push(rule);
  }

  const failedReportRules: ReportValidatorRule[] = [];
  if (def.kind === "sql_report") {
    if (!isValidReportConfig(result, reportConfig)) {
      failedReportRules.push({
        id: "report_config_complete",
        severityOnFail: "wrong_request",
        replyOnFail:
          "Widzę dane, ale nie widzę poprawnie złożonego raportu. Wybierz typ wykresu oraz różne pola X i Y z wyniku SQL.",
        check: () => false,
      });
    } else {
      const reportCtx = { ...ctx, reportConfig };
      for (const rule of branch.reportValidators ?? []) {
        let passed = false;
        try {
          passed = rule.check(reportCtx);
        } catch {
          passed = false;
        }
        if (!passed) failedReportRules.push(rule);
      }
    }
  }

  const allFailed = [...failed, ...failedReportRules];

  if (allFailed.length === 0) {
    return {
      severity: "success",
      reply: branch.successReply,
      facts: [...(branch.factsOnBranch ?? []), ...(branch.factsOnSuccess ?? [])],
      failedValidatorIds: [],
      branchId,
    };
  }

  let worst = allFailed[0];
  for (const rule of allFailed) {
    if (SEVERITY_RANK[rule.severityOnFail] > SEVERITY_RANK[worst.severityOnFail]) {
      worst = rule;
    }
  }

  const facts = allFailed.flatMap(r => r.factsOnFail ?? []);
  return {
    severity: worst.severityOnFail,
    reply: worst.replyOnFail,
    facts: [...(branch.factsOnBranch ?? []), ...facts],
    failedValidatorIds: allFailed.map(r => r.id),
    branchId,
  };
}

function selectBranch(def: TaskDefinition, ctx: ValidationContext): [string, BranchDefinition] {
  for (const entry of Object.entries(def.branches)) {
    const branch = entry[1];
    try {
      if (branch.match.check(ctx)) return entry;
    } catch {
      // Broken matchers are treated as non-matches so the default branch can catch.
    }
  }

  const fallback = def.branches.default;
  if (!fallback) {
    throw new Error(`Task ${def.id} has no matching branch and no default branch.`);
  }
  return ["default", fallback];
}
