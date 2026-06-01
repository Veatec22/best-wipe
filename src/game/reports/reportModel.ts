import type { QueryResult } from "../../services/duckdb/queryRunner";
import type { ReportChartConfig, ReportChartType } from "./reportTypes";

export interface ReportChartRow {
  x: string;
  y: number;
}

export interface ClassifiedReportFields {
  dimensions: string[];
  measures: string[];
}

export function getReportColumns(result: QueryResult | null): string[] {
  if (!result?.ok) return [];
  return result.columns;
}

export function canBuildReport(result: QueryResult | null): boolean {
  return Boolean(result?.ok && result.columns.length >= 2 && result.rowCount > 0);
}

export function isCompleteReportConfig(
  config: ReportChartConfig | null,
): config is { chartType: ReportChartType; xColumn: string; yColumn: string } {
  return Boolean(config?.chartType && config.xColumn && config.yColumn);
}

export function isValidReportConfig(
  result: QueryResult | null,
  config: ReportChartConfig | null,
): boolean {
  if (!isCompleteReportConfig(config)) return false;
  const { xColumn, yColumn } = config;
  if (xColumn === yColumn) return false;
  const columns = new Set(getReportColumns(result));
  return columns.has(xColumn) && columns.has(yColumn);
}

export function buildReportChartRows(
  result: QueryResult | null,
  config: ReportChartConfig | null,
): ReportChartRow[] {
  if (!result?.ok || !isCompleteReportConfig(config)) return [];
  const { xColumn, yColumn } = config;
  const xIndex = result.columns.indexOf(xColumn);
  const yIndex = result.columns.indexOf(yColumn);
  if (xIndex === -1 || yIndex === -1 || xIndex === yIndex) return [];

  return result.rows.flatMap(row => {
    const y = Number(row[yIndex]);
    if (!Number.isFinite(y)) return [];
    return [{ x: formatChartLabel(row[xIndex]), y }];
  });
}

export function classifyReportFields(result: QueryResult | null): ClassifiedReportFields {
  if (!result?.ok) return { dimensions: [], measures: [] };
  const dimensions: string[] = [];
  const measures: string[] = [];

  for (const [index, column] of result.columns.entries()) {
    const values = result.rows
      .map(row => row[index])
      .filter(value => value !== null && value !== undefined);
    const numericValues = values.filter(value => Number.isFinite(Number(value)));
    if (values.length > 0 && numericValues.length === values.length) {
      measures.push(column);
    } else {
      dimensions.push(column);
    }
  }

  return { dimensions, measures };
}

function formatChartLabel(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  return String(value);
}
