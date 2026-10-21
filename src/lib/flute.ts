import { LONG_MS } from "./card";

/** The flute's eight notes, one per direction, clockwise from up. */
export const DIRS = ["u", "ur", "r", "dr", "d", "dl", "l", "ul"] as const;

export type Note = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Played = { note: Note; long: boolean };

/** A note held for `heldMs`: long from `LONG_MS` on, as with the organ's chains. */
export function played(note: Note, heldMs: number): Played {
  return { note, long: heldMs >= LONG_MS };
}

/**
 * One more note of a tune, after `done` were already right: how many are right
 * now. A wrong one starts over, and counts as the first if it is one. With
 * `strict` off, how long a note is held is ignored.
 */
export function follow(tune: readonly Played[], done: number, p: Played, strict = true): number {
  const fits = (k: number) => k < tune.length && tune[k].note === p.note && (!strict || tune[k].long === p.long);
  if (fits(done)) return done + 1;
  return fits(0) ? 1 : 0;
}
