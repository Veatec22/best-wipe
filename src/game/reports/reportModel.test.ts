import { expect, test } from "bun:test";
import type { QueryResult } from "../../services/duckdb/queryRunner";
import {
  buildReportChartRows,
  canBuildReport,
  classifyReportFields,
  getReportColumns,
  isCompleteReportConfig,
  isValidReportConfig,
} from "./reportModel";
import type { ReportChartConfig } from "./reportTypes";

const result: QueryResult = {
  ok: true,
  columns: ["country_name", "revenue"],
  rows: [
    ["Poland", 120],
    ["Germany", 90],
  ],
  rowCount: 2,
  truncated: false,
  durationMs: 12,
};

test("report builder exposes only columns from a successful query result", () => {
  expect(getReportColumns(result)).toEqual(["country_name", "revenue"]);
  expect(getReportColumns({ ok: false, error: "bad sql", durationMs: 1 })).toEqual([]);
});

test("report builder requires a successful query with at least two columns and one row", () => {
  expect(canBuildReport(result)).toBe(true);
  expect(canBuildReport({ ...result, columns: ["country_name"] })).toBe(false);
  expect(canBuildReport({ ...result, rowCount: 0, rows: [] })).toBe(false);
  expect(canBuildReport({ ok: false, error: "bad sql", durationMs: 1 })).toBe(false);
});

test("report config is complete only when chart type, x, and y are selected", () => {
  expect(
    isCompleteReportConfig({
      chartType: "bar",
      xColumn: "country_name",
      yColumn: "revenue",
    }),
  ).toBe(true);

  expect(isCompleteReportConfig({ chartType: "bar", xColumn: "country_name", yColumn: null })).toBe(
    false,
  );
});

test("report config must reference distinct columns from the current query result", () => {
  const valid: ReportChartConfig = {
    chartType: "line",
    xColumn: "country_name",
    yColumn: "revenue",
  };
  expect(isValidReportConfig(result, valid)).toBe(true);

  expect(isValidReportConfig(result, { ...valid, xColumn: "missing" })).toBe(false);
  expect(isValidReportConfig(result, { ...valid, yColumn: "country_name" })).toBe(false);
});

test("report chart rows use selected x and numeric y values from the current query result", () => {
  expect(
    buildReportChartRows(
      {
        ...result,
        rows: [
          ["Poland", "120.5"],
          ["Germany", "n/a"],
          ["France", 80],
        ],
      },
      { chartType: "bar", xColumn: "country_name", yColumn: "revenue" },
    ),
  ).toEqual([
    { x: "Poland", y: 120.5 },
    { x: "France", y: 80 },
  ]);
});

test("report fields are split into dimensions and measures from result values", () => {
  expect(classifyReportFields(result)).toEqual({
    dimensions: ["country_name"],
    measures: ["revenue"],
  });
});
