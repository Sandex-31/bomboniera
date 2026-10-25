import { H, W } from "../../lib/well/pixels";
import { SPRITES, drawSprite } from "../../lib/well/sprites";

/*
 * What makes a wall a room of the well: the game's grass on every floor, its
 * moss hanging from the ceiling and swaying, a bush here and there, all of it
 * behind the room's own things; and the fireflies, over everything, the dark
 * too.
 */

/** A stretch of floor the grass grows on: from x0 to x1, its top at y. */
export type Ground = [x0: number, x1: number, y: number];

/** A number in [0, 1) that is always the same for the same n. */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** The grass, the moss and the bushes of a wall; `seed` keeps each wall's own. */
export function paintSetting(ctx: CanvasRenderingContext2D, t: number, ground: Ground[], seed: number) {
  const vine = SPRITES.vine;
  for (let i = 0, x = 6 + hash(seed) * 20; x < W - vine.w; i++, x += 26 + hash(seed + i) * 30) {
    const n = 1 + Math.floor(hash(seed + i + 50) * 5);
    for (let k = 0; k < n; k++) {
      // the lower it hangs, the more it sways
      const sway = Math.round(Math.sin(t * 1.3 + x * 0.07) * k * 0.5);
      drawSprite(ctx, "vine", x + sway, k * (vine.h - 1));
    }
  }
  const grass = SPRITES.grass;
  ground.forEach(([x0, x1, y], g) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, x1 - x0, H);
    ctx.clip();
    // the strip is not started at its own beginning on every floor, so the floors do not all look alike
    for (let x = x0 - Math.floor(hash(seed + g) * grass.w); x < x1; x += grass.w) drawSprite(ctx, "grass", x, y - grass.h);
    ctx.restore();
    for (let x = x0 + hash(seed + g + 7) * 60; x + SPRITES.bush.w <= x1; x += 90 + hash(seed + x) * 80) drawSprite(ctx, "bush", x, y - SPRITES.bush.h);
  });
}

const FLIES = 8;

/** The fireflies: drifting, each blinking on its own. */
export function paintFireflies(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = "#D8FF7A";
  for (let i = 0; i < FLIES; i++) {
    const glow = Math.sin(t * (1.2 + hash(i + 20)) + i * 1.7);
    if (glow < 0) continue;
    const drift = hash(i) * W + t * (hash(i + 9) - 0.5) * 16 + Math.sin(t * 0.5 + i * 2) * 24;
    const x = Math.round(((drift % W) + W) % W);
    const y = Math.round(24 + hash(i + 3) * (H - 56) + Math.sin(t * 0.8 + i) * 12);
    ctx.globalAlpha = glow * 0.3;
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.globalAlpha = glow;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}
