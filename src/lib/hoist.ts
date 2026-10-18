/**
 * The hoist of the machine room, and the little scale on the bench beside it.
 *
 * A cage hangs at the short end of a beam, down in a pit; the winch that
 * would raise it is driven by the gear board. It only raises it once the
 * beam is level, and that takes weights hung from the notches of the long
 * end. There are five things lying about to hang there, and nothing says
 * what any of them weighs: they look nothing like what they weigh, on
 * purpose. Each pulls harder the further out it hangs, like a child on a
 * seesaw.
 *
 * The beam only shows which way it tips, never by how much. What the
 * visitor has to go on is the scale: one or two things on each pan, and
 * which pan goes down. Weighed with some thought, that is enough to know all
 * five exactly, and from there the one way to level the beam. Tried at
 * random, the beam has some fifteen hundred settings. `npm test` checks both.
 */

import { HOIST_KEY } from "../data/puzzle";

export const OBJECTS = ["palla", "incudine", "campana", "secchio", "ruota"] as const;
export type Thing = (typeof OBJECTS)[number];

/** What each thing weighs. Only the beam and the scale ever read this. */
const WEIGHT: Record<Thing, number> = { palla: 6, incudine: 9, campana: 8, secchio: 4, ruota: 2 };

/** How many notches the long end has, at equal steps out from the pivot. */
export const NOTCHES = 5;
/** How hard the cage pulls on the short end, in the same units: weight times reach. */
export const CAGE = 23;
/** How many things a pan of the scale holds. */
export const PAN = 2;

/** Where a thing is: back where it was found, on a pan of the scale, or on a notch of the beam. */
export type Place = "posto" | "sinistra" | "destra" | 1 | 2 | 3 | 4 | 5;

export type HoistState = {
  where: Record<Thing, Place>;
  /** Whether the crate in the cage has been opened, and the piece taken out of it. */
  crate: boolean;
  piece: boolean;
};

export const START: HoistState = {
  where: { palla: "posto", incudine: "posto", campana: "posto", secchio: "posto", ruota: "posto" },
  crate: false,
  piece: false,
};

const on = (state: HoistState, place: Place) => OBJECTS.filter((t) => state.where[t] === place);

/** Whether `thing` can go to `place` as things stand: a notch holds one, a pan two. */
export function canPut(state: HoistState, thing: Thing, place: Place): boolean {
  if (place === "posto") return true;
  const there = on(state, place).filter((t) => t !== thing);
  return typeof place === "number" ? there.length === 0 : there.length < PAN;
}

/** Which way the beam tips: -1 the cage end down, 1 the weights end down, 0 level. */
export function tilt(state: HoistState): -1 | 0 | 1 {
  const pull = OBJECTS.reduce((sum, t) => {
    const p = state.where[t];
    return typeof p === "number" ? sum + WEIGHT[t] * p : sum;
  }, 0);
  return Math.sign(pull - CAGE) as -1 | 0 | 1;
}

/** Which way the scale tips: -1 the left pan down, 1 the right pan down, 0 level. */
export function weigh(state: HoistState): -1 | 0 | 1 {
  const load = (side: Place) => on(state, side).reduce((sum, t) => sum + WEIGHT[t], 0);
  return Math.sign(load("destra") - load("sinistra")) as -1 | 0 | 1;
}

/** The beam level, as the search found it. */
const WAY: Partial<Record<Thing, Place>> = { ruota: 3, secchio: 2, incudine: 1 };

export function solvedHoist(): HoistState {
  return {
    where: Object.fromEntries(OBJECTS.map((t) => [t, WAY[t] ?? "posto"])) as Record<Thing, Place>,
    crate: true,
    piece: true,
  };
}

const PLACES: Place[] = ["posto", "sinistra", "destra", 1, 2, 3, 4, 5];

/** The stored hoist, read back: anything malformed, or overloaded, is the hoist as found. */
export function hoistFrom(stored: string | null): HoistState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<HoistState> | null;
    if (!v || typeof v.where !== "object" || v.where === null) return START;
    if (typeof v.crate !== "boolean" || typeof v.piece !== "boolean") return START;
    let state: HoistState = { ...START, crate: v.crate, piece: v.crate && v.piece };
    for (const t of OBJECTS) {
      const p = (v.where as Record<string, unknown>)[t];
      if (!PLACES.includes(p as Place) || !canPut(state, t, p as Place)) return START;
      state = { ...state, where: { ...state.where, [t]: p as Place } };
    }
    return state;
  } catch {
    return START;
  }
}

export function loadHoist(): HoistState {
  try {
    return hoistFrom(localStorage.getItem(HOIST_KEY));
  } catch {
    return START;
  }
}

/** For the test only: the weights, so it can search what the scale and the beam would say. */
export const weightsForTest = () => ({ ...WEIGHT });
