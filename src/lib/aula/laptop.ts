import { Box3, type Object3D } from "three";
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

/**
 * The box of `part` in the frame `model` stands in. A cached model taken off
 * the desk when the hall unmounts keeps the desk's place in its world matrix,
 * so the next visit would lay the keys out a desk's height too high: the
 * model's matrices are brought up to date first, wherever it hangs now.
 */
export function partBox(model: Object3D, part: Object3D): Box3 {
  model.updateWorldMatrix(false, true);
  const box = new Box3().setFromObject(part);
  return model.parent ? box.applyMatrix4(model.parent.matrixWorld.clone().invert()) : box;
}
