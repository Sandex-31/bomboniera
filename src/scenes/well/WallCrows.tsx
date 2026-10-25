import { useMemo, useRef } from "react";
import { H, W, hit, touchRect, type Rect } from "../../lib/well/pixels";
import { SPRITES, drawSprite } from "../../lib/well/sprites";
import { follow, type Played } from "../../lib/flute";
import { crowVoice } from "../../lib/crowVoice";
import {
  BAR,
  BOX,
  COLS,
  CROWS,
  CROW_TUNE,
  LONG_CAW_MS,
  PORC_START,
  ROWS,
  SHORT_CAW_MS,
  STEP_MS,
  YELLOW,
  boxDone,
  cawAt,
  cellKey,
  fellOut,
  stepPorc,
  type CrowsState,
  type Porc,
} from "../../lib/well/crows";
import type { PillarsState } from "../../lib/well/pillars";
import { paintPillars, stampPillar } from "./pillarPaint";
import { paintSetting } from "./setting";
import type { Painter } from "./Screen";

/*
 * The second wall: a box with a porcupine that walks by itself and a pink
 * switch that raises and lowers one barrier; when he has crossed the three
 * yellow switches the door beside it opens on eight crows, standing round a
 * square. They caw their tune, bobbing as they do, and tapping their perch
 * has them caw it again. Nothing on it is written.
 */

const CELL = 16;
const BX = 8;
const BY = 20;
const SWITCH: Rect = { x: 40, y: 120, w: 8, h: 8 };
/** The door in the wall between the box and the crows. */
const DOOR: Rect = { x: 174, y: 54, w: 8, h: 72 };
/** The square of crows: its middle, which is also their perch, and how far out they stand. */
const MID: [number, number] = [252, 90];
const PERCH: Rect = { x: MID[0] - 8, y: MID[1] - 4, w: 16, h: 8 };
const REACH = 40;
/** Each direction's place on the square, clockwise from up. */
const VEC: readonly (readonly [number, number])[] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const SCATTER_MS = 1000;
const SETTLE_MS = 500;
const FLAME_MS = 1800;
/** The secret room under the perch, which the tune opens. */
const HATCH: Rect = { x: MID[0] - 16, y: 150, w: 32, h: 20 };

const tile = SPRITES.tile;

