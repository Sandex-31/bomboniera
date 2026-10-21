/*
 * The four walls of the well, one screen each. Kept apart from the hall so
 * the screens (and the checks) can name a wall without drawing the room.
 */

export type WallId = "tv" | "corvi" | "boccioli" | "pilastri";

/** Straight across from where the camera first looks, as in the machine room. */
const FAR = (-3 * Math.PI) / 4;

/**
 * Where each wall stands, as an angle round the hall. The TV keeps the far
 * side; the crows and the buds flank it, and the pillars are behind the
 * camera, found by turning round.
 */
export const WALL_ANGLES: Record<WallId, number> = {
  tv: FAR,
  corvi: FAR + Math.PI / 2,
  boccioli: FAR - Math.PI / 2,
  pilastri: FAR + Math.PI,
};
