import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #4 — Data Platform: ile sprzedaży idzie z is_test = true.
 *
 * Pułapki / scoring:
 *  - INWERSJA standardowej zasady: tu CHCEMY tylko test accounts.
 *  - filtr `is_test = true` (nie false!), próbujemy też wykryć "is_test" bez
 *    wartości i dać ostrzeżenie.
 *  - mała tabelka: kolumny revenue + liczba zamówień (lub similar).
 */
export const testAccountsImpactDay1 = defineTask({
  id: "test_accounts_impact_day1",
  fromActionId: "dp2",
  fromPersonId: "dp_robert",
  channelId: "data_platform",
  title: "Wpływ kont testowych (Data Platform)",
  brief:
    "DP chce wiedzieć, ile sprzedaży pochodzi od kont testowych (is_test = true). " +
    "Tym razem WBREW handbookowi NIE filtrujemy testów — chcemy je policzyć osobno.",
  initialSql:
    "-- Day 1 · DP: wpływ test accounts na sprzedaż\n" +
    "SELECT\n" +
    "  COUNT(DISTINCT s.order_id) AS test_orders,\n" +
    "  SUM(s.gross) AS test_gross\n" +
    "FROM sales s\n" +
    "JOIN users u ON u.id = s.user_id\n" +
    "WHERE u.is_test = true;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query padło, sanity-check nie zadziała.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_and_users",
          severityOnFail: "wrong_request",
          replyOnFail: "Bez sales + users nie odsiejemy testowych kont.",
          factsOnFail: ["test_accounts_impact_wrong_source"],
          check: ({ sqlProfile }) => ["sales", "users"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "filters_is_test_true",
          severityOnFail: "wrong_request",
          replyOnFail:
            "Tym razem chcemy CONTRA — sprzedaż TYLKO z kont testowych. Daj WHERE is_test = true.",
          factsOnFail: ["test_accounts_impact_filter_inverted"],
          check: ({ sqlProfile }) => /is_test\s*=\s*true/i.test(sqlProfile.sql),
        },
        {
          id: "single_summary_row",
          severityOnFail: "minor_issue",
          replyOnFail: "Sanity check robimy w jednym wierszu (suma + count). Bez podziału.",
          check: ({ resultProfile }) => resultProfile?.rowCount === 1,
        },
      ],

      successReply:
        "Ok, mamy liczbę. Załóżmy ticket żeby zacząć ich filtrować na poziomie pipeline'u.",
      factsOnSuccess: ["test_accounts_impact_measured"],
    }),
  },
  scoring: { weight: 1.0, expectedSeconds: 180 },
});
