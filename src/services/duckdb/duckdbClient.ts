import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbEhWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import duckdbMvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckdbMvp from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";

const BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: duckdbMvp, mainWorker: duckdbMvpWorker },
  eh: { mainModule: duckdbEh, mainWorker: duckdbEhWorker },
};

export type DuckDBHandle = {
  db: duckdb.AsyncDuckDB;
  conn: duckdb.AsyncDuckDBConnection;
};

let handlePromise: Promise<DuckDBHandle> | null = null;

export function getDuckDB(): Promise<DuckDBHandle> {
  if (!handlePromise) {
    handlePromise = init();
  }
  return handlePromise;
}

async function init(): Promise<DuckDBHandle> {
  const bundle = await duckdb.selectBundle(BUNDLES);
  if (!bundle.mainWorker) {
    throw new Error("DuckDB-WASM bundle is missing a worker");
  }
  const worker = new Worker(bundle.mainWorker);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  const conn = await db.connect();
  return { db, conn };
}
