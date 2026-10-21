/*
 * The screens of the well are 320 by 180 logical pixels, the size of an
 * Animal Well room. Everything a wall does with a tap happens in these
 * pixels: where it landed, whether it hit something, where Rotom runs.
 */

export const W = 320;
export const H = 180;

export type Rect = { x: number; y: number; w: number; h: number };

/** Where a hit on the panel lands on the canvas. A texture's v grows upwards, a canvas's y downwards. */
export function toPixel(uv: { x: number; y: number }): [number, number] {
  const clamp = (n: number, max: number) => Math.min(max - 1, Math.max(0, Math.floor(n)));
  return [clamp(uv.x * W, W), clamp((1 - uv.y) * H, H)];
}

/** One step of running from `at` towards `to`: at most `speed * dt` pixels, and never past it. */
export function chase(at: [number, number], to: [number, number], dt: number, speed = 140): [number, number] {
  const dx = to[0] - at[0];
  const dy = to[1] - at[1];
  const d = Math.hypot(dx, dy);
  const step = speed * dt;
  if (d <= step) return [to[0], to[1]];
  return [at[0] + (dx / d) * step, at[1] + (dy / d) * step];
}

/** Whether `p` is within `r` of `centre`, the rim included. */
export function inCircle(p: [number, number], centre: [number, number], r: number) {
  return (p[0] - centre[0]) ** 2 + (p[1] - centre[1]) ** 2 <= r * r;
}

/** Whether `p` falls on `rect`: its first pixel in, the one past its width or height out. */
export function hit(p: [number, number], rect: Rect) {
  return p[0] >= rect.x && p[0] < rect.x + rect.w && p[1] >= rect.y && p[1] < rect.y + rect.h;
}

/**
 * The least a thing to tap is, in logical pixels. On a 390 px phone the
 * focused screen is the panel's 1.6 world units at 214 px a unit, 343 CSS px
 * for 320 logical, so 1.07 CSS px a pixel: 41 logical pixels are 44 CSS px.
 */
export const TOUCH = 42;

/** `r` grown about its middle to at least TOUCH on each side. */
export function touchRect(r: Rect): Rect {
  const w = Math.max(r.w, TOUCH);
  const h = Math.max(r.h, TOUCH);
  return { x: r.x - (w - r.w) / 2, y: r.y - (h - r.h) / 2, w, h };
}
