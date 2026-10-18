import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { View } from "../focus";

/*
 * What every machine of the third floor shares: where the wall is, which way
 * a thing on it faces, and where the camera stands to work it.
 */

/** How wide the hall is, and how high its wall stands: Babel's, so the camera fits it the same. */
export const HALL_R = 2.4;
export const WALL_H = 1.9;

export const BRICK = "#4A2A22";
export const MORTAR = "#22140F";
export const IRON = "#2E2A28";
export const COPPER = "#B8733A";
export const BRASS = "#C9A227";
export const FIRE = "#FF6A1A";

/** Straight across from where the camera first looks: the boilers stand there. */
export const FAR = (-3 * Math.PI) / 4;

export type MachineId = "boilers" | "pipes" | "gears" | "hoist" | "organ" | "press";

/**
 * Where each machine stands on the wall, as an angle round the hall. The
 * boilers keep the far side; pipes and gears flank them; the hoist and the
 * organ share the side the camera starts on, so turning round finds them.
 * The press is not on the wall: it hangs over the middle.
 */
export const SPOTS: Record<Exclude<MachineId, "press">, { a: number; y: number; zoom: number; polar: number }> = {
  // from higher up than the rest, so Rotom in the middle hangs below the
  // boilers on the screen instead of in front of the middle one
  boilers: { a: FAR, y: 0.3, zoom: 1.45, polar: 0.85 },
  pipes: { a: FAR + 1.75, y: 1, zoom: 2.6, polar: 1.1 },
  gears: { a: FAR - 1.75, y: 1, zoom: 2.6, polar: 1.1 },
  hoist: { a: FAR + Math.PI - 0.6, y: 0.9, zoom: 2.3, polar: 1.1 },
  organ: { a: FAR + Math.PI + 0.6, y: 1, zoom: 2.3, polar: 1.1 },
};

/** Placed against the wall at angle `a`, `inset` in from it, turned to face the middle. */
export function onWall(a: number, inset: number, y: number) {
  const r = HALL_R - inset;
  return {
    position: [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number],
    "rotation-y": -a - Math.PI / 2,
  };
}

/**
 * Standing in the middle of the hall, looking straight at the wall at angle
 * `a`, from `polar` off the vertical. OrbitControls measure azimuth from +z towards +x, and the camera has
 * to be on the far side of the middle from the wall it looks at.
 */
export function facing({ a, y, zoom, polar }: { a: number; y: number; zoom: number; polar: number }): View {
  return {
    target: [Math.cos(a) * (HALL_R - 0.3), y, Math.sin(a) * (HALL_R - 0.3)],
    azimuth: Math.atan2(-Math.cos(a), -Math.sin(a)),
    polar,
    zoom,
    spread: { azimuth: 0.25, polar: 0.15 },
  };
}

/** The press, from a little above, with the floor round it. */
export const PRESS_VIEW: View = {
  target: [0, 0.9, 0],
  azimuth: Math.PI / 4,
  polar: 1.1,
  zoom: 1.6,
  spread: { azimuth: 0.4, polar: 0.2 },
};

/**
 * Shown only while it is on the far side of the hall from the camera. The
 * wall is drawn from the inside only, so its near half never stands in the
 * way; pipes and gears are solid all round, and on the near half they would
 * hang in front of everything. As the camera goes round, they come and go
 * with the wall behind them.
 */
export function FarSide({ a, children }: { a: number; children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (!group.current) return;
    const towards = Math.atan2(camera.position.z, camera.position.x);
    group.current.visible = Math.cos(a - towards) < 0.25;
  });
  return <group ref={group}>{children}</group>;
}
