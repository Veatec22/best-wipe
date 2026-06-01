import { useFactsStore } from "../../store/factsStore";
import { persistQueryRun } from "../persistence/records";
import { getActiveRunId } from "../persistence/runs";
import { ensureDatasetLoaded } from "./datasetLoader";
import { getDuckDB } from "./duckdbClient";

export type QuerySuccess = {
  ok: true;
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
};

export type QueryFailure = {
  ok: false;
  error: string;
  durationMs: number;
};

export type QueryResult = QuerySuccess | QueryFailure;

const MAX_PREVIEW_ROWS = 500;

export async function runQuery(sql: string): Promise<QueryResult> {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { ok: false, error: "Empty query", durationMs: 0 };
  }
  const start = performance.now();
  try {
    const handle = await getDuckDB();
    await ensureDatasetLoaded({ handle, day: 1, facts: useFactsStore.getState() });
    const result = await handle.conn.query(trimmed);
    const fields = result.schema.fields;
    const columns = fields.map(f => f.name);
    const totalRows = result.numRows;
    const truncated = totalRows > MAX_PREVIEW_ROWS;
    const limit = truncated ? MAX_PREVIEW_ROWS : totalRows;
    const rows: unknown[][] = [];
    for (let i = 0; i < limit; i++) {
      const record = result.get(i);
      if (!record) continue;
      const row: unknown[] = new Array(columns.length);
      for (let c = 0; c < columns.length; c++) {
        row[c] = normalizeCell(record[columns[c]]);
      }
      rows.push(row);
    }
    const queryResult: QueryResult = {
      ok: true,
      columns,
      rows,
      rowCount: totalRows,
      truncated,
      durationMs: Math.round(performance.now() - start),
    };
    persistRun(trimmed, queryResult);
    return queryResult;
  } catch (err) {
    const queryResult: QueryResult = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Math.round(performance.now() - start),
    };
    persistRun(trimmed, queryResult);
    return queryResult;
  }
}

function persistRun(sql: string, result: QueryResult): void {
  const runId = getActiveRunId();
  if (runId) void persistQueryRun(runId, { sql, result });
}

function normalizeCell(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  return value;
}
