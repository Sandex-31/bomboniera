import { useState } from "react";
import { A, ANALISI_ANSWER, B, REASONS, f, judgeAnalisi } from "../../lib/aula/analisi";
import type { AulaState, Verdict } from "../../lib/aula/chain";

/*
 * The big blackboard: the curve in chalk over a grid of unit squares, its
 * formula above it, two marks on the axis. Under it the answer, and once
 * the first right one has been turned down, the register with it ringed in
 * red and the reason it was turned down for.
 */

/** One unit of the grid, in px: the squares are counted, so they are square. */
const U = 24;
const X_MAX = 8;
const Y_MAX = 11;
const PAD = 14;
const W = X_MAX * U;
const H = Y_MAX * U;
const px = (x: number) => x * U;
const py = (y: number) => H - y * U;

/** The curve from 0 to X_MAX, and the area between the marks closed on the axis. */
function paths() {
  const pts = (a: number, b: number) =>
    Array.from({ length: 81 }, (_, i) => a + ((b - a) * i) / 80).map((x) => `${px(x).toFixed(1)} ${py(f(x)).toFixed(1)}`);
  return { curve: `M${pts(0, X_MAX).join("L")}`, area: `M${px(A)} ${py(0)}L${pts(A, B).join("L")}L${px(B)} ${py(0)}Z` };
}
const { curve, area } = paths();

export default function Analisi({ passed, onTry, state }: { passed: boolean; onTry: (v: Verdict) => void; state: AulaState }) {
  const [n, setN] = useState("");
  // the register gives a new reason every time it is looked at
  const [reason] = useState(() => REASONS[Math.floor(Math.random() * REASONS.length)]);
  const give = () => {
    const v = judgeAnalisi(state, Number(n));
    setN("");
    onTry(v === "pass" ? true : v === "stamp" ? "stamp" : false);
  };

  return (
    <div className="aula-analisi">
      <div className="aula-analisi__board">
        <p className="aula-analisi__f">
          f(x) = x³/4 − 3x² + 9x + 2
        </p>
        <svg viewBox={`${-PAD} ${-PAD / 2} ${W + 1.5 * PAD} ${H + 1.6 * PAD}`} aria-label="Il grafico di f su una quadrettatura">
          <path d={area} fill="#E9EEE6" fillOpacity="0.14" />
          {Array.from({ length: X_MAX + 1 }, (_, i) => (
            <line key={`x${i}`} x1={px(i)} y1={0} x2={px(i)} y2={H} stroke="#E9EEE6" strokeOpacity="0.22" />
          ))}
          {Array.from({ length: Y_MAX + 1 }, (_, i) => (
            <line key={`y${i}`} x1={0} y1={py(i)} x2={W} y2={py(i)} stroke="#E9EEE6" strokeOpacity="0.22" />
          ))}
          <path d={`M0 0V${H}H${W}`} fill="none" stroke="#E9EEE6" strokeWidth="1.5" />
          {[A, B].map((x) => (
            <g key={x}>
              <line x1={px(x)} y1={py(0)} x2={px(x)} y2={py(f(x))} stroke="#F3D392" strokeWidth="2" strokeDasharray="4 3" />
              <text x={px(x)} y={H + 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#F3D392">
                {x}
              </text>
            </g>
          ))}
          {[0, 2, 4, 6, 8, 10].map((y) => (
            <text key={y} x={-4} y={py(y) + 4} textAnchor="end" fontSize="9" fill="#E9EEE6" fillOpacity="0.7">
              {y}
            </text>
          ))}
          <path d={curve} fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      {state.analisiStamped && !passed && (
        <p className="aula-analisi__register" role="status">
          registro: <span className="aula-analisi__ring">{ANALISI_ANSWER}</span> respinto — {reason}
        </p>
      )}
      {passed ? (
        <p className="aula-arch__byte">area {ANALISI_ANSWER} · superato</p>
      ) : (
        <form
          className="aula-analisi__answer"
          onSubmit={(e) => {
            e.preventDefault();
            if (n !== "") give();
          }}
        >
          <label>
            area{" "}
            <input inputMode="numeric" pattern="[0-9]*" maxLength={4} value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ""))} />
          </label>
          <button type="submit" className="aula-stub" disabled={n === ""}>
            consegna
          </button>
        </form>
      )}
    </div>
  );
}
