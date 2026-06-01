export type ReportChartType = "bar" | "line";

export interface ReportChartConfig {
  chartType: ReportChartType | null;
  xColumn: string | null;
  yColumn: string | null;
}
