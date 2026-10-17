/**
 * Rotom going from one floor of the tower to the next: into the shaft at the
 * top, out of it at the bottom. Both ends are the same motion, one run
 * backwards — a spiral that tightens as it shrinks into the hole, and
 * unwinds as it grows out of the next one. Kept apart from the scene so the
 * shape of it can be checked without a renderer.
 */

/** Which way through the shaft, and which end of the trip. */
export type Move = {
  /** When it set off, in `performance.now()` ms. */
  at: number;
  /** Leaving the floor it is on, or arriving on the next. */
  kind: "out" | "in";
  /** Down the tower, or back up it. */
  dir: "down" | "up";
  /** The short way: every trip after the first one down. */
  fast: boolean;
};

/** How long one end of the trip takes. */
export const moveMs = (fast: boolean) => (fast ? 900 : 2400);

/** How far it travels to be out of sight: past the floor, or the ceiling. */
const DROP = 1.3;
/** Two whole turns on the way in. */
const SPIN = Math.PI * 4;
/** The stretch of an arrival during which it flashes and changes form. */
const FLASH_FROM = 0.35;
const FLASH_TO = 0.7;

/**
 * Where Rotom is, `p` of the way through one end of the trip: how far above
 * or below its resting height (`dy`, world units), how big (`scale`), how far
 * turned (`spin`, radians), and how bright the flash of its changing form is
 * (`flash`, 0 to 1, arrivals only).
 *
 * The `+ 0` turns a negative zero into zero: the motion begins and ends
 * exactly at rest, and a `-0` is not quite that.
 */
export function travel(p: number, kind: "out" | "in", dir: "down" | "up") {
  const t = Math.min(1, Math.max(0, p));
  if (kind === "out") {
    // it hangs a moment, then goes faster and faster
    const e = t * t * t;
    return {
      dy: (dir === "down" ? -1 : 1) * DROP * e + 0,
      scale: 1 - e,
      spin: SPIN * e,
      flash: 0,
    };
  }
  // and arrives fast, slowing to a stop where it floats
  const e = 1 - (1 - t) ** 3;
  // coming down the tower it drops in from above, going up it rises from below
  const from = dir === "down" ? 1 : -1;
  const flash =
    t > FLASH_FROM && t < FLASH_TO ? Math.sin((Math.PI * (t - FLASH_FROM)) / (FLASH_TO - FLASH_FROM)) : 0;
  return {
    dy: from * DROP * (1 - e) + 0,
    scale: e,
    spin: -SPIN * (1 - e) + 0,
    flash,
  };
}
