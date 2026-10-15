import { useState } from "react";
import { runLft } from "./cheerpj";
import { EXAMPLES } from "./examples";

export default function LftLab() {
  const [program, setProgram] = useState(EXAMPLES[0].program);
  const [input, setInput] = useState(EXAMPLES[0].input);
  const [res, setRes] = useState<{ out: string; jasmin: string } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const go = async () => {
    setBusy(true);
    setStatus(loaded ? "compilo…" : "carico la JVM nel browser (la prima volta ~20 MB)…");
    try {
      setRes(await runLft(program, input));
      setLoaded(true);
      setStatus("");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const lines = res?.out.trim().split("\n") ?? [];
  const error = lines.some((l) => l.startsWith("ERRORE "));
  // the handed-in Lexer prints every token it reads: kept, but folded away from the program's output
  const tokens = lines.filter((l) => l.startsWith("token = "));
  const output = lines.filter((l) => !l.startsWith("token = ")).join("\n");

  return (
    <div className="lft">
      <p>Il programma passa dal <code>Translator</code> consegnato, poi da Jasmin, poi gira sulla JVM: tutto nel browser, con CheerpJ.</p>
      <div className="mtdi-pick">
        {EXAMPLES.map((ex) => (
          <button key={ex.name} className="chip" onClick={() => { setProgram(ex.program); setInput(ex.input); setRes(null); }}>{ex.name}</button>
        ))}
      </div>
      <div className="asd-form">
        <label className="asd-wide">Programma<textarea rows={6} spellCheck={false} className="lft-src" value={program} onChange={(e) => setProgram(e.target.value)} /></label>
        <label>Input per read() (uno per riga)<textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} /></label>
        <button className="chip chip--on" onClick={go} disabled={busy}>Compila ed esegui</button>
        {status && <span className="labs-loading" role="status">{status}</span>}
      </div>
      {res && (
        <div className="lft-grid">
          <section><h4>Jasmin generato (Output.j)</h4><pre className="mtdi-code lft-j">{error ? "—" : res.jasmin}</pre></section>
          <section>
            <h4>Output</h4>
            <pre className={`asd-term${error ? " lft-err" : ""}`}>{output}</pre>
            {tokens.length > 0 && (
              <details><summary>Token letti dal Lexer ({tokens.length})</summary><pre className="mtdi-code lft-j">{tokens.join("\n")}</pre></details>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
