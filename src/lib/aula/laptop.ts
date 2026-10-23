import { ORDER, passed, type AulaState } from "./chain";
import { SI_ANSWER } from "./si";

/*
 * The laptop on the desk, the end of the hall. Its lid lifts only once the
 * libretto is full, and it takes Sistemi Intelligenti's code on its own
 * keyboard, one digit at a time. A wrong code jams its gears and starts
 * over; there is no appello for it.
 */

/** Every exam is passed: the libretto is full. */
export function canOpen(s: AulaState): boolean {
  return ORDER.every((id) => passed(s, id));
}

/**
 * One key pressed with `buffer` typed so far. Only a digit goes in; once the
 * code is as long as the answer it is judged, and a wrong one is cleared.
 */
export function typed(buffer: string, key: string): { buffer: string; result: "more" | "ok" | "jam" } {
  if (!/^\d$/.test(key)) return { buffer, result: "more" };
  const next = buffer + key;
  if (next.length < SI_ANSWER.length) return { buffer: next, result: "more" };
  return next === SI_ANSWER ? { buffer: next, result: "ok" } : { buffer: "", result: "jam" };
}
