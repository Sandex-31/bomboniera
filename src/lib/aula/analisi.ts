import type { AulaState } from "./chain";

/*
 * Analisi Matematica: a curve drawn on a grid on the big blackboard, its
 * formula chalked over it, and two marks on the axis. The area under it
 * between the marks is an integer, found by counting squares near enough to
 * guess at, or exactly with the integral. The first right answer is turned
 * down all the same and stamped on the register; the same answer at the
 * next appello passes.
 */

export const f = (x: number): number => x ** 3 / 4 - 3 * x ** 2 + 9 * x + 2;
export const A = 1;
export const B = 7;

/** x⁴/16 − x³ + 9x²/2 + 2x, the primitive of `f`. */
const F = (x: number) => x ** 4 / 16 - x ** 3 + (9 * x ** 2) / 2 + 2 * x;

/** 36: the area under `f` from `A` to `B`. */
export const ANALISI_ANSWER = Math.round(F(B) - F(A));

/** Right the first time is stamped; right once stamped passes; anything else fails. */
export function judgeAnalisi(s: AulaState, n: number): "pass" | "stamp" | "fail" {
  if (n !== ANALISI_ANSWER) return "fail";
  return s.analisiStamped ? "pass" : "stamp";
}

// TODO(Salvo): the absurd reasons written on the register next to the right answer; one is picked each time it is shown.
export const REASONS: string[] = [
  "scritto a matita",
  "il 6 sembra uno 0",
  "manca la data in alto a destra",
  "risultato giusto, ma non si fa così",
  "consegnato con troppa sicurezza",
];
