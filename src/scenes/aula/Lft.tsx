import { useEffect, useState } from "react";
import { ACCEPT, ALPHABET, FIXED, LFT_ANSWER, OPTIONAL, START, checkLft, type Transition } from "../../lib/aula/lft";

/*
 * The side board: the automaton in chalk, half drawn, its eight missing
 * arrows faint and numbered by the rows of Logica's table, and under it the
 * letter tiles the word is composed with. The right word brings the prof in
 * for two seconds, and that is all he says.
 */

/** Where each state stands on the board. */
const AT: [number, number][] = [
  [38, 92],
  [105, 28],
  [70, 192],
  [150, 115],
  [215, 30],
  [196, 205],
  [275, 158],
];
const R = 14;
/** How far every arrow bows to its left, so the two ways between a pair stay apart. */
const BEND = 16;
/** The arrows that bow the other way, by from and to, to keep their letter clear of a neighbour's. */
const BOW: Record<string, number> = { "31": -BEND, "45": 5 * BEND };
/** Longer than any word worth trying. */
const MAX = 12;
const CHALK = "#E9EEE6";

/** An arrow from state to state as a curve trimmed to the circles, and where its letter goes. */
function arc({ from, to }: Transition) {
  const bend = BOW[`${from}${to}`] ?? BEND;
  const out = Math.sign(bend) * 8;
  const [x1, y1] = AT[from];
  const [x2, y2] = AT[to];
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = (y2 - y1) / len;
  const ny = -(x2 - x1) / len;
  const cx = (x1 + x2) / 2 + nx * bend;
  const cy = (y1 + y2) / 2 + ny * bend;
  const trim = (x: number, y: number) => {
    const d = Math.hypot(cx - x, cy - y);
    return [x + ((cx - x) / d) * R, y + ((cy - y) / d) * R];
  };
  const [sx, sy] = trim(x1, y1);
  const [ex, ey] = trim(x2, y2);
  // the curve's midpoint, and a little further out for the letter
  const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex + nx * out;
  const my = 0.25 * sy + 0.5 * cy + 0.25 * ey + ny * out;
  return { d: `M${sx} ${sy}Q${cx} ${cy} ${ex} ${ey}`, mx, my };
}

function Arrow({ t, row }: { t: Transition; row?: number }) {
  const { d, mx, my } = arc(t);
  return (
    <g opacity={row === undefined ? 1 : 0.55}>
      <path d={d} fill="none" stroke={CHALK} strokeWidth="1.6" strokeDasharray={row === undefined ? undefined : "4 3"} markerEnd="url(#aula-lft-head)" />
      <text x={mx} y={my + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill={CHALK}>
        {t.letter}
      </text>
      {row !== undefined && (
        <g>
          <circle cx={mx + 13} cy={my} r="7.5" fill="none" stroke="#F3D392" />
          <text x={mx + 13} y={my + 3.5} textAnchor="middle" fontSize="10.5" fill="#F3D392">
            {row + 1}
          </text>
        </g>
      )}
    </g>
  );
}

export default function Lft({ passed, onTry }: { passed: boolean; onTry: (ok: boolean) => void }) {
  const [word, setWord] = useState("");
  const [prof, setProf] = useState(false);
  useEffect(() => {
    if (!prof) return;
    const id = setTimeout(() => setProf(false), 2000);
    return () => clearTimeout(id);
  }, [prof]);

  const give = () => {
    const ok = checkLft(word);
    setWord("");
    setProf(ok);
    onTry(ok);
  };

  return (
    <div className="aula-lft">
      <div className="aula-lft__board">
        <svg viewBox="0 0 300 230" aria-label="L'automa sulla lavagna laterale">
          <defs>
            <marker id="aula-lft-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L8 4L0 8Z" fill={CHALK} />
            </marker>
          </defs>
          {FIXED.map((t, k) => (
            <Arrow key={`f${k}`} t={t} />
          ))}
          {OPTIONAL.map((t, k) => (
            <Arrow key={`o${k}`} t={t} row={k} />
          ))}
          {/* the way in */}
          <path d={`M4 ${AT[START][1]}H${AT[START][0] - R - 1}`} stroke={CHALK} strokeWidth="1.6" markerEnd="url(#aula-lft-head)" />
          {AT.map(([x, y], s) => (
            <g key={s}>
              <circle cx={x} cy={y} r={R} fill="#1F3A2E" stroke={CHALK} strokeWidth="1.6" />
              {s === ACCEPT && <circle cx={x} cy={y} r={R - 3.5} fill="none" stroke={CHALK} strokeWidth="1.2" />}
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill={CHALK}>
                q{s}
              </text>
            </g>
          ))}
        </svg>
        {prof && (
          <p className="aula-lft__prof" role="status">
            <span aria-hidden="true">🧑‍🏫</span> «top ok»
          </p>
        )}
      </div>
      {passed ? (
        <p className="aula-arch__byte">{LFT_ANSWER} · superato</p>
      ) : (
        <>
          <p className="aula-lft__word" aria-live="polite">
            {word || " "}
          </p>
          <div className="aula-lft__tiles" role="group" aria-label="Le lettere">
            {[...ALPHABET].map((a) => (
              <button key={a} type="button" className="aula-lft__tile" onClick={() => word.length < MAX && setWord(word + a)}>
                {a}
              </button>
            ))}
            <button type="button" className="aula-lft__tile" aria-label="cancella l'ultima lettera" onClick={() => setWord(word.slice(0, -1))}>
              ⌫
            </button>
          </div>
          <button type="button" className="aula-stub" onClick={give} disabled={!word}>
            consegna
          </button>
        </>
      )}
    </div>
  );
}
