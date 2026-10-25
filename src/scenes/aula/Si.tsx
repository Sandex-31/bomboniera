import { useState } from "react";
import { results } from "../../lib/aula/chain";
import { SI_ANSWER, checkSi, constraints } from "../../lib/aula/si";

/*
 * The libretto open by the laptop: nine boxes in a row, and under them the
 * page of constraints, each with a chip naming the exam whose result it is
 * written on. The digits are tapped in from the left on a keypad; once all
 * nine are in, they are handed in. Once passed, the boxes keep the code.
 */

const PAGE = constraints(results());

export default function Si({ passed, onTry }: { passed: boolean; onTry: (ok: boolean) => void }) {
  const [code, setCode] = useState<number[]>([]);
  const shown = passed ? [...SI_ANSWER].map(Number) : code;

  return (
    <div className="aula-si">
      <ol className="aula-si__boxes" aria-label="Le nove caselle" aria-live="polite">
        {Array.from({ length: 9 }, (_, i) => (
          <li key={i} aria-current={!passed && i === code.length ? "true" : undefined}>
            <b>{shown[i] ?? ""}</b>
            <span>{i + 1}</span>
          </li>
        ))}
      </ol>
      <ul className="aula-si__page aula-sheet__keep">
        {PAGE.map((c) => (
          <li key={c.uses}>
            <span className="aula-si__chip">{c.chip}</span> {c.text}
          </li>
        ))}
      </ul>
      {passed ? (
        <p className="aula-arch__byte">{SI_ANSWER} · superato · il codice del portatile</p>
      ) : (
        <>
          <div className="aula-si__keys" role="group" aria-label="Le cifre">
            {Array.from({ length: 10 }, (_, d) => (
              <button key={d} type="button" className="aula-lft__tile" onClick={() => code.length < 9 && setCode([...code, d])}>
                {d}
              </button>
            ))}
            <button type="button" className="aula-lft__tile" aria-label="cancella l'ultima cifra" onClick={() => setCode(code.slice(0, -1))}>
              ⌫
            </button>
          </div>
          <button
            type="button"
            className="aula-stub"
            disabled={code.length < 9}
            onClick={() => {
              setCode([]);
              onTry(checkSi(code));
            }}
          >
            consegna
          </button>
        </>
      )}
    </div>
  );
}
