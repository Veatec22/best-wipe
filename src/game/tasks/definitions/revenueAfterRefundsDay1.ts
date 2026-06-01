import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #5 — Finance Janusz: gross po odjęciu refundów.
 *
 * Pułapki / scoring:
 *  - źródło: sales + refunds
 *  - GOTCHA: refunds.amount jest po order_id; jeśli zrobisz prosty
 *    LEFT JOIN sales→refunds po order_id, refundy zduplikują się przez
 *    multi-line orders → revenue zaniżone. Bezpieczniej zsumować osobno
 *    i odjąć (subquery / CTE / UNION).
 *  - oczekujemy jednego wiersza z liczbą.
 */
export const revenueAfterRefundsDay1 = defineTask({
  id: "revenue_after_refunds_day1",
  fromActionId: "fj2",
  fromPersonId: "fin_janusz",
  channelId: "fin_janusz",
  title: "Revenue po refundach (Janusz)",
  brief:
    "Janusz chce revenue po odjęciu refundów. " +
    "Uwaga: refunds są po order_id, a sales mają wiele wierszy na zamówienie — " +
    "naiwny JOIN zduplikuje refundy. Lepiej: zsumować osobno i odjąć.",
  initialSql:
    "-- Day 1 · Janusz: revenue po refundach (uwaga na duplikację!)\n" +
    "WITH gross_total AS (\n" +
    "  SELECT SUM(gross) AS gross FROM sales\n" +
    "),\n" +
    "refund_total AS (\n" +
    "  SELECT SUM(amount) AS refunds FROM refunds\n" +
    ")\n" +
    "SELECT\n" +
    "  g.gross,\n" +
    "  r.refunds,\n" +
    "  g.gross - r.refunds AS net_after_refunds\n" +
    "FROM gross_total g, refund_total r;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query nie przeszło, nie mam czego raportować CFO.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_and_refunds",
          severityOnFail: "wrong_request",
          replyOnFail: "Bez sales + refunds nie odpowiem na to pytanie.",
          factsOnFail: ["revenue_after_refunds_wrong_source"],
          check: ({ sqlProfile }) => ["sales", "refunds"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "single_summary_row",
          severityOnFail: "major_issue",
          replyOnFail: "Spodziewałem się jednego wiersza z podsumowaniem, nie tabelki.",
          check: ({ resultProfile }) => resultProfile?.rowCount === 1,
        },
        {
          id: "avoids_naive_join_duplication",
          severityOnFail: "major_issue",
          replyOnFail:
            "Wynik wygląda za nisko — pewnie refundy się zduplikowały przez JOIN po order_id. " +
            "Zsumuj refundy osobno (CTE / subquery) i dopiero odejmij.",
          factsOnFail: ["revenue_after_refunds_duplicated_via_join"],
          check: ({ sqlProfile }) =>
            /\bwith\b/i.test(sqlProfile.sql) ||
            /\(\s*select[\s\S]+?from\s+refunds[\s\S]+?\)/i.test(sqlProfile.sql),
        },
      ],

      successReply:
        "Ok, dzięki — to mi się spina z poprzednim raportem. Wreszcie nikt nie krzyczy.",
      factsOnSuccess: ["revenue_after_refunds_clean"],
    }),
  },
  scoring: { weight: 1.5, expectedSeconds: 360 },
});
