import { useState } from "react";
import { ARCH_ANSWER, PHONE_DIGIT_INDEX, PROGRAM, checkArch, type Instr } from "../../lib/aula/arch";
import { NUMBER } from "../../lib/well/pillars";

/*
 * The corner of the blackboard: the program in chalk, a handset drawn by r0
 * with one of its digits ringed, the tall pile of the «1700 pagine» beside
 * it, and under it eight lever switches, a byte to set the answer on.
 */

const line = ({ op, a, b }: Instr) => `${op.padEnd(4)}${a}${b === undefined ? "" : `, ${b}`}`;

/** A handset, and one box for each digit of the telephone, the one r0 takes ringed. */
function Handset({ ring }: { ring: number }) {
  return (
    <svg className="aula-arch__phone" viewBox={`0 0 ${40 + NUMBER.length * 16} 28`} aria-label="r0: la cornetta">
      <path d="M4 10 Q4 4 10 4 L26 4 Q32 4 32 10 L27 12 L24 8 L12 8 L9 12 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 12 L24 12 L30 24 L6 24 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {NUMBER.map((_, i) => (
        <g key={i} transform={`translate(${40 + i * 16} 6)`}>
          <rect width="12" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {i === ring && <ellipse cx="6" cy="8" rx="7.5" ry="11" fill="none" stroke="#F2B8B8" strokeWidth="2" />}
        </g>
      ))}
    </svg>
  );
}

/** The pile of the oral exam's pages, taller than the board is. */
function Pile() {
  const books = [26, 30, 24, 32, 28, 22, 30, 27, 25, 31, 23, 29];
  return (
    <svg className="aula-arch__pile" viewBox="0 0 48 176" aria-hidden="true">
      {books.map((w, i) => (
        <rect key={i} x={(48 - w) / 2 + (i % 3) - 1} y={164 - i * 14} width={w} height={12} rx="1.5" fill={["#8A3B2E", "#2E5A8A", "#6B7A3A"][i % 3]} />
      ))}
      <text x="24" y="10" textAnchor="middle" fontSize="8" fill="currentColor">
        1700 pagine
      </text>
    </svg>
  );
}

export default function Arch({ passed, onTry }: { passed: boolean; onTry: (ok: boolean) => void }) {
  const [levers, setLevers] = useState(() => Array<boolean>(8).fill(false));
  const shown = passed ? [...ARCH_ANSWER.toString(2).padStart(8, "0")].map((b) => b === "1") : levers;
  const flip = (k: number) => setLevers((l) => l.map((v, j) => (j === k ? !v : v)));

  return (
    <div className="aula-arch">
      <div className="aula-arch__board">
        <div>
          <p className="aula-arch__head">registri a 8 bit</p>
          <p className="aula-arch__head">
            r0 = <Handset ring={PHONE_DIGIT_INDEX} />
          </p>
          <ol className="aula-arch__code" start={0}>
            {PROGRAM.map((ins, i) => (
              <li key={i}>{line(ins)}</li>
            ))}
          </ol>
          <p className="aula-arch__head">risultato in r0</p>
        </div>
        <Pile />
      </div>
      <div className="aula-arch__levers" role="group" aria-label="Interruttori, dal bit più alto">
        {shown.map((on, k) => (
          <button key={k} type="button" className="aula-lever" aria-pressed={on} aria-label={`bit ${7 - k}`} onClick={() => !passed && flip(k)}>
            <span>{on ? "1" : "0"}</span>
          </button>
        ))}
      </div>
      {passed ? (
        <p className="aula-arch__byte">
          {ARCH_ANSWER.toString(2).padStart(8, "0")} · superato
        </p>
      ) : (
        <button type="button" className="aula-stub" onClick={() => onTry(checkArch(levers))}>
          consegna
        </button>
      )}
    </div>
  );
}
