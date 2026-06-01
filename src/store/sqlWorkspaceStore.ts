import { create } from "zustand";
import type { QueryResult } from "../services/duckdb/queryRunner";

export const INITIAL_SQL = `-- Scratchpad · use bottom-right RUN (or Ctrl+Enter) to execute.
SELECT *
FROM users
WHERE is_test = false
LIMIT 20;`;

interface SqlWorkspaceState {
  sql: string;
  result: QueryResult | null;
  setSql(sql: string): void;
  setResult(result: QueryResult | null): void;
  replace(input: { sql: string; result: QueryResult | null }): void;
}

export const useSqlWorkspaceStore = create<SqlWorkspaceState>(set => ({
  sql: INITIAL_SQL,
  result: null,
  setSql: sql => set({ sql }),
  setResult: result => set({ result }),
  replace: input => set(input),
}));
