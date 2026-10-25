import { ASD_ANSWER } from "./asd";
import { FISICA_ANSWER } from "./fisica";

/*
 * Sistemi Operativi: five students at a row of desks, four things to share
 * between them, each wanting two, and each by habit reaching first for the
 * same one of its two: round the table the habits close in a circle, and
 * nobody writes. A global order for the things breaks it, whoever takes
 * first the one that comes first. Then the five run in round robin: they
 * come in by the aisles of Algoritmi's way from the door to the desk, one a
 * time unit, the quantum is Fisica's current, and the answer is the order
 * they finish in. The prof's face at the desk keeps changing, and the grade
 * is the mood of the moment the answer is given.
 */

export type ResId = "penna" | "calcolatrice" | "foglio" | "matita";

export const RES: readonly ResId[] = ["penna", "calcolatrice", "foglio", "matita"];

/**
 * The five, by desk. `needs` in the order habit takes them; `burst` the
 * time units of writing each needs; `aisle` the two benches of the ASD plan
 * whose aisle each waits in.
 */
export const PROCS: { id: number; name: string; burst: number; needs: [ResId, ResId]; aisle: [number, number] }[] = [
  { id: 1, name: "Anna", burst: 5, needs: ["penna", "calcolatrice"], aisle: [9, 12] },
  { id: 2, name: "Bruno", burst: 3, needs: ["calcolatrice", "foglio"], aisle: [0, 5] },
  { id: 3, name: "Carla", burst: 4, needs: ["foglio", "penna"], aisle: [12, 10] },
  { id: 4, name: "Dario", burst: 6, needs: ["foglio", "matita"], aisle: [5, 8] },
  { id: 5, name: "Elena", burst: 2, needs: ["matita", "calcolatrice"], aisle: [8, 9] },
];

/** Nobody has said anything yet: every student goes by habit. */
export const DEFAULT_ORDER: ResId[] = [];

/** Who comes in when: the students in the order the way meets their aisles, from the door. One whose aisle is off the way does not come. */
export function arrival(asdPath: number[]): number[] {
  const at = (p: (typeof PROCS)[number]) =>
    asdPath.findIndex((n, i) => i > 0 && ((asdPath[i - 1] === p.aisle[0] && n === p.aisle[1]) || (asdPath[i - 1] === p.aisle[1] && n === p.aisle[0])));
  return PROCS.filter((p) => at(p) >= 0)
    .sort((a, b) => at(a) - at(b))
    .map((p) => p.id);
}

/**
 * Whether the students can end up each holding one and waiting for the
 * other: each takes first whichever of its two comes first in `order`, by
 * habit when neither or both are unranked, and a circle in what waits on
 * what is a deadlock.
 */
export function deadlocks(order: ResId[]): boolean {
  const rank = (r: ResId) => (order.includes(r) ? order.indexOf(r) : Infinity);
  const next = new Map<ResId, ResId[]>(RES.map((r) => [r, []]));
  for (const { needs: [a, b] } of PROCS) {
    if (rank(b) < rank(a)) next.get(b)!.push(a);
    else next.get(a)!.push(b);
  }
  // a circle is a thing reached again while still on the way from it
  const state = new Map<ResId, "on" | "done">();
  const loops = (r: ResId): boolean => {
    if (state.get(r) === "on") return true;
    if (state.get(r) === "done") return false;
    state.set(r, "on");
    const found = next.get(r)!.some(loops);
    state.set(r, "done");
    return found;
  };
  return RES.some(loops);
}

/**
 * Round robin: one student comes in a time unit, from 0, in `arrival`'s
 * order. Who comes in during a quantum joins the queue before the one whose
 * quantum has just run out. Each slice as it runs, one after the other.
 */
export function schedule(arrival: number[], quantum: number): { id: number; from: number; to: number }[] {
  const left = new Map(PROCS.map((p) => [p.id, p.burst]));
  const queue: number[] = [];
  const slices: { id: number; from: number; to: number }[] = [];
  let t = 0;
  let came = 0;
  const admit = () => {
    while (came < arrival.length && came <= t) queue.push(arrival[came++]);
  };
  admit();
  while (queue.length || came < arrival.length) {
    if (!queue.length) {
      t = came;
      admit();
    }
    const id = queue.shift()!;
    const run = Math.min(quantum, left.get(id)!);
    slices.push({ id, from: t, to: t + run });
    t += run;
    left.set(id, left.get(id)! - run);
    admit();
    if (left.get(id)! > 0) queue.push(id);
  }
  return slices;
}

/** Who finishes when, first to last. */
export function roundRobin(arrival: number[], quantum: number): number[] {
  const s = schedule(arrival, quantum);
  return s.filter((x, i) => !s.slice(i + 1).some((y) => y.id === x.id)).map((x) => x.id);
}

/** The board's rule: one time unit of quantum every 10 mA through the coil, 1 to 5. */
export function quantumFrom(mA: number): number {
  return Math.min(5, Math.max(1, Math.floor(mA / 10)));
}

export const SO_ARRIVAL = arrival(ASD_ANSWER);
export const SO_QUANTUM = quantumFrom(FISICA_ANSWER);
export const SO_ANSWER = roundRobin(SO_ARRIVAL, SO_QUANTUM);

export function checkSo(order: ResId[], finish: number[]): boolean {
  return !deadlocks(order) && finish.length === SO_ANSWER.length && finish.every((id, i) => id === SO_ANSWER[i]);
}

/*
 * The prof's mood: a face a while, then the next, round and round. Each
 * face gives grades from a band of its own, so the grade drawn when the
 * answer is given goes with the face shown at that moment.
 */

export const MOOD_MS = 1400;

export const MOODS: { face: "furioso" | "seccato" | "neutro" | "contento" | "raggiante"; grades: [number, number] }[] = [
  { face: "neutro", grades: [24, 26] },
  { face: "seccato", grades: [21, 23] },
  { face: "raggiante", grades: [29, 30] },
  { face: "furioso", grades: [18, 20] },
  { face: "contento", grades: [27, 28] },
];

/** The face at `t`, as an index of `MOODS`. */
export const moodAt = (t: number): number => Math.floor(t / MOOD_MS) % MOODS.length;

/** The face a grade comes from. */
export const moodOf = (grade: number): number => MOODS.findIndex((m) => grade >= m.grades[0] && grade <= m.grades[1]);

/** For `pass`, whose grade is `18 + floor(rng() * 13)`: a draw within the band of the face at `t`. */
export function moodRng(t: number, rand: () => number = Math.random): () => number {
  const [lo, hi] = MOODS[moodAt(t)].grades;
  const grade = lo + Math.floor(rand() * (hi - lo + 1));
  return () => (grade - 18 + 0.5) / 13;
}
