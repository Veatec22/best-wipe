import type { QueryResult } from "../../services/duckdb/queryRunner";
import type { ResultProfile, SqlProfile } from "./taskTypes";

/**
 * Heuristic SQL profiler. Strips comments, then captures bare identifiers
 * appearing right after FROM / JOIN. This is intentionally crude — the
 * architecture doc explicitly rules out a full SQL parser for v1. The point
 * is to catch obvious "wrong source" mistakes (e.g. counting `sales` when
 * the task asked for `users`), not to be perfectly correct.
 *
 * Limitations (acceptable for Week 1):
 *  - subqueries / CTE names show up as "tables".
 *  - schema-qualified names like `main.users` collapse to `users`.
 *  - aliases like `FROM users u` correctly capture `users`.
 */
export function profileSql(sql: string): SqlProfile {
  const stripped = sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

  const tables = new Set<string>();
  const re = /\b(?:from|join)\s+(?:[a-zA-Z_][a-zA-Z0-9_]*\s*\.\s*)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration
  while ((match = re.exec(stripped)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  return { sql, tables: [...tables] };
}

export function profileResult(result: QueryResult): ResultProfile | null {
  if (!result.ok) return null;
  return { rowCount: result.rowCount, columns: result.columns };
}
