import { expect, test } from "bun:test";
import type { QueryResult } from "../../services/duckdb/queryRunner";
import { countUsersDay1 } from "../tasks/definitions/countUsersDay1";
import { detectIgnored, handleAccept, handleIgnore, handleSubmission } from "./coreLoop";

test("handleAccept returns an accepted task effect without touching stores", () => {
  const result = handleAccept({
    actionId: "k4",
    channelId: "lead_kuba",
    replyText: "accept",
    acceptedAtTotalSeconds: 12,
    taskDefinition: countUsersDay1,
    now: () => new Date("2026-05-06T10:15:00").getTime(),
  });

  expect(result.action).toEqual({
    actionId: "k4",
    channelId: "lead_kuba",
    status: "accepted",
    replyText: "accept",
    replyTime: "10:15",
  });
  expect(result.acceptedTask).toEqual({
    id: "count_users_day1",
    initialSql: countUsersDay1.initialSql,
    acceptedAtTotalSeconds: 12,
  });
  expect(result.worldEffects).toEqual([]);
});

test("handleSubmission produces submission, chat appends, scoring, and fact effects", async () => {
  const queryResult: QueryResult = {
    ok: true,
    columns: ["users"],
    rows: [[123]],
    rowCount: 1,
    truncated: false,
    durationMs: 5,
  };
  const calls: string[] = [];

  const result = await handleSubmission({
    taskId: countUsersDay1.id,
    def: countUsersDay1,
    task: {
      id: countUsersDay1.id,
      status: "accepted",
      draftSql: countUsersDay1.initialSql,
      lastResult: null,
      reportConfig: null,
      submissionIds: [],
      acceptedAtTotalSeconds: 10,
    },
    clock: {
      day: 1,
      dayDurationSeconds: 480,
      elapsedTodaySeconds: 70,
      isPaused: false,
      isTimeFrozen: false,
      isDayEnded: false,
    },
    runQuery: async sql => {
      calls.push(sql);
      return queryResult;
    },
    now: () => new Date("2026-05-06T10:20:00.000Z").getTime(),
    submissionCoverText: "prosze",
  });

  expect(calls).toEqual([countUsersDay1.initialSql]);
  expect(result.lastResult).toBe(queryResult);
  expect(result.submission).toMatchObject({
    id: "sub_count_users_day1_1778062800000",
    taskId: "count_users_day1",
    submittedAt: "2026-05-06T10:20:00.000Z",
    gameTimeLabel: "DAY 01 · 10:10",
    sql: countUsersDay1.initialSql,
    result: queryResult,
    outcome: {
      severity: "success",
      branchId: "default",
      facts: ["day1_kuba_access_check_clean"],
    },
  });
  expect(result.newTaskStatus).toBe("submitted_ok");
  expect(result.chatAppends).toHaveLength(2);
  expect(result.chatAppends[0]).toMatchObject({
    channelId: "lead_kuba",
    message: {
      id: "count_users_day1:send:1778062800000",
      kind: "task_submission",
      time: "10:20",
      submissionId: result.submission.id,
    },
  });
  expect(result.scoringEvent).toMatchObject({
    id: "score_sub_count_users_day1_1778062800000",
    taskId: "count_users_day1",
    submissionId: result.submission.id,
    severity: "success",
    elapsedSeconds: 60,
    expectedSeconds: 90,
  });
  expect(result.worldEffects).toEqual([
    { type: "set_fact", key: "day1_kuba_access_check_clean", value: true },
  ]);
});

test("detectIgnored returns pending action requests whose hidden expiration passed", () => {
  expect(
    detectIgnored(
      [
        {
          channelId: "lead_kuba",
          action: {
            id: "k4",
            kind: "action_request",
            who: "lead_kuba",
            time: "09:05",
            text: "task",
            actionKind: "sql_task",
            acceptLabel: "ACCEPT",
            rejectLabel: "REJECT",
            deliveredAtTotalSeconds: 10,
            hiddenExpiresAfterSeconds: 20,
          },
        },
      ],
      {
        day: 1,
        dayDurationSeconds: 480,
        elapsedTodaySeconds: 31,
        isPaused: false,
        isTimeFrozen: false,
        isDayEnded: false,
      },
    ),
  ).toEqual([{ actionId: "k4", channelId: "lead_kuba", ignoredAtTotalSeconds: 31 }]);
});

test("handleIgnore returns a typed ignored transition result", () => {
  expect(
    handleIgnore({
      actionId: "k4",
      channelId: "lead_kuba",
      ignoredAtTotalSeconds: 31,
    }),
  ).toEqual({
    action: {
      actionId: "k4",
      channelId: "lead_kuba",
      status: "ignored",
      ignoredAtTotalSeconds: 31,
    },
    worldEffects: [],
  });
});
