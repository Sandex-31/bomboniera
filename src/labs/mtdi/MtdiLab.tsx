import { useEffect, useState } from "react";
import { ANIMALI, DEFAULT_VERSO, IF_ELSE, javaLines, run } from "./switch";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function MtdiLab() {
  const [breaks, setBreaks] = useState(() => ANIMALI.map(() => true));
  const [value, setValue] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const path = value === null ? [] : run(value, breaks);

  // the fall-through walks down one desk at a time
  useEffect(() => {
    if (reduced()) return setShown(path.length);
    setShown(0);
    const t = setInterval(() => setShown((s) => (s >= path.length ? s : s + 1)), 350);
    return () => clearInterval(t);
  }, [value, breaks]); // eslint-disable-line react-hooks/exhaustive-deps

  const lit = new Set(path.slice(0, shown));
  const flip = (i: number) => setBreaks((b) => b.map((x, j) => (j === i ? !x : x)));

  return (
    <div className="mtdi">
      <p>Scegli un numero: lo switch salta al <code>case</code> giusto. Togli un <code>break</code> e guarda l'esecuzione «cadere» nei banchi successivi.</p>
      <div className="mtdi-pick" role="group" aria-label="Valore di animale">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`chip${value === n ? " chip--on" : ""}`} onClick={() => setValue(n)}>{n}</button>
        ))}
      </div>
      <div className="mtdi-grid">
        <pre className="mtdi-code" aria-label="Codice Java">
          {javaLines(breaks).map((l, i) => (
            <span key={i} className={l.key && lit.has(l.key) ? "mtdi-on" : undefined}>{l.text + "\n"}</span>
          ))}
        </pre>
        <ol className="mtdi-desks">
          {ANIMALI.map((a, i) => (
            <li key={a.n} className={`mtdi-desk${lit.has(String(a.n)) ? " mtdi-on" : ""}`}>
              <span className="mtdi-case">case {a.n}</span>
              <span>{a.verso}</span>
              <label className="mtdi-break"><input type="checkbox" checked={breaks[i]} onChange={() => flip(i)} /> break</label>
            </li>
          ))}
          <li className={`mtdi-desk${lit.has("default") ? " mtdi-on" : ""}`}>
            <span className="mtdi-case">default</span>
            <span>{DEFAULT_VERSO}</span>
          </li>
        </ol>
      </div>
      <h4>Output</h4>
      <pre className="asd-term" aria-live="polite">
        {value === null ? "…" : path.slice(0, shown).map((k) => (k === "default" ? DEFAULT_VERSO : ANIMALI[Number(k) - 1].verso)).join("\n")}
      </pre>
      <details className="mtdi-before">
        <summary>Prima dello switch: la versione con if/else if</summary>
        <pre className="mtdi-code">{IF_ELSE}</pre>
      </details>
      <p className="rewrite-note">Dall'attività «Il banco delle scelte» della relazione (scheda Documenti).</p>
    </div>
  );
}
