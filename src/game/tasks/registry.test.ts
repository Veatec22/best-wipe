import { expect, test } from "bun:test";
import { findTaskByActionId, getTaskDefinition } from "./registry";

test("PM day 1 report action is registered as a sql_report task", () => {
  const def = findTaskByActionId("p2");

  expect(def?.id).toBe("pm_revenue_by_country_report_day1");
  expect(def?.kind).toBe("sql_report");
  expect(getTaskDefinition("pm_revenue_by_country_report_day1")).toBe(def);
});
