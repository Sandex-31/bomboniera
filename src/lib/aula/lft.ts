import { LOGICA_ANSWER } from "./logica";

/*
 * Linguaggi Formali e Traduttori: an automaton half drawn on the side board.
 * Its chalk arrows are always there; eight more are faint, numbered by the
 * rows of Logica's table, and each is there only where its row is 1. With
 * the right ones in, the shortest word the automaton accepts is the only
 * one of its length; with any row wrong, it is another word or none.
 */

export const STATES = [0, 1, 2, 3, 4, 5, 6];
/** The letters of the prof's verdict. */
export const ALPHABET = "topk";
export const START = 0;
export const ACCEPT = 6;

export type Transition = { from: number; letter: string; to: number };

const t = (from: number, letter: string, to: number): Transition => ({ from, letter, to });

/** In chalk: ways back, and ways round. */
export const FIXED: Transition[] = [t(0, "t", 1), t(1, "t", 0), t(2, "t", 0), t(3, "p", 1), t(4, "p", 1), t(5, "o", 2), t(5, "t", 3), t(6, "k", 3)];

/** Faint, one for each row of the table, in its order: arrow `k` is there when row `k` is 1. */
export const OPTIONAL: Transition[] = [t(2, "k", 3), t(1, "p", 4), t(4, "o", 5), t(3, "k", 6), t(1, "o", 2), t(5, "p", 6), t(3, "t", 4), t(0, "o", 3)];

/** The arrows drawn, with the faint ones that `bits` (a table, bit `k` row `k`) puts in. */
export function automaton(bits: number): Transition[] {
  return [...FIXED, ...OPTIONAL.filter((_, k) => (bits >> k) & 1)];
}

/** The shortest word that reaches `ACCEPT`, by BFS; on a tie, the first in `ALPHABET`'s order. "" when none does. */
export function shortestAccepted(bits: number): string {
  const tr = automaton(bits);
  const word = new Map<number, string>([[START, ""]]);
  const queue = [START];
  for (const s of queue) {
    if (s === ACCEPT) return word.get(s)!;
    for (const a of ALPHABET) {
      const next = tr.find((x) => x.from === s && x.letter === a);
      if (next && !word.has(next.to)) {
        word.set(next.to, word.get(s)! + a);
        queue.push(next.to);
      }
    }
  }
  return "";
}

export const LFT_ANSWER = shortestAccepted(LOGICA_ANSWER);

export function checkLft(word: string): boolean {
  return word === LFT_ANSWER;
}
