import type { Note, Played } from "../flute";
import { LONG_MS } from "../card";
import { WELL_CROWS_KEY } from "../../data/puzzle";

/*
 * The second wall of the well, in two parts. First a box with a porcupine
 * that walks on its own, turning back at every wall; the visitor has only a
 * pink switch, which raises and lowers one barrier, until he has crossed the
 * three yellow switches. Then the door to eight crows opens: they stand on
 * the sides and corners of a square, each the direction of its place seen
 * from the middle, and caw a tune, short and long. The flute plays it back.
 */

/* the box */
export const COLS = 10;
export const ROWS = 4;
/** `#` is stone. He walks on the cell above stone: row 0 is a floor with a gap on the right, row 2 a floor over the ground, whose hole at the left lets him out. */
export const BOX: readonly string[] = [
  "..........",
  "#######...",
  "..........",
  ".#########",
];
/** The barrier the pink switch raises: it stands in this cell. */
export const BAR = { x: 5, y: 0 };
/** The yellow switches, as cells. */
export const YELLOW: [number, number][] = [
  [1, 0],
  [6, 0],
  [3, 2],
];
/** How often he takes a step. */
export const STEP_MS = 300;

export type Porc = { x: number; y: number; dir: 1 | -1 };
export const PORC_START: Porc = { x: 4, y: 0, dir: 1 };

const blocked = (x: number, y: number, up: boolean) =>
  x < 0 || x >= COLS || (y < ROWS && BOX[y][x] === "#") || (up && x === BAR.x && y === BAR.y);

/** Gone through the hole in the ground: the box starts again. */
export const fellOut = (p: Porc): boolean => p.y >= ROWS;

/** One step: he drops where nothing is under him, else walks a cell, or turns where the way is stone or the barrier. */
export function stepPorc(p: Porc, barrierUp: boolean): Porc {
  if (fellOut(p)) return p;
  if (!blocked(p.x, p.y + 1, barrierUp) && p.y + 1 <= ROWS) return { ...p, y: p.y + 1 };
  return blocked(p.x + p.dir, p.y, barrierUp) ? { ...p, dir: p.dir === 1 ? -1 : 1 } : { ...p, x: p.x + p.dir };
}

/** The key of a cell in the set of those he has visited. */
export const cellKey = (p: { x: number; y: number }): string => `${p.x},${p.y}`;

/** Whether every yellow switch is in the visited cells. */
export const boxDone = (visited: Set<string>): boolean => YELLOW.every(([x, y]) => visited.has(`${x},${y}`));

/* the crows */
/** The eight crows, each the flute's direction of its place on the square. */
export const CROWS: Note[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** The tune they caw, always the same: every crow once, three of the caws drawn out. */
export const CROW_TUNE: readonly Played[] = [
  { note: 6, long: false },
  { note: 1, long: false },
  { note: 4, long: true },
  { note: 0, long: false },
  { note: 7, long: false },
  { note: 2, long: true },
  { note: 5, long: false },
  { note: 3, long: true },
];

export const SHORT_CAW_MS = 260;
export const LONG_CAW_MS = LONG_MS + 270;
export const CAW_GAP_MS = 240;

/** Which crow is cawing `ms` after the start: its turn in the tune, -1 between two, the tune's length when it is over. */
export function cawAt(tune: readonly Played[], ms: number): number {
  let t = ms;
  for (let k = 0; k < tune.length; k++) {
    const d = tune[k].long ? LONG_CAW_MS : SHORT_CAW_MS;
    if (t < d) return k;
    t -= d;
    if (t < CAW_GAP_MS) return -1;
    t -= CAW_GAP_MS;
  }
  return tune.length;
}

export type CrowsState = {
  /** The porcupine crossed the three yellow switches: the door is open. */
  box: boolean;
  /** The crows have cawed their tune through once. */
  heard: boolean;
  /** The tune was played back: the flame of this wall is given. */
  flame: boolean;
};

export const START: CrowsState = { box: false, heard: false, flame: false };

/** The stored state, read back: anything malformed is the wall as found. */
export function loadCrows(stored: string | null): CrowsState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<Record<keyof CrowsState, unknown>> | null;
    if (!v || (Object.keys(START) as (keyof CrowsState)[]).some((k) => typeof v[k] !== "boolean")) return START;
    return v as CrowsState;
  } catch {
    return START;
  }
}

/** The state in storage, or the wall as found if there is none. */
export function savedCrows(): CrowsState {
  try {
    return loadCrows(localStorage.getItem(WELL_CROWS_KEY));
  } catch {
    return START;
  }
}

/** The stop «corvi»: the box crossed, the tune heard and played. */
export const solvedCrows = (): CrowsState => ({ box: true, heard: true, flame: true });
