import { useMemo, useRef } from "react";
import { H, W, hit, touchRect, type Rect } from "../../lib/well/pixels";
import { SPRITES, drawSprite } from "../../lib/well/sprites";
import {
  ARRIVAL,
  CLOSED,
  DIGIT_DOTS,
  DOT_REACH,
  MAP,
  TO_MAP,
  TO_PHONE,
  NUMBER,
  PILLARS,
  WALL_SPAN,
  dial,
  dotAt,
  ghostsScared,
  groupCentre,
  joins,
  pillarAngle,
  type PillarsState,
} from "../../lib/well/pillars";
import { paintPillars, stampPillar } from "./pillarPaint";
import { paintSetting } from "./setting";
import type { Painter } from "./Screen";
import { WALL_ANGLES } from "./wall";

/*
 * The fourth wall. First a dark room: three yellow switches that only a lit
 * candle shows, two ghosts that sit on a switch and stop a tap reaching it,
 * a pile of firecrackers that scares them off for a while, and a chest that
 * opens when the three are pressed. In it is the UV lantern. After that the
 * wall is a map of the hall from above, where the pillars' dot groups
 * appear, to be joined with a finger into digits, and a rotary telephone
 * to dial them on. Nothing on it is written: the digits are only ever the
 * lines the visitor draws.
 */

const FLOOR = H - 24;
const SWITCHES = [{ x: 50, y: 100 }, { x: 150, y: 60 }, { x: 250, y: 100 }];
const CANDLES = SWITCHES.map((s) => ({ x: s.x + 40, y: s.y - 4 }));
const CHEST = { x: 146, y: 138 };
const PILE: Rect = { x: 28, y: 138, w: 22, h: 18 };
/** Everything small is tapped through a rect of at least TOUCH pixels about it. */
const grow = (r: Rect): Rect => touchRect(r);
const near = (a: [number, number], b: [number, number], r: number) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= r;

/** Where a ghost is, in ms: it drifts between two neighbouring switches, so that each is covered some of the time. */
function ghostAt(g: number, ms: number): [number, number] {
  const a = SWITCHES[g];
  const b = SWITCHES[g + 1];
  const u = (1 + Math.sin(ms / 1400 + g * 2.1)) / 2;
  return [a.x + (b.x - a.x) * u - 4 + Math.sin(ms / 310) * 3, a.y + (b.y - a.y) * u - 6 + Math.cos(ms / 260) * 4];
}
/** A ghost over a switch is within this of its middle. */
const COVER = 13;

/* the telephone: ten holes round a dial that fills the screen, and the stop at the lower right */
const PHONE = { x: 160, y: 90, r: 88 };
const HOLES_R = 70;
const HOLE_R = 14;
/** The nearest hole within this of a press is the one dialled: more than half the 36 px between holes. */
const HOLE_REACH = 22;
const STOP_DEG = 40;
const toRad = (deg: number) => (deg * Math.PI) / 180;
/** Where the hole of digit `d` is: 1 first, counter-clockwise from the stop, 0 last. */
const holeAt = (d: number): [number, number] => {
  const a = toRad(STOP_DEG - 45 - 30 * ((d + 9) % 10));
  return [PHONE.x + HOLES_R * Math.cos(a), PHONE.y + HOLES_R * Math.sin(a)];
};
const STOP: [number, number] = [PHONE.x + 80 * Math.cos(toRad(STOP_DEG)), PHONE.y + 80 * Math.sin(toRad(STOP_DEG))];
/** How near the stop a dragged hole has to be let go. */
const STOP_REACH = 24;

function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colour: string) {
  ctx.fillStyle = colour;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, 2 * half + 1, 1);
  }
}

function line(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number], colour: string) {
  ctx.fillStyle = colour;
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n), 2, 2);
}

