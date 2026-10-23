import { useState } from "react";
import { BD_ANSWER, BD_TARGET, ESITI, FIELDS, MAX_WHERE, STUDENTS, TUTOR, VALUES, checkBd, runQuery, type Query } from "../../lib/aula/bd";

/*
 * The two registers on the desk, the board's question over them, and the
 * query under them, made of cards: tap a slot and pick its card. The query
 * run is the answer handed in, and its rows stay written under it. The
 * tutor sits by the registers and helps with nothing. Once passed, the
 * student found stays marked in the register.
 */

type Cond = Query["where"][number];
/** The slot whose cards are laid out: the SELECT, a side of the ON, or a condition's field or value. */
type Slot = "select" | "on0" | "on1" | `f${number}` | `v${number}`;

const table = (field: string) => field.split(".")[0];

function Card({ label, onClick, on }: { label: string; onClick: () => void; on?: boolean }) {
  return (
    <button type="button" className="aula-bd__card" aria-pressed={on} onClick={onClick}>
      {label}
    </button>
  );
}

export default function Bd({ passed, onTry }: { passed: boolean; onTry: (ok: boolean) => void }) {
  const [select, setSelect] = useState(FIELDS[0]);
  const [join, setJoin] = useState(false);
  const [on, setOn] = useState<[string, string]>([FIELDS[0], FIELDS[0]]);
  const [where, setWhere] = useState<Cond[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [tutor, setTutor] = useState(-1);

  const query: Query = { select, join, on: join ? on : null, where };
  const from = table(select);
  const other = from === "studenti" ? "esiti" : "studenti";

  const toggle = (s: Slot) => setSlot(slot === s ? null : s);
  const setCond = (i: number, c: Cond) => setWhere(where.map((w, k) => (k === i ? c : w)));
  const pickCard = (card: string) => {
    if (slot === "select") setSelect(card);
    else if (slot === "on0") setOn([card, on[1]]);
    else if (slot === "on1") setOn([on[0], card]);
    else if (slot) {
      const i = Number(slot.slice(1));
      const [f, op, v] = where[i];
      setCond(i, slot[0] === "f" ? [card, op, v] : [f, op, card]);
    }
    setSlot(null);
  };
  const run = () => {
    const r = runQuery(query);
    setRows(r);
    setSlot(null);
    onTry(checkBd(r));
  };

  return (
    <div className="aula-bd">
      <p className="aula-bd__target aula-sheet__keep">{BD_TARGET}</p>
      <div className="aula-bd__registers aula-sheet__keep">
        <table>
          <caption>studenti</caption>
          <thead>
            <tr>
              <th>nome</th>
              <th>matricola</th>
            </tr>
          </thead>
          <tbody>
            {STUDENTS.map((s) => (
              <tr key={s.matricola} aria-current={passed && s.matricola === BD_ANSWER}>
                <td>{s.name}</td>
                <td>{s.matricola}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table>
          <caption>esiti</caption>
          <thead>
            <tr>
              <th>matricola</th>
              <th>esame</th>
              <th>esito</th>
            </tr>
          </thead>
          <tbody>
            {ESITI.map((x, k) => (
              <tr key={k}>
                <td>{x.matricola}</td>
                <td>{x.esame}</td>
                <td>{x.esito}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {passed ? (
        <p className="aula-arch__byte">matricola {BD_ANSWER} · superato</p>
      ) : (
        <div className="aula-bd__query">
          <div className="aula-bd__line">
            <b>SELECT</b>
            <Card label={select} on={slot === "select"} onClick={() => toggle("select")} />
          </div>
          <div className="aula-bd__line">
            <b>FROM</b> {from}
            <Card label={join ? `JOIN ${other}` : "+ JOIN"} on={join} onClick={() => setJoin(!join)} />
          </div>
          {join && (
            <div className="aula-bd__line">
              <b>ON</b>
              <Card label={on[0]} on={slot === "on0"} onClick={() => toggle("on0")} />=
              <Card label={on[1]} on={slot === "on1"} onClick={() => toggle("on1")} />
            </div>
          )}
          {where.map(([f, op, v], i) => (
            <div className="aula-bd__line" key={i}>
              <b>{i ? "AND" : "WHERE"}</b>
              <Card label={f} on={slot === `f${i}`} onClick={() => toggle(`f${i}`)} />
              <Card label={op} onClick={() => setCond(i, [f, op === "=" ? "!=" : "=", v])} />
              <Card label={`'${v}'`} on={slot === `v${i}`} onClick={() => toggle(`v${i}`)} />
              <button type="button" className="aula-bd__card" aria-label="togli la condizione" onClick={() => (setWhere(where.filter((_, k) => k !== i)), setSlot(null))}>
                ×
              </button>
            </div>
          ))}
          {where.length < MAX_WHERE && (
            <div className="aula-bd__line">
              <Card label={where.length ? "+ AND" : "+ WHERE"} onClick={() => setWhere([...where, [FIELDS[0], "=", VALUES[0]]])} />
            </div>
          )}
          {slot && (
            <div className="aula-bd__cards" role="group" aria-label="I cartellini">
              {(slot[0] === "v" ? VALUES : FIELDS).map((c) => (
                <Card key={c} label={c} onClick={() => pickCard(c)} />
              ))}
            </div>
          )}
          <button type="button" className="aula-stub" onClick={run}>
            esegui
          </button>
        </div>
      )}

      {rows && !passed && (
        <div className="aula-bd__rows aula-sheet__keep" role="status">
          {rows.length} {rows.length === 1 ? "riga" : "righe"}
          {rows.slice(0, 6).map((r, k) => (
            <code key={k}>{r.join(" · ")}</code>
          ))}
          {rows.length > 6 && <code>…</code>}
        </div>
      )}

      <div className="aula-bd__tutor aula-sheet__keep">
        <button type="button" className="aula-bd__card" onClick={() => setTutor((tutor + 1) % TUTOR.length)}>
          <span aria-hidden="true">🧑‍🎓</span> tutor
        </button>
        {tutor >= 0 && <p>«{TUTOR[tutor]}»</p>}
      </div>
    </div>
  );
}
