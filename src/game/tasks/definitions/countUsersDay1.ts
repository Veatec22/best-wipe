import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 — Kuba (lead, Growth) prosi o liczbę userów w bazie.
 *
 * Cel narracyjny: sanity-check dostępu i pierwszy kontakt z handbookiem
 * (test accounts). Cel projektowy: pokazać, że validator widzi *źródło* —
 * nie da się przejść taska wysyłając `COUNT(*) FROM sales`.
 *
 * Validatory w kolejności od najgroźniejszego do kosmetycznego:
 *   1. query_executed     – wrong_request (bez wyniku nic nie ma sensu)
 *   2. uses_users_table   – wrong_request (COUNT z sales / refunds itp.)
 *   3. single_scalar_count – major_issue  (tabelka zamiast jednej liczby)
 *   4. positive_count     – major_issue  (wynik 0 / NaN)
 *   5. filters_test_accounts – minor_issue (handbook / soft flag)
 */
export const countUsersDay1 = defineTask({
  id: "count_users_day1",
  fromActionId: "k4",
  fromPersonId: "lead_kuba",
  channelId: "lead_kuba",
  title: "Liczba userów (Kuba)",
  brief:
    "Kuba prosi o liczbę userów w bazie. Chce sprawdzić, czy masz spięty dostęp.\n" +
    "Handbook: domyślnie raporty userowe filtrują konta testowe (is_test = false).",
  initialSql:
    '-- Day 1 · Kuba: "Daj mi liczbę userów"\n' +
    "SELECT COUNT(*) AS users\n" +
    "FROM users\n" +
    "WHERE is_test = false;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail:
            "Hmm, query się wywaliło — bez wyniku nie mam co zaraportować. Popraw i wyślij jeszcze raz.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_users_table",
          severityOnFail: "wrong_request",
          replyOnFail:
            "Ej mordo, ja prosiłem o liczbę USERÓW. To, co mi wysłałeś, nie jest z tabeli users. " +
            "Daj proste COUNT(*) FROM users.",
          factsOnFail: ["day1_sent_count_from_wrong_table"],
          check: ({ sqlProfile }) => sqlProfile.tables.includes("users"),
        },
        {
          id: "single_scalar_count",
          severityOnFail: "major_issue",
          replyOnFail:
            "Spodziewałem się jednej liczby, a dostałem tabelkę. Daj mi proste COUNT(*) z users.",
          check: ({ resultProfile }) =>
            resultProfile?.rowCount === 1 && resultProfile.columns.length === 1,
        },
        {
          id: "positive_count",
          severityOnFail: "major_issue",
          replyOnFail:
            "Dostałem zero / NaN — coś się nie zgadza. Sprawdź czy w ogóle są dane w users.",
          check: ({ result, resultProfile }) => {
            if (!result.ok || !resultProfile) return false;
            if (resultProfile.rowCount !== 1 || resultProfile.columns.length !== 1) return false;
            const cell = result.rows[0]?.[0];
            const num = typeof cell === "number" ? cell : Number(cell);
            return Number.isFinite(num) && num > 0;
          },
        },
        {
          id: "filters_test_accounts",
          severityOnFail: "minor_issue",
          replyOnFail:
            "Ok, działa. Drobna uwaga: w handbooku jest, że userowe raporty domyślnie filtrują " +
            "konta testowe (is_test = false). Tym razem przeżyjemy, ale zapamiętaj.",
          factsOnFail: ["day1_users_metric_includes_test_accounts"],
          check: ({ sqlProfile }) => /is_test\s*=\s*false/i.test(sqlProfile.sql),
        },
      ],

      successReply: "Ok, dostęp masz spięty. Idziemy dalej.",
      factsOnSuccess: ["day1_kuba_access_check_clean"],
    }),
  },

  /**
   * Scoring tuning:
   *  - weight 1.0 — to jest prosty sanity check, nie chcemy przeładować
   *    skali na pierwszym tasku.
   *  - expectedSeconds 90 — Kuba mówi "spokojny start". Pół minuty real time
   *    to 4 in-game minuty, więc 90s ≈ 12 in-game minut, w sam raz.
   *  - reputationTarget = lead_kuba (default — task zlecony przez Kubę).
   */
  scoring: {
    weight: 1,
    expectedSeconds: 90,
  },
});
