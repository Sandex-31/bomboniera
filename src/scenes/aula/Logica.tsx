import { useState } from "react";
import { FORMULA, LOGICA_ANSWER, checkLogica, rowOf } from "../../lib/aula/logica";

/*
 * The abandoned notebook with the formula in it, and the row of desks: three
 * switches for p, q and r, and the bulb. The switches pick a row of the
 * table, a tap on the bulb marks it lit or dark for that row; the table
 * beside them is handed in whole. Once passed, the table stays written there,
 * for LFT's arrows.
 */

const ANSWER = Array.from({ length: 8 }, (_, k) => !!((LOGICA_ANSWER >> k) & 1));
const VARS = ["p", "q", "r"] as const;

function Bulb({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true">
      {lit && <circle cx="12" cy="11" r="11" fill="#F2D21B" opacity="0.3" />}
      <path d="M12 2a9 9 0 0 0-5 16.5V22h10v-3.5A9 9 0 0 0 12 2Z" fill={lit ? "#F2D21B" : "#F4EFE2"} stroke="#1A1410" strokeWidth="1.5" />
      <path d="M8 24h8M8 27h8M10 30h4" stroke="#1A1410" strokeWidth="1.5" />
    </svg>
  );
}

export default function Logica({ passed, onTry }: { passed: boolean; onTry: (ok: boolean) => void }) {
  /** The switches as a row number: p the highest bit. */
  const [sw, setSw] = useState(0);
  const [marks, setMarks] = useState(() => Array<boolean>(8).fill(false));
  const table = passed ? ANSWER : marks;
  const vals = rowOf(sw);

  const give = () => {
    setMarks(Array<boolean>(8).fill(false));
    onTry(checkLogica(marks));
  };

  return (
    <div className="aula-logica">
      <p className="aula-logica__note">{FORMULA}</p>
      <div className="aula-logica__bench">
        <div className="aula-logica__switches" role="group" aria-label="Gli interruttori e la lampadina">
          {VARS.map((v, i) => (
            <button key={v} type="button" className="aula-lever" aria-pressed={vals[i]} aria-label={v} onClick={() => !passed && setSw(sw ^ (4 >> i))}>
              <span>
                {v} {vals[i] ? "1" : "0"}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="aula-logica__bulb"
            aria-pressed={table[sw]}
            aria-label={`lampadina, riga ${sw + 1}`}
            onClick={() => !passed && setMarks((m) => m.map((b, k) => (k === sw ? !b : b)))}
          >
            <Bulb lit={table[sw]} />
          </button>
        </div>
        <table className="aula-logica__table">
          <thead>
            <tr>
              <th />
              {VARS.map((v) => (
                <th key={v}>{v}</th>
              ))}
              <th aria-label="lampadina">💡</th>
            </tr>
          </thead>
          <tbody>
            {table.map((lit, k) => (
              <tr key={k} aria-current={!passed && k === sw ? "true" : undefined}>
                <th>{k + 1}</th>
                {rowOf(k).map((b, i) => (
                  <td key={i}>{b ? 1 : 0}</td>
                ))}
                <td>{lit ? 1 : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {passed ? (
        <p className="aula-arch__byte">{ANSWER.map(Number).join("")} · superato</p>
      ) : (
        <button type="button" className="aula-stub" onClick={give}>
          consegna la tavola
        </button>
      )}
    </div>
  );
}
