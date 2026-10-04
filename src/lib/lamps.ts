/**
 * Twenty-eight lamps, and the one way to put them all out.
 *
 * Pressing a lamp turns it over along with the four around it, so nothing can
 * be dealt with on its own: every press undoes part of the last one. What
 * makes it more than a toy is that the grid is four by seven, and for that
 * shape the machine that flips lamps is invertible — there is exactly one set
 * of lamps that puts the board out, and no other.
 *
 * Which is the whole point. The answer is not the dark board, it is the
 * record of which lamps had to be pressed: four rows of seven, ones and
 * zeroes, and a graduate in computer science knows what to do with those.
 *
 * Everything below is derived from that record. The board that comes up is
 * not stored anywhere — it is worked out by pressing the answer onto a dark
 * grid, which is why it can only ever be undone by pressing the same lamps
 * again. `npm test` re-derives it, re-solves it, and checks the grid really
 * does have a single solution rather than taking this comment's word for it.
 */

import { GRADES } from "./ski";

export const ROWS = 4;
export const COLS = 7;
export const CELLS = ROWS * COLS;

export type Board = boolean[];

export const at = (row: number, col: number) => row * COLS + col;

/**
 * The four numbers the pressed lamps spell out, one per row.
 *
 * They are the gradients of the four kinds of piste, taken straight off the
 * map next door rather than written again here — which is the only reason
 * the two panels can never drift apart.
 *
 * Only the test is allowed to look at this. The panel is handed the lit
 * board and nothing else, and could not print the answer if it wanted to.
 */
export const CODE = GRADES;

/** The lamps one press turns over: itself and its four neighbours. */
export function flips(row: number, col: number): number[] {
  const out: number[] = [];
  for (const [dr, dc] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && c >= 0 && r < ROWS && c < COLS) out.push(at(r, c));
  }
  return out;
}

/** The set of presses that solves it: each row of the code, in binary. */
export const ANSWER: Board = Array.from({ length: CELLS }, (_, i) =>
  Boolean((CODE[Math.floor(i / COLS)] >> (COLS - 1 - (i % COLS))) & 1),
);

/** Turning a lamp over, and the four around it. */
export function press(board: Board, row: number, col: number): Board {
  const next = [...board];
  for (const i of flips(row, col)) next[i] = !next[i];
  return next;
}

/** What is lit when the panel opens: the answer, pressed onto a dark grid. */
export const START: Board = ANSWER.reduce(
  (board, on, i) => (on ? press(board, Math.floor(i / COLS), i % COLS) : board),
  Array.from({ length: CELLS }, () => false) as Board,
);

export const dark = (board: Board) => board.every((lit) => !lit);

/** What a record of presses spells, one number per row. */
export function read(pressed: Board): number[] {
  return Array.from({ length: ROWS }, (_, r) =>
    pressed.slice(r * COLS, r * COLS + COLS).reduce((n, on) => n * 2 + (on ? 1 : 0), 0),
  );
}
