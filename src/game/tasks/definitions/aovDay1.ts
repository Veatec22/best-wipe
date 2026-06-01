import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #9 — CEO Marek: AOV. Teraz.
 *
 * Pułapki / scoring:
 *  - GOTCHA: AOV = średnia z order_id, NIE średnia z wierszy sales.
 *    Naive `AVG(gross)` po wierszach jest błędne: zamówienia
 *    multi-line ważone są wyżej, a single-line poniżej.
 *  - Poprawnie: SUM(gross) → GROUP BY order_id → AVG.
 *  - CEO ma weight 2.0 — ten task waży najwięcej w scoringu Week 1.
 */
export const aovDay1 = defineTask({
  id: "aov_day1",
  fromActionId: "cm1",
  fromPersonId: "ceo_marek",
  channelId: "ceo_marek",
  title: "AOV (CEO)",
  brief:
    "CEO chce AOV — average order value. " +
    "Uwaga: AOV to średnia z zamówień (order_id), a nie średnia z wierszy sprzedaży. " +
    "Najpierw zsumuj gross per order_id, potem AVG.",
  initialSql:
    "-- Day 1 · CEO: AOV (po order_id, nie po wierszach!)\n" +
    "WITH orders AS (\n" +
    "  SELECT order_id, SUM(gross) AS order_gross\n" +
    "  FROM sales\n" +
    "  GROUP BY order_id\n" +
    ")\n" +
    "SELECT AVG(order_gross) AS avg_order_value\n" +
    "FROM orders;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "critical_fail",
          replyOnFail: "Query nie przeszło. CEO czeka.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_table",
          severityOnFail: "wrong_request",
          replyOnFail: "AOV liczymy z `sales`. Daj poprawne źródło.",
          factsOnFail: ["aov_wrong_source"],
          check: ({ sqlProfile }) => sqlProfile.tables.includes("sales"),
        },
        {
          id: "single_scalar_aov",
          severityOnFail: "major_issue",
          replyOnFail: "Spodziewam się jednej liczby, nie tabelki.",
          check: ({ resultProfile }) =>
            resultProfile?.rowCount === 1 && resultProfile.columns.length === 1,
        },
        {
          id: "groups_by_order_id",
          severityOnFail: "wrong_request",
          replyOnFail:
            "To nie jest AOV — wziąłeś średnią po wierszach sprzedaży. " +
            "AOV = SUM(gross) per order_id, dopiero potem AVG. Multi-line orders zaburzają wynik.",
          factsOnFail: ["aov_average_over_lines_not_orders", "ceo_received_wrong_aov"],
          check: ({ sqlProfile }) =>
            /group\s+by\s+order_id/i.test(sqlProfile.sql) ||
            /partition\s+by\s+order_id/i.test(sqlProfile.sql),
        },
      ],

      successReply: "Ok.",
      factsOnSuccess: ["aov_clean"],
    }),
  },
  scoring: { weight: 2.0, expectedSeconds: 300 },
});
