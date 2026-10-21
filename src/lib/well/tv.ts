import { H } from "./pixels";
import type { Played } from "../flute";
import { WELL_TV_KEY } from "../../data/puzzle";

/*
 * The first wall of the well: a living room. A chinchilla walks towards
 * wherever you tap. In the first room a chest sits on a green ledge, and a
 * green switch drops it on him; in it is the remote. In the second the floor
 * is blocks, pink and blue, and the remote swaps them all at once, so that
 * he can be walked to the sofa. Then the TV: it shows ghost faces whose
 * gazes, seen by UV light, are the notes of a tune for the flute.
 */

export type TvState = {
  /** The chest has been dropped and is open. */
  chest: boolean;
  /** The remote has been taken from it. */
  remote: boolean;
  /** The chinchilla has reached the sofa. */
  sofa: boolean;
  /** The TV is on. */
  tv: boolean;
  /** The tune was played: the flame of this wall is given. */
  flame: boolean;
};

export type Walker = { x: number; y: number; falling: boolean };

/** The chinchilla's feet are on this line, in both rooms, and he starts at START_X. */
export const FLOOR_Y = 130;
export const START_X = 20;
/** How fast he walks, and how fast he drops when there is no block. */
export const SPEED = 40;
const FALL = 160;

/* the chest room */
/** The chest sits on a ledge of green blocks, middle at CHEST_X. */
export const CHEST_X = 200;
export const LEDGE = { x: CHEST_X - 20, y: 64, w: 40, h: 8 };
/** The green switch on the floor. */
export const SWITCH = { x: 70, y: FLOOR_Y - 8, w: 8, h: 8 };
/** Whether the chest falls on a chinchilla standing at `chinX`: he is under it, give or take 6 px. */
export const dropChest = (chinX: number): boolean => Math.abs(chinX - CHEST_X) <= 6;

/* the block room */
/**
 * A row of blocks along the floor, pink and blue in turn, each overlapping
 * the next by 12 px: there, 300 ms of walking, he stands on either colour,
 * and that is when the remote has to swap them.
 */
export const BLOCKS: { x: number; y: number; w: number; pink: boolean }[] = Array.from({ length: 8 }, (_, i) => ({
  x: i * 40,
  y: FLOOR_Y,
  w: Math.min(52, 320 - i * 40),
  pink: i % 2 === 0,
}));
/** Pink blocks are full while the remote is as found, blue ones when it has swapped them. */
export const solid = (block: { pink: boolean }, swapped: boolean): boolean => block.pink !== swapped;
export const SOFA_X = 300;

/** The start is stone, whatever the colour: a fall ends there, and he must stand still. */
export const START_END = BLOCKS[1].x;
const supported = (x: number, swapped: boolean) => x < START_END || BLOCKS.some((b) => x >= b.x && x < b.x + b.w && solid(b, swapped));

/** One step of the chinchilla towards `target`: he falls where no solid block is under him, and a fall ends at the start. */
export function walk(w: Walker, target: number, swapped: boolean, dt: number): Walker {
  if (w.falling) {
    const y = w.y + FALL * dt;
    return y > H ? { x: START_X, y: FLOOR_Y, falling: false } : { ...w, y };
  }
  const d = target - w.x;
  const x = Math.abs(d) <= SPEED * dt ? target : w.x + Math.sign(d) * SPEED * dt;
  return { x, y: w.y, falling: !supported(x, swapped) };
}

/** The tune, one note per face: a long note is a face with its mouth open. */
export const TV_TUNE: readonly Played[] = [
  { note: 2, long: false },
  { note: 5, long: false },
  { note: 0, long: true },
  { note: 7, long: false },
  { note: 3, long: false },
  { note: 6, long: true },
  { note: 1, long: false },
  { note: 4, long: false },
];

export const START: TvState = { chest: false, remote: false, sofa: false, tv: false, flame: false };

/** The stored state, read back: anything malformed is the wall as found. */
export function loadTv(stored: string | null): TvState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<Record<keyof TvState, unknown>> | null;
    if (!v || (Object.keys(START) as (keyof TvState)[]).some((k) => typeof v[k] !== "boolean")) return START;
    return v as TvState;
  } catch {
    return START;
  }
}

/** The state in storage, or the wall as found if there is none. */
export function savedTv(): TvState {
  try {
    return loadTv(localStorage.getItem(WELL_TV_KEY));
  } catch {
    return START;
  }
}

/** The stop «tv»: everything done, the tune played. */
export const solvedTv = (): TvState => ({ chest: true, remote: true, sofa: true, tv: true, flame: true });
