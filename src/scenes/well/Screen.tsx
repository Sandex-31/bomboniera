import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { CanvasTexture, NearestFilter, SRGBColorSpace, type Group, type Object3D } from "three";
import { useTap } from "../Hotspot";
import { onWall } from "../machines/hall";
import { H, W, chase, inCircle, toPixel } from "../../lib/well/pixels";
import { SPRITES, drawSprite } from "../../lib/well/sprites";
import { SCREEN_Y, WELL_R } from "./wall";

/*
 * A wall of the well is a game screen: a 320 by 180 canvas, repainted every
 * frame and shown pixel for pixel on a panel hung on the wall. The wall's
 * own painter draws the room; the screen adds Rotom, in pixel art, running
 * to every tap, and over it all the dark and the UV light, a circle cut
 * round the finger. Nothing of this is a three.js light: the hall keeps the
 * lights it has, and the dark is painted.
 */

/** How big the panel is on the wall: the canvas's shape. */
export const PANEL = { w: 1.6, h: 0.9 };

/** How far in from the round wall the flat panel hangs, so that its corners clear the curve. */
export const INSET = 0.12;

/** Marks a screen's panel, so the hall can tell a tap that landed on one. */
export const SCREEN = { userData: { screen: true } };

/** How far round the finger the dark room is lit, and the UV lantern shows. */
export const LIGHT_R = 28;

/** Where the finger is on the screen being worked, in pixels; nothing when it is off it. */
export const finger: { current: [number, number] | null } = { current: null };

/**
 * Paints a wall's room. `uvAt` says whether a pixel is under the UV light:
 * the hidden marks are drawn only where it is true.
 */
/** How often a screen seen from across the hall is repainted, in seconds. */
const IDLE_S = 1 / 10;

/** Drawn and seen: `FarSide` hides the walls behind the camera by hiding a parent. */
function shown(o: Object3D | null): boolean {
  return !o || (o.visible && shown(o.parent));
}

/** The dark's soft hole and the lantern's glow, each a square twice the light's radius, made once. */
let made: { hole: HTMLCanvasElement; glow: HTMLCanvasElement } | null = null;
function masks() {
  if (made) return made;
  const R = LIGHT_R;
  const square = (stops: [number, string][], from: number) => {
    const c = document.createElement("canvas");
    c.width = c.height = 2 * R;
    const g = c.getContext("2d")!;
    const fill = g.createRadialGradient(R, R, from, R, R, R);
    for (const [at, colour] of stops) fill.addColorStop(at, colour);
    g.fillStyle = fill;
    g.fillRect(0, 0, 2 * R, 2 * R);
    return c;
  };
  made = {
    hole: square([[0, "rgba(0,0,0,0)"], [1, "#000"]], R * 0.55),
    glow: square([[0, "rgba(170,90,255,0.45)"], [0.85, "rgba(140,60,255,0.25)"], [1, "rgba(140,60,255,0)"]], 0),
  };
  return made;
}

export type Painter = (ctx: CanvasRenderingContext2D, t: number, uvAt: (p: [number, number]) => boolean) => void;

