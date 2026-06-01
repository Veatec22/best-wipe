import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import type {
  AskAiReportRequest,
  AskAiReportResponse,
  AskAiSqlRequest,
  SchemaTableMap,
} from "./types";

const SYSTEM_PROMPT = [
  "Jestes lokalnym asystentem SQL w grze Best Wipe.",
  "AI jest tylko sugestia dla gracza, nie walidatorem i nie zrodlem prawdy.",
  "WYGENERUJ WYLACZNIE pojedyncze zapytanie SQL SELECT.",
  "Nie dodawaj markdown, komentarzy, wyjasnien, tekstu przed SQL ani tekstu po SQL.",
  "Nie uzywaj INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, PRAGMA, COPY, ATTACH, INSTALL ani LOAD.",
  "Jesli task jest niejednoznaczny, przyjmij najbezpieczniejsza interpretacje zgodna z dokumentacja i schema.",
  "Domyslnie wyklucz konta testowe przez users.is_test = false, chyba ze zadanie mowi inaczej.",
].join("\n");

const DISALLOWED_SQL_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|MERGE|COPY|ATTACH|INSTALL|LOAD|CALL|PRAGMA)\b/i;

export function buildAskSqlMessages(request: AskAiSqlRequest): ChatCompletionMessageParam[] {
  const userSql = request.userSql?.trim();
  const sections = [
    section("KONTEKST GRY", request.gameContext),
    section("TRESC ZADANIA", request.taskBrief),
    section("SCHEMA TABEL", formatSchemaTables(request.schemaTables)),
    section("SQL USERA", userSql ? userSql : "Brak SQL usera."),
    section(
      "ODPOWIEDZ",
      "Zwroc tylko jedno gotowe zapytanie SELECT, ktore gracz moze skopiowac do edytora.",
    ),
  ];

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: sections.join("\n\n") },
  ];
}

export function buildAskReportMessages(request: AskAiReportRequest): ChatCompletionMessageParam[] {
  const sections = [
    section("TRESC ZADANIA", request.taskBrief),
    section("KOLUMNY WYNIKU SQL", request.columns.join(", ")),
    section("PRZYKLADOWE WIERSZE", formatSampleRows(request.sampleRows)),
    section(
      "ODPOWIEDZ",
      'Zwroc tylko JSON: {"chartType":"bar|line","xColumn":"nazwa","yColumn":"nazwa"}. ' +
        "Uzyj wylacznie kolumn z wyniku SQL. Nie dodawaj markdown ani komentarzy.",
    ),
  ];

  return [
    {
      role: "system",
      content: [
        "Jestes lokalnym asystentem BI w grze Best Wipe.",
        "AI jest tylko sugestia dla gracza, nie walidatorem i nie zrodlem prawdy.",
        "Dobierasz prosty wykres tylko z pol X i Y.",
        "WYGENERUJ WYLACZNIE poprawny JSON.",
      ].join("\n"),
    },
    { role: "user", content: sections.join("\n\n") },
  ];
}

export function extractSqlSelect(rawText: string): string {
  const candidate = stripMarkdownFence(rawText).trim();
  const sqlStart = findSqlStart(candidate);
  if (sqlStart === -1) {
    throw new Error("AI did not return a SELECT statement.");
  }

  const sql = candidate.slice(sqlStart).trim();
  if (!/^(SELECT|WITH)\b/i.test(sql)) {
    throw new Error("AI did not return a SELECT statement.");
  }
  if (DISALLOWED_SQL_KEYWORDS.test(sql)) {
    throw new Error("AI returned a non-read-only SQL keyword.");
  }
  if (hasMoreThanOneStatement(sql)) {
    throw new Error("AI returned more than one SQL statement.");
  }

  return sql;
}

export function extractReportChartConfig(
  rawText: string,
  allowedColumns: string[],
): Omit<AskAiReportResponse, "rawText" | "modelId"> {
  const jsonText = stripMarkdownFence(rawText).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI did not return valid report JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI did not return a report JSON object.");
  }

  const value = parsed as Record<string, unknown>;
  const chartType = value.chartType;
  const xColumn = value.xColumn;
  const yColumn = value.yColumn;
  if (
    (chartType !== "bar" && chartType !== "line") ||
    typeof xColumn !== "string" ||
    typeof yColumn !== "string"
  ) {
    throw new Error("AI returned an incomplete chart config.");
  }

  const columns = new Set(allowedColumns);
  if (!columns.has(xColumn) || !columns.has(yColumn) || xColumn === yColumn) {
    throw new Error("AI returned a chart config with unknown columns.");
  }

  return { chartType, xColumn, yColumn };
}

function formatSchemaTables(schemaTables: SchemaTableMap): string {
  return Object.entries(schemaTables)
    .map(([tableName, columns]) => `${tableName}(${columns.join(", ")})`)
    .join("\n");
}

function formatSampleRows(rows: unknown[][]): string {
  return rows
    .slice(0, 5)
    .map(row =>
      row.map(cell => (cell === null || cell === undefined ? "NULL" : String(cell))).join(" | "),
    )
    .join("\n");
}

function section(title: string, body: string): string {
  return `### ${title}\n${body}`;
}

function stripMarkdownFence(rawText: string): string {
  const fenceMatch = rawText.match(/```(?:sql|json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1];
  return rawText.replace(/^```(?:sql|json)?\s*/i, "").replace(/\s*```$/i, "");
}

function findSqlStart(text: string): number {
  const selectIndex = text.search(/\bSELECT\b/i);
  const withIndex = text.search(/\bWITH\b/i);
  if (selectIndex === -1) return withIndex;
  if (withIndex === -1) return selectIndex;
  return Math.min(selectIndex, withIndex);
}

function hasMoreThanOneStatement(sql: string): boolean {
  const statements = sql
    .split(";")
    .map(statement => statement.trim())
    .filter(Boolean);
  return statements.length > 1;
}
