import { defaultBranch, defineTask } from "../defineTask";

export const ordersByDayWeek1 = defineTask({
  id: "orders_by_day_week1",
  fromActionId: "st3",
  fromPersonId: "sales_tomek",
  channelId: "sales_tomek",
  title: "Zamowienia dzien po dniu (Tomek)",
  brief:
    "Tomek chce szybki trend liczby unikalnych zamowien dzien po dniu. " +
    "Uzyj sales, pogrupuj po dacie transakcji i licz COUNT(DISTINCT order_id).",
  initialSql:
    "-- Tomek: zamowienia dzien po dniu\n" +
    "SELECT\n" +
    "  transaction_date,\n" +
    "  COUNT(DISTINCT order_id) AS orders\n" +
    "FROM sales\n" +
    "GROUP BY transaction_date\n" +
    "ORDER BY transaction_date;",
  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query sie wywalilo, a ja mam call z klientem. Popraw prosze.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales",
          severityOnFail: "wrong_request",
          replyOnFail: "Tu chodzi o zamowienia z sales, nie o userow ani refundy.",
          check: ({ sqlProfile }) => sqlProfile.tables.includes("sales"),
        },
        {
          id: "has_date_and_orders",
          severityOnFail: "major_issue",
          replyOnFail: "Potrzebuje daty i liczby zamowien. W tym wyniku nie widze obu rzeczy.",
          check: ({ resultProfile }) => {
            const cols = resultProfile?.columns.map(c => c.toLowerCase()) ?? [];
            return cols.some(c => c.includes("date")) && cols.some(c => c.includes("order"));
          },
        },
        {
          id: "uses_distinct_orders",
          severityOnFail: "minor_issue",
          replyOnFail:
            "Wyglada prawie ok, ale sales ma pozycje zamowien. Policz COUNT(DISTINCT order_id), inaczej zawyzysz trend.",
          factsOnFail: ["orders_by_day_not_deduplicated"],
          check: ({ sqlProfile }) => /count\s*\(\s*distinct\s+(s\.)?order_id/i.test(sqlProfile.sql),
        },
      ],
      successReply: "Trend jest, dzieki. To juz moge pokazac bez rumienca.",
      factsOnSuccess: ["orders_by_day_clean"],
    }),
  },
  scoring: { weight: 1.1, expectedSeconds: 210 },
});

export const genderRevenueWeek1 = defineTask({
  id: "gender_revenue_week1",
  fromActionId: "mk4",
  fromPersonId: "mkt_kasia",
  channelId: "mkt_kasia",
  title: "Gross per gender (Kasia)",
  brief:
    "Kasia chce gross revenue per gender do segmentacji kampanii. " +
    "Polacz sales z users, odfiltruj konta testowe i pogrupuj po users.gender.",
  initialSql:
    "-- Kasia: gross per gender\n" +
    "SELECT\n" +
    "  u.gender,\n" +
    "  SUM(s.gross) AS gross\n" +
    "FROM sales s\n" +
    "JOIN users u ON u.id = s.user_id\n" +
    "WHERE u.is_test = false\n" +
    "GROUP BY u.gender\n" +
    "ORDER BY gross DESC;",
  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "SQL nie przeszedl, a ja potrzebuje tego na segmentacje.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_and_users",
          severityOnFail: "wrong_request",
          replyOnFail: "Brakuje sales albo users. Gender jest w users, revenue w sales.",
          check: ({ sqlProfile }) => ["sales", "users"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "has_gender_and_gross",
          severityOnFail: "major_issue",
          replyOnFail: "Potrzebuje gender + gross. Tego nie skleje w slajd.",
          check: ({ resultProfile }) => {
            const cols = resultProfile?.columns.map(c => c.toLowerCase()) ?? [];
            return cols.some(c => c.includes("gender")) && cols.some(c => c.includes("gross"));
          },
        },
        {
          id: "filters_test_accounts",
          severityOnFail: "minor_issue",
          replyOnFail:
            "Wynik wezme, ale testowe konta potrafia tu popsuc segmentacje. Dodaj u.is_test = false.",
          factsOnFail: ["gender_revenue_includes_test_accounts"],
          check: ({ sqlProfile }) => /is_test\s*=\s*false/i.test(sqlProfile.sql),
        },
      ],
      successReply: "Elegancko, mam segmenty. Dzieki!",
      factsOnSuccess: ["gender_revenue_clean"],
    }),
  },
  scoring: { weight: 1.0, expectedSeconds: 240 },
});

