import { aovDay1 } from "./definitions/aovDay1";
import { countUsersDay1 } from "./definitions/countUsersDay1";
import {
  ceoNetRevenueWeek1,
  cityComplaintsWeek1,
  genderRevenueWeek1,
  ordersByDayWeek1,
  refundReasonsWeek1,
} from "./definitions/extraWeek1Tasks";
import { monthlySalesDay1 } from "./definitions/monthlySalesDay1";
import { pmRevenueByCountryReportDay1 } from "./definitions/pmRevenueByCountryReportDay1";
import { revenueAfterRefundsDay1 } from "./definitions/revenueAfterRefundsDay1";
import { salesByCountryDay1 } from "./definitions/salesByCountryDay1";
import { testAccountsImpactDay1 } from "./definitions/testAccountsImpactDay1";
import { topCampaignsDay1 } from "./definitions/topCampaignsDay1";
import { topCitiesDay1 } from "./definitions/topCitiesDay1";
import { topComplaintsUsersDay1 } from "./definitions/topComplaintsUsersDay1";
import { topProductsDay1 } from "./definitions/topProductsDay1";
import { topRefundedProductsDay1 } from "./definitions/topRefundedProductsDay1";
import type { TaskDefinition } from "./taskTypes";

/**
 * Registry of all task definitions known to the game.
 *
 * To add a new quest:
 *   1. Drop a new file in `definitions/`, exporting a `TaskDefinition`.
 *   2. Make sure its `fromActionId` matches an `action_request` message in
 *      `src/data/messages.ts` *or* `src/game/scheduledMessages.ts` (the
 *      latter is for time-of-day delivered tasks).
 *   3. Register it here.
 *
 * The campaign content (chat messages) and the validation logic stay decoupled:
 * messages just announce the task, the registry binds the action button to a
 * concrete validator + reply.
 */
export const TASK_DEFINITIONS: Record<string, TaskDefinition> = {
  [countUsersDay1.id]: countUsersDay1,
  [pmRevenueByCountryReportDay1.id]: pmRevenueByCountryReportDay1,
  [monthlySalesDay1.id]: monthlySalesDay1,
  [topProductsDay1.id]: topProductsDay1,
  [salesByCountryDay1.id]: salesByCountryDay1,
  [testAccountsImpactDay1.id]: testAccountsImpactDay1,
  [revenueAfterRefundsDay1.id]: revenueAfterRefundsDay1,
  [topCampaignsDay1.id]: topCampaignsDay1,
  [topRefundedProductsDay1.id]: topRefundedProductsDay1,
  [topComplaintsUsersDay1.id]: topComplaintsUsersDay1,
  [aovDay1.id]: aovDay1,
  [topCitiesDay1.id]: topCitiesDay1,
  [ordersByDayWeek1.id]: ordersByDayWeek1,
  [genderRevenueWeek1.id]: genderRevenueWeek1,
  [refundReasonsWeek1.id]: refundReasonsWeek1,
  [cityComplaintsWeek1.id]: cityComplaintsWeek1,
  [ceoNetRevenueWeek1.id]: ceoNetRevenueWeek1,
};

export function findTaskByActionId(actionId: string): TaskDefinition | undefined {
  for (const def of Object.values(TASK_DEFINITIONS)) {
    if (def.fromActionId === actionId) return def;
  }
  return undefined;
}

export function getTaskDefinition(taskId: string): TaskDefinition | undefined {
  return TASK_DEFINITIONS[taskId];
}
