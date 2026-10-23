import { useEffect, useMemo, useRef } from "react";
import { hit, touchRect, type Rect } from "../../lib/well/pixels";
import { SPRITES, drawSprite } from "../../lib/well/sprites";
import { follow, type Played } from "../../lib/flute";
import { organ } from "../../lib/organ";
import { bounce, type Dir } from "../../lib/beam";
import { BUD_TUNE, MURAL, TURTLE_TUNE, budOrder, firstHidden, traceMural, type BudsState } from "../../lib/well/buds";
import type { PillarsState } from "../../lib/well/pillars";
import { paintPillars, stampPillar } from "./pillarPaint";
import { paintSetting } from "./setting";
import type { Painter } from "./Screen";

/*
 * The third wall: a pool with three sunk turtles, and across it a mural of a
 * beam of light, some mirrors and four buds. A tune painted by the water,
 * which only the UV light shows, raises the turtles into stones. On the far
 * side the beam is a drawing to read: the buds are tapped in the order it
 * reaches them, and each sings its own whistle. Nothing on it is written.
 */

const CELL = 22;
const MX = 128;
const MY = 36;
const [COLS, ROWS] = MURAL.size;
/** The pool on this side, which the turtles cross. */
const POOL: Rect = { x: 8, y: 36, w: 112, h: 110 };
const TURTLE_X = [22, 56, 90];
const TURTLE_Y = 88;
const FLAME_MS = 1800;
const WHISTLE_MS = 450;
/** Each direction's place round a mark, clockwise from up. */
const VEC: readonly (readonly [number, number])[] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

const tile = SPRITES.tile;
/** The point handed to `uvAt`, reused so that a frame allocates none. */
const PT: [number, number] = [0, 0];

/** The middle of a cell, in screen pixels. */
const centre = ([c, r]: readonly [number, number]): [number, number] => [MX + c * CELL + CELL / 2, MY + r * CELL + CELL / 2];

