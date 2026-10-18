/**
 * The press in the middle of the machine room, and the big lever that drops
 * it. The lever is held by three latches, one for each thing the press needs
 * from the rest of the room: the square line of steam at the press, the
 * flywheel turning, and the organ's tune played. Each latch lets go by
 * itself the moment its machine is right, and takes hold again if the
 * machine is undone. With all three let go, the lever comes down, and the
 * press goes through the floor towards the floor below.
 */

import { PRESS_KEY } from "../data/puzzle";

export type Latches = { quadrato: boolean; volano: boolean; organo: boolean };

export const free = (l: Latches) => l.quadrato && l.volano && l.organo;

export type PressState = { pulled: boolean };
export const STILL: PressState = { pulled: false };

/** The finale, in milliseconds from the pull: the three blows, the floor giving way, Rotom's line. */
export const BLOWS = [1200, 2400, 3600];
export const BREAK_MS = 4000;
export const LINE_MS = 5200;

export function solvedPress(): PressState {
  return { pulled: true };
}

/** The stored press, read back: anything malformed is the press as found. */
export function pressFrom(stored: string | null): PressState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<PressState> | null;
    return v && typeof v.pulled === "boolean" ? { pulled: v.pulled } : STILL;
  } catch {
    return STILL;
  }
}

export function loadPress(): PressState {
  try {
    return pressFrom(localStorage.getItem(PRESS_KEY));
  } catch {
    return STILL;
  }
}
