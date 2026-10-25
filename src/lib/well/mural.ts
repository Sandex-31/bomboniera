import { WELL_MURAL_KEY } from "../../data/puzzle";
import type { Flames } from "./flames";

/*
 * The community mural on the altar of the well. In the game it was split in
 * fifty pieces among thousands of players; here the community is the visitor
 * on the floors above, and each piece is a solution already found. They go
 * back top to bottom in the order the puzzles came, the way down the tower.
 * The decoys, from other games or from answers that were wrong, stay out.
 */

/** The seven true pieces, and the decoys. */
export type PieceId =
  | "lost"
  | "occhio"
  | "stella"
  | "codice"
  | "nastro"
  | "babele"
  | "scheda"
  | "samus"
  | "cuphead"
  | "knight"
  | "falso";

/** The solution, top to bottom: the order the puzzles come in `STAGES`. */
export const SLOTS: PieceId[] = ["lost", "occhio", "stella", "codice", "nastro", "babele", "scheda"];

/** Every piece on offer, true and false, in the order they lie by the panel: mixed, so the tray is no answer. */
export const PIECES: PieceId[] = ["nastro", "samus", "occhio", "codice", "cuphead", "scheda", "lost", "falso", "babele", "knight", "stella"];

export type MuralState = { placed: (PieceId | null)[]; done: boolean };

export const START: MuralState = { placed: SLOTS.map(() => null), done: false };

const withDone = (placed: (PieceId | null)[]): MuralState => ({ placed, done: placed.every((p, i) => p === SLOTS[i]) });

/** Puts `piece` in `slot`, or empties it with null. A piece already elsewhere moves; the one it lands on goes back by the panel. */
export function place(state: MuralState, slot: number, piece: PieceId | null): MuralState {
  if (state.done) return state;
  const placed = state.placed.map((p) => (p === piece ? null : p));
  placed[slot] = piece;
  return withDone(placed);
}

/** Whether the four candles are lit, which opens the panel. */
export const lit = (flames: Flames): boolean => flames.tv && flames.corvi && flames.boccioli && flames.pilastri;

/** The stored mural, read back: anything malformed is the empty panel. */
export function loadMural(stored: string | null): MuralState {
  try {
    const v = JSON.parse(stored ?? "null") as { placed?: unknown } | null;
    const placed = v?.placed;
    if (
      !Array.isArray(placed) ||
      placed.length !== SLOTS.length ||
      !placed.every((p) => p === null || PIECES.includes(p)) ||
      new Set(placed.filter(Boolean)).size !== placed.filter(Boolean).length
    )
      return START;
    return withDone(placed as (PieceId | null)[]);
  } catch {
    return START;
  }
}

/** The mural in storage, or the empty panel if there is none. */
export function savedMural(): MuralState {
  try {
    return loadMural(localStorage.getItem(WELL_MURAL_KEY));
  } catch {
    return START;
  }
}

/** The stop «murale»: every piece in its place. */
export const solvedMural = (): MuralState => withDone([...SLOTS]);
