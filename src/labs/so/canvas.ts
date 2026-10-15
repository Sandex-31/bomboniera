import type { Sim } from "./engine";

const MAX_DOTS = 2000;
/** How long an atom's spark stays on screen: the processes themselves live far less than a frame. */
const LIFE_MS = 700;

/** Stable pseudo-random 0..1 from a number, so dots keep their place between frames. */
const scatter = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

type Spark = { x: number; y: number; t: number };
const trails = new WeakMap<CanvasRenderingContext2D, { tick: number; sparks: Spark[] }>();

/** Atoms born in a tick (fission children included) as fading sparks, waiting atoms as dots (hue by temp), and the energy bar. */
export function draw(ctx: CanvasRenderingContext2D, s: Sim, w: number, h: number, now = performance.now()) {
  ctx.clearRect(0, 0, w, h);
  const barH = 28;
  const area = h - barH - 12;

  const trail = trails.get(ctx) ?? { tick: -1, sparks: [] };
  trails.set(ctx, trail);
  if (s.tick !== trail.tick) {
    trail.tick = s.tick;
    for (let i = 0; i < Math.min(s.born, 300); i++) trail.sparks.push({ x: scatter(s.tick * 7919 + i), y: scatter(s.tick * 104729 + i), t: now });
  }
  trail.sparks = trail.sparks.filter((p) => now - p.t < LIFE_MS).slice(-MAX_DOTS);
  for (const p of trail.sparks) {
    ctx.fillStyle = `rgba(255, 190, 110, ${1 - (now - p.t) / LIFE_MS})`;
    ctx.fillRect(p.x * (w - 8) + 4, p.y * (area - 8) + 4, 3, 3);
  }

  const every = Math.ceil(s.waiting.length / MAX_DOTS) || 1;
  for (let i = 0; i < s.waiting.length; i += every) {
    ctx.fillStyle = `hsl(${200 - Math.min(s.waiting[i], 80) * 2.5}, 80%, 60%)`;
    ctx.fillRect(scatter(i) * (w - 8) + 4, scatter(i + 0.5) * (area - 8) + 4, 3, 3);
  }

  const { energy } = s.d;
  const { ENERGY_DEMAND: demand, ENERGY_EXPLODE_THRESHOLD: limit } = s.p;
  const scale = Math.max(limit, demand, energy, 1);
  const y0 = h - barH;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, y0, w, barH);
  ctx.fillStyle = energy > limit ? "#ff6b5b" : energy < demand ? "#7aa7ff" : "#e3b04b";
  ctx.fillRect(0, y0, (Math.max(energy, 0) / scale) * w, barH);
  for (const [v, c] of [[demand, "#7aa7ff"], [limit, "#ff6b5b"]] as const) {
    ctx.fillStyle = c;
    ctx.fillRect((Math.max(v, 0) / scale) * w - 1, y0 - 4, 2, barH + 4);
  }
}
