import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #10 — Growth Lead Kuba: top 10 miast po gross.
 *
 * Pułapki / scoring:
 *  - źródło: sales JOIN users
 *  - WHERE is_test = false (Kuba mówi o tym wprost)
 *  - LIMIT 10, sortowanie DESC po gross
 */
export const topCitiesDay1 = defineTask({
  id: "top_cities_day1",
  fromActionId: "k5",
  fromPersonId: "lead_kuba",
  channelId: "lead_kuba",
  title: "Top 10 miast po gross (Kuba)",
  brief:
    "Kuba chce top 10 miast po gross revenue. " +
    "Wprost mówi: BEZ kont testowych (is_test = false).",
  initialSql:
    "-- Day 1 · Kuba: top 10 miast (bez kont testowych)\n" +
    "SELECT\n" +
    "  u.city,\n" +
    "  SUM(s.gross) AS gross\n" +
    "FROM sales s\n" +
    "JOIN users u ON u.id = s.user_id\n" +
    "WHERE u.is_test = false\n" +
    "GROUP BY u.city\n" +
    "ORDER BY gross DESC\n" +
    "LIMIT 10;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query padło — bez tego nie zamknę dnia.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_and_users",
          severityOnFail: "wrong_request",
          replyOnFail: "Brakuje sales + users — bez tego nie ma miast.",
          factsOnFail: ["top_cities_wrong_source"],
          check: ({ sqlProfile }) => ["sales", "users"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "filters_test_accounts",
          severityOnFail: "major_issue",
          replyOnFail: "Mówiłem wprost: BEZ kont testowych. Daj WHERE is_test = false.",
          factsOnFail: ["top_cities_includes_test_accounts"],
          check: ({ sqlProfile }) => /is_test\s*=\s*false/i.test(sqlProfile.sql),
        },
        {
          id: "limit_ten",
          severityOnFail: "major_issue",
          replyOnFail: "Top 10 znaczy LIMIT 10. Tu liczba wierszy się nie zgadza.",
          check: ({ resultProfile }) => resultProfile?.rowCount === 10,
        },
        {
          id: "ordered_by_gross_desc",
          severityOnFail: "major_issue",
          replyOnFail: "Sortuj malejąco — top zaczyna się od góry.",
          check: ({ result, resultProfile }) => {
            if (!result.ok || !resultProfile || resultProfile.rowCount < 2) return false;
            const cols = resultProfile.columns.map(c => c.toLowerCase());
            const grossIdx = cols.findIndex(c => c.includes("gross") || c.includes("revenue"));
            if (grossIdx === -1) return false;
            const values = result.rows
              .map(r => Number(r[grossIdx]))
              .filter(n => Number.isFinite(n));
            return values.every((v, i) => i === 0 || values[i - 1] >= v);
          },
        },
      ],

      successReply: "Ok, dobra robota na koniec dnia. Idź do domu.",
      factsOnSuccess: ["top_cities_clean"],
    }),
  },
  scoring: { weight: 1.2, expectedSeconds: 240 },
});
