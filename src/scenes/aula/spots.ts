import type { View } from "../focus";
import type { ExamId } from "../../lib/aula/chain";

/*
 * The lecture hall of the fifth floor, as numbers: how big it is, where its
 * tiers of benches step up, and where each exam is set and the camera
 * stands to sit it. Kept apart from the hall so each puzzle can place itself
 * with one line, and the checks can read where things are without drawing
 * the room.
 *
 * The hall is a box, the lecturer's end at -z and the entrance at the top of
 * the tiers at +z. The camera first looks from the back right, across the
 * benches, at the blackboard on the front wall and the windows on the left.
 */

/** Half the width of the hall (x), half its depth (z), and its height. */
export const HALF_W = 4;
export const HALF_D = 3.5;
export const HALL_H = 2.6;

/** How many rows of benches, how deep each tier is, and how much higher each stands than the one in front. */
export const ROWS = 4;
export const TIER_D = 1;
export const TIER_RISE = 0.18;
/** Where the first tier starts, behind the lecturer's platform. */
const FIRST_TIER_Z = -1.4;

/** Tier `k`: where its front edge is and how high its floor stands. The one past the last row is the landing at the entrance. */
export function tier(k: number): { z: number; y: number } {
  return { z: FIRST_TIER_Z + k * TIER_D, y: TIER_RISE * (k + 1) };
}

/** How far behind a tier's front edge its desk and its seat stand, and how high above its floor. */
export const ROW_DESK = { dz: 0.25, h: 0.45 };
export const ROW_SEAT = { dz: 0.65, h: 0.25 };

/** The lecturer's platform and the desk on it. */
export const PLATFORM = { z: -2.3, d: 1.4, h: 0.12 };
export const DESK = { w: 2.8, d: 0.7, h: 0.53 };
/** The top of the desk, where its registers and the laptop lie. */
export const DESK_TOP = PLATFORM.h + DESK.h;

/** The big blackboard on the front wall, behind the desk: centre and size. */
export const BOARD = { x: -0.6, y: 1.55, w: 4, h: 1.3 };
/** The projector screen, pulled down on the front wall to the right of the board. */
export const SCREEN = { x: 2.95, y: 1.65, w: 1.3, h: 1 };
/** The side board on the left wall, near the front. */
export const SIDE_BOARD = { z: -1.9, y: 1.45, w: 1.6, h: 1 };
/** The lab bench, free-standing at the front right. */
export const LAB = { x: 3.25, z: -2.15, w: 0.7, d: 1.3, h: 0.62 };

/** Where the hole in the ceiling is: over the landing at the entrance. */
export const HOLE: [number, number, number] = [2.7, HALL_H, 3.05];

/** Width the camera fits from the whole-hall view: the hall seen corner to corner. */
export const FIT_W = 11;

/**
 * How wide a spot's hit area has to be, in world units, for a finger: 44 CSS
 * px from the whole-hall view on a phone 390 px wide. Spots on the desk stand
 * that far apart, so theirs only touch.
 */
export const TAP_W = (44 / 390) * FIT_W;

/**
 * Marks a spot's group. Wherever a tap lands on a marked mesh and on the hole
 * in the ceiling too, the spot has it: every puzzle spreads this on its own
 * group, or the hole steals the taps meant for it from across the hall.
 */
export const SPOT_MARK = { userData: { spot: true } };

/** A spot of the hall: one of the ten exams, or the desk with the laptop. */
export type Spot = ExamId | "desk";

/** A close-up straight onto `target`, with little room to swing. */
const look = (target: [number, number, number], azimuth: number, polar: number, zoom: number): View => ({
  target,
  azimuth,
  polar,
  zoom,
  spread: { azimuth: 0.15, polar: 0.08 },
});

/** From the back of the hall, square onto the front wall. */
const FRONT = 0;
/** From the right, square onto the left wall. */
const LEFT = Math.PI / 2;

const row = (k: number, x: number): [number, number, number] => [x, tier(k).y + ROW_DESK.h, tier(k).z + ROW_DESK.dz];
const wall = (x: number, y: number): [number, number, number] => [x, y, -HALF_D + 0.05];
const desk = (x: number): [number, number, number] => [x, DESK_TOP, PLATFORM.z];

/** Where each exam is set, and where the camera stands to sit it. */
export const SPOTS: Record<Spot, { position: [number, number, number]; view: View }> = {
  // a corner of the big blackboard, high on the left
  arch: { position: wall(-2.1, 1.85), view: look(wall(-2.1, 1.85), FRONT, 1.5, 6) },
  // the middle of the big blackboard
  analisi: { position: wall(0, 1.5), view: look(wall(0, 1.5), FRONT, 1.5, 3.4) },
  // the projector screen
  ium: { position: wall(SCREEN.x, SCREEN.y), view: look(wall(SCREEN.x, SCREEN.y), FRONT, 1.5, 5) },
  // the side board on the left wall
  lft: {
    position: [-HALF_W + 0.05, SIDE_BOARD.y, SIDE_BOARD.z],
    view: look([-HALF_W + 0.05, SIDE_BOARD.y, SIDE_BOARD.z], LEFT, 1.5, 4.6),
  },
  // the lab bench, seen from the middle of the hall
  fisica: {
    position: [LAB.x, LAB.h, LAB.z],
    view: look([LAB.x, LAB.h, LAB.z], -Math.PI / 2, 1, 4.6),
  },
  // on the desk: the registers to the left of the laptop, the libretto to its right
  bd: { position: desk(-TAP_W), view: look(desk(-TAP_W), FRONT, 0.9, 6) },
  desk: { position: desk(0), view: look(desk(0), FRONT, 0.9, 6) },
  si: { position: desk(TAP_W), view: look(desk(TAP_W), FRONT, 0.9, 6) },
  // two rows of benches
  logica: { position: row(1, -1.8), view: look(row(1, -1.8), FRONT, 0.95, 5) },
  so: { position: row(2, 1), view: look(row(2, 1), FRONT, 0.95, 4.4) },
  // the floor of the hall, its benches and aisles, from high above
  asd: { position: [-3.3, tier(ROWS).y, 3], view: look([0, 0.4, 0], FRONT, 0.3, 1.2) },
};
