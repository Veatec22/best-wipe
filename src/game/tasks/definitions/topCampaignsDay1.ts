import { defaultBranch, defineTask } from "../defineTask";

/**
 * Day 1 · #6 — Marketing Kasia: ranking kampanii po gross.
 *
 * Pułapki / scoring:
 *  - źródło: sales JOIN campaigns
 *  - gotcha: część sprzedaży ma campaign_id NULL (organic) — trzeba odfiltrować,
 *    inaczej w rankingu pojawi się dziwny "(null)".
 */
export const topCampaignsDay1 = defineTask({
  id: "top_campaigns_day1",
  fromActionId: "mk3",
  fromPersonId: "mkt_kasia",
  channelId: "mkt_kasia",
  title: "Ranking kampanii po gross (Kasia)",
  brief:
    "Kasia chce ranking kampanii po gross revenue. " +
    "Pamiętaj, że część sprzedaży nie ma kampanii (NULL) — to nie kampania, tylko organic.",
  initialSql:
    "-- Day 1 · Kasia: ranking kampanii po gross\n" +
    "SELECT\n" +
    "  c.name AS campaign,\n" +
    "  SUM(s.gross) AS gross\n" +
    "FROM sales s\n" +
    "JOIN campaigns c ON c.id = s.campaign_id\n" +
    "WHERE s.campaign_id IS NOT NULL\n" +
    "GROUP BY c.name\n" +
    "ORDER BY gross DESC;",

  branches: {
    default: defaultBranch({
      validators: [
        {
          id: "query_executed",
          severityOnFail: "wrong_request",
          replyOnFail: "Query nie przeszło, nie mam rankingu na sync.",
          check: ({ result }) => result.ok,
        },
        {
          id: "uses_sales_and_campaigns",
          severityOnFail: "wrong_request",
          replyOnFail: "Bez sales + campaigns nie ma rankingu.",
          factsOnFail: ["top_campaigns_wrong_source"],
          check: ({ sqlProfile }) =>
            ["sales", "campaigns"].every(t => sqlProfile.tables.includes(t)),
        },
        {
          id: "filters_null_campaign",
          severityOnFail: "major_issue",
          replyOnFail:
            "W rankingu nie chcę widzieć NULL/organic jako kampanii. Dodaj WHERE campaign_id IS NOT NULL.",
          factsOnFail: ["top_campaigns_includes_null"],
          check: ({ sqlProfile }) =>
            /campaign_id\s+is\s+not\s+null/i.test(sqlProfile.sql) ||
            /\bjoin\s+campaigns\b[\s\S]*\bon\b[\s\S]*campaign_id/i.test(sqlProfile.sql),
        },
        {
          id: "ordered_desc_by_gross",
          severityOnFail: "major_issue",
          replyOnFail: "Brakuje sortowania od największego gross — ranking ma być od góry.",
          check: ({ result, resultProfile }) => {
            if (!result.ok || !resultProfile || resultProfile.rowCount < 2) return false;
            const grossIdx = resultProfile.columns.findIndex(c =>
              c.toLowerCase().includes("gross"),
            );
            const colIdx = grossIdx === -1 ? resultProfile.columns.length - 1 : grossIdx;
            const values = result.rows.map(r => Number(r[colIdx])).filter(n => Number.isFinite(n));
            return values.every((v, i) => i === 0 || values[i - 1] >= v);
          },
        },
      ],

      successReply: "Super ranking, leci na slajd. Dzięki!",
      factsOnSuccess: ["top_campaigns_clean"],
    }),
  },
  scoring: { weight: 1.0, expectedSeconds: 240 },
});
