import type { QueryResult } from "../services/duckdb/queryRunner";
import { DataGrid } from "./DataGrid";

type Props = {
  result: QueryResult | null;
  status: "idle" | "running" | "loading-runtime";
  loadingLabel: string;
  runningLabel: string;
  idleLabel: string;
  emptyLabel: string;
  errorLabel: string;
  filterPlaceholder: string;
  emptyAfterFilterLabel: string;
  rowsLabel: (count: number, durationMs: number) => string;
  truncatedLabel: (shown: number, total: number) => string;
};

export function QueryResultTable({
  result,
  status,
  loadingLabel,
  runningLabel,
  idleLabel,
  emptyLabel,
  errorLabel,
  filterPlaceholder,
  emptyAfterFilterLabel,
  rowsLabel,
  truncatedLabel,
}: Props) {
  if (status === "loading-runtime") {
    return <div className="df-result-status">{loadingLabel}</div>;
  }
  if (status === "running") {
    return <div className="df-result-status">{runningLabel}</div>;
  }
  if (!result) {
    return <div className="df-result-status muted">{idleLabel}</div>;
  }
  if (!result.ok) {
    return (
      <div className="df-result-error">
        <div className="df-result-error-head">{errorLabel}</div>
        <pre>{result.error}</pre>
      </div>
    );
  }
  if (result.columns.length === 0 || result.rowCount === 0) {
    return <div className="df-result-status muted">{emptyLabel}</div>;
  }
  return (
    <div className="df-result-wrap">
      <div className="df-result-meta">
        <span>{rowsLabel(result.rowCount, result.durationMs)}</span>
        {result.truncated && (
          <span className="df-result-trunc">
            {truncatedLabel(result.rows.length, result.rowCount)}
          </span>
        )}
      </div>
      <div className="df-result-scroll">
        <DataGrid
          columns={result.columns}
          rows={result.rows}
          filterPlaceholder={filterPlaceholder}
          emptyAfterFilterLabel={emptyAfterFilterLabel}
        />
      </div>
    </div>
  );
}
