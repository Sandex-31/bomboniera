import type { Played } from "../flute";
import { bounce, type Dir, type Mirror } from "../beam";
import { WELL_BUDS_KEY } from "../../data/puzzle";

/*
 * The third wall of the well, in two parts. First a pool with turtles, sunk
 * under the water: a tune painted on the water (UV shows it) raises them, and
 * they become stones to cross to the far side. There a mural of a beam of
 * light and four buds. The mirrors are fixed, a drawing to read like the
 * first floor's: the visitor follows the beam and taps the buds in the order
 * it reaches them. Some mirrors show only under the UV light.
 */

/** The tune painted by the water, which raises the turtles when played. */
export const TURTLE_TUNE: readonly Played[] = [
  { note: 3, long: false },
  { note: 6, long: true },
  { note: 0, long: false },
  { note: 5, long: false },
];

type Cell = [number, number];

/** Columns by rows; cells are [column, row]. */
export const MURAL: {
  size: [number, number];
  source: { cell: Cell; dir: Dir };
  mirrors: { cell: Cell; m: Mirror; hidden: boolean }[];
  buds: { cell: Cell; whistle: number }[];
} = {
  size: [8, 5],
  source: { cell: [0, 2], dir: 0 },
  mirrors: [
    { cell: [3, 2], m: "\\", hidden: false },
    { cell: [3, 4], m: "/", hidden: true },
    { cell: [1, 4], m: "\\", hidden: true },
    { cell: [1, 1], m: "/", hidden: false },
    { cell: [5, 1], m: "\\", hidden: false },
  ],
  // placed so that, ranked by column, at most one is reached in its place
  buds: [
    { cell: [1, 3], whistle: 3 },
    { cell: [2, 1], whistle: 0 },
    { cell: [3, 3], whistle: 1 },
    { cell: [5, 3], whistle: 4 },
  ],
};

const STEP: Cell[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/** The cells the beam crosses, in order, from the source until it leaves the grid; a cell crossed twice is twice in it. */
export function traceMural(): Cell[] {
  const [w, h] = MURAL.size;
  const cells: Cell[] = [];
  let [x, y] = MURAL.source.cell;
  let dir = MURAL.source.dir;
  for (let i = 0; i < w * h * 4 && x >= 0 && y >= 0 && x < w && y < h; i++) {
    cells.push([x, y]);
    const mirror = MURAL.mirrors.find((m) => m.cell[0] === x && m.cell[1] === y);
    if (mirror) dir = bounce(dir, mirror.m);
    x += STEP[dir][0];
    y += STEP[dir][1];
  }
  return cells;
}

/** Where in `traceMural()` the beam first meets a hidden mirror: before it the drawing shows the beam, after it only the UV light does. */
export function firstHidden(): number {
  return traceMural().findIndex(([x, y]) => MURAL.mirrors.some((m) => m.hidden && m.cell[0] === x && m.cell[1] === y));
}

/** The indices of `MURAL.buds` in the order the beam reaches them. */
export function budOrder(): number[] {
  const order: number[] = [];
  for (const [x, y] of traceMural()) {
    const k = MURAL.buds.findIndex((b) => b.cell[0] === x && b.cell[1] === y);
    if (k >= 0 && !order.includes(k)) order.push(k);
  }
  return order;
}

/** The buds in the order of the beam: the tune they are tapped in. */
export const BUD_TUNE = budOrder().map((k) => MURAL.buds[k]);

export type BudsState = {
  /** The turtles' tune was played: they are stones to the far side. */
  turtles: boolean;
  /** How many buds are right so far, in a row. */
  played: number;
  /** The four buds were tapped in order: the flame of this wall is given. */
  flame: boolean;
};

export const START: BudsState = { turtles: false, played: 0, flame: false };

/** The stored state, read back: anything malformed is the wall as found. */
export function loadBuds(stored: string | null): BudsState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<Record<keyof BudsState, unknown>> | null;
    if (
      !v ||
      typeof v.turtles !== "boolean" ||
      typeof v.flame !== "boolean" ||
      !Number.isInteger(v.played) ||
      (v.played as number) < 0 ||
      (v.played as number) > MURAL.buds.length
    )
      return START;
    return v as BudsState;
  } catch {
    return START;
  }
}

/** The state in storage, or the wall as found if there is none. */
export function savedBuds(): BudsState {
  try {
    return loadBuds(localStorage.getItem(WELL_BUDS_KEY));
  } catch {
    return START;
  }
}

/** The stop «boccioli»: the turtles raised, the buds sung in order. */
export const solvedBuds = (): BudsState => ({ turtles: true, played: MURAL.buds.length, flame: true });
