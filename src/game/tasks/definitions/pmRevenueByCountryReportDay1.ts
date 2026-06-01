import { defaultBranch, defineTask } from "../defineTask";

/**
 * Temporary Day 1 report-task smoke content.
 *
 * Later this should move to a later campaign day. For now it gives us an
 * in-game path to exercise SQL -> Build report -> X/Y config -> SEND.
 */
export const pmRevenueByCountryReportDay1 = defineTask({
  id: "pm_revenue_by_country_report_day1",
  kind: "sql_report",
  fromActionId: "p2",
  fromPersonId: "pm_ola",
  channelId: "pm_ola",
  title: "Raport revenue po kraju (Ola)",
  brief:
    "Ola potrzebuje prostego raportu na board: revenue po kraju użytkownika. " +
    "To ma być wykres, nie sama tabelka. Użyj net jako revenue i odfiltruj konta testowe.",
  initialSql:
    '-- Day 1 · Ola: "revenue po kraju jako raport"\n' +
    "SELECT\n" +
    "  c.country_name,\n" +
    "  SUM(s.net) AS revenue\n" +
    "FROM sales s\n" +
    "JOIN users u ON u.id = s.user_id\n" +
    "JOIN countries c ON c.id = u.country_id\n" +
    "WHERE u.is_test = false\n" +
    "GROUP BY c.country_name\n" +
    "ORDER BY revenue DESC;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Nie mam raportu, bo SQL się wywalił. Popraw query i podeślij jeszcze raz.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_users_countries",
          severityOnFail: "wrong_request",
          replyOnFail:
            "To ma być revenue po kraju usera, więc potrzebuję sprzedaży połączonej z users i countries.",
          factsOnFail: ["pm_revenue_report_wrong_source_tables"],
          check: ({ sqlProfile }) =>
            ["sales", "users", "countries"].every(table => sqlProfile.tables.includes(table)),
        },
        {
          id: "has_country_and_revenue_columns",
          severityOnFail: "major_issue",
          replyOnFail:
            "Dane wyglądają nie pod ten wykres. Potrzebuję dwóch kolumn: country_name i revenue.",
          check: ({ resultProfile }) =>
            Boolean(
              resultProfile &&
                resultProfile.rowCount > 0 &&
                resultProfile.columns.includes("country_name") &&
                resultProfile.columns.includes("revenue"),
            ),
        },
        {
          id: "filters_test_accounts",
          severityOnFail: "minor_issue",
          replyOnFail:
            "Raport się przyda, ale widzę ryzyko kont testowych. Na board raczej nie chcemy QA/dev w revenue.",
          factsOnFail: ["pm_revenue_report_includes_test_accounts"],
          check: ({ sqlProfile }) => /is_test\s*=\s*false/i.test(sqlProfile.sql),
        },
      ],

      reportValidators: [
        {
          id: "bar_chart_selected",
          severityOnFail: "major_issue",
          replyOnFail:
            "Na boardzie potrzebuję szybkiego porównania krajów. Daj to jako bar chart, nie trend.",
          factsOnFail: ["pm_revenue_report_wrong_chart_type"],
          check: ({ reportConfig }) => reportConfig?.chartType === "bar",
        },
        {
          id: "country_on_x",
          severityOnFail: "major_issue",
          replyOnFail: "Oś X powinna pokazywać kraje. Teraz wykres jest trudny do odczytania.",
          factsOnFail: ["pm_revenue_report_wrong_x_axis"],
          check: ({ reportConfig }) => reportConfig?.xColumn === "country_name",
        },
        {
          id: "revenue_on_y",
          severityOnFail: "major_issue",
          replyOnFail: "Na osi Y musi być revenue. Inaczej board nie zobaczy wielkości problemu.",
          factsOnFail: ["pm_revenue_report_wrong_y_axis"],
          check: ({ reportConfig }) => reportConfig?.yColumn === "revenue",
        },
      ],

      successReply: "Super, o to chodziło. Jeden wykres, revenue po kraju, można wrzucić na board.",
      factsOnSuccess: ["pm_revenue_by_country_report_clean"],
    }),
  },

  /**
   * Scoring tuning:
   *  - weight 1.5 — task idzie na board (CEO zobaczy), więc wpływ na
   *    accuracy / reputation wyższy niż przy wewnętrznym sanity-checku.
   *  - expectedSeconds 240 — joiny + report builder, realistycznie 4 min.
   *  - reputationTarget = pm_ola (default).
   */
  scoring: {
    weight: 1.5,
    expectedSeconds: 240,
  },
});
