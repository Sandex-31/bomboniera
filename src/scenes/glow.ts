import { CanvasTexture } from "three";

let cache: CanvasTexture | null = null;

/**
 * One soft radial sprite, generated once and shared by every glow in both
 * rooms — no texture file to download, and nothing to go missing later.
 */
export function glowTexture() {
  if (cache) return cache;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.28, "rgba(255,255,255,0.42)");
    g.addColorStop(0.65, "rgba(255,255,255,0.09)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  cache = new CanvasTexture(canvas);
  return cache;
}
