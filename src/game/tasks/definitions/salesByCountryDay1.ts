import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #3 — Marketing Kasia: sprzedaż per kraj.
 *
 * Pułapki / scoring:
 *  - źródło: sales JOIN users JOIN countries
 *  - oczekujemy gross (SUM) i unikalnej liczby zamówień
 */
export const salesByCountryDay1 = defineTask({
  id: "sales_by_country_day1",
  fromActionId: "mk2",
  fromPersonId: "mkt_kasia",
  channelId: "mkt_kasia",
  title: "Sprzedaż per kraj (Kasia)",
  brief:
    "Kasia chce sprzedaż per kraj na slajd: gross + liczba unikalnych zamówień. " +
    "Połącz sales przez users z countries i pogrupuj po kraju.",
  initialSql:
    "-- Day 1 · Kasia: sprzedaż per kraj\n" +
    "SELECT\n" +
    "  c.country_name,\n" +
    "  COUNT(DISTINCT s.order_id) AS orders,\n" +
    "  SUM(s.gross) AS gross\n" +
    "FROM sales s\n" +
    "JOIN users u ON u.id = s.user_id\n" +
    "JOIN countries c ON c.id = u.country_id\n" +
    "GROUP BY c.country_name\n" +
    "ORDER BY gross DESC;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query się wywaliło — bez wyniku slajd nie powstanie.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_users_countries",
          severityOnFail: "wrong_request",
          replyOnFail:
            "Brakuje któregoś z trzech źródeł — sales, users i countries muszą być razem.",
          factsOnFail: ["sales_by_country_wrong_source"],
          check: ({ sqlProfile }) =>
            ["sales", "users", "countries"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "has_country_and_metrics",
          severityOnFail: "major_issue",
          replyOnFail:
            "Potrzebuję trzech kolumn: kraj, liczba zamówień, gross. Coś z nich się nie zgadza.",
          check: ({ resultProfile }) => {
            if (!resultProfile) return false;
            const cols = resultProfile.columns.map(c => c.toLowerCase());
            const hasCountry = cols.some(c => c.includes("country"));
            const hasOrders = cols.some(c => c.includes("order") || c.includes("count"));
            const hasGross = cols.some(c => c.includes("gross"));
            return hasCountry && hasOrders && hasGross;
          },
        },
        {
          id: "uses_distinct_orders",
          severityOnFail: "minor_issue",
          replyOnFail:
            "Wynik wygląda ok, ale przy zamówieniach z wieloma pozycjami liczba zamówień będzie zawyżona — użyj COUNT(DISTINCT order_id).",
          factsOnFail: ["sales_by_country_orders_not_deduplicated"],
          check: ({ sqlProfile }) => /count\s*\(\s*distinct\s+(s\.)?order_id/i.test(sqlProfile.sql),
        },
      ],

      successReply: "Super, wkleję na slajd. Dzięki!",
      factsOnSuccess: ["sales_by_country_clean"],
    }),
  },
  scoring: { weight: 1.0, expectedSeconds: 240 },
});
