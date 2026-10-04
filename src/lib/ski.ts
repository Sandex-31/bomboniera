import { SKI_KEY } from "../data/puzzle";

/**
 * A ski area, and the four gradients that hold it up.
 *
 * Green, blue, red, black: on the map they are only colours, and how steep
 * each one is appears nowhere. That number comes from the lamps next door —
 * the four rows they spell out are these four gradients, in this order, and
 * without them there is nothing here to work with at all.
 *
 * Every run's length is worked out from the two altitudes it joins and its
 * own gradient, never written down twice. So the map cannot contradict
 * itself: change a station's altitude and every run touching it re-measures.
 * The visitor does the same sum backwards — length times gradient is the
 * drop, and one known altitude walks the whole mountain.
 */

export const PISTES = [
  { key: "verde", grade: 5, ink: "#57B27A" },
  { key: "blu", grade: 25, ink: "#4F8FD8" },
  { key: "rosso", grade: 40, ink: "#D2564B" },
  { key: "nero", grade: 70, ink: "#23252F" },
] as const;

/** The four numbers, in the order the lamps give them. */
export const GRADES = PISTES.map((p) => p.grade);

/** The four colours, which is all the lamps are allowed to know about. */
export const INK = PISTES.map((p) => p.ink);

export type Station = {
  id: string;
  name: string;
  /** Where it sits on the map, 0 to 100. Higher up the screen is higher up. */
  x: number;
  y: number;
  alt: number;
  /** Printed on the map. Exactly one is, or nothing could be worked out. */
  given?: boolean;
  /** Its place in the code, for the few that have one. */
  digit?: number;
};

/**
 * Eight stations. Only the village has its altitude written on it; the other
 * seven are blank, and each one is reached from something already known.
 *
 * Their heights on the map follow their altitudes in order — that is how the
 * visitor knows which way is down, and it is the only thing the drawing
 * gives away. The spacing deliberately does not follow the altitudes, so
 * nothing can be read off with a ruler.
 */
export const STATIONS: Station[] = [
  { id: "H", name: "Punta", x: 78, y: 8, alt: 2780, digit: 5 },
  { id: "G", name: "Cresta", x: 60, y: 20, alt: 2500, digit: 4 },
  { id: "E", name: "Colle", x: 42, y: 33, alt: 2150, digit: 3 },
  { id: "F", name: "Rifugio", x: 71, y: 40, alt: 2060 },
  { id: "D", name: "Baita", x: 34, y: 56, alt: 1700, digit: 2 },
  { id: "B", name: "Malga", x: 18, y: 70, alt: 1420, digit: 1 },
  { id: "C", name: "Lago", x: 62, y: 74, alt: 1300 },
  { id: "A", name: "Paese", x: 42, y: 92, alt: 1180, given: true },
];

export type Run = { from: string; to: string; piste: number };

/** Twelve runs. More than enough to reach everything, so the sums check out. */
export const RUNS: Run[] = [
  { from: "B", to: "A", piste: 1 },
  { from: "C", to: "A", piste: 0 },
  { from: "B", to: "C", piste: 2 },
  { from: "D", to: "B", piste: 2 },
  { from: "D", to: "C", piste: 2 },
  { from: "E", to: "D", piste: 1 },
  { from: "F", to: "D", piste: 1 },
  { from: "E", to: "F", piste: 0 },
  { from: "G", to: "E", piste: 3 },
  { from: "H", to: "E", piste: 3 },
  { from: "G", to: "F", piste: 2 },
  { from: "H", to: "G", piste: 3 },
];

export const stationOf = (id: string) => STATIONS.find((s) => s.id === id)!;

/** How long a run is, in metres: the drop it makes at the gradient it has. */
export function lengthOf(run: Run): number {
  const drop = Math.abs(stationOf(run.from).alt - stationOf(run.to).alt);
  return Math.round((drop * 100) / PISTES[run.piste].grade);
}

/**
 * The code, one digit per marked station: the hundreds of its altitude.
 *
 * Nothing on the panel explains that, and nothing needs to — the digits are
 * handed over once every altitude on the mountain is right, and what rule
 * turned eight heights into five figures is the machine's business.
 */
export const CODE = STATIONS.filter((s) => s.digit)
  .sort((a, b) => a.digit! - b.digit!)
  .map((s) => Math.floor(s.alt / 100) % 10);

/** Whether every blank has been worked out. All of it or none of it. */
export function solvedSki(filled: Record<string, string>): boolean {
  return STATIONS.every((s) => s.given || Number(filled[s.id]) === s.alt);
}

/**
 * What has been worked out so far, believed only once it has been checked.
 *
 * It lives here rather than in the panel because the island needs it too:
 * whether the machine is on the desk is decided by whether this map is
 * finished, and two places asking the same question should ask it the same
 * way rather than keep two flags that can drift apart.
 */
export function loadSki(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SKI_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (!saved || typeof saved !== "object") return {};
    const from = saved as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const station of STATIONS) {
      const value = from[station.id];
      if (typeof value === "string" && /^\d{0,4}$/.test(value)) out[station.id] = value;
    }
    return out;
  } catch {
    return {};
  }
}
