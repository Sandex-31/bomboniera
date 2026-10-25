/*
 * Logica Matematica: a formula in an abandoned notebook, three switches on
 * a row of desks for p, q and r, and a bulb for what the formula comes to.
 * The visitor sets each of the eight combinations and marks whether the
 * bulb is lit; the whole table is handed in at once. Close to ¬r, and wrong
 * in one row only for whoever stops at the look of it.
 */

/** As the notebook writes it: ¬ binds tightest, then ∧, ∨, and → last. */
export const FORMULA = "((p → q) → ¬(q ∧ r)) ∧ (p ∨ (r → q))";

const imp = (a: boolean, b: boolean) => !a || b;

export function evaluate(p: boolean, q: boolean, r: boolean): boolean {
  return imp(imp(p, q), !(q && r)) && (p || imp(r, q));
}

/** Row `k` of the table is p q r = k in binary, p the highest bit. */
export const rowOf = (k: number): [p: boolean, q: boolean, r: boolean] => [!!(k & 4), !!(k & 2), !!(k & 1)];

/** The table as a byte: bit `k` is row `k`, rows in the order pqr = 000…111. 117, 10101110 read from row 000. */
export const LOGICA_ANSWER = Array.from({ length: 8 }, (_, k) => evaluate(...rowOf(k))).reduce((n, b, k) => n | (b ? 1 << k : 0), 0);

export function checkLogica(table: boolean[]): boolean {
  return table.length === 8 && table.every((b, k) => b === !!((LOGICA_ANSWER >> k) & 1));
}
