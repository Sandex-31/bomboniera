import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { BackSide, type Group, type Mesh, type PointLight } from "three";
import { useTap } from "../Hotspot";
import { onWall } from "../machines/hall";
import { SCREEN_Y, WALL_ANGLES, WELL_R, type WallId } from "./wall";
import type { Flames } from "../../lib/well/flames";

/*
 * The altar in the middle of the well: four candles, one for each wall, each
 * lit by the flame its wall gives. With all four lit the community mural
 * stands over it. The altar stands on a stone slab that covers the well; once
 * the mural is whole the slab slides aside and the well is open, lit from
 * below by a light that was always there and is only turned up.
 */

/** How wide the well under the altar is. The floor of the hall has a hole this size. */
export const PIT_R = 0.65;

/** Where the slab and the altar end up when the well opens: off to the side, across from Rotom. */
const ASIDE: [number, number, number] = [1.25, 0, -1.25];

/** How long a flame takes from its wall to its candle, in ms. */
export const FLY_MS = 1500;

/** The panel over the altar, in world units, and the scale that makes its 420 px that wide. */
export const PANEL_Y = 1.55;
const PANEL_SCALE = (2.1 * 40) / 420;

/** How far from the middle of the altar top the candles stand, and the height of their flames. */
const CANDLE_R = 0.3;
const FLAME_Y = 0.73;
const WALLS = Object.keys(WALL_ANGLES) as WallId[];
const candleAt = (w: WallId): [number, number, number] => [Math.cos(WALL_ANGLES[w]) * CANDLE_R, FLAME_Y, Math.sin(WALL_ANGLES[w]) * CANDLE_R];

export default function Altar({
  flames,
  flying,
  open,
  reduced,
  panel,
  onPick,
}: {
  flames: Flames;
  /** When each wall's flame set off for its candle, if it has this visit. */
  flying: Partial<Record<WallId, number>>;
  /** The mural is whole: the well is open. */
  open: boolean;
  reduced: boolean;
  /** The mural, when it stands over the altar. */
  panel: ReactNode;
  onPick: () => void;
}) {
  const slab = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const lit = useRef<Partial<Record<WallId, Mesh | null>>>({});
  const flown = useRef<Partial<Record<WallId, Mesh | null>>>({});
  const tap = useTap(onPick);

  useFrame((_, dt) => {
    const k = reduced ? 1 : Math.min(1, dt * 1.5);
    const g = slab.current;
    if (g) {
      const to = open ? ASIDE : [0, 0, 0];
      g.position.x += (to[0] - g.position.x) * k;
      g.position.z += (to[2] - g.position.z) * k;
    }
    if (light.current) light.current.intensity += ((open ? 6 : 0) - light.current.intensity) * k;
    const now = performance.now();
    for (const w of WALLS) {
      const t = reduced || flying[w] === undefined ? 1 : (now - flying[w]!) / FLY_MS;
      const candle = lit.current[w];
      if (candle) candle.visible = flames[w] && t >= 1;
      const f = flown.current[w];
      if (!f) continue;
      f.visible = flames[w] && t >= 0 && t < 1;
      if (!f.visible) continue;
      // from the screen of its wall, in an arc, to its candle (which moves with the slab)
      const from = onWall(WALL_ANGLES[w], 0.3, SCREEN_Y + 0.3, WELL_R).position;
      const to = candleAt(w);
      const s = t * t * (3 - 2 * t);
      f.position.set(from[0] + (to[0] - from[0]) * s, from[1] + (to[1] - from[1]) * s + Math.sin(Math.PI * t) * 0.7, from[2] + (to[2] - from[2]) * s);
    }
  });

  return (
    <>
      {/* the light from below, there from the start and turned up when the well opens */}
      <pointLight ref={light} position={[0, -0.5, 0]} color="#BFE6FF" intensity={0} distance={3.5} decay={1.2} />
      {/* the well: shallow walls and a glow at the bottom, seen through the hole in the floor; a tap on it does nothing */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[PIT_R, PIT_R, 1.2, 32, 1, true]} />
        <meshStandardMaterial color="#10141B" side={BackSide} roughness={0.95} />
      </mesh>
      <mesh position={[0, -1.2, 0]} rotation-x={-Math.PI / 2} onClick={open ? (e) => e.stopPropagation() : undefined}>
        <circleGeometry args={[PIT_R, 32]} />
        <meshBasicMaterial color={open ? "#9FD4FF" : "#05070B"} />
      </mesh>

      {/* the flames on their way, in the hall and not on the slab */}
      {WALLS.map((w) => (
        <mesh key={w} ref={(m) => void (flown.current[w] = m)} visible={false}>
          <sphereGeometry args={[0.06, 12, 8]} />
          <meshBasicMaterial color="#FFB347" />
        </mesh>
      ))}

      <group ref={slab}>
        {/* the slab over the well */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[PIT_R + 0.05, PIT_R + 0.05, 0.04, 32]} />
          <meshStandardMaterial color="#1E232C" roughness={0.9} />
        </mesh>
        {/* the altar, tapped to walk up to it */}
        <mesh position={[0, 0.27, 0]} {...tap}>
          <cylinderGeometry args={[0.45, 0.55, 0.5, 24]} />
          <meshStandardMaterial color="#3A4150" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.53, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.4, 24]} />
          <meshStandardMaterial color="#8FA3BF" emissive="#6F8CB5" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
        {/* the four candles, each toward its wall */}
        {WALLS.map((w) => {
          const [x, , z] = candleAt(w);
          return (
            <group key={w} position={[x, 0.52, z]}>
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.035, 0.04, 0.16, 12]} />
                <meshStandardMaterial color="#E9DDBF" roughness={0.7} />
              </mesh>
              <mesh ref={(m) => void (lit.current[w] = m)} position={[0, FLAME_Y - 0.52, 0]} visible={false}>
                <coneGeometry args={[0.03, 0.09, 10]} />
                <meshBasicMaterial color="#FFB347" />
              </mesh>
            </group>
          );
        })}
        {panel && (
          <group position={[0, PANEL_Y, 0]} rotation-y={Math.PI / 4}>
            <Html transform scale={PANEL_SCALE} zIndexRange={[20, 10]}>
              {panel}
            </Html>
          </group>
        )}
      </group>
    </>
  );
}
