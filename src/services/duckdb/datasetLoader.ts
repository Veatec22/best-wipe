import campaignsCsv from "../../../data/ENG/campaigns.csv?url";
import complaintsCsv from "../../../data/ENG/complaints.csv?url";
import countriesCsv from "../../../data/ENG/countries.csv?url";
import productsCsv from "../../../data/ENG/products.csv?url";
import refundsCsv from "../../../data/ENG/refunds.csv?url";
import salesCsv from "../../../data/ENG/sales.csv?url";
import usersCsv from "../../../data/ENG/users.csv?url";
import type { FactsStore } from "../../game/facts";
import { activeVariantKeys, type VariantKey } from "../../game/variants";
import type { DuckDBHandle } from "./duckdbClient";

const AVAILABLE_FROM_DAY_COLUMN = "available_from_day";
const VARIANT_KEY_COLUMN = "variant_key";
const METADATA_COLUMNS = new Set([AVAILABLE_FROM_DAY_COLUMN, VARIANT_KEY_COLUMN]);

export interface CsvSource {
  table: string;
  url: string;
  gated: boolean;
}

const SOURCES: CsvSource[] = [
  { table: "countries", url: countriesCsv, gated: false },
  { table: "products", url: productsCsv, gated: false },
  { table: "campaigns", url: campaignsCsv, gated: false },
  { table: "users", url: usersCsv, gated: true },
  { table: "sales", url: salesCsv, gated: true },
  { table: "refunds", url: refundsCsv, gated: true },
  { table: "complaints", url: complaintsCsv, gated: true },
];

export interface RebuildDatasetInput {
  handle: DuckDBHandle;
  day: number;
  facts: Pick<FactsStore, "get">;
}

export interface RuntimeRowSelectionInput {
  day: number;
  activeVariantKeys: ReadonlySet<string>;
}

export type RuntimeRow = Record<string, unknown>;

let registered = false;
let loadedStaticTables = false;
let runtimeKey: string | null = null;
let rebuildPromise: Promise<void> | null = null;

export function loadWeek1Dataset(handle: DuckDBHandle): Promise<void> {
  return rebuildDataset({ handle, day: 1, facts: EMPTY_FACTS });
}

export function ensureDatasetLoaded(input: RebuildDatasetInput): Promise<void> {
  if (runtimeKey) return Promise.resolve();
  return rebuildDataset(input);
}

export function rebuildDataset(input: RebuildDatasetInput): Promise<void> {
  const variants = activeVariantKeys(input.facts);
  const nextRuntimeKey = createRuntimeKey(input.day, variants);
  if (runtimeKey === nextRuntimeKey && loadedStaticTables) return Promise.resolve();
  if (rebuildPromise) return rebuildPromise.then(() => rebuildDataset(input));
  if (!rebuildPromise) {
    rebuildPromise = doRebuild(input.handle, input.day, variants, nextRuntimeKey).finally(() => {
      rebuildPromise = null;
    });
  }
  return rebuildPromise;
}

export function selectRuntimeRows(
  rows: readonly RuntimeRow[],
  input: RuntimeRowSelectionInput,
): RuntimeRow[] {
  return rows
    .filter(
      row => rowIsAvailable(row, input.day) && rowVariantIsActive(row, input.activeVariantKeys),
    )
    .map(stripMetadataColumns);
}

async function doRebuild(
  handle: DuckDBHandle,
  day: number,
  variants: ReadonlySet<VariantKey>,
  nextRuntimeKey: string,
): Promise<void> {
  await registerSources(handle);

  for (const src of SOURCES) {
    if (!src.gated && loadedStaticTables) continue;
    if (!src.gated) {
      await createTableFromCsv(handle, src, day, variants, false);
    }
  }

  for (const src of SOURCES) {
    if (src.gated) await createTableFromCsv(handle, src, day, variants, true);
  }

  loadedStaticTables = true;
  runtimeKey = nextRuntimeKey;
}

async function registerSources(handle: DuckDBHandle): Promise<void> {
  if (registered) return;
  for (const src of SOURCES) {
    const res = await fetch(src.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${src.table}.csv (${res.status})`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    await handle.db.registerFileBuffer(csvFileName(src), buf);
  }
  registered = true;
}

async function createTableFromCsv(
  handle: DuckDBHandle,
  src: CsvSource,
  day: number,
  variants: ReadonlySet<VariantKey>,
  gated: boolean,
): Promise<void> {
  const rawTable = quoteIdentifier(`__raw_${src.table}`);
  await handle.conn.query(
    `CREATE OR REPLACE TEMP TABLE ${rawTable} AS
     SELECT * FROM read_csv_auto(${sqlString(csvFileName(src))}, header=true)`,
  );

  const schema = await handle.conn.query(`SELECT * FROM ${rawTable} LIMIT 0`);
  const columns = schema.schema.fields.map(field => field.name);
  const visibleColumns = columns.filter(column => !METADATA_COLUMNS.has(column));
  const projection = visibleColumns.map(quoteIdentifier).join(", ");
  const where = gated ? buildWhereClause(columns, day, variants) : "";

  await handle.conn.query(
    `CREATE OR REPLACE TABLE ${quoteIdentifier(src.table)} AS
     SELECT ${projection} FROM ${rawTable}${where}`,
  );
}

function buildWhereClause(
  columns: readonly string[],
  day: number,
  variants: ReadonlySet<VariantKey>,
): string {
  const clauses: string[] = [];
  if (columns.includes(AVAILABLE_FROM_DAY_COLUMN)) {
    clauses.push(`CAST(${quoteIdentifier(AVAILABLE_FROM_DAY_COLUMN)} AS INTEGER) <= ${day}`);
  }
  if (columns.includes(VARIANT_KEY_COLUMN)) {
    const variantColumn = `CAST(${quoteIdentifier(VARIANT_KEY_COLUMN)} AS VARCHAR)`;
    const active = [...variants].map(sqlString);
    const variantClause =
      active.length === 0
        ? `(${variantColumn} IS NULL OR ${variantColumn} = '')`
        : `(${variantColumn} IS NULL OR ${variantColumn} = '' OR ${variantColumn} IN (${active.join(
            ", ",
          )}))`;
    clauses.push(variantClause);
  }
  if (clauses.length === 0) return "";
  return ` WHERE ${clauses.join(" AND ")}`;
}

function rowIsAvailable(row: RuntimeRow, day: number): boolean {
  if (!(AVAILABLE_FROM_DAY_COLUMN in row)) return true;
  const availableFromDay = Number(row[AVAILABLE_FROM_DAY_COLUMN]);
  if (!Number.isFinite(availableFromDay)) return true;
  return availableFromDay <= day;
}

function rowVariantIsActive(row: RuntimeRow, variants: ReadonlySet<string>): boolean {
  if (!(VARIANT_KEY_COLUMN in row)) return true;
  const variant = row[VARIANT_KEY_COLUMN];
  if (variant === null || variant === undefined || variant === "") return true;
  return variants.has(String(variant));
}

function stripMetadataColumns(row: RuntimeRow): RuntimeRow {
  const visible: RuntimeRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (!METADATA_COLUMNS.has(key)) visible[key] = value;
  }
  return visible;
}

function createRuntimeKey(day: number, variants: ReadonlySet<VariantKey>): string {
  return `${day}:${[...variants].sort().join(",")}`;
}

function csvFileName(src: CsvSource): string {
  return `${src.table}.csv`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const EMPTY_FACTS: Pick<FactsStore, "get"> = {
  get: () => undefined,
};
