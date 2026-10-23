import { useMemo, useRef } from "react";
import { H, W, chase, hit, touchRect, type Rect } from "../../lib/well/pixels";
import { GAZE, SPRITES, drawSprite } from "../../lib/well/sprites";
import { follow, type Played } from "../../lib/flute";
import { fluteVoice } from "../../lib/fluteVoice";
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
import { paintSetting } from "./setting";

/*
 * The first wall: a living room, in two parts. First the chest on its green
 * ledge, the green switch that drops it on the chinchilla, and the remote
 * inside. Then a floor of pink and blue blocks that the remote swaps all at
 * once, a sofa at the far end, and the TV above it, whose ghost faces look
 * the way of the notes, but only under the UV light. Nothing on it is written.
 */

const TVR: Rect = { x: 70, y: 14, w: 180, h: 90 };
/** The top of the sofa's seat, where he sits once there. */
const SOFA_SEAT = FLOOR_Y - 14;
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

      // the grass on the floor and the ledge, or on the starting stone once the floor is blocks
      paintSetting(ctx, t, s.remote ? [[0, START_END, FLOOR_Y]] : [[0, W, FLOOR_Y], [LEDGE.x, LEDGE.x + LEDGE.w, LEDGE.y]], 1);
      // the pillars are the room's own columns, standing on its floor behind everything in it
      paintPillars(ctx, "tv", other.current.pillars, uvAt);

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
        // the sofa: a back with two cushions, a seat, an arm each side, short legs
        ctx.fillStyle = "#2A1A20";
        ctx.fillRect(SOFA_X - 17, FLOOR_Y - 2, 2, 2);
        ctx.fillRect(SOFA_X + 15, FLOOR_Y - 2, 2, 2);
        ctx.fillStyle = "#6A3A4A";
        ctx.fillRect(SOFA_X - 16, SOFA_SEAT - 14, 32, 14);
        ctx.fillStyle = "#552E3C";
        ctx.fillRect(SOFA_X - 1, SOFA_SEAT - 13, 2, 13);
        ctx.fillStyle = "#8A5060";
        ctx.fillRect(SOFA_X - 18, SOFA_SEAT, 36, FLOOR_Y - 2 - SOFA_SEAT);
        ctx.fillStyle = "#A86A7A";
        ctx.fillRect(SOFA_X - 16, SOFA_SEAT, 32, 1);
        for (const ax of [SOFA_X - 20, SOFA_X + 14]) {
          ctx.fillStyle = "#7A4656";
          ctx.fillRect(ax, SOFA_SEAT - 6, 6, FLOOR_Y - 2 - SOFA_SEAT + 6);
          ctx.fillStyle = "#A86A7A";
          ctx.fillRect(ax, SOFA_SEAT - 6, 6, 1);
        }
        ctx.fillStyle = "#1A2230";
        ctx.fillRect(TVR.x - 4, TVR.y - 4, TVR.w + 8, TVR.h + 8);
        // off with him on the sofa, it flickers and its light blinks red, to be tapped
        const call = s.sofa && !s.tv && Math.floor(t * 3) % 2 === 1;
        ctx.fillStyle = s.tv ? "#3A5A78" : call ? "#1C2838" : "#10151D";
        ctx.fillRect(TVR.x, TVR.y, TVR.w, TVR.h);
        ctx.fillStyle = s.tv ? "#5FE07A" : call ? "#FF4040" : "#5A2020";
        ctx.fillRect(TVR.x + TVR.w, TVR.y + TVR.h + 1, 2, 2);
        if (s.tv)
          TV_TUNE.forEach((p, i) => {
            const [fx, fy] = faceAt(i);
            // the game's own face sheet has expressions, not eight gazes: this one is drawn, 16 by 16
            const cx = fx + 6;
            const cy = fy + 8;
            // the face is there; where it looks is for the UV light to show
            if (uvAt([cx, cy])) {
              ctx.fillStyle = SPRITES.face.key;
              ctx.fillRect(cx - 8, cy - 8, 16, 16);
              const [dx, dy] = GAZE[p.note];
              for (const ex of [cx - 7, cx + 1]) {
                ctx.fillStyle = "#1A3A40";
                ctx.fillRect(ex, cy - 6, 6, 6);
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(ex + 2 + dx, cy - 4 + dy, 2, 2);
              }
              // a long note opens the mouth wide, a short one barely
              ctx.fillStyle = "#1A3A40";
              if (p.long) ctx.fillRect(cx - 4, cy + 3, 8, 2);
              else ctx.fillRect(cx - 1, cy + 3, 2, 2);
            } else {
              ctx.fillStyle = "#2C4660";
              ctx.fillRect(cx - 8, cy - 8, 16, 16);
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
        if (rise >= 0 && rise < 1) drawSprite(ctx, "flame", TVR.x + TVR.w / 2 - SPRITES.flame.w / 2, TVR.y + 30 - rise * 70, Math.floor(t * 8));
      }

      if (s.sofa) drawSprite(ctx, "chinchilla", SOFA_X - SPRITES.chinchilla.w / 2, SOFA_SEAT + 2 - SPRITES.chinchilla.h, 0);
      else drawSprite(ctx, "chinchilla", c.x - SPRITES.chinchilla.w / 2, c.y - SPRITES.chinchilla.h, moving ? Math.floor(t * 6) : 0, target.current < c.x);
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
        } else fluteVoice().puff();
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
    const before = heard.current;
    heard.current = follow(TV_TUNE, before, p);
    if (heard.current !== before + 1) fluteVoice().puff();
    if (heard.current < TV_TUNE.length) return;
    heard.current = 0;
    flameAt.current = performance.now();
    other.current.onFlame();
    commit({ ...s, flame: true });
  };

  return { paint, onTap, onNote, dark: false };
}
