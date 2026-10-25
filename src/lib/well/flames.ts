import type { WallId } from "../../scenes/well/wall";

/** Whether each wall has given its flame. */
export type Flames = Record<WallId, boolean>;

/** Whether the flame just taken on `wall` is the floor's first: no other wall has given one. Rotom has his say only then. */
export const firstFlame = (flames: Flames, wall: WallId): boolean =>
  (Object.keys(flames) as WallId[]).every((w) => w === wall || !flames[w]);