const ORDER = budOrder();
const STEPS: readonly (readonly [number, number])[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const mirrorAt = (c: number, r: number) => MURAL.mirrors.find((m) => m.cell[0] === c && m.cell[1] === r);

/** The beam as a line: in from beyond the source, through every cell, out past the last. */
const BEAM: [number, number][] = (() => {
  const cells = traceMural();
  const pts = cells.map(centre);
  const [dx, dy] = STEPS[MURAL.source.dir];
  pts.unshift([pts[0][0] - (dx * CELL) / 2, pts[0][1] - (dy * CELL) / 2]);
  const last = cells[cells.length - 1];
  const prev = cells[cells.length - 2];
  let out = STEPS.findIndex(([sx, sy]) => sx === Math.sign(last[0] - prev[0]) && sy === Math.sign(last[1] - prev[1])) as Dir;
  const m = mirrorAt(last[0], last[1]);
  if (m) out = bounce(out, m.m);
  const end = pts[pts.length - 1];
  pts.push([end[0] + (STEPS[out][0] * CELL) / 2, end[1] + (STEPS[out][1] * CELL) / 2]);
  return pts;
})();

/** The beam up to the first hidden mirror, always drawn; the rest is only where the UV light falls. */
const SEEN = BEAM.slice(0, firstHidden() + 2);
/** The rest of the beam, as points a pixel-pair apart, tested against the light each frame. */
const DARK: number[] = (() => {
  const rest = BEAM.slice(firstHidden() + 1);
  const out: number[] = [];
  for (let i = 1; i < rest.length; i++) {
    const [x0, y0] = rest[i - 1];
    const [x1, y1] = rest[i];
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
    for (let k = 0; k < n; k++) out.push(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
  }
  return out;
})();
/** How far along the beam each of its points is, in pixels. */
const ALONG: number[] = BEAM.reduce<number[]>((acc, q, i) => [...acc, i ? acc[i - 1] + Math.hypot(q[0] - BEAM[i - 1][0], q[1] - BEAM[i - 1][1]) : 0], []);
/** Where the beam stops being drawn and is left to the UV light. */
const SEEN_TO = ALONG[SEEN.length - 1];
/** The point `d` pixels along the beam. */
function along(d: number): [number, number] {
  const i = Math.max(1, ALONG.findIndex((a) => a >= d));
  const f = (d - ALONG[i - 1]) / (ALONG[i] - ALONG[i - 1] || 1);
  return [BEAM[i - 1][0] + (BEAM[i][0] - BEAM[i - 1][0]) * f, BEAM[i - 1][1] + (BEAM[i][1] - BEAM[i - 1][1]) * f];
}
/** How far along the beam it first reaches each bud. */
const BUD_AT = MURAL.buds.map((b) => ALONG[traceMural().findIndex(([c, r]) => c === b.cell[0] && r === b.cell[1]) + 1]);
/** A pulse of light runs the beam at this speed, in pixels a second, and its tail is this long. */
const PULSE_SPEED = 70;
const PULSE_LEN = 12;
/** How long a bud glows as the pulse goes by, in pixels of the pulse's run. */
const GLOW = 14;

/** Each mirror's two ends, and its middle. */
const MIRRORS = MURAL.mirrors.map(({ cell, m, hidden }) => {
  const [x, y] = centre(cell);
  return { x, y, hidden, x0: x - 7, x1: x + 7, y0: m === "/" ? y + 7 : y - 7, y1: m === "/" ? y - 7 : y + 7 };
});
const SOURCE_Y = centre(MURAL.source.cell)[1];
const BUD_RECTS: Rect[] = MURAL.buds.map((b) => {
  const [x, y] = centre(b.cell);
  return { x: x - SPRITES.bud.w / 2, y: y - SPRITES.bud.h / 2, w: SPRITES.bud.w, h: SPRITES.bud.h };
});
/** Where each note of the turtles' tune is painted on the water. */
const MARKS: [number, number][] = TURTLE_TUNE.map((_, k) => [30 + k * 24, 66]);

/** The wall's behaviour: what to paint and what a tap or a note does. */
export function useWallBuds({
  state,
  set,
  pillars,
  setPillars,
  uvOn,
  onFlame,
}: {
  state: BudsState;
  set: (next: BudsState) => void;
  /** The pillars' state: a tap with the lantern on stamps the pillars of this wall into it. */
  pillars: PillarsState;
  setPillars: (next: PillarsState) => void;
  uvOn: boolean;
  /** The four buds were sung in order, and the flame flies. */
  onFlame: () => void;
}) {
  const now = useRef(state);
  now.current = state;
  const other = useRef({ set, pillars, setPillars, uvOn, onFlame });
  other.current = { set, pillars, setPillars, uvOn, onFlame };

  const heard = useRef(0);
  /** The buds tapped so far, in order: judged only once all four are. */
  const tapped = useRef<number[]>([]);
  const flameAt = useRef(-Infinity);
  const raisedAt = useRef(-Infinity);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const commit = (next: BudsState) => {
    now.current = next;
    other.current.set(next);
  };

  const paint = useMemo<Painter>(
    () => (ctx, t, uvAt) => {
      const s = now.current;
      const ms = performance.now();

      // the floor
      ctx.fillStyle = "#0E1218";
      ctx.fillRect(0, 24, 320, 132);
      for (let x = 0; x < 320; x += tile.w) drawSprite(ctx, "tile", x, 156, (x / tile.w) % tile.frames);
      paintSetting(ctx, t, [[0, 320, 156]], 2);

      // the pool: water with a ripple that moves
      ctx.fillStyle = "#12304A";
      ctx.fillRect(POOL.x, POOL.y, POOL.w, POOL.h);
      ctx.fillStyle = "#1E4A6E";
      for (let y = POOL.y + 6; y < POOL.y + POOL.h; y += 10) ctx.fillRect(POOL.x + 4 + ((y * 7 + Math.floor(t * 6)) % 30), y, 14, 1);

      // the tune painted by the water, under the UV light only: the flute's own arrows, a long note's with a longer stem and a bar across its tail
      ctx.fillStyle = "#FF4FD8";
      for (let k = 0; k < TURTLE_TUNE.length; k++) {
        const [x, y] = MARKS[k];
        const { note, long } = TURTLE_TUNE[k];
        const [vx, vy] = VEC[note];
        const dot = (px: number, py: number) => uvAt([px, py]) && ctx.fillRect(px - 1, py - 1, 2, 2);
        const len = long ? 8 : 5;
        for (let i = -len; i <= len; i++) dot(x + vx * i, y + vy * i);
        // the head: two arms back from the tip, square to each other
        const arms: [number, number][] = vx && vy ? [[-vx, 0], [0, -vy]] : [[-vx - vy, vx - vy], [-vx + vy, -vy - vx]];
        for (const [ax, ay] of arms) for (let i = 1; i <= 4; i++) dot(x + vx * len + ax * i, y + vy * len + ay * i);
        if (long) for (let i = -3; i <= 3; i++) dot(x - vx * len - vy * i, y - vy * len + vx * i);
      }

      // the turtles: a ripple while sunk, a shell on the water once raised
      for (let k = 0; k < TURTLE_X.length; k++) {
        if (s.turtles) {
          const rise = Math.min(1, (ms - raisedAt.current) / 600);
          drawSprite(ctx, "turtle", TURTLE_X[k], TURTLE_Y + (1 - rise) * 6 + Math.sin(t * 2 + k) * 0.8, Math.floor(t * 2 + k) % 2);
        } else {
          ctx.fillStyle = "#2E6A8C";
          ctx.fillRect(TURTLE_X[k] + 2, TURTLE_Y + 3, 12, 1);
          ctx.fillRect(TURTLE_X[k] + 5, TURTLE_Y + 5, 6, 1);
        }
      }

      // the far side: the mural, reached only over the turtles
      ctx.fillStyle = "#1A212C";
      ctx.fillRect(MX, MY, COLS * CELL, ROWS * CELL);
      if (s.turtles) {
        ctx.fillStyle = "#232C3A";
        for (let c = 0; c <= COLS; c++) ctx.fillRect(MX + c * CELL, MY, 1, ROWS * CELL);
        for (let r = 0; r <= ROWS; r++) ctx.fillRect(MX, MY + r * CELL, COLS * CELL, 1);

        // the beam, from the source through every bounce
        ctx.strokeStyle = "#FFE9A0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(SEEN[0][0], SEEN[0][1]);
        for (let i = 1; i < SEEN.length; i++) ctx.lineTo(SEEN[i][0], SEEN[i][1]);
        ctx.stroke();
        // beyond the first hidden mirror the beam shows only in the light of the lantern
        ctx.fillStyle = "#FFE9A0";
        for (let i = 0; i < DARK.length; i += 2) {
          PT[0] = DARK[i];
          PT[1] = DARK[i + 1];
          if (uvAt(PT)) ctx.fillRect(DARK[i] - 1, DARK[i + 1] - 1, 2, 2);
        }

        // the mirrors; the hidden ones only where the light of the lantern falls
        ctx.strokeStyle = "#9DB4D8";
        for (let i = 0; i < MIRRORS.length; i++) {
          const q = MIRRORS[i];
          if (q.hidden) {
            PT[0] = q.x;
            PT[1] = q.y;
            if (!uvAt(PT)) continue;
          }
          ctx.strokeStyle = q.hidden ? "#FF4FD8" : "#9DB4D8";
          ctx.beginPath();
          ctx.moveTo(q.x0, q.y0);
          ctx.lineTo(q.x1, q.y1);
          ctx.stroke();
        }

        // a pulse of light runs the beam from the source, again and again; past the dark it shows only under UV
        const head = ((ms / 1000) * PULSE_SPEED) % (ALONG[ALONG.length - 1] + 60);
        ctx.fillStyle = "#FFFFFF";
        for (let d = Math.max(0, head - PULSE_LEN); d <= Math.min(head, ALONG[ALONG.length - 1]); d++) {
          const q = along(d);
          if (d <= SEEN_TO || uvAt(q)) ctx.fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - 1, 3, 3);
        }

        // the buds: one glows as the pulse reaches it, where the pulse can be seen; tapped ones stay lit
        ctx.fillStyle = "#FFE9A0";
        ctx.fillRect(MX - 6, SOURCE_Y - 3, 6, 6);
        for (let k = 0; k < MURAL.buds.length; k++) {
          PT[0] = BUD_RECTS[k].x + BUD_RECTS[k].w / 2;
          PT[1] = BUD_RECTS[k].y + BUD_RECTS[k].h / 2;
          const reached = Math.abs(head - BUD_AT[k]) < GLOW && (BUD_AT[k] <= SEEN_TO || uvAt(PT));
          const lit = s.flame || tapped.current.includes(k) || reached;
          drawSprite(ctx, "bud", BUD_RECTS[k].x, BUD_RECTS[k].y, lit ? 1 : 0);
        }

        if (s.flame) {
          const rise = (ms - flameAt.current) / FLAME_MS;
          const [fx, fy] = centre(BUD_TUNE[BUD_TUNE.length - 1].cell);
          if (rise >= 0 && rise < 1) drawSprite(ctx, "flame", fx - SPRITES.flame.w / 2, fy - rise * 80, Math.floor(t * 8));
        }
      }

      // the pillar stands on top, so that its marks show
      paintPillars(ctx, "boccioli", other.current.pillars, uvAt);
    },
    [],
  );

  const onTap = (pt: [number, number]) => {
    const s = now.current;
    const o = other.current;
    const stamped = stampPillar(o.pillars, "boccioli", pt, o.uvOn);
    if (stamped) {
      o.setPillars(stamped);
      return;
    }
    if (!s.turtles || s.flame) return;
    const k = BUD_RECTS.findIndex((r) => hit(pt, touchRect(r)));
    if (k < 0 || tapped.current.includes(k)) return;
    // a tap is a gesture: the place to make the audio, and the bud sings its whistle
    const voice = organ().start(MURAL.buds[k].whistle);
    timers.current.push(setTimeout(() => voice.stop(), WHISTLE_MS));
    // nothing tells a right bud from a wrong one until all four are lit: then they are judged together
    tapped.current = [...tapped.current, k];
    if (tapped.current.length < MURAL.buds.length) return;
    const right = tapped.current.every((b, i) => b === ORDER[i]);
    tapped.current = [];
    if (!right) {
      timers.current.push(setTimeout(() => organ().puff(), WHISTLE_MS));
      return;
    }
    const played = MURAL.buds.length;
    flameAt.current = performance.now();
    o.onFlame();
    commit({ ...s, played, flame: true });
  };

  /** A note of the flute: the turtles' tune raises them. */
  const onNote = (p: Played) => {
    // notes come from a press: the place to make or wake the audio
    organ();
    const s = now.current;
    if (s.turtles) return;
    const before = heard.current;
    heard.current = follow(TURTLE_TUNE, before, p);
    if (heard.current !== before + 1) organ().puff();
    if (heard.current < TURTLE_TUNE.length) return;
    heard.current = 0;
    raisedAt.current = performance.now();
    commit({ ...s, turtles: true });
  };

  return { paint, onTap, onNote, dark: false };
}