/** The map's floor, rim, four walls, altar and arrival point: still, so painted once. */
let base: HTMLCanvasElement | null = null;
function mapBase() {
  if (base) return base;
  base = document.createElement("canvas");
  base.width = W;
  base.height = H;
  const g = base.getContext("2d")!;
  disc(g, MAP.x, MAP.y, MAP.r, "#4A5468");
  disc(g, MAP.x, MAP.y, MAP.r - 1, "#141A24");
  g.fillStyle = "#8FA3BF";
  for (const a of Object.values(WALL_ANGLES))
    for (let t = a - WALL_SPAN / 2; t <= a + WALL_SPAN / 2; t += 0.008)
      for (let r = MAP.r - 2; r <= MAP.r + 1; r++) g.fillRect(Math.round(MAP.x + r * Math.cos(t)), Math.round(MAP.y + r * Math.sin(t)), 1, 1);
  g.fillStyle = "#3A4150";
  g.fillRect(MAP.x - 3, MAP.y - 3, 6, 6);
  // the arrival point: a bright mark on the rim where the walk round begins
  const ax = MAP.x + (MAP.r + 6) * Math.cos(ARRIVAL);
  const ay = MAP.y + (MAP.r + 6) * Math.sin(ARRIVAL);
  g.fillStyle = "#9FE8FF";
  g.fillRect(Math.round(ax) - 1, Math.round(ay) - 4, 3, 9);
  g.fillRect(Math.round(ax) - 4, Math.round(ay) - 1, 9, 3);
  return base;
}

/** The engineer's busy tone, three beeps of two notes; silent without Web Audio. */
let audio: AudioContext | null = null;
function busyTone() {
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    audio ??= new C();
    void audio.resume();
    const out = audio.createGain();
    out.gain.value = 0.1;
    out.connect(audio.destination);
    for (let i = 0; i < 3; i++)
      for (const hz of [480, 620]) {
        const o = audio.createOscillator();
        o.frequency.value = hz;
        o.connect(out);
        o.start(audio.currentTime + i * 0.5);
        o.stop(audio.currentTime + i * 0.5 + 0.25);
      }
  } catch {
    // no sound: the lamps still flash
  }
}

type Drag =
  | { kind: "map"; k: number; path: number[]; at: [number, number] }
  | { kind: "dial"; d: number; at: [number, number] };

/**
 * The fourth wall's behaviour: what to paint, and what the finger does.
 * `state` is the wall as kept; `set` keeps the next one. `uvOn` is the lantern.
 */
