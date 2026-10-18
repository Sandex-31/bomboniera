/**
 * The punched card of the steam organ, torn in three, and the tune on it.
 *
 * Each row of the card is a whistle, each column a moment: a round hole is a
 * short note, a long slot a long one. The tune is the phrase of «Genesis
 * Retake Light» Salvo chose, twelve notes on six whistles. Nothing on the
 * card is written. The shapes of the six handles are printed down the left
 * margin of the first piece, and nowhere else.
 *
 * The three pieces go back together on the organ's lectern, in order and the
 * right way round. Two things decide it: the torn edges, which only meet
 * their own neighbour and only one way up, and the small round holes along
 * the top margin, which have to sit on the lectern's pins. A piece put in
 * back to front, or upside down, or in the wrong place, misses one or the
 * other. `npm test` tries every way of laying the three pieces down.
 */

import { ORGAN_KEY } from "../data/puzzle";

/** The six whistles, as rows: the shapes of their handles, top to bottom. */
export const HANDLES = ["tondo", "triangolo", "quadrato", "stella", "mezzaluna", "goccia"] as const;
export type Handle = (typeof HANDLES)[number];

export const ROWS = HANDLES.length;
export const COLS = 12;
/** How many columns each piece holds. */
export const STRIP = 4;
export const PIECES = ["A", "B", "C"] as const;
export type PieceId = (typeof PIECES)[number];

/** The tune: which whistle, and whether it is held. Rows 0 to 5 are C, D, E flat, F, G, A flat. */
export const MELODY: readonly { note: number; long: boolean }[] = [
  { note: 5, long: false },
  { note: 3, long: false },
  { note: 0, long: true },
  { note: 5, long: false },
  { note: 3, long: false },
  { note: 0, long: true },
  { note: 5, long: false },
  { note: 3, long: false },
  { note: 0, long: false },
  { note: 1, long: false },
  { note: 2, long: false },
  { note: 4, long: true },
];

export type Hole = "foro" | "fessura";
/** The card whole: `CARD[row][col]`. */
export const CARD: (Hole | null)[][] = HANDLES.map((_, row) =>
  MELODY.map(({ note, long }) => (note === row ? (long ? "fessura" : "foro") : null)),
);

/**
 * A torn edge, as how far it strays from the straight line at each boundary
 * between rows, top to bottom. Both pieces either side of a tear share it.
 */
export type Tear = readonly number[];
const TEAR_AB: Tear = [0, 1, 1, -1, 0, 1, 0];
const TEAR_BC: Tear = [0, -1, 0, 1, 1, -1, 0];

/** Each piece as found: its two edges (null is the card's own straight edge) and its margin holes. */
export const PIECE: Record<PieceId, { left: Tear | null; right: Tear | null; holes: readonly number[] }> = {
  A: { left: null, right: TEAR_AB, holes: [0.5] },
  B: { left: TEAR_AB, right: TEAR_BC, holes: [2.5] },
  C: { left: TEAR_BC, right: null, holes: [1] },
};

/** Where the lectern's pins stand, in columns from its left end. */
export const PINS = [0.5, 6.5, 9];

/** A piece as laid down: which, and whether turned over left to right, or top to bottom. */
export type Laid = { piece: PieceId; flipH: boolean; flipV: boolean };

const mirror = (t: Tear | null) => (t ? t.map((x) => -x) : null);
const upend = (t: Tear | null) => (t ? [...t].reverse() : null);
const same = (a: Tear | null, b: Tear | null) => (a === null || b === null ? a === b : a.every((x, i) => x === b[i]));

/** A laid piece's edges and margin holes, as they now face. Holes on the bottom margin do not count. */
export function faced({ piece, flipH, flipV }: Laid) {
  const p = PIECE[piece];
  let left = flipH ? mirror(p.right) : p.left;
  let right = flipH ? mirror(p.left) : p.right;
  if (flipV) {
    left = upend(left);
    right = upend(right);
  }
  const holes = flipV ? [] : p.holes.map((x) => (flipH ? STRIP - x : x));
  return { left, right, holes };
}

/** Whether the three slots of the lectern hold the card whole, the right way round. */
export function assembled(lectern: readonly (Laid | null)[]): boolean {
  if (lectern.length !== 3 || lectern.some((l) => l === null)) return false;
  const laid = (lectern as Laid[]).map(faced);
  if (laid[0].left !== null || laid[2].right !== null) return false;
  for (let s = 0; s < 2; s++) if (!same(laid[s].right, laid[s + 1].left)) return false;
  const holes = laid.flatMap((l, s) => l.holes.map((x) => x + s * STRIP)).sort((a, b) => a - b);
  return holes.length === PINS.length && holes.every((x, i) => x === PINS[i]);
}

/** A pull shorter than this is a short note, longer a long one. */
export const LONG_MS = 450;

/**
 * One pull of a chain, `held` ms long, after `done` notes of the tune were
 * already right: how many are right now. A wrong one starts it over, and
 * counts as the first note if it is one.
 */
export function step(done: number, note: number, held: number): number {
  const long = held >= LONG_MS;
  const fits = (k: number) => k < MELODY.length && MELODY[k].note === note && MELODY[k].long === long;
  if (fits(done)) return done + 1;
  return fits(0) ? 1 : 0;
}

export type OrganState = {
  /** The three slots of the lectern. */
  lectern: (Laid | null)[];
  /** Whether the tune has been played right. */
  played: boolean;
};

export const EMPTY: OrganState = { lectern: [null, null, null], played: false };

export function solvedOrgan(): OrganState {
  return {
    lectern: PIECES.map((piece) => ({ piece, flipH: false, flipV: false })),
    played: true,
  };
}

/** The stored organ, read back: anything malformed is the organ as found. */
export function organFrom(stored: string | null): OrganState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<OrganState> | null;
    if (!v || !Array.isArray(v.lectern) || v.lectern.length !== 3 || typeof v.played !== "boolean") return EMPTY;
    const seen = new Set<string>();
    for (const l of v.lectern) {
      if (l === null) continue;
      if (
        typeof l !== "object" ||
        !PIECES.includes(l.piece) ||
        seen.has(l.piece) ||
        typeof l.flipH !== "boolean" ||
        typeof l.flipV !== "boolean"
      )
        return EMPTY;
      seen.add(l.piece);
    }
    return { lectern: v.lectern, played: v.played };
  } catch {
    return EMPTY;
  }
}

export function loadOrgan(): OrganState {
  try {
    return organFrom(localStorage.getItem(ORGAN_KEY));
  } catch {
    return EMPTY;
  }
}
