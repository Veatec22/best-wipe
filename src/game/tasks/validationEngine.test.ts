import { expect, test } from "bun:test";
import type { QueryResult } from "../../services/duckdb/queryRunner";
import { defaultBranch } from "./defineTask";
import type { TaskDefinition } from "./taskTypes";
import { runValidation } from "./validationEngine";

const reportResult: QueryResult = {
  ok: true,
  columns: ["country_name", "revenue"],
  rows: [
    ["Poland", 120],
    ["Germany", 90],
  ],
  rowCount: 2,
  truncated: false,
  durationMs: 10,
};

const reportTask: TaskDefinition = {
  id: "test_report_task",
  kind: "sql_report",
  fromActionId: "test_action",
  fromPersonId: "pm_ola",
  channelId: "pm_ola",
  title: "Test report",
  brief: "Build a revenue by country report.",
  initialSql: "SELECT country_name, 120 AS revenue FROM countries;",
  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query failed.",
          check: ({ result }) => result.ok,
        },
      ],
      reportValidators: [
        {
          id: "country_on_x",
          severityOnFail: "major_issue",
          replyOnFail: "Country should be on X.",
          check: ({ reportConfig }) => reportConfig?.xColumn === "country_name",
        },
        {
          id: "revenue_on_y",
          severityOnFail: "major_issue",
          replyOnFail: "Revenue should be on Y.",
          check: ({ reportConfig }) => reportConfig?.yColumn === "revenue",
        },
      ],
      successReply: "Looks good.",
    }),
  },
};

test("sql_report task requires a valid chart config", () => {
  const outcome = runValidation(reportTask, reportResult, "SELECT country_name, revenue FROM x");

  expect(outcome.severity).toBe("wrong_request");
  expect(outcome.branchId).toBe("default");
  expect(outcome.failedValidatorIds).toContain("report_config_complete");
});

test("sql_report task passes SQL and report validators with a matching X/Y config", () => {
  const outcome = runValidation(reportTask, reportResult, "SELECT country_name, revenue FROM x", {
    chartType: "bar",
    xColumn: "country_name",
    yColumn: "revenue",
  });

  expect(outcome.severity).toBe("success");
  expect(outcome.branchId).toBe("default");
  expect(outcome.failedValidatorIds).toEqual([]);
});

test("branching task returns the selected branchId and branch facts", () => {
  const branchingTask: TaskDefinition = {
    id: "branching_task",
    fromActionId: "branching_action",
    fromPersonId: "pm_ola",
    channelId: "pm_ola",
    title: "Branching task",
    brief: "Choose a report branch.",
    initialSql: "SELECT 1;",
    branches: {
      pm_flawed_report: {
        match: {
          id: "matches_pm_flawed_report",
          check: ({ sqlProfile }) => /pm_flawed/i.test(sqlProfile.sql),
        },
        validators: [
          {
            id: "query_executed",
            severityOnFail: "wrong_request",
            replyOnFail: "Query failed.",
            check: ({ result }) => result.ok,
          },
        ],
        successReply: "Thanks for keeping my version.",
        factsOnBranch: ["pm_coverup_sent_flawed_report", "player_helped_pm_coverup"],
      },
      default: defaultBranch({
        validators: [
          {
            id: "query_executed",
            severityOnFail: "wrong_request",
            replyOnFail: "Query failed.",
            check: ({ result }) => result.ok,
          },
        ],
        successReply: "Thanks for the clean report.",
        factsOnSuccess: ["pm_coverup_sent_correct_report"],
      }),
    },
  };

  const flawed = runValidation(branchingTask, reportResult, "SELECT 1 AS pm_flawed");
  const correct = runValidation(branchingTask, reportResult, "SELECT 1");

  expect(flawed.branchId).toBe("pm_flawed_report");
  expect(flawed.facts).toEqual(["pm_coverup_sent_flawed_report", "player_helped_pm_coverup"]);
  expect(correct.branchId).toBe("default");
  expect(correct.facts).toEqual(["pm_coverup_sent_correct_report"]);
});