export const refundReasonsWeek1 = defineTask({
  id: "refund_reasons_week1",
  fromActionId: "pr3",
  fromPersonId: "pm_radek",
  channelId: "pm_radek",
  title: "Powody refundow (Radek)",
  brief:
    "Radek chce ranking powodow refundow: reason, liczba refundow i kwota. " +
    "Uzyj refunds, pogrupuj po reason i posortuj po kwocie malejaco.",
  initialSql:
    "-- Radek: powody refundow\n" +
    "SELECT\n" +
    "  reason,\n" +
    "  COUNT(*) AS refunds,\n" +
    "  SUM(amount) AS refunded_amount\n" +
    "FROM refunds\n" +
    "GROUP BY reason\n" +
    "ORDER BY refunded_amount DESC;",
  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Nie mam wyniku, SQL sie wywalil. Popraw i wyslij jeszcze raz.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_refunds",
          severityOnFail: "wrong_request",
          replyOnFail: "To musi isc z refunds, inaczej nie zobaczymy powodow zwrotow.",
          check: ({ sqlProfile }) => sqlProfile.tables.includes("refunds"),
        },
        {
          id: "has_reason_count_amount",
          severityOnFail: "major_issue",
          replyOnFail:
            "Potrzebuje reason, liczby refundow i kwoty. Brakuje mi jednej z tych rzeczy.",
          check: ({ resultProfile }) => {
            const cols = resultProfile?.columns.map(c => c.toLowerCase()) ?? [];
            return (
              cols.some(c => c.includes("reason")) &&
              cols.some(c => c.includes("refund") || c.includes("count")) &&
              cols.some(c => c.includes("amount"))
            );
          },
        },
        {
          id: "ordered_by_amount_desc",
          severityOnFail: "minor_issue",
          replyOnFail: "Dane sa, ale posortuj po kwocie malejaco. Inaczej zaczniemy od drobnicy.",
          check: ({ result, resultProfile }) => {
            if (!result.ok || !resultProfile || resultProfile.rowCount < 2) return false;
            const amountIndex = resultProfile.columns.findIndex(c =>
              c.toLowerCase().includes("amount"),
            );
            if (amountIndex === -1) return false;
            const values = result.rows.map(r => Number(r[amountIndex])).filter(Number.isFinite);
            return values.every((value, index) => index === 0 || values[index - 1] >= value);
          },
        },
      ],
      successReply: "Ok, to juz wyglada jak trop. Dzieki.",
      factsOnSuccess: ["refund_reasons_clean"],
    }),
  },
  scoring: { weight: 1.1, expectedSeconds: 240 },
});

export const cityComplaintsWeek1 = defineTask({
  id: "city_complaints_week1",
  fromActionId: "hm3",
  fromPersonId: "hr_magda",
  channelId: "hr_magda",
  title: "Reklamacje per miasto (Magda)",
  brief:
    "Magda chce miasta z najwieksza liczba reklamacji. " +
    "Polacz complaints z users, odfiltruj konta testowe i pogrupuj po city.",
  initialSql:
    "-- Magda: reklamacje per miasto\n" +
    "SELECT\n" +
    "  u.city,\n" +
    "  COUNT(*) AS complaints\n" +
    "FROM complaints c\n" +
    "JOIN users u ON u.id = c.user_id\n" +
    "WHERE u.is_test = false\n" +
    "GROUP BY u.city\n" +
    "ORDER BY complaints DESC\n" +
    "LIMIT 10;",
  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Nie otwiera mi sie ten wynik. Mozesz poprawic SQL?",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_complaints_and_users",
          severityOnFail: "wrong_request",
          replyOnFail: "Potrzebuje complaints plus users, bo miasto siedzi przy userze.",
          check: ({ sqlProfile }) =>
            ["complaints", "users"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "has_city_and_complaints",
          severityOnFail: "major_issue",
          replyOnFail: "Chcialam miasto i liczbe reklamacji. Tu nie widze takiego ukladu.",
          check: ({ resultProfile }) => {
            const cols = resultProfile?.columns.map(c => c.toLowerCase()) ?? [];
            return cols.some(c => c.includes("city")) && cols.some(c => c.includes("complaint"));
          },
        },
        {
          id: "filters_test_accounts",
          severityOnFail: "minor_issue",
          replyOnFail: "Ok, ale wywal testowe konta, bo support nie chce ganiać QA.",
          factsOnFail: ["city_complaints_includes_test_accounts"],
          check: ({ sqlProfile }) => /is_test\s*=\s*false/i.test(sqlProfile.sql),
        },
      ],
      successReply: "Dzieki, mam liste miast do sprawdzenia.",
      factsOnSuccess: ["city_complaints_clean"],
    }),
  },
  scoring: { weight: 0.9, expectedSeconds: 210 },
});

export const ceoNetRevenueWeek1 = defineTask({
  id: "ceo_net_revenue_week1",
  fromActionId: "cm2",
  fromPersonId: "ceo_marek",
  channelId: "ceo_marek",
  title: "Net revenue (CEO)",
  brief:
    "Marek chce jedna liczbe: net revenue po odjeciu refundow. " +
    "Zsumuj sales.net i odejmij laczna kwote refunds.amount.",
  initialSql:
    "-- Marek: net revenue po refundach\n" +
    "SELECT\n" +
    "  (SELECT SUM(net) FROM sales) - (SELECT COALESCE(SUM(amount), 0) FROM refunds) AS net_revenue;",
  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Nie dziala.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_and_refunds",
          severityOnFail: "critical_fail",
          replyOnFail: "To nie jest revenue po refundach.",
          factsOnFail: ["ceo_net_revenue_wrong_source"],
          check: ({ sqlProfile }) => ["sales", "refunds"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "single_scalar",
          severityOnFail: "major_issue",
          replyOnFail: "Jedna liczba.",
          check: ({ resultProfile }) =>
            resultProfile?.rowCount === 1 && resultProfile.columns.length === 1,
        },
        {
          id: "subtracts_refunds",
          severityOnFail: "critical_fail",
          replyOnFail: "Nie widze odjecia refundow. To idzie do board packa.",
          factsOnFail: ["ceo_net_revenue_without_refunds"],
          check: ({ sqlProfile }) =>
            /-\s*\(?\s*select|sum\s*\(\s*s\.?net\s*-\s*/i.test(sqlProfile.sql),
        },
      ],
      successReply: "Ok.",
      factsOnSuccess: ["ceo_net_revenue_clean"],
    }),
  },
  scoring: { weight: 2.0, expectedSeconds: 180, reputationTarget: "ceo_marek" },
});
