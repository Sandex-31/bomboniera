import { WALL_ANGLES, type WallId } from "../../scenes/well/wall";
import { W } from "./pixels";
import { WELL_PILLARS_KEY } from "../../data/puzzle";

/*
 * The fourth wall of the well: a dark room with a lantern in a chest, seven
 * pillars on the four walls, a map where their marks are joined into digits,
 * and a telephone to dial them on.
 */

export type PillarsState = {
  /** The three yellow switches of the dark room. */
  switches: [boolean, boolean, boolean];
  /** The UV lantern has been taken from the chest. */
  uv: boolean;
  /** Which pillars have been stamped on the map, by index in PILLARS. */
  stamped: boolean[];
  /** Which stamped groups have been joined into their digit. */
  joined: boolean[];
  /** The digits dialled so far, right ones only: a wrong one empties it. */
  dialled: number[];
  /** The number was dialled: the flame of this wall is given. */
  flame: boolean;
};

/** The number to dial, one digit per pillar. */
export const NUMBER = [9, 0, 1, 7, 4, 3, 2] as const;

/** The pillars are this big, standing on the floor of their screen. */
export const PILLAR = { w: 14, h: 56 };

/** How much of the turn round the hall one screen takes up: the panel's width over the wall's radius. */
const WALL_SPAN = 0.49;

/**
 * Where the visitor arrives, as an angle round the hall: the left edge of the
 * wall behind the camera. "Clockwise" is the way the wall angles grow: x
 * runs to +cos, z to +sin, and seen from above, with the camera's side at the
 * bottom, +x is to the right and +z is down, so growing angles turn right,
 * like a clock. It is also left to right along any wall seen from inside.
 */
export const ARRIVAL = WALL_ANGLES.pilastri - WALL_SPAN / 2;

/** The pillars, clockwise from the arrival point: `x` and `y` are the top left on the wall's screen. */
export const PILLARS: { wall: WallId; x: number; y: number }[] = [
  { wall: "pilastri", x: 6, y: 100 },
  { wall: "pilastri", x: 304, y: 100 },
  { wall: "boccioli", x: 20, y: 100 },
  { wall: "boccioli", x: 290, y: 100 },
  { wall: "tv", x: 20, y: 100 },
  { wall: "tv", x: 290, y: 100 },
  { wall: "corvi", x: 153, y: 100 },
];

/** Where pillar `k` stands round the hall, as an angle. */
export function pillarAngle(k: number): number {
  const { wall, x } = PILLARS[k];
  return WALL_ANGLES[wall] + ((x + PILLAR.w / 2 - W / 2) / W) * WALL_SPAN;
}

/** How far clockwise of the arrival point pillar `k` stands, in [0, 2π). */
export function pillarTurn(k: number): number {
  const full = 2 * Math.PI;
  return (((pillarAngle(k) - ARRIVAL) % full) + full) % full;
}

/**
 * The dots of each digit on a 3 by 5 grid, as [column, row], in the order
 * the stroke goes. The strokes of 0 and 8 close on themselves.
 */
export const DIGIT_DOTS: Record<number, [number, number][]> = {
  0: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [1, 4], [0, 4], [0, 3], [0, 2], [0, 1]],
  1: [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
  2: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4]],
  3: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 2], [2, 3], [2, 4], [1, 4], [0, 4]],
  4: [[2, 4], [2, 3], [2, 2], [2, 1], [2, 0], [1, 1], [0, 2], [1, 2]],
  5: [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 3], [2, 4], [1, 4], [0, 4]],
  6: [[2, 0], [1, 0], [0, 1], [0, 2], [0, 3], [1, 4], [2, 3], [2, 2], [1, 2]],
  7: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 2], [1, 3], [1, 4]],
  8: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 2], [2, 3], [2, 4], [1, 4], [0, 4], [0, 3], [0, 2], [0, 1]],
  9: [[0, 4], [1, 4], [2, 3], [2, 2], [2, 1], [1, 0], [0, 1], [0, 2], [1, 2]],
};

/** The digits whose stroke comes back to its first dot. */
export const CLOSED = [0, 8];

/** Whether a drag through these dots (indices into the digit's list) draws the digit: its stroke order, either way, nothing skipped. */
export function joins(digit: number, path: number[]): boolean {
  const n = DIGIT_DOTS[digit]?.length ?? 0;
  if (n === 0 || path.length !== n) return false;
  return path.every((d, i) => d === i) || path.every((d, i) => d === n - 1 - i);
}

/** Dials a digit: a right one is kept, the seventh lights the flame, a wrong one empties the dial and is busy. */
export function dial(state: PillarsState, d: number): { state: PillarsState; busy: boolean } {
  if (state.flame) return { state, busy: false };
  if (d !== NUMBER[state.dialled.length]) return { state: { ...state, dialled: [] }, busy: true };
  const dialled = [...state.dialled, d];
  return { state: { ...state, dialled, flame: dialled.length === NUMBER.length }, busy: false };
}

/** How long a firecracker keeps the ghosts away, in ms. */
export const SCARED_MS = 4000;

/** Whether the ghosts are still gone, the firecracker having gone off at `at`. */
export const ghostsScared = (at: number, now: number) => now >= at && now - at < SCARED_MS;

export const START: PillarsState = {
  switches: [false, false, false],
  uv: false,
  stamped: PILLARS.map(() => false),
  joined: PILLARS.map(() => false),
  dialled: [],
  flame: false,
};

/** The stored state, read back: anything malformed is the wall as found. */
export function loadPillars(stored: string | null): PillarsState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<PillarsState> | null;
    const flags = (list: unknown, n: number): list is boolean[] =>
      Array.isArray(list) && list.length === n && list.every((b) => typeof b === "boolean");
    if (
      !v ||
      !flags(v.switches, 3) ||
      !flags(v.stamped, PILLARS.length) ||
      !flags(v.joined, PILLARS.length) ||
      typeof v.uv !== "boolean" ||
      typeof v.flame !== "boolean" ||
      !Array.isArray(v.dialled) ||
      v.dialled.length > NUMBER.length ||
      !v.dialled.every((d, i) => d === NUMBER[i])
    )
      return START;
    return { switches: v.switches as PillarsState["switches"], uv: v.uv, stamped: v.stamped, joined: v.joined, dialled: v.dialled, flame: v.flame };
  } catch {
    return START;
  }
}

/** The state in storage, or the wall as found if there is none. */
export function savedPillars(): PillarsState {
  try {
    return loadPillars(localStorage.getItem(WELL_PILLARS_KEY));
  } catch {
    return START;
  }
}

/** The stop «luce uv»: the switches pressed and the lantern taken, nothing more. */
export const solvedUv = (): PillarsState => ({ ...START, switches: [true, true, true], uv: true });

/** The stop «pilastri»: everything done, the number dialled. */
export const solvedPillars = (): PillarsState => ({
  ...solvedUv(),
  stamped: PILLARS.map(() => true),
  joined: PILLARS.map(() => true),
  dialled: [...NUMBER],
  flame: true,
});
