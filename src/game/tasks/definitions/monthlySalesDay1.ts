import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #1 — Ola: sprzedaż miesięczna (oct → apr).
 *
 * Pułapki / scoring:
 *  - źródło: tylko `sales` (gross/net/tax tu są)
 *  - musi być grupowanie po miesiącu — sprawdzamy heurystycznie
 *  - 7 miesięcy (oct, nov, dec, jan, feb, mar, apr) → result row count
 */
export const monthlySalesDay1 = defineTask({
  id: "monthly_sales_day1",
  fromActionId: "p3",
  fromPersonId: "pm_ola",
  channelId: "pm_ola",
  title: "Sprzedaż miesięczna (Ola)",
  brief:
    "Ola chce sprzedaż miesięczną od października do kwietnia: net, tax, gross. " +
    "Tabelka, jeden wiersz na miesiąc.",
  initialSql:
    "-- Day 1 · Ola: sprzedaż miesięczna oct→apr (net/tax/gross)\n" +
    "SELECT\n" +
    "  strftime(transaction_date, '%Y-%m') AS month,\n" +
    "  SUM(net)  AS net,\n" +
    "  SUM(tax)  AS tax,\n" +
    "  SUM(gross) AS gross\n" +
    "FROM sales\n" +
    "WHERE strftime(transaction_date, '%m') IN ('10','11','12','01','02','03','04')\n" +
    "GROUP BY month\n" +
    "ORDER BY month;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query się wywaliło, nic nie wpadło na tabelkę. Popraw i wyślij.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_table",
          severityOnFail: "wrong_request",
          replyOnFail: "To miało być z `sales`, a tu nie widzę tej tabeli.",
          factsOnFail: ["monthly_sales_wrong_source"],
          check: ({ sqlProfile }) => sqlProfile.tables.includes("sales"),
        },
        {
          id: "has_month_grouping",
          severityOnFail: "major_issue",
          replyOnFail:
            "Potrzebuję podziału po miesiącu, a tu wygląda jak total. Dodaj GROUP BY po miesiącu.",
          check: ({ sqlProfile }) =>
            /\b(date_trunc|strftime|extract|month|to_char|year_month)\b/i.test(sqlProfile.sql) &&
            /\bgroup\s+by\b/i.test(sqlProfile.sql),
        },
        {
          id: "has_three_metric_columns",
          severityOnFail: "major_issue",
          replyOnFail: "Chciałam net, tax i gross — widzę, że którejś kolumny brakuje.",
          check: ({ resultProfile }) => {
            if (!resultProfile) return false;
            const cols = resultProfile.columns.map(c => c.toLowerCase());
            return ["net", "tax", "gross"].every(metric => cols.some(c => c.includes(metric)));
          },
        },
        {
          id: "covers_seven_months",
          severityOnFail: "minor_issue",
          replyOnFail:
            "Działa, tylko liczba miesięcy się nie zgadza — chciałam siedem (oct → apr). Dorzuć WHERE na zakres.",
          factsOnFail: ["monthly_sales_wrong_month_range"],
          check: ({ resultProfile }) => resultProfile?.rowCount === 7,
        },
      ],

      successReply: "Idealnie, siedem miesięcy z net/tax/gross. Wkleję na slajd.",
      factsOnSuccess: ["monthly_sales_clean"],
    }),
  },
  scoring: { weight: 1.2, expectedSeconds: 240 },
});
