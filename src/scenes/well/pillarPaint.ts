import { hit } from "../../lib/well/pixels";
import { PILLAR, PILLARS, type PillarsState } from "../../lib/well/pillars";
import type { WallId } from "./wall";

/*
 * What every wall of the well shares: its pillars. A pillar is a post on the
 * floor of the screen; its marks are drawn only under the UV light, and a
 * tap on it with the lantern on stamps it on the map. The walls draw them
 * through `paintPillars` and take taps through `stampPillar`.
 */

/** A little more than the post, so a thumb finds it. */
const PAD = 5;

/** Which pillar of this wall, by index in PILLARS, is at pixel `p`; -1 for none. */
export function pillarAt(wall: WallId, p: [number, number]): number {
  return PILLARS.findIndex(
    (q) => q.wall === wall && hit(p, { x: q.x - PAD, y: q.y - PAD, w: PILLAR.w + 2 * PAD, h: PILLAR.h + 2 * PAD }),
  );
}

/** The state after a tap at `p` on `wall`, or null when the tap stamps nothing: no lantern, or not a pillar, or one already stamped. */
export function stampPillar(state: PillarsState, wall: WallId, p: [number, number], uvOn: boolean): PillarsState | null {
  const k = pillarAt(wall, p);
  if (!uvOn || !state.uv || k < 0 || state.stamped[k]) return null;
  return { ...state, stamped: state.stamped.map((s, i) => s || i === k) };
}

/** Draws the pillars of `wall`: the posts always, their marks only where `uvAt` says the light is. */
export function paintPillars(
  ctx: CanvasRenderingContext2D,
  wall: WallId,
  state: PillarsState,
  uvAt: (p: [number, number]) => boolean,
) {
  PILLARS.forEach((q, k) => {
    if (q.wall !== wall) return;
    ctx.fillStyle = "#3A4150";
    ctx.fillRect(q.x, q.y, PILLAR.w, PILLAR.h);
    ctx.fillStyle = "#566074";
    ctx.fillRect(q.x - 1, q.y - 3, PILLAR.w + 2, 3);
    ctx.fillStyle = "#2A303C";
    ctx.fillRect(q.x + PILLAR.w - 3, q.y, 3, PILLAR.h);
    ctx.fillStyle = state.stamped[k] ? "#FFD0F4" : "#FF4FD8";
    for (let x = 0; x < PILLAR.w - 3; x++)
      for (let y = 0; y < PILLAR.h; y++)
        // a scatter that is different on every pillar
        if ((x * 5 + y * 3 + k * 7) % 11 < 2 && uvAt([q.x + x, q.y + y])) ctx.fillRect(q.x + x, q.y + y, 1, 1);
  });
}
