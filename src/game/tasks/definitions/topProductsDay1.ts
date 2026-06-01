import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #2 — Sales Tomek: top 10 produktów po gross revenue.
 *
 * Pułapki / scoring:
 *  - źródło: sales JOIN products
 *  - musi mieć ORDER BY DESC i LIMIT 10
 *  - kolumny: nazwa produktu + revenue
 */
export const topProductsDay1 = defineTask({
  id: "top_products_day1",
  fromActionId: "st2",
  fromPersonId: "sales_tomek",
  channelId: "sales_tomek",
  title: "Top 10 produktów po gross (Tomek)",
  brief:
    "Tomek chce top 10 produktów po gross revenue dla klienta. " +
    "Połącz sales z products, posortuj po sumie gross malejąco, ogranicz do 10.",
  initialSql:
    "-- Day 1 · Tomek: top 10 produktów po gross\n" +
    "SELECT\n" +
    "  p.name AS product,\n" +
    "  SUM(s.gross) AS gross_revenue\n" +
    "FROM sales s\n" +
    "JOIN products p ON p.id = s.product_id\n" +
    "GROUP BY p.name\n" +
    "ORDER BY gross_revenue DESC\n" +
    "LIMIT 10;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query się wywaliło, klient czeka — popraw i daj znać.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_and_products",
          severityOnFail: "wrong_request",
          replyOnFail: "Mordo, tu trzeba sales + products, inaczej nie ma nazw produktów.",
          factsOnFail: ["top_products_wrong_source"],
          check: ({ sqlProfile }) =>
            ["sales", "products"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "has_two_columns",
          severityOnFail: "major_issue",
          replyOnFail: "Chcę dwie kolumny: produkt + revenue. Tu mam coś innego.",
          check: ({ resultProfile }) => resultProfile?.columns.length === 2,
        },
        {
          id: "limit_ten_rows",
          severityOnFail: "major_issue",
          replyOnFail: "Miało być TOP 10. Dodaj LIMIT 10.",
          factsOnFail: ["top_products_wrong_row_count"],
          check: ({ resultProfile }) => resultProfile?.rowCount === 10,
        },
        {
          id: "ordered_by_revenue_desc",
          severityOnFail: "major_issue",
          replyOnFail:
            "Dane są, ale nie posortowane od największego. Klient odczyta top jako bottom.",
          factsOnFail: ["top_products_unsorted"],
          check: ({ result, resultProfile }) => {
            if (!result.ok || !resultProfile || resultProfile.rowCount < 2) return false;
            const values = result.rows.map(r => Number(r[1])).filter(n => Number.isFinite(n));
            return values.every((v, i) => i === 0 || values[i - 1] >= v);
          },
        },
      ],

      successReply: "Mordo, dziesiątka jest, klient klepnie. Dzięki.",
      factsOnSuccess: ["top_products_clean"],
    }),
  },
  scoring: { weight: 1.2, expectedSeconds: 240 },
});