/** The wall's behaviour: what to paint and what a tap or a note does. */
export function useWallCrows({
  state,
  set,
  pillars,
  setPillars,
  uvOn,
  onFlame,
}: {
  state: CrowsState;
  set: (next: CrowsState) => void;
  /** The pillars' state: a tap with the lantern on stamps the pillars of this wall into it. */
  pillars: PillarsState;
  setPillars: (next: PillarsState) => void;
  uvOn: boolean;
  /** The tune was played back, and the flame flies. */
  onFlame: () => void;
}) {
  const now = useRef(state);
  now.current = state;
  const other = useRef({ set, pillars, setPillars, uvOn, onFlame });
  other.current = { set, pillars, setPillars, uvOn, onFlame };

  const porc = useRef<Porc>(PORC_START);
  const visited = useRef(new Set<string>([cellKey(PORC_START)]));
  const barrier = useRef(false);
  const acc = useRef(0);
  const last = useRef(0);
  /** When the crows began: a scatter first when `scatter`, then the tune. */
  const play = useRef<{ at: number; scatter: boolean } | null>(null);
  const lastCaw = useRef(-1);
  const heard = useRef(0);
  const flameAt = useRef(-Infinity);

  const commit = (next: CrowsState) => {
    now.current = next;
    other.current.set(next);
  };

  const start = (scatter: boolean) => {
    play.current = { at: performance.now(), scatter };
    lastCaw.current = -1;
    heard.current = 0;
  };

  const paint = useMemo<Painter>(
    () => (ctx, t, uvAt) => {
      const s = now.current;
      const ms = performance.now();
      const dt = Math.min(0.1, Math.max(0, (ms - last.current) / 1000));
      last.current = ms;

      // the porcupine, until the box is done: every STEP_MS a step, and out through the hole is back to the start
      if (!s.box) {
        acc.current += dt * 1000;
        while (acc.current >= STEP_MS) {
          acc.current -= STEP_MS;
          porc.current = stepPorc(porc.current, barrier.current);
          if (fellOut(porc.current)) {
            porc.current = PORC_START;
            visited.current = new Set();
          }
          visited.current.add(cellKey(porc.current));
          if (boxDone(visited.current)) {
            commit({ ...s, box: true });
            start(false);
            break;
          }
        }
      }
      const open = now.current.box;

      // no floor here: the grass grows along the bottom
      paintSetting(ctx, t, [[0, W, H]], 3);

      // the box
      ctx.fillStyle = "#0E1218";
      ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL);
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++)
          if (BOX[y][x] === "#")
            for (let i = 0; i < 4; i++)
              drawSprite(ctx, "tile", BX + x * CELL + (i % 2) * tile.w, BY + y * CELL + Math.floor(i / 2) * tile.h, (x + y + i) % tile.frames);
      YELLOW.forEach(([x, y]) => {
        const done = open || visited.current.has(`${x},${y}`);
        drawSprite(ctx, "switchYellow", BX + x * CELL + 4, BY + y * CELL + CELL - 8, done ? 1 : 0);
      });
      // the barrier: a bar across its cell when up, only its socket when down
      ctx.fillStyle = "#FF5FA8";
      if (barrier.current && !open) ctx.fillRect(BX + BAR.x * CELL + 6, BY + BAR.y * CELL, 4, CELL);
      else ctx.fillRect(BX + BAR.x * CELL + 5, BY + BAR.y * CELL + CELL - 2, 6, 2);
      drawSprite(ctx, "switchPink", SWITCH.x, SWITCH.y, barrier.current ? 1 : 0);
      const p = porc.current;
      drawSprite(ctx, "porcupine", BX + p.x * CELL, BY + p.y * CELL + CELL - SPRITES.porcupine.h, Math.floor(t * 4), p.dir === -1);

      // the door, shut or open
      ctx.fillStyle = open ? "#05070B" : "#6A4A2A";
      ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);

      if (open) {
        // the crows' timeline: a scatter and a settling, then the tune
        const pl = play.current;
        let caw = -2;
        let spread = 0;
        if (pl) {
          let e = ms - pl.at;
          if (pl.scatter) {
            if (e < SCATTER_MS) spread = e / SCATTER_MS;
            else if (e < SCATTER_MS + SETTLE_MS) spread = 1 - (e - SCATTER_MS) / SETTLE_MS;
            e -= SCATTER_MS + SETTLE_MS;
          }
          if (e >= 0) caw = cawAt(CROW_TUNE, e);
          if (caw === CROW_TUNE.length) {
            play.current = null;
            caw = -2;
            if (!now.current.heard) commit({ ...now.current, heard: true });
          } else if (caw >= 0 && caw !== lastCaw.current) {
            crowVoice().caw(CROW_TUNE[caw].long ? LONG_CAW_MS : SHORT_CAW_MS);
          }
          lastCaw.current = caw;
        }
        // until they have been heard, the perch blinks pink to be tapped
        ctx.fillStyle = !now.current.heard && !pl && Math.floor(t * 3) % 2 ? "#FF5FA8" : "#4A3A2A";
        ctx.fillRect(PERCH.x, PERCH.y, PERCH.w, PERCH.h);
        CROWS.forEach((c) => {
          const cawing = caw >= 0 && CROW_TUNE[caw].note === c;
          // a short caw bobs, a long one stands raised for all of it; a scattering crow flies outwards and up
          const bob = !cawing ? 0 : CROW_TUNE[caw].long ? -5 : -Math.abs(Math.sin(t * 24)) * 3;
          const x = MID[0] + VEC[c][0] * (REACH + spread * 70) - SPRITES.crow.w / 2;
          const y = MID[1] + VEC[c][1] * REACH * 0.8 - SPRITES.crow.h + bob - spread * 50;
          drawSprite(ctx, "crow", x, y, cawing || spread > 0 ? 1 : 0, VEC[c][0] < 0);
        });
      }

      if (now.current.flame) {
        ctx.fillStyle = "#05070B";
        ctx.fillRect(HATCH.x, HATCH.y, HATCH.w, HATCH.h);
        const rise = (ms - flameAt.current) / FLAME_MS;
        if (rise >= 0 && rise < 1) drawSprite(ctx, "flame", MID[0] - SPRITES.flame.w / 2, HATCH.y - rise * 80, Math.floor(t * 8));
      }

      // the pillar stands on top, so that its marks show
      paintPillars(ctx, "corvi", other.current.pillars, uvAt);
    },
    [],
  );

  const onTap = (pt: [number, number]) => {
    const s = now.current;
    const o = other.current;
    const stamped = stampPillar(o.pillars, "corvi", pt, o.uvOn);
    if (stamped) {
      o.setPillars(stamped);
      return;
    }
    if (!s.box && hit(pt, touchRect(SWITCH))) {
      crowVoice();
      barrier.current = !barrier.current;
      return;
    }
    if (s.box && !s.flame && !play.current && hit(pt, touchRect(PERCH))) {
      crowVoice();
      start(false);
    }
  };

  /** A note of the flute: it counts once the crows have been heard, and cuts them short if they are cawing. */
  const onNote = (p: Played) => {
    const s = now.current;
    // notes come from a press: the place to make or wake the audio before a caw is heard
    crowVoice();
    if (!s.box || s.flame) return;
    // the crows not yet heard (a reload): a note is their cue, in a gesture
    if (!s.heard) {
      if (!play.current) start(false);
      return;
    }
    // the visitor plays over them: they fall quiet and listen
    play.current = null;
    heard.current = follow(CROW_TUNE, heard.current, p);
    if (heard.current === 0) {
      // wrong: they scatter, settle, and caw from the start
      start(true);
      return;
    }
    if (heard.current < CROW_TUNE.length) return;
    heard.current = 0;
    flameAt.current = performance.now();
    other.current.onFlame();
    commit({ ...s, flame: true });
  };

  return { paint, onTap, onNote, dark: false };
}
