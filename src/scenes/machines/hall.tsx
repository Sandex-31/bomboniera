import { useRef, type ReactNode } from "react";
import { useTap } from "../Hotspot";
import { useFrame } from "@react-three/fiber";
import type { Group, Intersection, Object3D, PointLight } from "three";
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
  pipes: { a: FAR + 1.65, y: 1, zoom: 4.3, polar: 1.5 },
  gears: { a: FAR - 1.65, y: 0.95, zoom: 3.9, polar: 1.5 },
  hoist: { a: FAR + 2.68, y: 0.7, zoom: 3.9, polar: 1.35 },
  organ: { a: FAR - 2.68, y: 0.86, zoom: 3.9, polar: 1.4 },
};

/** Placed against the wall at angle `a`, `inset` in from it, turned to face the middle. `r` is the hall's radius: the well's is wider. */
export function onWall(a: number, inset: number, y: number, r = HALL_R) {
  const wall = r - inset;
  return {
    position: [Math.cos(a) * wall, y, Math.sin(a) * wall] as [number, number, number],
    "rotation-y": -a - Math.PI / 2,
  };
}

/**
 * Standing in the middle of the hall, looking straight at the wall at angle
 * `a`, from `polar` off the vertical. OrbitControls measure azimuth from +z towards +x, and the camera has
 * to be on the far side of the middle from the wall it looks at. `r` is the
 * hall's radius, the machine room's unless the hall is another.
 */
export function facing({ a, y, zoom, polar }: { a: number; y: number; zoom: number; polar: number }, r = HALL_R): View {
  return {
    target: [Math.cos(a) * (r - 0.3), y, Math.sin(a) * (r - 0.3)],
    azimuth: Math.atan2(-Math.cos(a), -Math.sin(a)),
    polar,
    zoom,
    spread: { azimuth: 0.25, polar: 0.15 },
  };
}

/** Rotom, eased to where it is put and to the size it is wanted at. */
export function Carried({
  at,
  size,
  instant,
  children,
}: {
  at: [number, number, number];
  size: number;
  instant: boolean;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const k = instant ? 1 : Math.min(1, dt * 4);
    g.position.x += (at[0] - g.position.x) * k;
    g.position.y += (at[1] - g.position.y) * k;
    g.position.z += (at[2] - g.position.z) * k;
    g.scale.setScalar(g.scale.x + (size - g.scale.x) * Math.min(1, dt * 5));
  });
  return <group ref={group}>{children}</group>;
}

/** The press, from a little above, with the floor round it. */
export const PRESS_VIEW: View = {
  target: [0, 0.9, 0],
  azimuth: Math.PI / 4,
  polar: 1.1,
  zoom: 1.6,
  spread: { azimuth: 0.4, polar: 0.2 },
};

/** The machine the camera stands in front of, set by the hall every render, read by `FarSide`. */
export const focused: { current: MachineId | null } = { current: null };
/** How many boilers burn, set by the hall every render, read by `Lamp`. */
export const burning = { current: 0 };

/**
 * A machine's lamp: dark while the hall is cold, coming up with the first
 * boiler lit. Always in the scene, never hidden, only turned down: a light
 * that comes and goes makes three.js recompile every material in the hall.
 */
export function Lamp({ position, intensity, distance }: { position: [number, number, number]; intensity: number; distance: number }) {
  const light = useRef<PointLight>(null);
  useFrame((_, dt) => {
    if (!light.current) return;
    const goal = burning.current > 0 ? intensity : 0;
    light.current.intensity += (goal - light.current.intensity) * Math.min(1, dt * 2);
  });
  return <pointLight ref={light} position={position} color="#FFC890" intensity={0} distance={distance} />;
}

/**
 * Shown only while it is on the far side of the hall from the camera, and,
 * when it is a machine, while no other machine is being worked. The
 * wall is drawn from the inside only, so its near half never stands in the
 * way; pipes and gears are solid all round, and on the near half they would
 * hang in front of everything. As the camera goes round, they come and go
 * with the wall behind them.
 */
export function FarSide({ a, id, children }: { a: number; id?: MachineId; children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (!group.current) return;
    const towards = Math.atan2(camera.position.z, camera.position.x);
    // in front of one machine, its neighbours on the wall crowd the edges of the shot
    const crowding = id !== undefined && focused.current !== null && focused.current !== id;
    group.current.visible = !crowding && Math.cos(a - towards) < 0.25;
  });
  return <group ref={group}>{children}</group>;
}

/**
 * Only what can be seen takes a tap, and in front of a machine, only that
 * machine. Three's raycaster tests objects whether they are drawn or not, and
 * `FarSide` hides things by not drawing them: left alone, a panel hidden
 * behind the camera would catch every tap meant for the machine in front of
 * it. And a neighbouring machine at the edge of the shot, or the pad that
 * walks up to it, would catch the taps meant for this one.
 */
export function onlySeen(hits: Intersection[], focus: MachineId | null = null): Intersection[] {
  const seen = (o: Object3D | null): boolean => !o || (o.visible && seen(o.parent));
  const machine = (o: Object3D | null): string | null => (!o ? null : (o.userData.machine ?? machine(o.parent)));
  return hits.filter((h) => {
    if (!seen(h.object)) return false;
    const m = machine(h.object);
    return focus === null || m === null || m === focus;
  });
}

/** Marks a machine's group, so that taps can tell which machine they landed on. */
export const machine = (id: MachineId) => ({ userData: { machine: id } });

/**
 * Seen from across the hall, a machine on the side wall shows only its edge.
 * This is a box out in front of it, as wide and high as the machine and
 * reaching well into the hall, so a tap anywhere near it walks up to it. It
 * is only there while the machine is not being worked, or it would swallow
 * every tap meant for its pieces.
 */
export function Approach({ w, h, onPick }: { w: number; h: number; onPick: () => void }) {
  const tap = useTap(onPick);
  return (
    <mesh position={[0, 0, 0.45]} {...tap}>
      <boxGeometry args={[w, h, 0.9]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
