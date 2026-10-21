import { useMemo, useRef } from "react";
import { H, W, chase, hit, touchRect, type Rect } from "../../lib/well/pixels";
import { SPRITES, drawSprite } from "../../lib/well/sprites";
import { follow, type Played } from "../../lib/flute";
import {
  BLOCKS,
  CHEST_X,
  FLOOR_Y,
  LEDGE,
  SOFA_X,
  SPEED,
  START_END,
  START_X,
  SWITCH,
  TV_TUNE,
  dropChest,
  solid,
  walk,
  type TvState,
  type Walker,
} from "../../lib/well/tv";
import type { PillarsState } from "../../lib/well/pillars";
import { paintPillars, stampPillar } from "./pillarPaint";
import type { Painter } from "./Screen";

/*
 * The first wall: a living room, in two parts. First the chest on its green
 * ledge, the green switch that drops it on the chinchilla, and the remote
 * inside. Then a floor of pink and blue blocks that the remote swaps all at
 * once, a sofa at the far end, and the TV above it, whose ghost faces look
 * the way of the notes, but only under the UV light. Nothing on it is written.
 */

const TVR: Rect = { x: 70, y: 14, w: 180, h: 90 };
const REMOTE: Rect = { x: 16, y: 12, w: 12, h: 22 };
const CHEST_W = 16;
/** Where the faces sit on the TV: four to a row, in the order of the tune. */
const faceAt = (i: number): [number, number] => [TVR.x + 24 + (i % 4) * 40, TVR.y + 16 + Math.floor(i / 4) * 40];
const FALL_MS = 400;
const FLAME_MS = 1800;

