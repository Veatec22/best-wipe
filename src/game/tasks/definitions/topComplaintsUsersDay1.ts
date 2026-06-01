import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #8 — Support Magda: userzy z największą liczbą reklamacji.
 *
 * Pułapki / scoring:
 *  - źródło: complaints JOIN users
 *  - sortowanie po liczbie reklamacji DESC
 *  - top — zakładamy ≤ 20 wierszy (Magda chce zobaczyć grupę "stałych maruderów")
 */
export const topComplaintsUsersDay1 = defineTask({
  id: "top_complaints_users_day1",
  fromActionId: "hm2",
  fromPersonId: "hr_magda",
  channelId: "hr_magda",
  title: "Reklamacje per user (Magda)",
  brief:
    "Magda chce userów z największą liczbą reklamacji. " +
    "Połącz complaints z users, posortuj po liczbie reklamacji malejąco. Top 20 starczy.",
  initialSql:
    "-- Day 1 · Magda: top użytkowników po liczbie reklamacji\n" +
    "SELECT\n" +
    "  u.name || ' ' || u.surname AS user,\n" +
    "  COUNT(*) AS complaint_count\n" +
    "FROM complaints co\n" +
    "JOIN users u ON u.id = co.user_id\n" +
    "GROUP BY u.id, u.name, u.surname\n" +
    "ORDER BY complaint_count DESC\n" +
    "LIMIT 20;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query padło, nie zobaczę listy maruderów.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_complaints_and_users",
          severityOnFail: "wrong_request",
          replyOnFail: "Bez complaints + users nie pokażę tego po userach.",
          factsOnFail: ["top_complaints_users_wrong_source"],
          check: ({ sqlProfile }) =>
            ["complaints", "users"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "has_count_column",
          severityOnFail: "major_issue",
          replyOnFail: "Chciałam zobaczyć liczbę reklamacji (COUNT), a tu jej nie ma.",
          check: ({ resultProfile }) => {
            if (!resultProfile) return false;
            return resultProfile.columns.some(c => c.toLowerCase().includes("count"));
          },
        },
        {
          id: "ordered_by_count_desc",
          severityOnFail: "major_issue",
          replyOnFail: "Posortuj malejąco — chcę zacząć od osoby z największą liczbą zgłoszeń.",
          check: ({ result, resultProfile }) => {
            if (!result.ok || !resultProfile || resultProfile.rowCount < 2) return false;
            const cols = resultProfile.columns.map(c => c.toLowerCase());
            const countIdx = cols.findIndex(c => c.includes("count"));
            if (countIdx === -1) return false;
            const values = result.rows
              .map(r => Number(r[countIdx]))
              .filter(n => Number.isFinite(n));
            return values.every((v, i) => i === 0 || values[i - 1] >= v);
          },
        },
        {
          id: "trims_to_top_n",
          severityOnFail: "minor_issue",
          replyOnFail:
            "Działa, ale ja chciałam zobaczyć tylko top — daj LIMIT, nie całą bazę userów.",
          check: ({ resultProfile }) =>
            resultProfile !== null && resultProfile.rowCount > 0 && resultProfile.rowCount <= 25,
        },
      ],

      successReply: "Idealnie — przejrzę i odezwę się do tych z góry.",
      factsOnSuccess: ["top_complaints_users_clean"],
    }),
  },
  scoring: { weight: 1.0, expectedSeconds: 240 },
});
