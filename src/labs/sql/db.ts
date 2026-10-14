import type { Database, SqlJsStatic } from "sql.js";

export type LabDb = {
  tables(): string[];
  run(sql: string): { columns: string[]; rows: unknown[][] }[];
  reset(): void;
};

/** In-memory copy of the original bytes: the visitor may break it, reset() brings it back. */
export function openDb(bytes: Uint8Array, SQL: SqlJsStatic): LabDb {
  // sql.js may adopt the buffer it is given: always hand it a copy, so the original survives a DELETE
  const fresh = () => new SQL.Database(new Uint8Array(bytes));
  let db: Database = fresh();
  return {
    tables: () =>
      db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values.map((r) => String(r[0])) ?? [],
    run: (sql) => db.exec(sql).map((r) => ({ columns: r.columns, rows: r.values })),
    reset() {
      db.close();
      db = fresh();
    },
  };
}

export async function loadDb(url: string): Promise<LabDb> {
  const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([import("sql.js"), import("sql.js/dist/sql-wasm.wasm?url")]);
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return openDb(new Uint8Array(await res.arrayBuffer()), SQL);
}