/** The wall's behaviour: what to paint and what a tap or a note does. */
export function useWallTv({
  state,
  set,
  pillars,
  setPillars,
  uvOn,
  onFlame,
}: {
  state: TvState;
  set: (next: TvState) => void;
  /** The pillars' state: a tap with the lantern on stamps the pillars of this wall into it. */
  pillars: PillarsState;
  setPillars: (next: PillarsState) => void;
  uvOn: boolean;
  /** The tune was played, and the flame flies. */
  onFlame: () => void;
}) {
  const now = useRef(state);
  now.current = state;
  const other = useRef({ set, pillars, setPillars, uvOn, onFlame });
  other.current = { set, pillars, setPillars, uvOn, onFlame };

  const walker = useRef<Walker>({ x: START_X, y: FLOOR_Y, falling: false });
  const target = useRef(START_X);
  const swapped = useRef(false);
  const heard = useRef(0);
  const last = useRef(0);
  const droppedAt = useRef(-Infinity);
  const flameAt = useRef(-Infinity);

  const commit = (next: TvState) => {
    now.current = next;
    other.current.set(next);
  };

  const paint = useMemo<Painter>(
    () => (ctx, t, uvAt) => {
      const s = now.current;
      const ms = performance.now();
      const dt = Math.min(0.1, Math.max(0, (ms - last.current) / 1000));
      last.current = ms;
      const tile = SPRITES.tile;

      // the chinchilla: free on the floor of the chest room, on the blocks after
      const w = walker.current;
      if (!s.remote) {
        walker.current = { ...w, x: chase([w.x, 0], [target.current, 0], dt, SPEED)[0] };
      } else if (!s.sofa) {
        const next = walk(w, target.current, swapped.current, dt);
        // after a fall he is back at the start, and waits for a new tap
        if (w.falling && !next.falling) target.current = START_X;
        walker.current = next;
        if (next.x === SOFA_X && !next.falling) commit({ ...s, sofa: true });
      }
      const c = walker.current;
      const moving = !s.sofa && !c.falling && c.x !== target.current;

      if (!s.remote) {
        for (let x = 0; x < W; x += tile.w)
          for (let y = FLOOR_Y; y < H; y += tile.h) drawSprite(ctx, "tile", x, y, (x / tile.w + y / tile.h) % tile.frames);
        // the ledge of green blocks, and the chest on it, or fallen from it
        ctx.fillStyle = "#3C9A4A";
        ctx.fillRect(LEDGE.x, LEDGE.y, LEDGE.w, LEDGE.h);
        ctx.fillStyle = "#2A6E34";
        ctx.fillRect(LEDGE.x, LEDGE.y + LEDGE.h - 2, LEDGE.w, 2);
        const fall = Math.min(1, (ms - droppedAt.current) / FALL_MS);
        const top = LEDGE.y - 12;
        drawSprite(ctx, "chest", CHEST_X - CHEST_W / 2, s.chest ? top + (FLOOR_Y - 12 - top) * fall * fall : top, s.chest && fall >= 1 ? 1 : 0);
        drawSprite(ctx, "switchGreen", SWITCH.x, SWITCH.y, s.chest ? 1 : 0);
      } else {
        // the sofa, the TV and the blocks
        ctx.fillStyle = "#6A3A4A";
        ctx.fillRect(SOFA_X - 16, FLOOR_Y - 18, 32, 18);
        ctx.fillStyle = "#8A5060";
        ctx.fillRect(SOFA_X - 16, FLOOR_Y - 10, 32, 10);
        ctx.fillStyle = "#1A2230";
        ctx.fillRect(TVR.x - 4, TVR.y - 4, TVR.w + 8, TVR.h + 8);
        ctx.fillStyle = s.tv ? "#3A5A78" : "#10151D";
        ctx.fillRect(TVR.x, TVR.y, TVR.w, TVR.h);
        if (s.tv)
          TV_TUNE.forEach((p, i) => {
            const [fx, fy] = faceAt(i);
            const f = SPRITES.face;
            // the face is there; where it looks is for the UV light to show
            if (uvAt([fx + f.w / 2, fy + f.h / 2])) {
              drawSprite(ctx, "face", fx, fy, p.note);
              if (p.long) {
                ctx.fillStyle = "#10151D";
                ctx.fillRect(fx + 4, fy + 8, 4, 3);
              }
            } else {
              ctx.fillStyle = "#2C4660";
              ctx.fillRect(fx + 1, fy, f.w - 2, f.h);
            }
          });
        BLOCKS.forEach((b) => {
          const frame = solid(b, swapped.current) ? 0 : 1;
          for (let x = b.x; x < b.x + b.w; x += 8) drawSprite(ctx, b.pink ? "blockPink" : "blockBlue", x, b.y, frame);
        });
        // the stone the chinchilla starts on, which no swap takes away
        for (let x = 0; x < START_END; x += tile.w) drawSprite(ctx, "tile", x, FLOOR_Y, (x / tile.w) % tile.frames);
        // the remote, in the colour of the blocks that are full
        ctx.fillStyle = "#20262E";
        ctx.fillRect(REMOTE.x, REMOTE.y, REMOTE.w, REMOTE.h);
        ctx.fillStyle = swapped.current ? SPRITES.blockBlue.key : SPRITES.blockPink.key;
        ctx.fillRect(REMOTE.x + 3, REMOTE.y + 3, 6, 6);
        ctx.fillStyle = "#8FA3BF";
        ctx.fillRect(REMOTE.x + 3, REMOTE.y + 12, 6, 2);
        ctx.fillRect(REMOTE.x + 3, REMOTE.y + 16, 6, 2);
        const rise = (ms - flameAt.current) / FLAME_MS;
        if (rise >= 0 && rise < 1) drawSprite(ctx, "flame", TVR.x + TVR.w / 2 - 4, TVR.y + 30 - rise * 70, Math.floor(t * 8));
      }

      // the pillars stand on top of the floor, the blocks and the sofa, so that their marks show
      paintPillars(ctx, "tv", other.current.pillars, uvAt);
      if (s.sofa) drawSprite(ctx, "chinchilla", SOFA_X - 8, FLOOR_Y - 14, 0);
      else drawSprite(ctx, "chinchilla", c.x - 8, c.y - 12, moving ? Math.floor(t * 6) : 0, target.current < c.x);
    },
    [],
  );

  const onTap = (p: [number, number]) => {
    const s = now.current;
    const o = other.current;
    const stamped = stampPillar(o.pillars, "tv", p, o.uvOn);
    if (stamped) {
      o.setPillars(stamped);
      return;
    }
    if (!s.remote) {
      if (!s.chest && hit(p, touchRect(SWITCH))) {
        if (dropChest(walker.current.x)) {
          droppedAt.current = performance.now();
          commit({ ...s, chest: true });
        }
        return;
      }
      if (s.chest && hit(p, touchRect({ x: CHEST_X - CHEST_W / 2, y: FLOOR_Y - 12, w: CHEST_W, h: 12 }))) {
        walker.current = { x: START_X, y: FLOOR_Y, falling: false };
        target.current = START_X;
        commit({ ...s, remote: true });
        return;
      }
      target.current = Math.min(W - 8, Math.max(8, p[0]));
      return;
    }
    if (hit(p, touchRect(REMOTE))) {
      swapped.current = !swapped.current;
      return;
    }
    if (s.sofa && !s.tv && hit(p, touchRect(TVR))) {
      commit({ ...s, tv: true });
      return;
    }
    if (!s.sofa) target.current = Math.min(SOFA_X, Math.max(0, p[0]));
  };

  /** A note of the flute: it counts only once the TV is on. */
  const onNote = (p: Played) => {
    const s = now.current;
    if (!s.tv || s.flame) return;
    heard.current = follow(TV_TUNE, heard.current, p);
    if (heard.current < TV_TUNE.length) return;
    heard.current = 0;
    flameAt.current = performance.now();
    other.current.onFlame();
    commit({ ...s, flame: true });
  };

  return { paint, onTap, onNote, dark: false };
}