export default function Screen({
  a,
  paint,
  onTap,
  onPress,
  onDrag,
  onRelease,
  active,
  dark = false,
  uv = false,
  reduced = false,
}: {
  /** Which wall: its angle round the hall. */
  a: number;
  paint: Painter;
  /** A tap on the screen, in pixels. It acts at once: Rotom only runs after it. */
  onTap: (p: [number, number]) => void;
  /** A finger came down on the screen, moved while down, and lifted or left it: for walls with something to drag. */
  onPress?: (p: [number, number]) => void;
  onDrag?: (p: [number, number]) => void;
  onRelease?: () => void;
  /** The camera stands in front of it, no scene is playing, and Rotom is inside. */
  active: boolean;
  /** The room is dark but round the finger. */
  dark?: boolean;
  /** The UV lantern is on. */
  uv?: boolean;
  /** Rotom jumps to a tap instead of running. */
  reduced?: boolean;
}) {
  const { ctx, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    return { ctx, texture };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  const rotom = useRef<[number, number]>([W / 2, H * 0.7]);
  const goal = useRef<[number, number]>([W / 2, H * 0.7]);
  const facingLeft = useRef(false);
  const down = useRef<[number, number] | null>(null);

  // a screen left behind takes the finger with it
  useEffect(() => {
    if (!active) finger.current = null;
  }, [active]);

  /** What `uvAt` reads: the lantern and the finger as of this frame. One function for the screen's life, not one a frame. */
  const lit = useRef<{ on: boolean; at: [number, number] | null }>({ on: false, at: null });
  const uvAt = useMemo(
    () => (p: [number, number]) => lit.current.on && lit.current.at !== null && inCircle(p, lit.current.at, LIGHT_R),
    [],
  );
  const group = useRef<Group>(null);
  /** Seconds since the screen was last painted. */
  const since = useRef(Infinity);

  useFrame(({ clock }, dt) => {
    since.current += dt;
    // a screen behind the camera is not painted; one seen across the hall only now and then
    if (!shown(group.current) || (!active && since.current < IDLE_S)) return;
    const step = Math.min(since.current, 0.1);
    since.current = 0;
    const t = clock.elapsedTime;
    const at = active ? finger.current : null;
    lit.current.on = uv;
    lit.current.at = at;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    paint(ctx, t, uvAt);

    if (active) {
      const g = goal.current;
      if (g[0] !== rotom.current[0]) facingLeft.current = g[0] < rotom.current[0];
      rotom.current = reduced ? g : chase(rotom.current, g, step);
      const s = SPRITES.rotomFrost;
      drawSprite(ctx, "rotomFrost", rotom.current[0] - s.w / 2, rotom.current[1] - s.h / 2, reduced ? 0 : Math.floor(t * 4), facingLeft.current);
    }

    const R = LIGHT_R;
    if (dark) {
      ctx.fillStyle = "#000";
      if (!at) ctx.fillRect(0, 0, W, H);
      else {
        // black all round the square the light sits in, and the light's own soft edge inside it
        const [x, y] = at;
        ctx.fillRect(0, 0, W, Math.max(0, y - R));
        ctx.fillRect(0, y + R, W, H);
        ctx.fillRect(0, y - R, Math.max(0, x - R), 2 * R);
        ctx.fillRect(x + R, y - R, W, 2 * R);
        ctx.drawImage(masks().hole, x - R, y - R);
      }
    }
    if (uv && at) ctx.drawImage(masks().glow, at[0] - R, at[1] - R);
    texture.needsUpdate = true;
  });

  const tap = useTap(() => {
    const p = down.current;
    if (!p) return;
    goal.current = p;
    onTap(p);
  }, active);

  const pressed = useRef(false);
  const release = () => {
    if (!pressed.current) return;
    pressed.current = false;
    onRelease?.();
  };
  const point = (e: ThreeEvent<PointerEvent>) => {
    if (!active || !e.uv) return null;
    finger.current = toPixel(e.uv);
    return finger.current;
  };

  return (
    <group ref={group} {...onWall(a, INSET, SCREEN_Y, WELL_R)}>
      {/* the bezel, a little darker than the wall */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[PANEL.w + 0.1, PANEL.h + 0.1]} />
        <meshStandardMaterial color="#0C0F14" roughness={0.7} />
      </mesh>
      <mesh
        {...SCREEN}
        onPointerDown={(e) => {
          down.current = point(e);
          if (down.current) {
            pressed.current = true;
            onPress?.(down.current);
          }
          tap.onPointerDown(e);
        }}
        onPointerUp={(e) => {
          release();
          tap.onPointerUp(e);
        }}
        onPointerMove={(e) => {
          const p = point(e);
          if (p && pressed.current) onDrag?.(p);
        }}
        onPointerOut={() => {
          release();
          if (active) finger.current = null;
        }}
      >
        <planeGeometry args={[PANEL.w, PANEL.h]} />
        {/* lit by nothing: a screen gives its own light */}
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
