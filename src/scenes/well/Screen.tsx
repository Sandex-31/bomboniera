import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { CanvasTexture, NearestFilter, SRGBColorSpace } from "three";
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

/** How far round the finger the dark room is lit, and the UV lantern shows. */
export const LIGHT_R = 28;

/** Where the finger is on the screen being worked, in pixels; nothing when it is off it. */
export const finger: { current: [number, number] | null } = { current: null };

/**
 * Paints a wall's room. `uvAt` says whether a pixel is under the UV light:
 * the hidden marks are drawn only where it is true.
 */
export type Painter = (ctx: CanvasRenderingContext2D, t: number, uvAt: (p: [number, number]) => boolean) => void;

export default function Screen({
  a,
  paint,
  onTap,
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

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const at = active ? finger.current : null;
    const uvAt = (p: [number, number]) => uv && at !== null && inCircle(p, at, LIGHT_R);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    paint(ctx, t, uvAt);

    if (active) {
      const g = goal.current;
      if (g[0] !== rotom.current[0]) facingLeft.current = g[0] < rotom.current[0];
      rotom.current = reduced ? g : chase(rotom.current, g, Math.min(dt, 0.1));
      const s = SPRITES.rotomFrost;
      drawSprite(ctx, "rotomFrost", rotom.current[0] - s.w / 2, rotom.current[1] - s.h / 2, reduced ? 0 : Math.floor(t * 4), facingLeft.current);
    }

    if (dark) {
      if (at) {
        const light = ctx.createRadialGradient(at[0], at[1], LIGHT_R * 0.55, at[0], at[1], LIGHT_R);
        light.addColorStop(0, "rgba(0,0,0,0)");
        light.addColorStop(1, "#000");
        ctx.fillStyle = light;
      } else ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
    }
    if (uv && at) {
      const glow = ctx.createRadialGradient(at[0], at[1], 0, at[0], at[1], LIGHT_R);
      glow.addColorStop(0, "rgba(170,90,255,0.45)");
      glow.addColorStop(0.85, "rgba(140,60,255,0.25)");
      glow.addColorStop(1, "rgba(140,60,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(at[0] - LIGHT_R, at[1] - LIGHT_R, LIGHT_R * 2, LIGHT_R * 2);
    }
    texture.needsUpdate = true;
  });

  const tap = useTap(() => {
    const p = down.current;
    if (!p) return;
    goal.current = p;
    onTap(p);
  }, active);

  const point = (e: ThreeEvent<PointerEvent>) => {
    if (!active || !e.uv) return null;
    finger.current = toPixel(e.uv);
    return finger.current;
  };

  return (
    <group {...onWall(a, INSET, SCREEN_Y, WELL_R)}>
      {/* the bezel, a little darker than the wall */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[PANEL.w + 0.1, PANEL.h + 0.1]} />
        <meshStandardMaterial color="#0C0F14" roughness={0.7} />
      </mesh>
      <mesh
        onPointerDown={(e) => {
          down.current = point(e);
          tap.onPointerDown(e);
        }}
        onPointerUp={tap.onPointerUp}
        onPointerMove={point}
        onPointerOut={() => {
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
