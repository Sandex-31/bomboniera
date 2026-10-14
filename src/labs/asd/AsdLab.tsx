import { useRef, useState } from "react";
import { labsUrl } from "../paths";
import { makeRecords } from "./records";
import { runProgram } from "./runner";

/** Some servers (Vite's dev server) send .gz with Content-Encoding and the browser has already
 *  inflated it; others (GitHub Pages) send the raw bytes. Inflate only what still starts with gzip's magic. */
const gunzip = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
};
const MAX_WORDS = 6;
const decode = (u: Uint8Array) => new TextDecoder().decode(u);

type Ex = "ex1" | "ex2" | "ex3" | "ex4";
const TITLES: Record<Ex, string> = { ex1: "Merge Sort e Quick Sort", ex2: "Edit distance", ex3: "Tabella hash", ex4: "Grafo e BFS" };

export default function AsdLab({ id }: { id: string }) {
  const [ex, setEx] = useState<Ex>("ex1");
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<string>();
  const [running, setRunning] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const [n, setN] = useState(100000);
  const [field, setField] = useState("1");
  const [algo, setAlgo] = useState("1");
  const [input, setInput] = useState("");
  const [minLen, setMinLen] = useState(6);
  const [start, setStart] = useState("torino");

  const pick = (k: Ex) => {
    setEx(k);
    setLines([]);
    setStatus("");
    setResult(undefined);
  };

  async function go(kind: "main" | "test") {
    setLines([]);
    setResult(undefined);
    setRunning(true);
    const data = (f: string) => labsUrl(id, "data", f);
    let args: string[] = [];
    let files: Record<string, Uint8Array | string> = {};
    let readBack: string | undefined;
    if (kind === "main") {
      setStatus("preparo i dati…");
      try {
        if (ex === "ex1") {
          files = { "/records.csv": makeRecords(decode(await gunzip(data("words.txt.gz"))).split("\n"), n) };
          args = ["/records.csv", "/sorted.csv", field, algo];
          readBack = "/sorted.csv";
        } else if (ex === "ex2") {
          const fallback = await (await fetch(data("correctme.txt"))).text();
          // edit_distance_dyn never frees its matrix: 660k comparisons per word leak about 300 MB,
          // so past ~6 words the browser's 2 GB of wasm memory runs out. The C stays as it was handed in.
          const text = (input.trim() || fallback).split(/\s+/).slice(0, MAX_WORDS).join(" ");
          files = { "/dictionary.txt": await gunzip(data("dictionary.txt.gz")), "/correctme.txt": text };
          args = ["/dictionary.txt", "/correctme.txt"];
        } else if (ex === "ex3") {
          files = { "/commedia.txt": await gunzip(data("commedia.txt.gz")) };
          args = ["/commedia.txt", String(minLen)];
        } else {
          files = { "/graph.csv": await gunzip(data("graph.csv.gz")) };
          args = ["/graph.csv", start.trim().toLowerCase(), "/bfs.txt"];
          readBack = "/bfs.txt";
        }
      } catch {
        setRunning(false);
        setStatus("non riesco a scaricare i dati: controlla la connessione");
        return;
      }
    }
    setStatus(kind === "test" ? "eseguo gli unit test…" : "eseguo il programma…");
    const run = runProgram({
      url: labsUrl(id, ex, `${kind}.mjs`),
      args,
      files,
      readBack,
      onLine: (l) => setLines((p) => (p.length >= 2000 ? p : [...p, l])),
    });
    stopRef.current = run.stop;
    const r = await run.done;
    setRunning(false);
    setResult(r.output);
    setStatus(r.code === null ? `fermato dopo ${r.ms} ms` : `terminato con codice ${r.code} in ${r.ms} ms`);
  }

  return (
    <div className="asd">
      <div className="tags">
        {(Object.keys(TITLES) as Ex[]).map((k) => (
          <button key={k} className={`chip${k === ex ? " chip--on" : ""}`} disabled={running} onClick={() => pick(k)}>
            {TITLES[k]}
          </button>
        ))}
      </div>
      <form className="asd-form" onSubmit={(e) => { e.preventDefault(); go("main"); }}>
        {ex === "ex1" && (
          <>
            <label>Record<select value={n} onChange={(e) => setN(Number(e.target.value))}>{[1000, 100000, 1000000].map((v) => <option key={v} value={v}>{v.toLocaleString("it-IT")}</option>)}</select></label>
            <label>Campo<select value={field} onChange={(e) => setField(e.target.value)}><option value="1">1 · parola</option><option value="2">2 · intero</option><option value="3">3 · decimale</option></select></label>
            <label>Algoritmo<select value={algo} onChange={(e) => setAlgo(e.target.value)}><option value="1">Merge Sort</option><option value="2">Quick Sort</option></select></label>
          </>
        )}
        {ex === "ex2" && (
          <label className="asd-wide">
            Testo da correggere (vuoto = inizio di <code>correctme.txt</code> del corso, max {MAX_WORDS} parole: la versione dinamica non libera la sua matrice, e nel browser la memoria finisce prima che sul PC)
            <textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Quando avevo cinqve anni…" />
          </label>
        )}
        {ex === "ex3" && <label>Lunghezza minima<input type="number" min={1} max={20} value={minLen} onChange={(e) => setMinLen(Number(e.target.value))} /></label>}
        {ex === "ex4" && <label>Città di partenza<input value={start} onChange={(e) => setStart(e.target.value)} /></label>}
        <div className="links">
          <button className="link-btn" type="submit" disabled={running}>ESEGUI main_{ex} ▸</button>
          <button className="link-btn" type="button" disabled={running} onClick={() => go("test")}>UNIT TEST ✓</button>
          {running && <button className="link-btn" type="button" onClick={() => stopRef.current()}>FERMA ■</button>}
        </div>
      </form>
      {ex === "ex1" && <p className="demo-badge">record generati nel browser, stesso formato di records.csv</p>}
      <pre className="asd-term" aria-live="polite">{lines.join("\n")}{status && `\n— ${status}`}</pre>
      {result && (
        <>
          <h4>Prime righe del file prodotto</h4>
          <pre className="asd-term">{result}</pre>
        </>
      )}
    </div>
  );
}
