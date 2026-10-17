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

/** How long Rotom takes to catch fire and come out of the smoke changed, once it has landed. */
export const BURN_MS = 4500;
/** When it changes form: with the smoke at its thickest. */
const SWAP_AT = 2600;

/** 0 before `from`, 1 after `to`, eased in between. */
function ramp(t: number, from: number, to: number) {
  const p = Math.min(1, Math.max(0, (t - from) / (to - from)));
  return p * p * (3 - 2 * p);
}

/**
 * Rotom catching fire on its first arrival in the machine room, `ms` after
 * it came to rest: how red-hot it glows (`heat`), how hard it shakes, how
 * high the flames round it reach, how thick the smoke that swallows it is
 * (all 0 to 1), and whether it has changed form yet — which it does only
 * once the smoke has hidden it. It heats and shakes, the flames climb, they
 * burst into smoke, and the smoke lifts off a few last flames that die away.
 */
export function burn(ms: number) {
  const t = Math.min(BURN_MS, Math.max(0, ms));
  const flames =
    t < SWAP_AT ? ramp(t, 800, 2400) : (1 - 0.75 * ramp(t, SWAP_AT, 3000)) * (1 - ramp(t, 3800, BURN_MS));
  return {
    heat: ramp(t, 0, 1200) * (1 - ramp(t, SWAP_AT, 3400)),
    shake: ramp(t, 0, 1200) * (1 - ramp(t, 2400, SWAP_AT)),
    flames,
    smoke: ramp(t, 2200, SWAP_AT) * (1 - ramp(t, 2900, BURN_MS)),
    swapped: t >= SWAP_AT,
  };
}
