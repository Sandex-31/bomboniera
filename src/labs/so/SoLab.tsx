import { useEffect, useRef, useState } from "react";
import RewriteNote from "../RewriteNote";
import { draw } from "./canvas";
import { createSim, ORIGINALI, PID_INIBITORE, procs, RALLENTATA, step, TICKS, usr2, type Params, type Sim } from "./engine";

const SLIDERS: [keyof Params, string, number, number, number][] = [
  ["NATOM", "NATOM", 0, 2000, 10],
  ["N_NUOVI_ATOMI", "N_NUOVI_ATOMI", 0, 500, 10],
  ["STEP_MS", "STEP di Alimentazione (ms)", 0.5, 2000, 0.5],
  ["ENERGY_DEMAND", "ENERGY_DEMAND", 0, 1000000, 10000],
  ["ENERGY_EXPLODE_THRESHOLD", "ENERGY_EXPLODE_THRESHOLD", 100000, 20000000, 100000],
  ["SIM_DURATION", "SIM_DURATION (s)", 5, 120, 5],
  ["MAX_PROCESSI", "limite processi (ulimit -u)", 100, 20000, 100],
];
const MAX_LINES = 3000;

export default function SoLab({ id }: { id: string }) {
  const [params, setParams] = useState<Params>(RALLENTATA);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [, setFrame] = useState(0);
  const sim = useRef<Sim>(createSim(RALLENTATA));
  const canvas = useRef<HTMLCanvasElement>(null);
  const term = useRef<HTMLPreElement>(null);

  const reset = (p: Params) => { setParams(p); sim.current = createSim(p); setRunning(false); setFrame((f) => f + 1); };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    const loop = (now: number) => {
      carry += ((now - last) / 1000) * TICKS * speed;
      last = now;
      for (; carry >= 1 && !sim.current.outcome; carry--) step(sim.current);
      const out = sim.current.out;
      if (out.length > MAX_LINES) out.splice(0, out.length - MAX_LINES);
      setFrame((f) => f + 1);
      if (sim.current.outcome) setRunning(false);
      else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed]);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) draw(ctx, sim.current, c.width, c.height);
    if (term.current) term.current.scrollTop = term.current.scrollHeight;
  });

  const s = sim.current;
  const set = (k: keyof Params, v: number) => reset({ ...params, [k]: v });

  return (
    <div className="so">
      <div className="asd-form">
        {SLIDERS.map(([k, label, min, max, by]) => (
          <label key={k}>{label}: <b>{params[k]}</b>
            <input type="range" min={min} max={max} step={by} value={params[k]} onChange={(e) => set(k, Number(e.target.value))} />
          </label>
        ))}
        <label>seme<input type="number" value={params.seed} onChange={(e) => set("seed", Number(e.target.value) || 1)} /></label>
      </div>
      <div className="so-actions">
        <button className="chip chip--on" onClick={() => setRunning((r) => !r)} disabled={!!s.outcome}>{running ? "Stop" : "Avvia"}</button>
        <button className="chip" onClick={() => reset(params)}>Ricomincia</button>
        <button className="chip" onClick={() => { usr2(s); setFrame((f) => f + 1); }} disabled={!!s.outcome}>kill -USR2 {PID_INIBITORE}</button>
        {[1, 4, 16].map((x) => <button key={x} className={`chip${speed === x ? " chip--on" : ""}`} onClick={() => setSpeed(x)}>{x}×</button>)}
        <button className="chip" onClick={() => reset(ORIGINALI)}>Valori originali</button>
        <button className="chip" onClick={() => reset(RALLENTATA)}>Rallentata</button>
      </div>
      <p className="rewrite-note">Con i valori originali Alimentazione crea 100 atomi ogni 0,5 ms: il limite dei processi si esaurisce subito ed è MELTDOWN, come nella VM. «Rallentata» allunga solo quella pausa.</p>
      <div className="so-grid">
        <pre ref={term} className="asd-term so-term">{s.out.join("\n")}</pre>
        <div>
          <canvas ref={canvas} className="so-canvas" width={480} height={320} aria-label="Atomi in attesa di scissione ed energia" />
          <dl className="so-stats">
            <dt>secondo</dt><dd>{Math.floor(s.tick / TICKS)}</dd>
            <dt>processi</dt><dd>{procs(s)}</dd>
            <dt>energia</dt><dd>{s.d.energy}</dd>
            <dt>inibitore</dt><dd>{s.inhibitor ? "attivo" : "spento"}</dd>
            <dt>esito</dt><dd>{s.outcome ?? "—"}</dd>
          </dl>
        </div>
      </div>
      <RewriteNote id={id} files={["Master.c", "Atomo.c", "Attivatore.c", "Alimentazione.c", "Inibitore.c"]} />
    </div>
  );
}
