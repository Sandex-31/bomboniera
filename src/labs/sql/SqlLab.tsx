import { useEffect, useState } from "react";
import { labsUrl } from "../paths";
import { loadDb, type LabDb } from "./db";

const DB_FILE: Record<string, string> = { catering: "catering.db", "food-delivery-db": "delivery.db" };
type Query = { title: string; sql: string };
type Junit = { total: number; failures: number; cases: { suite: string; name: string; time: number; ok: boolean; message?: string }[] };
type Result = ReturnType<LabDb["run"]>;

export default function SqlLab({ id }: { id: string }) {
  const [db, setDb] = useState<LabDb | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);
  const [junit, setJunit] = useState<Junit | null>(null);
  const [sql, setSql] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [fail, setFail] = useState("");

  useEffect(() => {
    loadDb(labsUrl(id, DB_FILE[id])).then(setDb).catch(() => setFail("Il database non si è caricato. Codice e documenti restano nelle altre schede."));
    fetch(labsUrl(id, "queries.json"))
      .then((r) => r.json())
      .then((q: Query[]) => {
        setQueries(q);
        setSql(q[0]?.sql ?? "");
      })
      .catch(() => {});
    if (id === "catering") fetch(labsUrl(id, "tests.json")).then((r) => r.json()).then(setJunit).catch(() => {});
  }, [id]);

  const exec = (text: string) => {
    if (!db) return;
    setSql(text);
    try {
      setRes(db.run(text));
      setError("");
    } catch (e) {
      setRes(null);
      setError((e as Error).message);
    }
  };

  if (fail) return <p className="empty">{fail}</p>;
  if (!db) return <p className="labs-loading">apro il database…</p>;
  return (
    <div className="sql">
      {id === "food-delivery-db" && <p className="demo-badge">dati generati per la demo</p>}
      <h4>Domande</h4>
      <div className="tags">{queries.map((q) => <button key={q.title} className="chip" onClick={() => exec(q.sql)}>{q.title}</button>)}</div>
      <h4>Tabelle</h4>
      <div className="tags">{db.tables().map((t) => <button key={t} className="chip" onClick={() => exec(`SELECT * FROM "${t}" LIMIT 50;`)}>{t}</button>)}</div>
      <textarea className="sql-editor" rows={7} value={sql} onChange={(e) => setSql(e.target.value)} spellCheck={false} aria-label="Query SQL" />
      <div className="links">
        <button className="link-btn" onClick={() => exec(sql)}>ESEGUI ▸</button>
        <button className="link-btn" onClick={() => { db.reset(); setRes(null); setError(""); }}>RIPRISTINA ↺</button>
      </div>
      {error && <p className="sql-error">{error}</p>}
      {res && res.length === 0 && <p className="labs-loading">fatto, nessuna riga da mostrare</p>}
      {res?.map((r, i) => (
        <div className="sql-table" key={i}>
          <table>
            <thead><tr>{r.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{r.rows.slice(0, 200).map((row, j) => <tr key={j}>{row.map((v, k) => <td key={k}>{v === null ? "NULL" : String(v)}</td>)}</tr>)}</tbody>
          </table>
          {r.rows.length > 200 && <p className="labs-loading">mostro 200 righe su {r.rows.length}</p>}
        </div>
      ))}
      {junit && (
        <section className="sql-junit">
          <h4>JUnit · {junit.total - junit.failures}/{junit.total} verdi</h4>
          <ul>{junit.cases.map((c) => <li key={c.suite + c.name}>{c.ok ? "✓" : "✗"} {c.suite} · {c.name} <small>{c.time}s</small>{c.message && <em> — {c.message}</em>}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
