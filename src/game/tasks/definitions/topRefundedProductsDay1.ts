import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #7 — Product Manager Radek: produkty z największą liczbą refundów.
 *
 * Pułapki / scoring:
 *  - źródło: refunds JOIN products
 *  - chcemy COUNT(*) jako liczbę refundów + SUM(amount)
 *  - sortowanie po liczbie refundów DESC
 */
export const topRefundedProductsDay1 = defineTask({
  id: "top_refunded_products_day1",
  fromActionId: "pr2",
  fromPersonId: "pm_radek",
  channelId: "pm_radek",
  title: "Produkty z największą liczbą refundów (Radek)",
  brief:
    "Radek chce listę produktów z największą liczbą refundów (i sumą zwrotów). " +
    "JOIN refunds + products, sortowanie po liczbie refundów malejąco.",
  initialSql:
    "-- Day 1 · Radek: produkty z największą liczbą refundów\n" +
    "SELECT\n" +
    "  p.name AS product,\n" +
    "  COUNT(*) AS refund_count,\n" +
    "  SUM(r.amount) AS refund_amount\n" +
    "FROM refunds r\n" +
    "JOIN products p ON p.id = r.product_id\n" +
    "GROUP BY p.name\n" +
    "ORDER BY refund_count DESC;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query nie przeszło, nie ruszę z tym śledztwem.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_refunds_and_products",
          severityOnFail: "wrong_request",
          replyOnFail: "Potrzebuję refunds + products, inaczej nie mam nazw.",
          factsOnFail: ["top_refunded_products_wrong_source"],
          check: ({ sqlProfile }) =>
            ["refunds", "products"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "has_count_and_amount",
          severityOnFail: "major_issue",
          replyOnFail:
            "Chcę dwie metryki: liczba refundów (COUNT) i suma kwoty refundów (SUM). " +
            "W wyniku tego nie widzę.",
          check: ({ resultProfile }) => {
            if (!resultProfile) return false;
            const cols = resultProfile.columns.map(c => c.toLowerCase());
            const hasCount = cols.some(c => c.includes("count") || c.includes("refund_count"));
            const hasAmount = cols.some(c => c.includes("amount") || c.includes("sum"));
            return hasCount && hasAmount;
          },
        },
        {
          id: "ordered_by_count_desc",
          severityOnFail: "major_issue",
          replyOnFail:
            "Brak sortowania od najczęściej zwracanych. Top zaczyna się od góry, nie od dołu.",
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
      ],

      successReply: "Dokładnie to, czego potrzebowałem — jutro rano siadam z product designerem.",
      factsOnSuccess: ["top_refunded_products_clean"],
    }),
  },
  scoring: { weight: 1.2, expectedSeconds: 240 },
});
