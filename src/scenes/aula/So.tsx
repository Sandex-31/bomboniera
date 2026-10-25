import { useEffect, useState } from "react";
import { MOODS, MOOD_MS, PROCS, RES, SO_ANSWER, SO_ARRIVAL, SO_QUANTUM, checkSo, moodAt, moodOf, schedule, type ResId } from "../../lib/aula/so";

/*
 * The row of desks: the board with the rules, the five students each with
 * what they write for, what they reach for first and the aisle they wait
 * in, the four things they share, and the prof's face at the desk, never
 * the same for long. The things are tapped into a global order, then the
 * students in the order they finish; the fifth tap is the answer. Once
 * passed the face stays the one the grade was drawn with, and the run is
 * drawn as a Gantt strip.
 */

/** Each student's colour on the strip. */
const INK = ["#9B1C1C", "#2F7A4A", "#2B4C7E", "#C9A64A", "#6B4A33"];
const nameOf = (id: number) => PROCS.find((p) => p.id === id)!.name;
const inkOf = (id: number) => INK[PROCS.findIndex((p) => p.id === id)];
/** A bench as the ASD plan names it. */
const bench = (n: number) => (n === 0 ? "porta" : n === 10 ? "cattedra" : String(n));

/** The face that is up now, redrawn as each turns, on the beat `moodAt` keeps. */
function useMood(): number {
  const [t, setT] = useState(Date.now);
  useEffect(() => {
    const id = setTimeout(() => setT(Date.now()), MOOD_MS - (Date.now() % MOOD_MS) + 5);
    return () => clearTimeout(id);
  }, [t]);
  return moodAt(t);
}

/** The prof's mouth and brows, by face. */
const FACE: Record<(typeof MOODS)[number]["face"], { mouth: string; brows: string }> = {
  furioso: { mouth: "M14 33 Q20 27 26 33", brows: "M10 12 L17 16 M30 12 L23 16" },
  seccato: { mouth: "M14 31 L26 30", brows: "M10 14 L17 14 M23 15 L30 13" },
  neutro: { mouth: "M14 31 L26 31", brows: "M10 13 L17 13 M23 13 L30 13" },
  contento: { mouth: "M14 29 Q20 34 26 29", brows: "M10 12 Q13 10 17 12 M23 12 Q27 10 30 12" },
  raggiante: { mouth: "M13 28 Q20 38 27 28 Z", brows: "M10 10 Q13 8 17 10 M23 10 Q27 8 30 10" },
};

function Face({ mood }: { mood: number }) {
  const { face } = MOODS[mood];
  return (
    <svg viewBox="0 0 40 40" className="aula-so__face" role="img" aria-label={`il prof: ${face}`}>
      <circle cx="20" cy="21" r="17" fill="#E8C9A0" stroke="#1A1410" />
      <path d="M5 16 Q20 -2 35 16" fill="#6B6B6B" />
      <circle cx="14" cy="19" r="1.8" fill="#1A1410" />
      <circle cx="26" cy="19" r="1.8" fill="#1A1410" />
      <path d={FACE[face].brows} stroke="#1A1410" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d={FACE[face].mouth} stroke="#1A1410" strokeWidth="1.6" fill={face === "raggiante" ? "#8A2B2B" : "none"} strokeLinecap="round" />
    </svg>
  );
}

/** The run, slice by slice, under a ruler of time units. */
function Gantt() {
  const slices = schedule(SO_ARRIVAL, SO_QUANTUM);
  const end = slices[slices.length - 1].to;
  const u = 296 / end;
  return (
    <svg viewBox="-8 0 312 40" className="aula-so__gantt" aria-label="Diagramma di Gantt del round robin">
      {slices.map((s, k) => (
        <g key={k}>
          <rect x={s.from * u} y="2" width={(s.to - s.from) * u} height="20" fill={inkOf(s.id)} stroke="#F4EFE2" />
          <text x={((s.from + s.to) / 2) * u} y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#F4EFE2">
            {nameOf(s.id)[0]}
          </text>
        </g>
      ))}
      {Array.from({ length: end / 5 + 1 }, (_, k) => (
        <text key={k} x={k * 5 * u} y="35" textAnchor="middle" fontSize="9" fill="#1A1410">
          {k * 5}
        </text>
      ))}
    </svg>
  );
}

export default function So({ passed, onTry, grade }: { passed: boolean; onTry: (ok: boolean) => void; grade: number | null }) {
  const now = useMood();
  const [order, setOrder] = useState<ResId[]>([]);
  const [finish, setFinish] = useState<number[]>([]);

  const rank = (r: ResId) => {
    if (order[order.length - 1] === r) return setOrder(order.slice(0, -1));
    if (!order.includes(r)) setOrder([...order, r]);
  };
  const done = (id: number) => {
    if (passed) return;
    if (finish[finish.length - 1] === id) return setFinish(finish.slice(0, -1));
    if (finish.includes(id)) return;
    const next = [...finish, id];
    if (next.length < PROCS.length) return setFinish(next);
    setFinish([]);
    setOrder([]);
    onTry(checkSo(order, next));
  };
  const shown = passed ? SO_ANSWER : finish;

  return (
    <div className="aula-so">
      <div className="aula-so__prof aula-sheet__keep">
        <Face mood={passed && grade !== null ? moodOf(grade) : now} />
        {passed && grade !== null ? (
          <p>
            voto: <b>{grade}</b>
          </p>
        ) : (
          <p>il prof, alla cattedra</p>
        )}
      </div>
      <ol className="aula-so__board">
        <li>Round robin: un'unità di quanto ogni 10 mA della bobina di Fisica.</li>
        <li>Arrivano uno per unità di tempo, da 0, nell'ordine in cui li incontra chi va dalla porta alla cattedra più in fretta.</li>
        <li>Chi arriva durante un quanto si mette in coda prima di chi l'ha appena finito.</li>
        <li>Ognuno prende prima, delle sue due cose, quella che viene prima nell'ordine; quelle fuori dall'ordine, d'abitudine.</li>
      </ol>
      <ul className="aula-so__desks">
        {PROCS.map((p) => {
          const at = shown.indexOf(p.id);
          return (
            <li key={p.id}>
              <button type="button" className="aula-so__student" style={{ borderColor: inkOf(p.id) }} aria-pressed={at >= 0} onClick={() => done(p.id)}>
                {p.name}
                {at >= 0 && <b>{at + 1}°</b>}
              </button>
              <span>
                {p.burst} unità · {p.needs[0]}, poi {p.needs[1]} · corridoio {bench(p.aisle[0])}–{bench(p.aisle[1])}
              </span>
            </li>
          );
        })}
      </ul>
      {passed ? (
        <>
          <Gantt />
          <p className="aula-so__done">{SO_ANSWER.map(nameOf).join(" → ")}</p>
        </>
      ) : (
        <>
          <p className="aula-so__label">ordine globale delle cose:</p>
          <div className="aula-so__things">
            {RES.map((r) => {
              const at = order.indexOf(r);
              return (
                <button key={r} type="button" className="aula-stub" aria-pressed={at >= 0} onClick={() => rank(r)}>
                  {at >= 0 && <b>{at + 1}. </b>}
                  {r}
                </button>
              );
            })}
          </div>
          <p className="aula-so__label">
            finiscono: {finish.length ? finish.map(nameOf).join(", ") : "tocca gli studenti, dal primo all'ultimo"}
          </p>
        </>
      )}
    </div>
  );
}
