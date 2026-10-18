/**
 * The three boilers of the machine room, and how a fire is got going in one.
 *
 * Heat Rotom is put inside through the open door and the bellows are pumped
 * with the pedal held down: the needle of the gauge climbs, and the boiler is
 * lit if the pedal comes up while the needle is in the green. Into the red
 * and the safety valve blows Rotom straight back out.
 *
 * What makes it more than timing is the damper over each boiler. Only one of
 * its three positions gives the fire the air it wants, and it is a different
 * one for each boiler. Too little air and the needle stalls short of the
 * green, smoking black; too much and the fire flares in lurches that skip
 * the green altogether, with smoke that is gone as soon as it is out. The
 * smoke is the only thing that says which way to move the lever.
 */

import { BOILERS_KEY } from "../data/puzzle";

/** The three shapes that tell the three lines of steam apart, all over the floor. */
export const SHAPES = ["tondo", "triangolo", "quadrato"] as const;
export type Shape = (typeof SHAPES)[number];

/** The damper lever: up lets the most air in, down the least. */
export type Damper = 0 | 1 | 2;
const air = (d: Damper) => 2 - d;

/** One per boiler, left to right, and all different: each has to be read on its own. */
export const RIGHT_DAMPERS: readonly Damper[] = [1, 2, 0];

/** The boiler whose ash drawer holds the first piece of the punched card. */
export const DRAWER_BOILER = SHAPES.indexOf("quadrato");

/** Where the needle has to be when the pedal comes up, and where it blows. */
export const GREEN: readonly [number, number] = [0.6, 0.8];
export const RED = GREEN[1];

/** How long the needle takes to cross the green with the right damper. */
export const GREEN_MS = 900;
/** Where a fire short of air stalls, and how fast it gets there. */
const STALL = 0.48;
const STALL_MS = 700;
/** How far one lurch of an over-aired fire throws the needle, and how often. */
const LURCH = 0.28;
const LURCH_MS = 220;

/**
 * The needle, 0 at rest to 1 full, after pumping for `ms` with damper `d` on
 * a boiler that wants `right`.
 */
export function rise(d: Damper, right: Damper, ms: number): number {
  const t = Math.max(0, ms);
  if (air(d) === air(right)) return Math.min(1, ((GREEN[1] - GREEN[0]) / GREEN_MS) * t);
  if (air(d) < air(right)) return STALL * (1 - Math.exp(-t / STALL_MS));
  return Math.min(1, LURCH * Math.floor(t / LURCH_MS));
}

/** What the pedal coming up does, with the needle where it is. */
export function release(needle: number): "out" | "lit" | "spat" {
  if (needle >= RED) return "spat";
  return needle >= GREEN[0] ? "lit" : "out";
}

/** The smoke out of the chimney while pumping: the one hint at the damper. */
export function smoke(d: Damper, right: Damper): "nero" | "grigio" | "chiaro" {
  if (air(d) === air(right)) return "grigio";
  return air(d) < air(right) ? "nero" : "chiaro";
}

export type BoilerState = {
  /** Which boilers burn. */
  lit: boolean[];
  /** Where each damper lever was left. */
  dampers: Damper[];
  /** Which fire doors are unlatched. */
  doors: boolean[];
  /** Whether the ash drawer has been pulled out, and the piece taken from it. */
  drawer: boolean;
  piece: boolean;
};

export const COLD: BoilerState = {
  lit: [false, false, false],
  dampers: [0, 0, 0],
  doors: [false, false, false],
  drawer: false,
  piece: false,
};

const isFlags = (v: unknown): v is boolean[] =>
  Array.isArray(v) && v.length === SHAPES.length && v.every((b) => typeof b === "boolean");

/** The stored boilers, read back: anything malformed is the cold room. */
export function boilersFrom(stored: string | null): BoilerState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<BoilerState> | null;
    if (
      !v ||
      !isFlags(v.lit) ||
      !isFlags(v.doors) ||
      !Array.isArray(v.dampers) ||
      v.dampers.length !== SHAPES.length ||
      !v.dampers.every((d) => d === 0 || d === 1 || d === 2) ||
      typeof v.drawer !== "boolean" ||
      typeof v.piece !== "boolean"
    )
      return COLD;
    // a piece taken out of a drawer that was never opened is a forgery
    return { lit: v.lit, dampers: v.dampers, doors: v.doors, drawer: v.drawer, piece: v.drawer && v.piece };
  } catch {
    return COLD;
  }
}

export function loadBoilers(): BoilerState {
  try {
    return boilersFrom(localStorage.getItem(BOILERS_KEY));
  } catch {
    return COLD;
  }
}

/** All three lit the way a visitor would have: doors open, dampers right. */
export function solvedBoilers(): BoilerState {
  return {
    lit: [true, true, true],
    dampers: [...RIGHT_DAMPERS],
    doors: [true, true, true],
    drawer: true,
    piece: true,
  };
}

/** Which lines of steam are under pressure: a line is its boiler, lit. */
export function steamOf(state: BoilerState): Record<Shape, boolean> {
  return Object.fromEntries(SHAPES.map((s, i) => [s, state.lit[i]])) as Record<Shape, boolean>;
}
