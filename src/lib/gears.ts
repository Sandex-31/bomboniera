/**
 * The gear board of the machine room: a wooden board with pegs, a motor on
 * one of them driven by the round line of steam, and three shafts that take
 * the turning out to the rest of the hall: the winch of the hoist, the fan
 * over the organ, the flywheel of the press.
 *
 * Gears come from a rack in three sizes and go on any free peg. Two gears
 * mesh when their pegs stand exactly as far apart as their two radii; closer
 * and they would overlap, so they do not go on. Meshing gears turn opposite
 * ways, and a smaller one faster: what is the same all along a train is how
 * fast the teeth go by. A ring of gears that would have to turn both ways at
 * once jams, and stops everything it touches.
 *
 * Each shaft says what it wants on a plate, with no numbers: a curved arrow
 * for the way it turns, and a hare or a snail for faster or slower than the
 * motor. The board was found by a search for one with a single way to
 * satisfy all three at once with the gears of the rack, and `npm test`
 * searches it again.
 */

import { GEARS_KEY } from "../data/puzzle";

export type Size = 1 | 2 | 3;
export type Peg = readonly [number, number];
export type ShaftId = "argano" | "ventola" | "volano";

/** Where the pegs stand, in board units: 0 to 10 across, 0 to 7 down. */
export const PEGS: readonly Peg[] = [
  [0, 0],
  [0, 3],
  [2, 0],
  [3, 3],
  [4, 1],
  [4, 3],
  [4, 6],
  [5, 6],
  [7, 1],
  [7, 3],
  [7, 6],
  [10, 0],
  [10, 1],
  [10, 6],
];
export const BOARD_W = 10;
export const BOARD_H = 7;

/** The motor's peg and the size of its own gear. It turns clockwise when the round line arrives. */
export const MOTOR = { peg: 1, size: 2 as Size };

/** Clockwise is 1, the other way -1. */
export type Turn = 1 | -1;
export type Pace = "lepre" | "lumaca";
export const SHAFTS: readonly { id: ShaftId; peg: number; dir: Turn; pace: Pace }[] = [
  { id: "argano", peg: 13, dir: 1, pace: "lumaca" },
  { id: "ventola", peg: 2, dir: 1, pace: "lepre" },
  { id: "volano", peg: 9, dir: -1, pace: "lepre" },
];

/** The rack, in order: four small, two middling, two large. One of them is not needed. */
export const RACK: readonly Size[] = [1, 1, 1, 1, 2, 2, 3, 3];
/** The rack gear the second piece of the punched card is stuck behind. */
export const PIECE_BEHIND = 7;

/** Which rack gear stands on which peg, by peg. */
export type GearsState = { placed: Record<number, number>; piece: boolean };
export const EMPTY: GearsState = { placed: {}, piece: false };

const d2 = (a: Peg, b: Peg) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

/** The size on each peg, motor included. */
function sizes(state: GearsState): Map<number, Size> {
  const out = new Map<number, Size>([[MOTOR.peg, MOTOR.size]]);
  for (const [peg, g] of Object.entries(state.placed)) out.set(Number(peg), RACK[g]);
  return out;
}

/** Whether a gear of `size` can go on `peg` with the board as it is: the peg free, nothing overlapped. */
export function fits(state: GearsState, peg: number, size: Size): boolean {
  if (peg === MOTOR.peg || state.placed[peg] !== undefined) return false;
  for (const [other, s] of sizes(state)) {
    if (d2(PEGS[peg], PEGS[other]) < (size + s) ** 2) return false;
  }
  return true;
}

export type Spin = {
  /** How each gear on the board turns: its direction times its speed, the motor's being 1. 0 is still. */
  turning: Map<number, number>;
  /** Whether the train the motor drives has jammed. */
  jam: boolean;
  /** What each shaft does. */
  shafts: Record<ShaftId, "ok" | "wrong" | "still" | "jam">;
};

/**
 * How everything turns with the motor driven or not. Followed out from the
 * motor through every pair of gears that mesh.
 */
export function spin(state: GearsState, driven: boolean): Spin {
  const s = sizes(state);
  const pegs = [...s.keys()];
  const meshes = (a: number, b: number) => d2(PEGS[a], PEGS[b]) === (s.get(a)! + s.get(b)!) ** 2;
  const turning = new Map<number, number>([[MOTOR.peg, 1]]);
  const stack = [MOTOR.peg];
  let jam = false;
  while (stack.length) {
    const g = stack.pop()!;
    for (const h of pegs) {
      if (h === g || !meshes(g, h)) continue;
      // the teeth go by at the same speed on both, so the speed goes as one over the size
      const w = (-turning.get(g)! * s.get(g)!) / s.get(h)!;
      const was = turning.get(h);
      if (was === undefined) {
        turning.set(h, w);
        stack.push(h);
      } else if (Math.sign(was) !== Math.sign(w)) jam = true;
    }
  }
  const shafts = {} as Spin["shafts"];
  for (const { id, peg, dir, pace } of SHAFTS) {
    const w = turning.get(peg);
    if (w === undefined || !driven) shafts[id] = "still";
    else if (jam) shafts[id] = "jam";
    else shafts[id] = Math.sign(w) === dir && (pace === "lepre" ? Math.abs(w) > 1 : Math.abs(w) < 1) ? "ok" : "wrong";
  }
  if (!driven) for (const peg of turning.keys()) turning.set(peg, 0);
  if (jam) for (const peg of turning.keys()) turning.set(peg, 0);
  return { turning, jam: driven && jam, shafts };
}

/** The one way, as the search found it: peg to size. */
const WAY: Record<number, Size> = { 6: 3, 13: 3, 0: 1, 2: 1, 12: 2, 8: 1, 9: 1 };

export function solvedGears(): GearsState {
  const free = RACK.map((_, i) => i);
  const placed: Record<number, number> = {};
  for (const [peg, size] of Object.entries(WAY)) {
    const g = free.findIndex((i) => RACK[i] === size);
    placed[Number(peg)] = free.splice(g, 1)[0];
  }
  return { placed, piece: true };
}

/** The stored board, read back: anything malformed, or impossible, is the empty board. */
export function gearsFrom(stored: string | null): GearsState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<GearsState> | null;
    if (!v || typeof v.placed !== "object" || v.placed === null || typeof v.piece !== "boolean") return EMPTY;
    const used = new Set<number>();
    let state: GearsState = { placed: {}, piece: v.piece };
    for (const [k, g] of Object.entries(v.placed)) {
      const peg = Number(k);
      if (!Number.isInteger(peg) || peg < 0 || peg >= PEGS.length) return EMPTY;
      if (!Number.isInteger(g) || g < 0 || g >= RACK.length || used.has(g)) return EMPTY;
      // put back one at a time, so a board that could never have been built is refused
      if (!fits(state, peg, RACK[g])) return EMPTY;
      used.add(g);
      state = { ...state, placed: { ...state.placed, [peg]: g } };
    }
    return state;
  } catch {
    return EMPTY;
  }
}

export function loadGears(): GearsState {
  try {
    return gearsFrom(localStorage.getItem(GEARS_KEY));
  } catch {
    return EMPTY;
  }
}