export function useWallPillars({
  state,
  set,
  uvOn,
  onFlame,
}: {
  state: PillarsState;
  set: (next: PillarsState) => void;
  uvOn: boolean;
  /** The number was dialled, and the flame flies. */
  onFlame: () => void;
}) {
  const now = useRef(state);
  now.current = state;
  const lantern = useRef(uvOn);
  lantern.current = uvOn;
  const keep = useRef({ set, onFlame });
  keep.current = { set, onFlame };

  const lit = useRef([false, false, false]);
  const scaredAt = useRef(-Infinity);
  const busyAt = useRef(-Infinity);
  const flameAt = useRef(-Infinity);
  const drag = useRef<Drag | null>(null);
  /** Which of the two the screen shows, once the lantern is taken. */
  const view = useRef<"map" | "phone">("map");

  const commit = (next: PillarsState) => {
    now.current = next;
    keep.current.set(next);
  };

  const paint = useMemo<Painter>(
    () => (ctx, t, uvAt) => {
      const s = now.current;
      const ms = performance.now();
      const tile = SPRITES.tile;
      for (let x = 0; x < W; x += tile.w)
        for (let y = FLOOR; y < H; y += tile.h) drawSprite(ctx, "tile", x, y, (x / tile.w + y / tile.h) % tile.frames);
      paintSetting(ctx, t, [[0, W, FLOOR]], 4);

      if (!s.uv) {
        const pressed = s.switches.every(Boolean);
        // the pile of firecrackers
        ctx.fillStyle = "#C0392B";
        for (const [dx, dy] of [[0, 8], [8, 8], [15, 8], [4, 2], [11, 2]]) ctx.fillRect(PILE.x + dx, PILE.y + dy, 6, 8);
        ctx.fillStyle = "#F2D02A";
        for (const [dx, dy] of [[2, 0], [9, 0], [6, 6], [13, 6]]) ctx.fillRect(PILE.x + dx, PILE.y + dy, 2, 2);
        CANDLES.forEach((c, k) => {
          drawSprite(ctx, "candle", c.x, c.y, lit.current[k] ? 1 : 0);
          // a lit candle shows its switch
          if (lit.current[k]) drawSprite(ctx, "switchYellow", SWITCHES[k].x, SWITCHES[k].y, s.switches[k] ? 1 : 0);
        });
        drawSprite(ctx, "chest", CHEST.x, CHEST.y, pressed ? 1 : 0);
        if (!ghostsScared(scaredAt.current, ms))
          [0, 1].forEach((g) => {
            const [x, y] = ghostAt(g, ms);
            drawSprite(ctx, "ghost", x, y, Math.floor(ms / 400), Math.sin(ms / 1400 + g * 2.1 + 1) < 0);
          });
        else {
          // the bang: a ring spreading from the pile
          const r = ((ms - scaredAt.current) / 400) * 40;
          if (r < 40) {
            ctx.fillStyle = "#FFD27A";
            for (let a = 0; a < 6.28; a += 0.12) ctx.fillRect(Math.round(PILE.x + 11 + r * Math.cos(a)), Math.round(PILE.y + 4 + r * Math.sin(a)), 2, 2);
          }
        }
      } else {
        if (view.current === "map") {
          ctx.drawImage(mapBase(), 0, 0);
          drawSprite(ctx, "phone", TO_PHONE.x, TO_PHONE.y);
          PILLARS.forEach((_, k) => {
            const a = pillarAngle(k);
            const tick: [number, number] = [Math.round(MAP.x + (MAP.r - 5) * Math.cos(a)), Math.round(MAP.y + (MAP.r - 5) * Math.sin(a))];
            ctx.fillStyle = s.stamped[k] ? "#FF4FD8" : "#6A5A80";
            ctx.fillRect(tick[0] - 1, tick[1] - 1, 3, 3);
            if (!s.stamped[k]) return;
            // a faint thread from the pillar's place on the rim to its group
            line(ctx, tick, groupCentre(k), "#3A3050");
            const dots = DIGIT_DOTS[NUMBER[k]];
            const d = drag.current?.kind === "map" && drag.current.k === k ? drag.current : null;
            if (s.joined[k]) {
              dots.forEach((_, i) => i && line(ctx, dotAt(k, i - 1), dotAt(k, i), "#FFE97A"));
              if (CLOSED.includes(NUMBER[k])) line(ctx, dotAt(k, dots.length - 1), dotAt(k, 0), "#FFE97A");
            } else if (d) {
              d.path.forEach((p, i) => i && line(ctx, dotAt(k, d.path[i - 1]), dotAt(k, p), "#FFFFFF"));
              line(ctx, dotAt(k, d.path[d.path.length - 1]), d.at, "#9FE8FF");
            }
            ctx.fillStyle = s.joined[k] ? "#FFE97A" : "#C8D4E8";
            dots.forEach((_, i) => {
              const [x, y] = dotAt(k, i);
              ctx.fillRect(x - 2, y - 2, 4, 4);
            });
          });
        } else {
          // the telephone
          disc(ctx, PHONE.x, PHONE.y, PHONE.r, "#7A2A22");
          disc(ctx, PHONE.x, PHONE.y, PHONE.r - 3, "#B04030");
          for (let d = 0; d <= 9; d++) {
            const [x, y] = holeAt(d);
            disc(ctx, x, y, HOLE_R, drag.current?.kind === "dial" && drag.current.d === d ? "#F2D02A" : "#1A0F0E");
          }
          disc(ctx, PHONE.x, PHONE.y, 26, "#7A2A22");
          ctx.fillStyle = "#D8D8D8";
          ctx.fillRect(Math.round(STOP[0]) - 5, Math.round(STOP[1]) - 2, 11, 5);
          if (drag.current?.kind === "dial") disc(ctx, drag.current.at[0], drag.current.at[1], 7, "#F2D02A");
          disc(ctx, TO_MAP.x + 8, TO_MAP.y + 8, 8, "#4A5468");
          // one lamp for each digit dialled; red while the line is busy
          const busy = ms - busyAt.current < 1500 && Math.floor((ms - busyAt.current) / 250) % 2 === 0;
          for (let i = 0; i < NUMBER.length; i++) {
            ctx.fillStyle = busy ? "#E04040" : i < s.dialled.length ? "#5FD35F" : "#3A4150";
            ctx.fillRect(232 + i * 10, 8, 6, 6);
          }
          // the flame rises out of the telephone and away
          const rise = (ms - flameAt.current) / 1800;
          if (rise >= 0 && rise < 1) drawSprite(ctx, "flame", PHONE.x - SPRITES.flame.w / 2, 76 - rise * 100, Math.floor(t * 8));
        }
      }
      paintPillars(ctx, "pilastri", s, uvAt);
    },
    [],
  );

  const onTap = (p: [number, number]) => {
    const s = now.current;
    if (s.uv) {
      const to = view.current === "map" ? TO_PHONE : TO_MAP;
      if (hit(p, grow(to))) {
        view.current = view.current === "map" ? "phone" : "map";
        return;
      }
      // the pillars are not there to be tapped under the telephone
      const next = view.current === "map" ? stampPillar(s, "pilastri", p, lantern.current) : null;
      if (next) commit(next);
      return;
    }
    const ms = performance.now();
    if (hit(p, grow(PILE))) {
      scaredAt.current = ms;
      return;
    }
    const c = CANDLES.findIndex((q) => hit(p, grow({ x: q.x, y: q.y, w: 8, h: 12 })));
    if (c >= 0) {
      lit.current[c] = true;
      return;
    }
    const sw = SWITCHES.findIndex((q, k) => lit.current[k] && !s.switches[k] && hit(p, grow({ x: q.x, y: q.y, w: 8, h: 8 })));
    if (sw >= 0) {
      // a ghost sitting on a switch keeps the tap from it
      const covered = [0, 1].some((g) => {
        const [gx, gy] = ghostAt(g, ms);
        return !ghostsScared(scaredAt.current, ms) && near([gx + 8, gy + 8], [SWITCHES[sw].x + 4, SWITCHES[sw].y + 4], COVER);
      });
      if (!covered) commit({ ...s, switches: s.switches.map((v, i) => v || i === sw) as PillarsState["switches"] });
      return;
    }
    if (s.switches.every(Boolean) && hit(p, grow({ x: CHEST.x, y: CHEST.y, w: 16, h: 12 }))) commit({ ...s, uv: true });
  };

  const onPress = (p: [number, number]) => {
    const s = now.current;
    if (!s.uv) return;
    if (view.current === "map") {
    let best: { k: number; i: number; d: number } | null = null;
    PILLARS.forEach((_, k) => {
      if (!s.stamped[k] || s.joined[k]) return;
      DIGIT_DOTS[NUMBER[k]].forEach((_, i) => {
        const d = Math.hypot(p[0] - dotAt(k, i)[0], p[1] - dotAt(k, i)[1]);
        if (d <= DOT_REACH && (!best || d < best.d)) best = { k, i, d };
      });
    });
    const grab = best as { k: number; i: number } | null;
    if (grab) drag.current = { kind: "map", k: grab.k, path: [grab.i], at: p };
    return;
    }
    let d0 = -1;
    let dist = HOLE_REACH;
    for (let d = 0; d <= 9; d++) {
      const h = Math.hypot(p[0] - holeAt(d)[0], p[1] - holeAt(d)[1]);
      if (h <= dist) {
        dist = h;
        d0 = d;
      }
    }
    if (d0 >= 0 && !s.flame) drag.current = { kind: "dial", d: d0, at: p };
  };

  const onDrag = (p: [number, number]) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "map") {
      // a fast finger jumps over dots: look at every couple of pixels of the way
      const n = Math.max(1, Math.ceil(Math.hypot(p[0] - d.at[0], p[1] - d.at[1]) / 2));
      for (let j = 1; j <= n; j++) {
        const q: [number, number] = [d.at[0] + ((p[0] - d.at[0]) * j) / n, d.at[1] + ((p[1] - d.at[1]) * j) / n];
        const i = DIGIT_DOTS[NUMBER[d.k]].findIndex((_, i) => near(q, dotAt(d.k, i), DOT_REACH));
        if (i >= 0 && i !== d.path[d.path.length - 1]) d.path.push(i);
      }
    }
    d.at = p;
  };

  const onRelease = (cancelled = false) => {
    const d = drag.current;
    drag.current = null;
    // a cancelled touch finishes nothing
    if (!d || cancelled) return;
    if (d.kind === "map") {
      if (joins(NUMBER[d.k], d.path)) commit({ ...now.current, joined: now.current.joined.map((v, i) => v || i === d.k) });
      return;
    }
    if (!near(d.at, STOP, STOP_REACH)) return;
    const { state: next, busy } = dial(now.current, d.d);
    if (busy) {
      busyAt.current = performance.now();
      busyTone();
    }
    if (next.flame && !now.current.flame) {
      flameAt.current = performance.now();
      keep.current.onFlame();
    }
    commit(next);
  };

  return { paint, onTap, onPress, onDrag, onRelease, dark: !state.switches.every(Boolean) };
}
