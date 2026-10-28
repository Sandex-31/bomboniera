import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { DPR, Steady } from "./Steady";
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type PointLight,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import CameraRig from "./CameraRig";
import { glowTexture } from "./glow";
import Hotspot, { useTap } from "./Hotspot";
import Portal from "./Portal";
import { creditRoll, credits } from "../data/credits";
import { easterEggs } from "../data/easterEggs";
import { PORTAL_AT } from "../data/puzzle";
import { exams } from "../data/exams";
import { projects } from "../data/projects";
import { thesis } from "../data/thesis";
import { CREDITS_SCREEN, FLIGHT, FOCUS_VIEWS, ROOM_VIEW, type FocusId } from "./focus";
import type { CreditBlock, CreditGroup, SectionId } from "../types";

/* ----------------------------------------------------------------- palette
 * Warm charcoal shell, warm wood floor, everything lit by a few warm pools.
 * Change these six constants and the whole room changes mood.
 */
const GOLD = "#E3B04B";
const LAMP = "#FFB25E";
const WOOD = "#5A4130";
const WOOD_DARK = "#3E2C20";
const FLOOR_TOP = "#4A3627";
const FLOOR_SIDE = "#33241A";
const WALL = "#332E35";
const WALL_SIDE = "#2B262D";
const FABRIC = "#4E3A36";

/* ------------------------------------------------------- room dimensions --
 * The diorama is exactly half a cube: one square slab, two walls standing on
 * two of its edges. Every position below derives from these constants, so the
 * pieces meet flush instead of intersecting.
 *
 *   slab      6 x 6, top face at y = 0
 *   walls     outer faces flush with the slab sides, butt joint in the corner
 *   INNER     the inner face of both walls = where the usable floor starts
 */
const HALF = 3;
const WALL_T = 0.16;
const WALL_H = 3;
const SLAB_T = 0.22;
const INNER = -HALF + WALL_T; // -2.84

/** Doorway cut into the left wall (world z range, and its height). */
const DOOR_Z = 0.7;
const DOOR_W = 1.2;
const DOOR_H = 2.3;

export type Pick =
  | { kind: "section"; id: SectionId }
  | { kind: "egg"; id: string }
  | { kind: "portal" };

type Props = {
  reduced: boolean;
  /** Area the camera is flown into, or null for the wide room shot. */
  focus: FocusId | null;
  /** Item picked inside the focused area — a book, a project, a thesis step. */
  picked: string | null;
  onPick: (pick: Pick) => void;
  onPickItem: (id: string | null) => void;
  /** The way through is open: show the ring. Stays open once found. */
  portal: boolean;
  /** Taps landed on the can so far — how hard it is shaking. */
  charge: number;
};

type FocusProps = {
  focused: boolean;
  picked: string | null;
  onPickItem: (id: string | null) => void;
};

/**
 * Shared behaviour for anything you can pull out of a piece of furniture:
 * it slides toward the viewer when picked, nudges on hover, and only reacts
 * at all once the camera is actually in front of it.
 */
function useSlide(
  out: number,
  hoverOut: number,
  active: boolean,
  rest = 0,
  onTap: () => void = () => {},
  enabled = true,
) {
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const tap = useTap(onTap, enabled);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const goal = rest + (active ? out : hovered ? hoverOut : 0);
    g.position.z += (goal - g.position.z) * (1 - Math.pow(0.002, delta));
  });

  const handlers = {
    ...tap,
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      setHovered(false);
      document.body.style.cursor = "auto";
    },
  };

  return { ref, hovered, handlers };
}

/**
 * Anything in the room you can find. It is a secret hotspot that reports one
 * easter egg, so adding a findable object is one element and one data entry.
 */
type EggBus = { reduced: boolean; muted: boolean; onPick: (pick: Pick) => void };

/**
 * The name floating over an object is the one in the data file, never a copy
 * written here: rename an egg in easterEggs.ts and the room follows.
 */
const eggLabel = (id: string) => easterEggs.find((e) => e.id === id)?.label ?? id;

function Egg({
  position,
  id,
  height,
  hit,
  hitOffset,
  reduced,
  muted,
  onPick,
  children,
}: EggBus & {
  position: [number, number, number];
  id: string;
  height: number;
  /** Size of the invisible tap pad; every egg gets one, they are all small. */
  hit: [number, number, number];
  hitOffset?: [number, number, number];
  children: ReactNode;
}) {
  return (
    <Hotspot
      position={position}
      label={eggLabel(id)}
      labelHeight={height}
      secret
      muted={muted}
      hit={hit}
      hitOffset={hitOffset}
      reduced={reduced}
      onSelect={() => onPick({ kind: "egg", id })}
    >
      {children}
    </Hotspot>
  );
}

/** The small floating name that appears over a hovered or picked item. */
function ItemLabel({ position, label }: { position: [number, number, number]; label: string }) {
  return (
    <Html position={position} center zIndexRange={[4, 0]}>
      <div className="hotspot-label is-active hotspot-label--item">
        <span className="hotspot-label__text">{label}</span>
      </div>
    </Html>
  );
}

/* --------------------------------------------------------------- glow bits */

/** Camera-facing halo around a light source. */
function Glow({
  position,
  size = 1,
  color = LAMP,
  opacity = 0.45,
}: {
  position: [number, number, number];
  size?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <sprite position={position} scale={[size, size, size]}>
      <spriteMaterial
        map={glowTexture()}
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
}

/** A warm pool of light lying flat on the floor. */
function LightPool({
  position,
  radius = 1,
  color = LAMP,
  opacity = 0.3,
}: {
  position: [number, number, number];
  radius?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <mesh position={position} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial
        map={glowTexture()}
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ----------------------------------------------------------------- the cut */

function Shell() {
  const seams = useMemo(() => [-2.25, -1.5, -0.75, 0, 0.75, 1.5, 2.25], []);

  return (
    <group>
      {/* slab — the visible thickness is what makes it read as a cut block */}
      <mesh position={[0, -SLAB_T / 2, 0]}>
        <boxGeometry args={[HALF * 2, SLAB_T, HALF * 2]} />
        <meshStandardMaterial color={FLOOR_SIDE} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]}>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial color={FLOOR_TOP} roughness={0.85} />
      </mesh>
      {seams.map((z) => (
        <mesh key={z} position={[0, 0.004, z]}>
          <boxGeometry args={[HALF * 2, 0.005, 0.016]} />
          <meshStandardMaterial color={FLOOR_SIDE} roughness={1} />
        </mesh>
      ))}

      {/* back wall — shortened by one thickness so it butts into the left one */}
      <mesh position={[WALL_T / 2, WALL_H / 2, -HALF + WALL_T / 2]}>
        <boxGeometry args={[HALF * 2 - WALL_T, WALL_H, WALL_T]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* left wall — three segments around a real doorway, so nothing
          has to be faked and nothing intersects */}
      <LeftWall />

      {/* skirting, following the same joint */}
      <mesh position={[WALL_T / 2, 0.07, INNER + 0.022]}>
        <boxGeometry args={[HALF * 2 - WALL_T, 0.14, 0.04]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>
      <mesh position={[INNER + 0.022, 0.07, (-HALF + DOOR_Z - DOOR_W / 2) / 2]}>
        <boxGeometry args={[0.04, 0.14, HALF + DOOR_Z - DOOR_W / 2]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>
      <mesh position={[INNER + 0.022, 0.07, (HALF + DOOR_Z + DOOR_W / 2) / 2]}>
        <boxGeometry args={[0.04, 0.14, HALF - DOOR_Z - DOOR_W / 2]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>

      {/* rug */}
      <mesh rotation-x={-Math.PI / 2} position={[0.1, 0.008, 0.75]}>
        <planeGeometry args={[3.5, 2.5]} />
        <meshStandardMaterial color={FABRIC} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.1, 0.01, 0.75]}>
        <planeGeometry args={[3.1, 2.1]} />
        <meshStandardMaterial color="#5D4640" roughness={1} />
      </mesh>
    </group>
  );
}

/** Left wall in three pieces, leaving a real opening for the door. */
function LeftWall() {
  const x = -HALF + WALL_T / 2;
  const front = DOOR_Z - DOOR_W / 2; // z where the opening starts
  const back = DOOR_Z + DOOR_W / 2;

  return (
    <group>
      <mesh position={[x, WALL_H / 2, (-HALF + front) / 2]}>
        <boxGeometry args={[WALL_T, WALL_H, front + HALF]} />
        <meshStandardMaterial color={WALL_SIDE} roughness={0.95} />
      </mesh>
      <mesh position={[x, WALL_H / 2, (back + HALF) / 2]}>
        <boxGeometry args={[WALL_T, WALL_H, HALF - back]} />
        <meshStandardMaterial color={WALL_SIDE} roughness={0.95} />
      </mesh>
      {/* lintel over the opening */}
      <mesh position={[x, (DOOR_H + WALL_H) / 2, DOOR_Z]}>
        <boxGeometry args={[WALL_T, WALL_H - DOOR_H, DOOR_W]} />
        <meshStandardMaterial color={WALL_SIDE} roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ props */

/**
 * A run of RGB segments doing a slow rainbow wash. Deliberately dim: it should
 * tint the desk, not light the room. Static (but still rainbow) when the
 * visitor asked for reduced motion.
 */
function RgbStrip({
  count,
  from,
  to,
  y,
  z,
  size,
  reduced,
  intensity = 0.5,
  speed = 0.05,
}: {
  count: number;
  from: number;
  to: number;
  y: number;
  z: number;
  size: [number, number, number];
  reduced: boolean;
  intensity?: number;
  speed?: number;
}) {
  const group = useRef<Group>(null);
  const step = count > 1 ? (to - from) / (count - 1) : 0;

  useFrame((state) => {
    if (reduced || !group.current) return;
    const t = state.clock.elapsedTime * speed;
    group.current.children.forEach((child, i) => {
      const mat = (child as Mesh).material as MeshStandardMaterial;
      if (mat) mat.emissive.setHSL((t + i / count) % 1, 0.7, 0.5);
    });
  });

  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[from + i * step, y, z]}>
          <boxGeometry args={size} />
          <meshStandardMaterial
            color="#15171E"
            emissive={`hsl(${Math.round((i / count) * 360)}, 70%, 50%)`}
            emissiveIntensity={intensity}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Angled side display. Decorative — the main screen is the hotspot. */
function SecondMonitor() {
  return (
    <group position={[0.34, 0.825, -0.2]} rotation-y={-0.45}>
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.34, 0.03, 0.18]} />
        <meshStandardMaterial color="#333C48" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[0.06, 0.24, 0.06]} />
        <meshStandardMaterial color="#333C48" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.75, 0.46, 0.04]} />
        <meshStandardMaterial color="#262E38" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.5, 0.023]}>
        <planeGeometry args={[0.68, 0.39]} />
        <meshStandardMaterial
          color="#1B2A3A"
          emissive="#3E86A8"
          emissiveIntensity={0.55}
          roughness={1}
        />
      </mesh>
      <Glow position={[0, 0.5, 0.1]} size={1.1} color="#4F9ECB" opacity={0.14} />
    </group>
  );
}

/** Headset resting on the desk. */
function Headset() {
  return (
    <group position={[-1.15, 0.825, 0.3]} rotation-y={0.35}>
      <mesh position={[0, 0.06, 0]}>
        <torusGeometry args={[0.095, 0.016, 8, 18, Math.PI]} />
        <meshStandardMaterial color="#20262E" roughness={0.7} />
      </mesh>
      {[-0.095, 0.095].map((x) => (
        <group key={x} position={[x, 0.06, 0]}>
          <mesh rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.055, 0.055, 0.04, 16]} />
            <meshStandardMaterial color="#20262E" roughness={0.7} />
          </mesh>
          <mesh rotation-z={Math.PI / 2} position={[x > 0 ? 0.022 : -0.022, 0, 0]}>
            <torusGeometry args={[0.04, 0.006, 8, 18]} />
            <meshStandardMaterial
              color="#12161C"
              emissive="#4FBFD9"
              emissiveIntensity={0.5}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Controller resting on the desk, with its own little light bar. */
function Gamepad({ reduced }: { reduced: boolean }) {
  return (
    <group rotation-y={-0.25}>
      <mesh position={[0, 0.019, 0]}>
        <boxGeometry args={[0.15, 0.038, 0.085]} />
        <meshStandardMaterial color="#232830" roughness={0.6} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh
          key={sx}
          position={[sx * 0.085, 0.017, 0.028]}
          rotation-y={-sx * 0.45}
        >
          <boxGeometry args={[0.055, 0.034, 0.085]} />
          <meshStandardMaterial color="#232830" roughness={0.6} />
        </mesh>
      ))}

      {/* thumbsticks */}
      {[-0.042, 0.042].map((x) => (
        <mesh key={x} position={[x, 0.043, 0.012]}>
          <cylinderGeometry args={[0.016, 0.014, 0.014, 12]} />
          <meshStandardMaterial color="#14171C" roughness={0.75} />
        </mesh>
      ))}

      {/* face buttons + d-pad */}
      {[
        [0.062, -0.022],
        [0.086, -0.004],
        [0.062, 0.014],
        [0.038, -0.004],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.04, z]}>
          <cylinderGeometry args={[0.008, 0.008, 0.006, 8]} />
          <meshStandardMaterial color="#3E4654" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[-0.062, 0.04, -0.004]}>
        <boxGeometry args={[0.032, 0.006, 0.011]} />
        <meshStandardMaterial color="#14171C" roughness={0.75} />
      </mesh>
      <mesh position={[-0.062, 0.04, -0.004]}>
        <boxGeometry args={[0.011, 0.006, 0.032]} />
        <meshStandardMaterial color="#14171C" roughness={0.75} />
      </mesh>

      <RgbStrip
        count={3}
        from={-0.03}
        to={0.03}
        y={0.039}
        z={-0.042}
        size={[0.025, 0.006, 0.006]}
        intensity={0.6}
        speed={0.09}
        reduced={reduced}
      />
    </group>
  );
}

function Desk({ reduced, muted, onPick }: EggBus) {
  const legs: [number, number][] = [
    [-1.3, 0.5],
    [-1.3, -0.5],
  ];

  return (
    <group position={[-0.7, 0, -2.1]}>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[2.8, 0.09, 1.2]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]}>
          <boxGeometry args={[0.08, 0.74, 0.08]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
        </mesh>
      ))}

      {/* drawer unit carries the right-hand side of the top */}
      <mesh position={[1.0, 0.365, -0.1]}>
        <boxGeometry args={[0.66, 0.73, 0.9]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
      {[0.16, 0.44, 0.64].map((y) => (
        <mesh key={y} position={[1.0, y, 0.352]}>
          <boxGeometry args={[0.5, 0.018, 0.018]} />
          <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}

      {/* RGB strip tucked under the front edge */}
      <RgbStrip
        count={14}
        from={-1.28}
        to={1.28}
        y={0.72}
        z={0.58}
        size={[0.15, 0.018, 0.02]}
        intensity={0.45}
        reduced={reduced}
      />

      {/* keyboard: body, then a row of backlit zones */}
      <mesh position={[-0.5, 0.845, 0.3]} rotation-y={0.06}>
        <boxGeometry args={[0.8, 0.03, 0.28]} />
        <meshStandardMaterial color="#20262E" roughness={0.6} />
      </mesh>
      <RgbStrip
        count={9}
        from={-0.84}
        to={-0.16}
        y={0.863}
        z={0.3}
        size={[0.062, 0.008, 0.21]}
        intensity={0.55}
        speed={0.07}
        reduced={reduced}
      />

      <mesh position={[0.15, 0.832, 0.3]}>
        <boxGeometry args={[0.32, 0.006, 0.26]} />
        <meshStandardMaterial color="#2E3845" roughness={1} />
      </mesh>

      <SecondMonitor />
      <Headset />
      <Egg
        position={[0.5, 0.825, 0.34]}
        id="gamepad"
        height={0.2}
        hit={[0.26, 0.2, 0.26]}
        hitOffset={[0, 0.03, 0]}
        reduced={reduced}
        muted={muted}
        onPick={onPick}
      >
        <Gamepad reduced={reduced} />
      </Egg>

      {/* chair */}
      <group position={[-0.1, 0, 1.35]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.52, 0.09, 0.52]} />
          <meshStandardMaterial color={FABRIC} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.79, 0.24]} rotation-x={0.12}>
          <boxGeometry args={[0.5, 0.62, 0.08]} />
          <meshStandardMaterial color={FABRIC} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.45, 10]} />
          <meshStandardMaterial color="#2C3440" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 12]} />
          <meshStandardMaterial color="#2C3440" roughness={0.6} metalness={0.3} />
        </mesh>

        {/* turned to face the desk, which is at -z from the chair */}
        <Egg
          position={[0, 0, 0]}
          id="me"
          height={1.72}
          hit={[0.7, 1.5, 0.75]}
          hitOffset={[0, 0.75, 0]}
          reduced={reduced}
          muted={muted}
          onPick={onPick}
        >
          <group rotation-y={Math.PI}>
            <Me />
          </group>
        </Egg>
      </group>
    </group>
  );
}

/**
 * Architect desk lamp. Built from nested pivots — base → lower arm → elbow →
 * upper arm → head — so the joints actually meet instead of floating apart.
 * The head ends up pointing down and slightly forward, over the desk.
 */
function DeskLamp({ reduced }: { reduced: boolean }) {
  const light = useRef<PointLight>(null);

  const METAL = "#3B4552";
  const LOWER = 0.42;
  const UPPER = 0.3;

  useFrame((state) => {
    if (reduced || !light.current) return;
    const t = state.clock.elapsedTime;
    light.current.intensity = 9 + Math.sin(t * 1.4) * 0.5 + Math.sin(t * 3.3) * 0.25;
  });

  return (
    <group position={[0.4, 0.825, -2.45]}>
      {/* weighted base */}
      <mesh position={[0, 0.018, 0]}>
        <cylinderGeometry args={[0.14, 0.15, 0.036, 20]} />
        <meshStandardMaterial color="#2C3540" roughness={0.45} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.048, 0]}>
        <cylinderGeometry args={[0.045, 0.062, 0.028, 14]} />
        <meshStandardMaterial color={METAL} roughness={0.45} metalness={0.5} />
      </mesh>

      {/* lower arm, leaning out over the desk */}
      <group position={[0, 0.06, 0]} rotation-x={0.38}>
        <mesh position={[0, LOWER / 2, 0]}>
          <cylinderGeometry args={[0.016, 0.016, LOWER, 10]} />
          <meshStandardMaterial color={METAL} roughness={0.45} metalness={0.5} />
        </mesh>

        {/* elbow + upper arm, in the lower arm's frame */}
        <group position={[0, LOWER, 0]} rotation-x={0.62}>
          <mesh>
            <sphereGeometry args={[0.033, 12, 12]} />
            <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, UPPER / 2, 0]}>
            <cylinderGeometry args={[0.014, 0.014, UPPER, 10]} />
            <meshStandardMaterial color={METAL} roughness={0.45} metalness={0.5} />
          </mesh>

          {/* head: rotated back past vertical so the shade looks down */}
          <group position={[0, UPPER, 0]} rotation-x={-1.2}>
            <mesh>
              <sphereGeometry args={[0.027, 10, 10]} />
              <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.6} />
            </mesh>
            {/* cone: apex up, open mouth down — no rotation needed */}
            <mesh position={[0, -0.1, 0]}>
              <coneGeometry args={[0.15, 0.2, 20, 1, true]} />
              <meshStandardMaterial
                color="#414B59"
                emissive={LAMP}
                emissiveIntensity={0.35}
                roughness={0.55}
                metalness={0.35}
                side={DoubleSide}
              />
            </mesh>
            <mesh position={[0, -0.155, 0]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshStandardMaterial color="#FFE3B8" emissive={LAMP} emissiveIntensity={2.4} />
            </mesh>
            <pointLight
              ref={light}
              position={[0, -0.2, 0]}
              intensity={9}
              distance={4.2}
              color={LAMP}
            />
            <Glow position={[0, -0.16, 0]} size={1.1} opacity={0.5} />
          </group>
        </group>
      </group>
    </group>
  );
}

/** Fairy lights along the back wall — the cosiest few lines in the file. */
function StringLights({ reduced }: { reduced: boolean }) {
  const bulbs = useRef<Group>(null);
  const spots = useMemo(() => Array.from({ length: 9 }, (_, i) => -2.3 + i * 0.62), []);
  const sag = (x: number) => 2.5 + Math.cos((x / 2.4) * 1.5) * 0.12;

  useFrame((state) => {
    if (reduced || !bulbs.current) return;
    const t = state.clock.elapsedTime;
    bulbs.current.children.forEach((child, i) => {
      const mat = (child as Mesh).material as MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = 1.6 + Math.sin(t * 1.1 + i * 0.9) * 0.6;
    });
  });

  return (
    <group position={[0, 0, INNER + 0.06]}>
      <group ref={bulbs}>
        {spots.map((x) => (
          <mesh key={x} position={[x, sag(x), 0]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#FFE7BE" emissive="#FFC98A" emissiveIntensity={1.8} />
          </mesh>
        ))}
      </group>
      {spots.map((x) => (
        <Glow key={x} position={[x, sag(x), 0]} size={0.5} color="#FFC98A" opacity={0.38} />
      ))}
    </group>
  );
}

function BookStack() {
  const books: [number, string, number][] = [
    [0.0, "#5E4C70", 0.07],
    [0.075, "#42607C", 0.06],
    [0.14, "#7C5440", 0.055],
  ];

  return (
    <group position={[0.6, 0, 1.6]}>
      {books.map(([y, color, h], i) => (
        <mesh key={i} position={[0, y + h / 2, 0]} rotation-y={i * 0.16}>
          <boxGeometry args={[0.34, h, 0.26]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * White snowboard on brackets, filling the bare stretch of the left wall.
 * A capsule squashed on one axis: rounded nose and tail for free.
 */
function Snowboard() {
  return (
    <group rotation-x={0.05}>
      {[-0.46, 0.46].map((z) => (
        <mesh key={z} position={[-0.035, 0, z]}>
          <boxGeometry args={[0.05, 0.05, 0.06]} />
          <meshStandardMaterial color="#2A2F38" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      <mesh rotation-x={Math.PI / 2} scale={[0.19, 1, 1]}>
        <capsuleGeometry args={[0.15, 1.2, 6, 18]} />
        <meshStandardMaterial color="#EDEBE6" roughness={0.35} metalness={0.1} />
      </mesh>

      {/* graphic stripe */}
      <mesh position={[0.026, 0, 0]} rotation-x={Math.PI / 2} scale={[0.05, 1, 1]}>
        <capsuleGeometry args={[0.055, 1.18, 4, 14]} />
        <meshStandardMaterial color="#4FA8C9" roughness={0.5} />
      </mesh>

      {/* bindings */}
      {[-0.22, 0.24].map((z) => (
        <mesh key={z} position={[0.03, 0, z]}>
          <boxGeometry args={[0.03, 0.19, 0.15]} />
          <meshStandardMaterial color="#20242B" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** Folded bike parked in the corner. */
function FoldingBike() {
  const FRAME = "#2F6B62";

  return (
    <group rotation-y={0.5}>
      {/* the two wheels, tucked side by side as when folded */}
      {[-0.08, 0.09].map((z) => (
        <group key={z} position={[0, 0.18, z]} rotation-y={Math.PI / 2}>
          <mesh>
            <torusGeometry args={[0.17, 0.028, 8, 22]} />
            <meshStandardMaterial color="#1B1E24" roughness={0.85} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.05, 12]} />
            <meshStandardMaterial color="#8A8F98" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* folded frame + hinge */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.07, 0.36, 0.1]} />
        <meshStandardMaterial color={FRAME} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.24, 0.01]} rotation-z={0.5}>
        <boxGeometry args={[0.06, 0.28, 0.08]} />
        <meshStandardMaterial color={FRAME} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* seatpost + saddle */}
      <mesh position={[0, 0.66, -0.01]}>
        <cylinderGeometry args={[0.018, 0.018, 0.24, 10]} />
        <meshStandardMaterial color="#9AA0A8" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.79, -0.02]}>
        <boxGeometry args={[0.07, 0.04, 0.22]} />
        <meshStandardMaterial color="#1B1E24" roughness={0.8} />
      </mesh>

      {/* folded handlebar */}
      <mesh position={[0, 0.58, 0.12]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.016, 0.016, 0.3, 10]} />
        <meshStandardMaterial color="#9AA0A8" roughness={0.35} metalness={0.7} />
      </mesh>
    </group>
  );
}

/**
 * Kiteboard propped against its kite bag, dumped the way gear is after a
 * session. It stands up rather than lying flat because from this camera a
 * board on the floor is a grey rectangle — and half a tap target.
 */
function KiteGear() {
  const DECK = "#E8E2D6";
  const BAG = "#2B3A55";
  const STRAP = "#E2703A";

  return (
    <group rotation-y={0.7}>
      {/* the bag: what the board leans on */}
      <group position={[0, 0.28, 0]}>
        <mesh>
          <boxGeometry args={[0.34, 0.56, 0.24]} />
          <meshStandardMaterial color={BAG} roughness={0.9} />
        </mesh>
        {/* lid seam and grab handle */}
        <mesh position={[0, 0.17, 0]}>
          <boxGeometry args={[0.35, 0.035, 0.25]} />
          <meshStandardMaterial color={STRAP} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <torusGeometry args={[0.06, 0.014, 6, 10, Math.PI]} />
          <meshStandardMaterial color="#1B1E24" roughness={0.8} />
        </mesh>
        {/* shoulder straps, on the side turned away from the room */}
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, -0.04, -0.14]} rotation-x={0.06}>
            <boxGeometry args={[0.07, 0.42, 0.04]} />
            <meshStandardMaterial color={STRAP} roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* the board, tail on the floor and tip resting back on the bag */}
      <group position={[0, 0.64, 0.14]} rotation={[-0.2, 0, 0.28]}>
        <mesh scale={[1, 1, 0.09]}>
          <capsuleGeometry args={[0.21, 0.9, 6, 18]} />
          <meshStandardMaterial color={DECK} roughness={0.3} metalness={0.1} />
        </mesh>
        {/* graphic down the deck */}
        <mesh position={[0, 0, 0.021]} scale={[1, 1, 0.05]}>
          <capsuleGeometry args={[0.07, 0.86, 4, 12]} />
          <meshStandardMaterial color={STRAP} roughness={0.5} />
        </mesh>
        {/* footstraps and pads */}
        {[-0.3, 0.3].map((y) => (
          <mesh key={y} position={[0, y, 0.035]}>
            <boxGeometry args={[0.2, 0.1, 0.05]} />
            <meshStandardMaterial color="#20242B" roughness={0.85} />
          </mesh>
        ))}
        {/* two of the four fins, the ones this side shows */}
        {[-0.52, 0.52].map((y) => (
          <mesh key={y} position={[0.13, y, -0.045]}>
            <boxGeometry args={[0.03, 0.09, 0.06]} />
            <meshStandardMaterial color="#8A8F98" roughness={0.4} metalness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Basketball and volleyball, left where they were last dropped. */
function Basketball() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.125, 14, 12]} />
        <meshStandardMaterial color="#C1662C" roughness={0.9} />
      </mesh>
      {[0, Math.PI / 2].map((r, i) => (
        <mesh key={i} rotation-y={r} rotation-x={i ? 0.4 : 0}>
          <torusGeometry args={[0.1248, 0.004, 6, 24]} />
          <meshStandardMaterial color="#3A2014" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Volleyball() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.105, 14, 12]} />
        <meshStandardMaterial color="#EDEAE2" roughness={0.85} />
      </mesh>
      {[0.5, -0.7].map((r, i) => (
        <mesh key={i} rotation-y={r} rotation-z={i ? 0.6 : 0}>
          <torusGeometry args={[0.1048, 0.008, 6, 22]} />
          <meshStandardMaterial color="#2F6FA8" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Low-poly figure sitting on a small chair. Faceted on purpose — at this
 * polygon count it reads by silhouette and colour (dark hair with a fringe,
 * black top, choker), not by facial detail.
 * Seat top is at 0.445, so the hips sit at 0.50 and the feet reach the floor.
 */
function Figure() {
  const HAIR = "#2B1D18";
  const TOP = "#16171C";
  const SKIN = "#D8A386";
  const JEANS = "#1E2028";

  return (
    <group>
      {/* the chair */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.38, 0.05, 0.36]} />
        <meshStandardMaterial color={WOOD} roughness={0.75} />
      </mesh>
      {[-0.16, 0.16].map((x) =>
        [-0.15, 0.15].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.21, z]}>
            <boxGeometry args={[0.035, 0.42, 0.035]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.66, -0.17]}>
        <boxGeometry args={[0.38, 0.42, 0.035]} />
        <meshStandardMaterial color={WOOD} roughness={0.75} />
      </mesh>

      {/* thighs forward, shins down, feet on the floor */}
      {[-0.07, 0.07].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.505, 0.17]}>
            <boxGeometry args={[0.1, 0.12, 0.34]} />
            <meshStandardMaterial color={JEANS} roughness={0.9} />
          </mesh>
          <mesh position={[x, 0.22, 0.34]}>
            <boxGeometry args={[0.1, 0.44, 0.11]} />
            <meshStandardMaterial color={JEANS} roughness={0.9} />
          </mesh>
          <mesh position={[x, 0.028, 0.41]}>
            <boxGeometry args={[0.09, 0.055, 0.21]} />
            <meshStandardMaterial color="#14161A" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* torso + arms */}
      <mesh position={[0, 0.725, 0]}>
        <boxGeometry args={[0.27, 0.45, 0.16]} />
        <meshStandardMaterial color={TOP} roughness={0.85} />
      </mesh>
      {[-0.175, 0.175].map((x) => (
        <mesh key={x} position={[x, 0.7, 0.02]}>
          <boxGeometry args={[0.07, 0.4, 0.08]} />
          <meshStandardMaterial color={SKIN} roughness={0.75} />
        </mesh>
      ))}

      {/* neck + choker */}
      <mesh position={[0, 0.985, 0]}>
        <cylinderGeometry args={[0.042, 0.042, 0.09, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.995, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.048, 0.011, 6, 16]} />
        <meshStandardMaterial color="#111216" roughness={0.6} />
      </mesh>

      {/* head, faceted */}
      <mesh position={[0, 1.125, 0]}>
        <icosahedronGeometry args={[0.115, 0]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} flatShading />
      </mesh>

      {/* hair: back mass, length, fringe, face-framing strands */}
      <mesh position={[0, 1.115, -0.055]} scale={[1.08, 1.2, 1]}>
        <icosahedronGeometry args={[0.125, 0]} />
        <meshStandardMaterial color={HAIR} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.9, -0.1]}>
        <boxGeometry args={[0.21, 0.3, 0.09]} />
        <meshStandardMaterial color={HAIR} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.2, 0.068]} rotation-x={0.2}>
        <boxGeometry args={[0.2, 0.065, 0.07]} />
        <meshStandardMaterial color={HAIR} roughness={0.85} />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 1.055, 0.045]}>
          <boxGeometry args={[0.05, 0.3, 0.07]} />
          <meshStandardMaterial color={HAIR} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The graduate, mid-cheer, in the desk chair. Same low-poly language as
 * `Figure`, but sized for that chair: its seat top is at 0.495, so the hips
 * sit there and the shins still reach the floor. The arms hang off a shoulder
 * pivot, so the V opens without detaching from the torso.
 */
/**
 * Wavy hair, not curls: each strand is a squashed sphere stretched front-to-back,
 * laid over the cap. [x, y, z, radius, lengthwise stretch], relative to the head.
 */
const WAVES: [number, number, number, number, number][] = [
  [0, 0.082, 0.012, 0.052, 2.3],
  [-0.062, 0.072, 0.004, 0.046, 2.2],
  [0.062, 0.072, 0.004, 0.046, 2.2],
  [-0.104, 0.04, -0.012, 0.038, 2.0],
  [0.104, 0.04, -0.012, 0.038, 2.0],
  /* fringe, lifting off the forehead and a little off-centre */
  [-0.028, 0.094, 0.07, 0.042, 1.5],
  [0.042, 0.09, 0.066, 0.038, 1.4],
];

function Me() {
  const HAIR = "#22170F";
  const TEE = "#F2F0EA";
  const CARGO = "#DDD3BC";
  const CARGO_DARK = "#C6BBA2";
  const SKIN = "#E0AE86";
  const SKIN_DARK = "#B98561";
  const HEAD = 1.3;
  const SEAT = 0.495;

  return (
    <group>
      {/* cargo trousers: thigh on the seat, shin down, cuff over the shoe */}
      {[-0.085, 0.085].map((x) => (
        <group key={x}>
          <mesh position={[x, SEAT + 0.07, 0.19]}>
            <boxGeometry args={[0.13, 0.14, 0.38]} />
            <meshStandardMaterial color={CARGO} roughness={0.95} />
          </mesh>
          {/* side pocket */}
          <mesh position={[x * 1.85, SEAT + 0.055, 0.21]}>
            <boxGeometry args={[0.022, 0.11, 0.16]} />
            <meshStandardMaterial color={CARGO_DARK} roughness={1} />
          </mesh>
          <mesh position={[x, 0.25, 0.375]}>
            <boxGeometry args={[0.125, 0.48, 0.135]} />
            <meshStandardMaterial color={CARGO} roughness={0.95} />
          </mesh>
          <mesh position={[x, 0.085, 0.385]}>
            <boxGeometry args={[0.14, 0.06, 0.15]} />
            <meshStandardMaterial color={CARGO_DARK} roughness={1} />
          </mesh>
          {/* white sneaker on a gum sole */}
          <mesh position={[x, 0.058, 0.45]}>
            <boxGeometry args={[0.115, 0.07, 0.24]} />
            <meshStandardMaterial color="#EDEAE3" roughness={0.6} />
          </mesh>
          <mesh position={[x, 0.018, 0.455]}>
            <boxGeometry args={[0.122, 0.036, 0.26]} />
            <meshStandardMaterial color="#C8BDA8" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* white tee: body, hem, collar */}
      <mesh position={[0, 0.855, 0]}>
        <boxGeometry args={[0.35, 0.46, 0.21]} />
        <meshStandardMaterial color={TEE} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.642, 0]}>
        <boxGeometry args={[0.365, 0.05, 0.225]} />
        <meshStandardMaterial color={TEE} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.088, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.07, 0.022, 8, 20]} />
        <meshStandardMaterial color={TEE} roughness={0.9} />
      </mesh>

      {/* arms up in a V — shoulder pivot, then an elbow so they bend */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.185, 1.03, 0]} rotation-z={-s * 0.38}>
          <mesh position={[0, 0.055, 0]}>
            <boxGeometry args={[0.12, 0.18, 0.195]} />
            <meshStandardMaterial color={TEE} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.21, 0]}>
            <boxGeometry args={[0.085, 0.28, 0.095]} />
            <meshStandardMaterial color={SKIN} roughness={0.75} />
          </mesh>
          <group position={[0, 0.34, 0]} rotation-z={s * 0.22}>
            <mesh position={[0, 0.16, 0]}>
              <boxGeometry args={[0.075, 0.32, 0.085]} />
              <meshStandardMaterial color={SKIN} roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.36, 0]}>
              <icosahedronGeometry args={[0.062, 1]} />
              <meshStandardMaterial color={SKIN} roughness={0.7} flatShading />
            </mesh>
          </group>
        </group>
      ))}

      {/* neck + head */}
      <mesh position={[0, 1.13, 0]}>
        <cylinderGeometry args={[0.05, 0.052, 0.11, 12]} />
        <meshStandardMaterial color={SKIN_DARK} roughness={0.8} />
      </mesh>
      <mesh position={[0, HEAD, 0]} scale={[1, 1.08, 0.98]}>
        <sphereGeometry args={[0.128, 18, 14]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      {/* stubble: follows the jaw instead of sitting on it as a block */}
      <mesh position={[0, HEAD - 0.058, 0.008]} scale={[1, 0.62, 1]}>
        <sphereGeometry args={[0.124, 16, 12]} />
        <meshStandardMaterial color={SKIN_DARK} roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.126, HEAD - 0.005, -0.005]} scale={[0.5, 1, 0.8]}>
          <sphereGeometry args={[0.036, 10, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.75} />
        </mesh>
      ))}

      {/* face */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.05, HEAD + 0.032, 0.112]}>
            <boxGeometry args={[0.055, 0.016, 0.025]} />
            <meshStandardMaterial color={HAIR} roughness={1} />
          </mesh>
          <mesh position={[s * 0.05, HEAD - 0.003, 0.108]}>
            <icosahedronGeometry args={[0.022, 1]} />
            <meshStandardMaterial color="#26201C" roughness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, HEAD - 0.025, 0.125]}>
        <boxGeometry args={[0.04, 0.062, 0.05]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      <mesh position={[0, HEAD - 0.082, 0.115]}>
        <boxGeometry args={[0.058, 0.014, 0.025]} />
        <meshStandardMaterial color="#9C5F51" roughness={0.8} />
      </mesh>

      {/* hair: a cap that stops above the ears, plus strands swept back */}
      <mesh position={[0, HEAD + 0.004, -0.008]} scale={[1.03, 1.06, 1.06]}>
        <sphereGeometry args={[0.132, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color={HAIR} roughness={0.9} />
      </mesh>
      {WAVES.map(([x, y, z, r, long], i) => (
        <mesh key={i} position={[x, HEAD + y, z]} scale={[1, 0.55, long]}>
          <sphereGeometry args={[r, 12, 8]} />
          <meshStandardMaterial color={HAIR} roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
}

/* --------------------------------------------------------- hotspot bodies */

function Monitor({ focused, picked, onPickItem }: FocusProps) {
  const codeLines = [0.22, 0.12, 0.02, -0.08, -0.18];

  return (
    <group>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.52, 0.035, 0.24]} />
        <meshStandardMaterial color="#333C48" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.09, 0.34, 0.09]} />
        <meshStandardMaterial color="#333C48" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.25, 0.76, 0.06]} />
        <meshStandardMaterial color="#262E38" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.72, 0.034]}>
        <planeGeometry args={[1.15, 0.66]} />
        <meshStandardMaterial
          color="#16303F"
          emissive="#3E86A8"
          emissiveIntensity={0.9}
          roughness={1}
        />
      </mesh>
      {/* idle: fake code. focused: the real project list, one row each. */}
      {focused
        ? projects.map((p, i) => (
            <ProjectRow
              key={p.id}
              project={p}
              y={0.72 + ((projects.length - 1) / 2 - i) * ROW_STEP}
              picked={picked}
              focused
              onPickItem={onPickItem}
            />
          ))
        : codeLines.map((y, i) => (
            <mesh key={i} position={[-0.3 + (i % 2) * 0.12, 0.72 + y, 0.036]}>
              <planeGeometry args={[0.36 - (i % 3) * 0.1, 0.026]} />
              <meshBasicMaterial color={i === 2 ? GOLD : "#8FD3E8"} transparent opacity={0.75} />
            </mesh>
          ))}
      <Glow position={[0, 0.72, 0.12]} size={1.7} color="#4F9ECB" opacity={0.2} />
    </group>
  );
}

/** Row pitch, then height, sized so the whole list, gaps included, always fits the 0.66-high screen. */
const ROW_STEP = Math.min(0.14, 0.62 / Math.max(projects.length, 1));
const ROW_H = ROW_STEP * 0.75;

/** One project, shown as a selectable line on the monitor. */
function ProjectRow({
  project,
  y,
  picked,
  onPickItem,
}: { project: (typeof projects)[number]; y: number } & FocusProps) {
  const active = picked === project.id;
  const { ref, hovered, handlers } = useSlide(0.035, 0.012, active, 0.037, () =>
    onPickItem(active ? null : project.id),
  );

  return (
    <group ref={ref} position={[0, y, 0.037]}>
      <mesh {...handlers}>
        <planeGeometry args={[1.02, ROW_H]} />
        <meshBasicMaterial
          color={active ? GOLD : hovered ? "#8FD3E8" : "#0E2634"}
          transparent
          opacity={active ? 0.85 : hovered ? 0.55 : 0.75}
        />
      </mesh>
      {/* leading marker, so a row still reads as a row when it is not lit */}
      <mesh position={[-0.44, 0, 0.002]}>
        <planeGeometry args={[0.05, ROW_H * 0.45]} />
        <meshBasicMaterial color={active ? "#0E2634" : GOLD} transparent opacity={0.9} />
      </mesh>

      {(hovered || active) && <ItemLabel position={[0, ROW_H * 0.9, 0.06]} label={project.title} />}
    </group>
  );
}

/* -------------------------------------------------------------- bookshelf --
 * The whole case is derived from these numbers, so it absorbs new exams
 * instead of overflowing into the collection: the exams own the two lower
 * levels and spread themselves over the full width, the collection owns the
 * two above, and the carcass is exactly as tall as its levels need.
 */
const CASE_W = 1.7;
const CASE_SIDE = 0.07;
const CASE_D = 0.44;
const BOARD_T = 0.045;
/** Usable width between the two side panels. */
const CASE_INNER = CASE_W - 2 * CASE_SIDE;
/** Air above each level, bottom first. Two for the exams, two for the rest. */
const SHELF_GAPS = [0.58, 0.58, 0.5, 0.36];
const BOOK_SHELVES = 2;
/** Top face of every level: the carcass floor, then one board per level. */
const SHELF_TOPS = SHELF_GAPS.map((_, i) =>
  SHELF_GAPS.slice(0, i).reduce((y, gap) => y + gap + BOARD_T, 0.05),
);
/** Underside of the lid, and the carcass box that has to reach it. */
const CASE_TOP = SHELF_TOPS[SHELF_TOPS.length - 1] + SHELF_GAPS[SHELF_GAPS.length - 1];
const CASE_H = CASE_TOP + 0.07;
const CASE_CY = CASE_H / 2 - 0.01;

/** One book per exam — the shelf grows with src/data/exams.ts. */
function Bookshelf({ focused, picked, onPickItem, reduced, onPick }: FocusProps & Omit<EggBus, "muted">) {
  const books = useMemo<BookData[]>(() => {
    const perShelf = Math.max(1, Math.ceil(exams.length / BOOK_SHELVES));
    // the row gives back width rather than running past the side panel, and
    // the spines thin out with it, so twenty-two books still read as books
    const step = Math.min(0.14, (CASE_INNER - 0.08) / perShelf);
    const width = Math.min(0.1, step - 0.025);
    const first = -((perShelf - 1) * step) / 2;
    const palette = ["#42607C", "#7C5440", "#4C6B55", "#5E4C70"];

    // by year, so the two shelves read as a timeline instead of file order
    return [...exams]
      .sort((a, b) => a.year - b.year)
      .map((exam, i) => {
        const shelf = Math.min(Math.floor(i / perShelf), BOOK_SHELVES - 1);
        const height = 0.3 + ((exam.cfu % 5) + 1) * 0.03;
        return {
          id: exam.id,
          name: exam.name,
          x: first + (i % perShelf) * step,
          y: SHELF_TOPS[shelf] + height / 2,
          width,
          height,
          color:
            exam.grade !== undefined && exam.grade >= 30
              ? GOLD
              : palette[(exam.year + i) % palette.length],
        };
      });
  }, []);

  return (
    <group>
      {/* open carcass: back panel + sides + top/bottom, so the books show */}
      <mesh position={[0, CASE_CY, -0.19]}>
        <boxGeometry args={[CASE_W, CASE_H, 0.06]} />
        <meshStandardMaterial color="#2B2530" roughness={1} />
      </mesh>
      {[-(CASE_W - CASE_SIDE) / 2, (CASE_W - CASE_SIDE) / 2].map((x) => (
        <mesh key={x} position={[x, CASE_CY, 0]}>
          <boxGeometry args={[CASE_SIDE, CASE_H, CASE_D]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}
      {[0.02, CASE_TOP + 0.03].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[CASE_W, 0.06, CASE_D]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}
      {SHELF_TOPS.slice(1).map((y) => (
        <mesh key={y} position={[0, y - BOARD_T / 2, 0]}>
          <boxGeometry args={[CASE_INNER, BOARD_T, CASE_D - 0.02]} />
          <meshStandardMaterial color={WOOD} roughness={0.8} />
        </mesh>
      ))}
      {books.map((b) => (
        <Book key={b.id} book={b} focused={focused} picked={picked} onPickItem={onPickItem} />
      ))}

      <Collectibles focused={focused} reduced={reduced} onPick={onPick} />

      {/* a reading light, only while you are standing in front of it */}
      {focused && (
        <pointLight position={[0, 1.3, 1.3]} intensity={7} distance={4} color="#FFE2B0" />
      )}
    </group>
  );
}

type BookData = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

/** One exam. Slides out of the shelf when you pick it, like pulling a book. */
function Book({
  book,
  focused,
  picked,
  onPickItem,
}: { book: BookData } & FocusProps) {
  const active = picked === book.id;
  const { ref, hovered, handlers } = useSlide(
    0.26,
    0.07,
    active,
    0.02,
    () => onPickItem(active ? null : book.id),
    focused,
  );

  return (
    <group ref={ref} position={[book.x, book.y, 0.02]}>
      <mesh {...(focused ? handlers : {})}>
        <boxGeometry args={[book.width, book.height, 0.26]} />
        <meshStandardMaterial
          color={book.color}
          roughness={0.85}
          emissive={book.color}
          emissiveIntensity={active ? 0.4 : hovered ? 0.2 : 0}
        />
      </mesh>
      {/* band on the spine, so the shelf does not read as plain bars */}
      <mesh position={[0, book.height * 0.26, 0.131]}>
        <planeGeometry args={[book.width * 0.7, 0.016]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.45} />
      </mesh>

      {focused && (hovered || active) && (
        <ItemLabel position={[0, book.height / 2 + 0.11, 0.16]} label={book.name} />
      )}
    </group>
  );
}

/* ------------------------------------------------------- shelf collection --
 * The half of the bookshelf the exams do not fill. Every piece is built from
 * the one feature that makes it recognisable at this size — the oversized
 * square head, the two-tone sphere, the pauldrons — and nothing else.
 */

type FunkoHair = "spiky" | "swoop" | "flat";

function Funko({
  position,
  body,
  hair,
  style = "spiky",
  skin = "#E8D5C4",
}: {
  position: [number, number, number];
  body: string;
  hair: string;
  style?: FunkoHair;
  skin?: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.07, 0.03, 0.05]} />
        <meshStandardMaterial color="#2A2530" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.075, 0]}>
        <boxGeometry args={[0.065, 0.09, 0.045]} />
        <meshStandardMaterial color={body} roughness={0.85} />
      </mesh>
      {[-0.045, 0.045].map((x) => (
        <mesh key={x} position={[x, 0.075, 0]}>
          <boxGeometry args={[0.022, 0.075, 0.04]} />
          <meshStandardMaterial color={body} roughness={0.85} />
        </mesh>
      ))}

      {/* the oversized square head is the whole silhouette */}
      <mesh position={[0, 0.175, 0]}>
        <boxGeometry args={[0.105, 0.1, 0.09]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* two black dots, which is all the face a Pop ever has */}
      {[-0.026, 0.026].map((x) => (
        <mesh key={x} position={[x, 0.182, 0.046]}>
          <boxGeometry args={[0.016, 0.021, 0.004]} />
          <meshStandardMaterial color="#14131A" roughness={0.5} />
        </mesh>
      ))}

      {style === "spiky" &&
        [-0.035, -0.012, 0.012, 0.035].map((x, i) => (
          <mesh key={x} position={[x, 0.238, -0.018]} rotation-x={-0.5 + i * 0.12}>
            <coneGeometry args={[0.019, 0.075, 4]} />
            <meshStandardMaterial color={hair} roughness={0.9} flatShading />
          </mesh>
        ))}
      {style === "swoop" && (
        <>
          <mesh position={[0, 0.232, -0.004]}>
            <boxGeometry args={[0.108, 0.03, 0.094]} />
            <meshStandardMaterial color={hair} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.255, -0.03]} rotation-x={0.35}>
            <boxGeometry args={[0.1, 0.055, 0.05]} />
            <meshStandardMaterial color={hair} roughness={0.9} />
          </mesh>
        </>
      )}
      {style === "flat" && (
        <mesh position={[0, 0.232, -0.006]}>
          <boxGeometry args={[0.108, 0.032, 0.09]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

/** A Pop still in its carton: cardboard, header band, dark recess, figure. */
function BoxedFunko({
  position,
  body,
  hair,
  card = "#C6B296",
}: {
  position: [number, number, number];
  body: string;
  hair: string;
  card?: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.135, -0.035]}>
        <boxGeometry args={[0.145, 0.27, 0.085]} />
        <meshStandardMaterial color={card} roughness={1} />
      </mesh>
      <mesh position={[0, 0.245, 0.009]}>
        <planeGeometry args={[0.135, 0.042]} />
        <meshBasicMaterial color="#EDE9E0" />
      </mesh>
      <mesh position={[0, 0.115, 0.008]}>
        <planeGeometry args={[0.112, 0.19]} />
        <meshBasicMaterial color="#12121A" />
      </mesh>
      <group position={[0, 0.02, 0.018]} scale={0.78}>
        <Funko position={[0, 0, 0]} body={body} hair={hair} style="flat" />
      </group>
    </group>
  );
}

/** Red over white, split by a black band: readable at any size. */
function PokeBall({ position }: { position: [number, number, number] }) {
  const R = 0.075;
  return (
    <group position={[position[0], position[1] + R, position[2]]}>
      <mesh>
        <sphereGeometry args={[R, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#CB3B37" roughness={0.35} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R, 18, 10, Math.PI / 2, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#EDEAE3" roughness={0.4} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[R * 1.012, R * 1.012, 0.013, 22]} />
        <meshStandardMaterial color="#1A1A1F" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, R * 0.95]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.019, 0.019, 0.012, 14]} />
        <meshStandardMaterial color="#EDEAE3" roughness={0.4} />
      </mesh>
    </group>
  );
}

/**
 * Dark armoured knight on a round base. Built as a real suit rather than a
 * stack of blocks: sabatons, greaves, a plate skirt, a cuirass, layered
 * pauldrons, gauntlets, a beaked helm and a cloak — each piece sized so the
 * silhouette still reads once it is 10 cm tall on a shelf.
 */
function KnightStatue({ position }: { position: [number, number, number] }) {
  const ARMOR = "#3D3E47";
  const TRIM = "#585A65";
  const DARK = "#23232A";
  const CLOTH = "#1D1A21";
  const plate = { roughness: 0.4, metalness: 0.62 };

  return (
    <group position={position}>
      {/* base: slab plus a turned rim, the way a display statue is mounted */}
      <mesh position={[0, 0.013, 0]}>
        <cylinderGeometry args={[0.098, 0.104, 0.026, 22]} />
        <meshStandardMaterial color="#17171C" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.031, 0]}>
        <cylinderGeometry args={[0.086, 0.09, 0.01, 22]} />
        <meshStandardMaterial color="#2A2A31" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* legs: sabatons, greaves, knee cops */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.026, 0, 0]}>
          <mesh position={[0, 0.046, 0.012]}>
            <boxGeometry args={[0.031, 0.022, 0.058]} />
            <meshStandardMaterial color={DARK} {...plate} />
          </mesh>
          <mesh position={[0, 0.082, 0]}>
            <boxGeometry args={[0.029, 0.052, 0.032]} />
            <meshStandardMaterial color={ARMOR} {...plate} />
          </mesh>
          <mesh position={[0, 0.105, 0.014]}>
            <boxGeometry args={[0.031, 0.02, 0.016]} />
            <meshStandardMaterial color={TRIM} {...plate} />
          </mesh>
        </group>
      ))}

      {/* plate skirt: two overlapping lames over a tapered fauld */}
      <mesh position={[0, 0.132, 0]}>
        <cylinderGeometry args={[0.043, 0.064, 0.055, 12]} />
        <meshStandardMaterial color={ARMOR} {...plate} />
      </mesh>
      <mesh position={[0, 0.112, 0]}>
        <cylinderGeometry args={[0.062, 0.068, 0.012, 12]} />
        <meshStandardMaterial color={TRIM} {...plate} />
      </mesh>
      <mesh position={[0, 0.162, 0]}>
        <cylinderGeometry args={[0.04, 0.046, 0.011, 12]} />
        <meshStandardMaterial color={TRIM} {...plate} />
      </mesh>

      {/* cuirass, tapered to the waist, with a raised breastplate ridge */}
      <mesh position={[0, 0.198, 0]}>
        <boxGeometry args={[0.066, 0.072, 0.05]} />
        <meshStandardMaterial color={ARMOR} {...plate} />
      </mesh>
      <mesh position={[0, 0.2, 0.026]}>
        <boxGeometry args={[0.016, 0.062, 0.014]} />
        <meshStandardMaterial color={TRIM} {...plate} />
      </mesh>

      {/* arms: layered pauldron, upper arm, gauntlet */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.058, 0.228, 0]} rotation-z={-s * 0.42}>
            <boxGeometry args={[0.05, 0.03, 0.058]} />
            <meshStandardMaterial color={ARMOR} {...plate} />
          </mesh>
          <mesh position={[s * 0.062, 0.207, 0]} rotation-z={-s * 0.5}>
            <boxGeometry args={[0.044, 0.022, 0.052]} />
            <meshStandardMaterial color={TRIM} {...plate} />
          </mesh>
          <mesh position={[s * 0.054, 0.175, 0]}>
            <boxGeometry args={[0.025, 0.05, 0.03]} />
            <meshStandardMaterial color={DARK} {...plate} />
          </mesh>
          <mesh position={[s * 0.058, 0.14, 0.006]}>
            <boxGeometry args={[0.028, 0.038, 0.032]} />
            <meshStandardMaterial color={ARMOR} {...plate} />
          </mesh>
        </group>
      ))}

      {/* gorget and beaked helm */}
      <mesh position={[0, 0.241, 0]}>
        <cylinderGeometry args={[0.025, 0.029, 0.015, 12]} />
        <meshStandardMaterial color={TRIM} {...plate} />
      </mesh>
      <mesh position={[0, 0.266, 0]}>
        <boxGeometry args={[0.038, 0.042, 0.04]} />
        <meshStandardMaterial color={ARMOR} {...plate} />
      </mesh>
      <mesh position={[0, 0.262, 0.028]} rotation-x={Math.PI / 2 + 0.18}>
        <coneGeometry args={[0.018, 0.042, 6]} />
        <meshStandardMaterial color={DARK} {...plate} flatShading />
      </mesh>
      {/* the visor slit is the only thing that is not metal */}
      <mesh position={[0, 0.272, 0.0205]}>
        <planeGeometry args={[0.03, 0.007]} />
        <meshBasicMaterial color="#0A0A0E" />
      </mesh>
      <mesh position={[0, 0.308, -0.008]} rotation-x={-0.24}>
        <coneGeometry args={[0.021, 0.07, 6]} />
        <meshStandardMaterial color={DARK} {...plate} flatShading />
      </mesh>

      {/* cloak, flaring as it falls */}
      <mesh position={[0, 0.2, -0.035]} rotation-x={0.1}>
        <boxGeometry args={[0.086, 0.11, 0.012]} />
        <meshStandardMaterial color={CLOTH} roughness={1} />
      </mesh>
      <mesh position={[0, 0.115, -0.045]} rotation-x={0.16}>
        <cylinderGeometry args={[0.05, 0.078, 0.11, 8, 1, true]} />
        <meshStandardMaterial color={CLOTH} roughness={1} side={DoubleSide} />
      </mesh>

      {/* greatsword resting point-down beside the leg */}
      <group position={[0.082, 0, 0.03]} rotation-z={0.08}>
        <mesh position={[0, 0.038, 0]} rotation-x={Math.PI}>
          <coneGeometry args={[0.009, 0.05, 4]} />
          <meshStandardMaterial color="#787B84" roughness={0.28} metalness={0.82} />
        </mesh>
        <mesh position={[0, 0.145, 0]}>
          <boxGeometry args={[0.018, 0.17, 0.006]} />
          <meshStandardMaterial color="#70737B" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.234, 0]}>
          <boxGeometry args={[0.052, 0.012, 0.014]} />
          <meshStandardMaterial color={DARK} {...plate} />
        </mesh>
        <mesh position={[0, 0.256, 0]}>
          <boxGeometry args={[0.013, 0.034, 0.013]} />
          <meshStandardMaterial color={CLOTH} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.278, 0]}>
          <sphereGeometry args={[0.011, 10, 8]} />
          <meshStandardMaterial color={TRIM} {...plate} />
        </mesh>
      </group>
    </group>
  );
}

/** TODO: the name printed on the boxed set on the middle shelf. */
const BOX_TITLE = "Cofanetto";

/**
 * Gold lettering drawn straight onto a canvas at runtime. Real text geometry
 * would mean shipping a font; a flat plane with a drawn label costs nothing
 * and stays readable once the camera is up against the shelf.
 */
function titleTexture(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = GOLD;
    ctx.font = "600 58px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.toUpperCase(), 256, 68);
  }
  return new CanvasTexture(canvas);
}

/** A boxed set standing on its end: plain slipcase, one line of gold. */
function Slipcase({ position, title }: { position: [number, number, number]; title: string }) {
  const label = useMemo(() => titleTexture(title), [title]);
  useEffect(() => () => label.dispose(), [label]);

  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.13, 0.3, 0.2]} />
        <meshStandardMaterial color="#5A2233" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.17, 0.101]}>
        <planeGeometry args={[0.108, 0.027]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
    </group>
  );
}

const MANGA = ["#8E2C2C", "#1E2A44", "#2B2B33", "#6E3050", "#2F4A3C", "#7A4326"];

/** Volumes lying flat, the way a run of manga ends up once the row is full. */
function MangaStack({
  position,
  count,
  width = 0.2,
}: {
  position: [number, number, number];
  count: number;
  width?: number;
}) {
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[i % 2 ? 0.006 : -0.005, 0.011 + i * 0.023, 0]}>
          <mesh>
            <boxGeometry args={[width, 0.022, 0.14]} />
            <meshStandardMaterial color="#E4E0D6" roughness={1} />
          </mesh>
          <mesh position={[0, 0, 0.0706]}>
            <planeGeometry args={[width, 0.022]} />
            <meshBasicMaterial color={MANGA[i % MANGA.length]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A run of one series standing up: thin, identical, one bright spine each. */
function MangaRow({
  position,
  count,
  color,
}: {
  position: [number, number, number];
  count: number;
  color: string;
}) {
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[i * 0.023, 0.085, 0]}>
          <mesh>
            <boxGeometry args={[0.021, 0.17, 0.125]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.062, 0.0631]}>
            <planeGeometry args={[0.017, 0.028]} />
            <meshBasicMaterial color="#E9E4D8" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The Pops, as data: each one is an easter egg id plus the colours to build it. */
const POPS: {
  id: string;
  x: number;
  body: string;
  hair: string;
  style?: FunkoHair;
  boxed?: boolean;
  card?: string;
}[] = [
  { id: "funko-verde", x: -0.65, body: "#4C7A4E", hair: "#191721", style: "spiky" },
  { id: "funko-viola", x: -0.42, body: "#2C2733", hair: "#5B3552", style: "flat" },
  { id: "funko-scienziato", x: -0.19, body: "#DCE1E6", hair: "#A9D9E9", style: "swoop" },
  { id: "funko-scatola-a", x: 0.1, body: "#8E3B3B", hair: "#E7E3D8", boxed: true },
  { id: "funko-scatola-b", x: 0.4, body: "#33526E", hair: "#1C1A22", boxed: true, card: "#B8A78E" },
];

/**
 * Everything that is not an exam, laid out on the free half of each shelf.
 * The pieces only answer to a tap once the camera is in the close-up — at
 * room zoom a Pop is a few pixels wide and would just steal the shelf's tap.
 */
function Collectibles({ focused, reduced, onPick }: Omit<EggBus, "muted"> & { focused: boolean }) {
  // the two upper levels: the display shelf, then the Pops along the lid
  const [, , display, top] = SHELF_TOPS;
  const egg = { reduced, muted: !focused, onPick };

  return (
    <group>
      {/* top shelf: the Pops, two of them still boxed */}
      {POPS.map((p) => (
        <Egg
          key={p.id}
          position={[p.x, top, 0]}
          id={p.id}
          height={p.boxed ? 0.33 : 0.31}
          hit={p.boxed ? [0.2, 0.32, 0.22] : [0.2, 0.32, 0.18]}
          hitOffset={[0, 0.16, 0]}
          {...egg}
        >
          {p.boxed ? (
            <BoxedFunko position={[0, 0, 0]} body={p.body} hair={p.hair} card={p.card} />
          ) : (
            <Funko position={[0, 0, 0]} body={p.body} hair={p.hair} style={p.style} />
          )}
        </Egg>
      ))}
      <mesh position={[0.62, top + 0.028, 0.03]}>
        <sphereGeometry args={[0.028, 12, 10]} />
        <meshStandardMaterial color="#C4642A" roughness={0.85} />
      </mesh>

      {/* the display shelf, left to right: the stacks, the run, the statue,
          the short run, the slipcase. Laid out by footprint, not by eye —
          together they are 1.14 wide inside 1.56 of shelf. */}
      <MangaStack position={[-0.66, display, 0]} count={7} width={0.17} />
      <MangaStack position={[-0.45, display, 0]} count={5} width={0.19} />
      <PokeBall position={[-0.27, display, 0]} />
      <MangaRow position={[-0.16, display, 0]} count={8} color="#1B1B22" />
      <Egg position={[0.2, display, 0]} id="cavaliere" height={0.42} hit={[0.3, 0.42, 0.3]} hitOffset={[0, 0.2, 0]} {...egg}>
        <KnightStatue position={[0, 0, 0]} />
      </Egg>
      <MangaRow position={[0.38, display, 0]} count={3} color="#8E2C2C" />
      <Slipcase position={[0.56, display, -0.01]} title={BOX_TITLE} />
    </group>
  );
}

function ThesisPiece({
  reduced,
  focused,
  picked,
  onPickItem,
}: { reduced: boolean } & FocusProps) {
  const scroll = useRef<Group>(null);

  useFrame((state) => {
    // the scroll settles once you are close enough to read the timeline
    if (reduced || !scroll.current || focused) return;
    const t = state.clock.elapsedTime;
    scroll.current.position.y = 1.06 + Math.sin(t * 0.9) * 0.045;
    scroll.current.rotation.y = Math.sin(t * 0.35) * 0.4;
  });

  return (
    <group>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.36, 0.42, 0.72, 20]} />
        <meshStandardMaterial color="#3A3440" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.05, 20]} />
        <meshStandardMaterial color="#463F4E" roughness={0.6} />
      </mesh>
      <group ref={scroll} position={[0, 1.06, 0]}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.11, 0.11, 0.58, 16]} />
          <meshStandardMaterial color="#EFE6D2" roughness={0.9} />
        </mesh>
        <mesh rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.12, 0.022, 8, 20]} />
          <meshStandardMaterial
            color={GOLD}
            emissive={GOLD}
            emissiveIntensity={0.45}
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
      </group>
      <Glow position={[0, 1.1, 0]} size={1.6} color={GOLD} opacity={0.3} />

      {/* the five steps, stacked into a timeline you can pick apart */}
      {focused &&
        thesis.steps.map((step, i) => (
          <ThesisStepPlate
            key={step.label}
            step={step}
            index={i}
            picked={picked}
            focused
            onPickItem={onPickItem}
          />
        ))}
    </group>
  );
}

/** One step of the thesis, floating over the pedestal. */
function ThesisStepPlate({
  step,
  index,
  picked,
  onPickItem,
}: { step: (typeof thesis.steps)[number]; index: number } & FocusProps) {
  const id = `step-${index}`;
  const active = picked === id;
  const { ref, hovered, handlers } = useSlide(0.22, 0.06, active, 0, () =>
    onPickItem(active ? null : id),
  );

  return (
    <group ref={ref} position={[index % 2 ? 0.07 : -0.07, 1.32 + index * 0.25, 0]}>
      <mesh {...handlers}>
        <boxGeometry args={[0.58, 0.05, 0.3]} />
        <meshStandardMaterial
          color="#EFE6D2"
          roughness={0.85}
          emissive={GOLD}
          emissiveIntensity={active ? 0.5 : hovered ? 0.25 : 0.06}
        />
      </mesh>
      {/* numbered edge, so the order of the timeline is readable */}
      <mesh position={[-0.29 + 0.03, 0, 0.151]}>
        <planeGeometry args={[0.05, 0.03]} />
        <meshBasicMaterial color={GOLD} />
      </mesh>

      {(hovered || active) && <ItemLabel position={[0, 0.12, 0.18]} label={step.label} />}
    </group>
  );
}

/**
 * The leaf standing in the wall opening. Drawn around its own centre, which
 * the caller places in the middle of the wall thickness.
 * The warm plane behind it is only visible through the gaps around the leaf —
 * no fake light strips needed.
 */
/** Half the leaf's length: the hinge sits here, on the far edge of the opening. */
const HINGE = (DOOR_W - 0.06) / 2;

function Door({ focused }: { focused: boolean }) {
  const hinge = useRef<Group>(null);

  useFrame((_, delta) => {
    const h = hinge.current;
    if (!h) return;
    const goal = focused ? 1.05 : 0;
    h.rotation.y += (goal - h.rotation.y) * (1 - Math.pow(0.004, delta));
  });

  return (
    <group>
      {/* what is on the other side */}
      <mesh position={[-WALL_T / 2 - 0.005, DOOR_H / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshBasicMaterial color="#FFD9A0" />
      </mesh>

      {/* the leaf swings on its own pivot, so it turns on the frame edge */}
      <group ref={hinge} position={[0, 0, -HINGE]}>
        {/* narrower and shorter than the opening, so light gets past */}
        <mesh position={[0, DOOR_H / 2 - 0.04, HINGE]}>
          <boxGeometry args={[0.07, DOOR_H - 0.08, DOOR_W - 0.06]} />
          <meshStandardMaterial color={WOOD} roughness={0.75} />
        </mesh>
        <mesh position={[0.04, 1.05, HINGE + 0.36]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      <Glow position={[0.12, 1.1, 0]} size={2.6} color="#FFC47A" opacity={focused ? 0.55 : 0.3} />
      {focused && (
        <pointLight position={[0.5, 1.2, 0]} intensity={9} distance={4.5} color="#FFD9A0" />
      )}
    </group>
  );
}

/* ------------------------------------------------------- the credits roll --
 * The acknowledgements, then the names, scroll on one canvas texture the size
 * of the screen. The whole roll is too tall for one canvas on a phone, so it
 * is laid out in lines once and only the lines in view are redrawn as it
 * moves. No font file, no text geometry — and the same data feeds the Grazie
 * panel, so the roll is readable without WebGL too.
 */
const SCREEN_W = 3.4;
const SCREEN_H = 2;
const ROLL_W = 1024;
/** Texture pixels visible at once — matches the screen so the text is square. */
const ROLL_WINDOW = Math.round((ROLL_W * SCREEN_H) / SCREEN_W);
/** Reading pace, in texture pixels per second. */
const ROLL_SPEED = 32;
/** Free space each side of a wrapped line. */
const ROLL_PAD = 90;
const SERIF = "Georgia, 'Times New Roman', serif";

type RollLine = { y: number; text: string; font: string; color: string };

/** Every line of the roll with its centre, and the roll's height, a blank screen at each end. */
function rollLayout(blocks: CreditBlock[], groups: CreditGroup[]) {
  const measure = document.createElement("canvas").getContext("2d");
  const lines: RollLine[] = [];
  let y = ROLL_WINDOW;
  const put = (text: string, font: string, color: string, lh: number) => {
    lines.push({ y: y + lh / 2, text, font, color });
    y += lh;
  };
  const wrap = (text: string, font: string, color: string, lh: number) => {
    if (measure) measure.font = font;
    for (const para of text.split("\n\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (line && measure && measure.measureText(next).width > ROLL_W - 2 * ROLL_PAD) {
          put(line, font, color, lh);
          line = word;
        } else line = next;
      }
      if (line) put(line, font, color, lh);
      y += lh / 2;
    }
  };

  for (const block of blocks) {
    if (block.heading) put(block.heading.toUpperCase(), `600 30px ${SERIF}`, GOLD, 70);
    if (block.emphasis) wrap(block.body, `italic 500 38px ${SERIF}`, "#F4EFE7", 56);
    else wrap(block.body, `400 31px ${SERIF}`, "#D9D1C3", 46);
    y += 80;
  }
  for (const group of groups) {
    put(group.heading.toUpperCase(), `600 34px ${SERIF}`, GOLD, 96);
    for (const name of group.names) put(name, `500 46px ${SERIF}`, "#F4EFE7", 64);
    y += 52;
  }
  put("GRAZIE", `600 92px ${SERIF}`, GOLD, 200);
  return { lines, height: y + ROLL_WINDOW };
}

/** The window of the roll whose top edge is `top` pixels down it. */
function drawRoll(ctx: CanvasRenderingContext2D, lines: RollLine[], top: number) {
  ctx.fillStyle = "#14110F";
  ctx.fillRect(0, 0, ROLL_W, ROLL_WINDOW);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const l of lines) {
    const y = l.y - top;
    if (y < -60 || y > ROLL_WINDOW + 60) continue;
    ctx.font = l.font;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, ROLL_W / 2, y);
  }
}

/**
 * The stage beyond the door: a cinema screen facing away from the room, on a
 * dark backdrop that hides the outside of the wall. Mounted only while the
 * credits are being watched — from the room it would be a slab in mid-air.
 */
function CreditsStage({ reduced }: { reduced: boolean }) {
  const roll = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = ROLL_W;
    canvas.height = ROLL_WINDOW;
    return { ...rollLayout(credits, creditRoll), canvas, texture: new CanvasTexture(canvas) };
  }, []);
  useEffect(() => () => roll.texture.dispose(), [roll]);
  // nothing will scroll for these visitors, so start them on the first line
  const top = useRef(reduced ? ROLL_WINDOW : 0);
  const drawn = useRef(-1);

  useFrame((_, delta) => {
    // further down the roll means up the screen, the way credits have always rolled
    if (!reduced) top.current = (top.current + delta * ROLL_SPEED) % roll.height;
    const px = Math.floor(top.current);
    const ctx = px === drawn.current ? null : roll.canvas.getContext("2d");
    if (!ctx) return;
    drawn.current = px;
    drawRoll(ctx, roll.lines, px);
    roll.texture.needsUpdate = true;
  });

  return (
    <group position={CREDITS_SCREEN} rotation-y={-Math.PI / 2}>
      {/* everything behind the screen, room included, goes dark */}
      <mesh position={[0, 0, -1.2]}>
        <planeGeometry args={[26, 18]} />
        <meshBasicMaterial color="#0C0A0D" />
      </mesh>

      {/* frame */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[SCREEN_W + 0.16, SCREEN_H + 0.16, 0.08]} />
        <meshStandardMaterial color="#26222A" roughness={0.6} metalness={0.3} />
      </mesh>

      <mesh>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={roll.texture} toneMapped={false} />
      </mesh>

      {/* behind the frame, so it halos the screen instead of washing it out */}
      <Glow position={[0, 0, -0.5]} size={7} color="#FFD9A0" opacity={0.3} />
    </group>
  );
}

/**
 * Open-frame tower in the Antec Torque idiom: dark skeleton, white angular
 * armour panels floating off it, tinted glass held away on standoffs, splayed
 * feet. It inherits the hidden terminal from the old laptop.
 */
function PcTower({ reduced }: { reduced: boolean }) {
  const fans = useRef<Group>(null);

  const FRAME = "#20242B";
  const ARMOUR = "#E9E7E2";
  const INNER = "#171B21";

  const feet: [number, number][] = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  useFrame((state) => {
    if (reduced || !fans.current) return;
    const t = state.clock.elapsedTime * 0.05;
    fans.current.children.forEach((child, i) => {
      const mat = (child as Mesh).material as MeshStandardMaterial;
      if (mat) mat.emissive.setHSL((t + i / 3) % 1, 0.7, 0.5);
    });
  });

  return (
    <group>
      {/* splayed feet */}
      {feet.map(([sx, sz]) => (
        <mesh
          key={`${sx}${sz}`}
          position={[sx * 0.14, 0.1, sz * 0.18]}
          rotation-z={-sx * 0.32}
          rotation-x={sz * 0.16}
        >
          <boxGeometry args={[0.045, 0.24, 0.1]} />
          <meshStandardMaterial color={FRAME} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* skeleton */}
      <mesh position={[0, 0.205, 0]}>
        <boxGeometry args={[0.32, 0.035, 0.46]} />
        <meshStandardMaterial color={FRAME} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <boxGeometry args={[0.18, 0.74, 0.42]} />
        <meshStandardMaterial color={FRAME} roughness={0.65} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.96, 0]}>
        <boxGeometry args={[0.26, 0.03, 0.4]} />
        <meshStandardMaterial color={FRAME} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* internals, seen through the open frame */}
      <mesh position={[-0.07, 0.62, -0.01]}>
        <boxGeometry args={[0.015, 0.56, 0.34]} />
        <meshStandardMaterial color={INNER} roughness={0.8} />
      </mesh>
      <mesh position={[0.0, 0.52, 0.0]}>
        <boxGeometry args={[0.09, 0.055, 0.28]} />
        <meshStandardMaterial color={INNER} roughness={0.7} />
      </mesh>

      {/* RGB fans, facing the glass side */}
      <group ref={fans}>
        {[0.4, 0.78].map((y) => (
          <mesh key={y} position={[0.06, y, 0.02]} rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.072, 0.013, 8, 22]} />
            <meshStandardMaterial
              color="#12161C"
              emissive={`hsl(${Math.round(y * 420)}, 70%, 50%)`}
              emissiveIntensity={0.6}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>
      {[0.4, 0.78].map((y) => (
        <mesh key={y} position={[0.055, y, 0.02]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.062, 0.062, 0.012, 16]} />
          <meshStandardMaterial color="#181D25" roughness={0.75} />
        </mesh>
      ))}

      {/* white armour: side, back, tilted top, and the front prow */}
      <mesh position={[-0.19, 0.6, -0.02]} rotation-z={0.06}>
        <boxGeometry args={[0.022, 0.68, 0.36]} />
        <meshStandardMaterial color={ARMOUR} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.6, -0.225]}>
        <boxGeometry args={[0.3, 0.62, 0.022]} />
        <meshStandardMaterial color={ARMOUR} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation-z={0.1}>
        <boxGeometry args={[0.36, 0.028, 0.44]} />
        <meshStandardMaterial color={ARMOUR} roughness={0.45} metalness={0.15} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh
          key={sx}
          position={[sx * 0.12, 0.6, 0.18]}
          rotation-y={-sx * 0.55}
        >
          <boxGeometry args={[0.022, 0.68, 0.26]} />
          <meshStandardMaterial color={ARMOUR} roughness={0.45} metalness={0.15} />
        </mesh>
      ))}

      {/* front I/O strip */}
      <mesh position={[0.15, 0.9, 0.09]}>
        <boxGeometry args={[0.07, 0.028, 0.15]} />
        <meshStandardMaterial color={ARMOUR} roughness={0.4} metalness={0.2} />
      </mesh>
      {[0.045, 0.085].map((z) => (
        <mesh key={z} position={[0.15, 0.915, z]}>
          <boxGeometry args={[0.03, 0.004, 0.016]} />
          <meshStandardMaterial color="#2F6FA8" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0.15, 0.915, 0.13]}>
        <circleGeometry args={[0.011, 12]} />
        <meshStandardMaterial color="#9FE8D0" emissive="#4FBF9A" emissiveIntensity={1.6} />
      </mesh>

      {/* tinted glass, held off the frame on four standoffs */}
      {[
        [0.36, -0.14],
        [0.36, 0.14],
        [0.84, -0.14],
        [0.84, 0.14],
      ].map(([y, z]) => (
        <mesh key={`${y}${z}`} position={[0.215, y, z]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.012, 0.012, 0.055, 10]} />
          <meshStandardMaterial color={FRAME} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0.246, 0.6, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[0.4, 0.64]} />
        <meshStandardMaterial
          color="#0E1218"
          transparent
          opacity={0.38}
          roughness={0.1}
          metalness={0.2}
          side={DoubleSide}
        />
      </mesh>

      <Glow position={[0.22, 0.6, 0.1]} size={1.2} color="#7C6FE0" opacity={0.18} />
    </group>
  );
}

/** Monster Ultra: white can, blue claw. Oversized so it stays tappable on a phone. */
/**
 * The can, and the only object in the room that remembers being tapped:
 * every hit winds it up a little more until something gives (see App).
 */
function MonsterCan({ charge, reduced }: { charge: number; reduced: boolean }) {
  const claws = [-0.024, 0, 0.024];
  const g = useRef<Group>(null);

  useFrame((state) => {
    if (!g.current) return;
    const wind = reduced ? 0 : Math.min(charge, PORTAL_AT) / PORTAL_AT;
    const t = state.clock.elapsedTime;
    g.current.rotation.z = Math.sin(t * 9) * 0.11 * wind;
    g.current.position.y = Math.abs(Math.sin(t * 4.5)) * 0.05 * wind;
  });

  return (
    <group ref={g}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.2, 20]} />
        <meshStandardMaterial color="#F1EEE7" roughness={0.3} metalness={0.35} />
      </mesh>
      {/* shoulder + rim */}
      <mesh position={[0, 0.212, 0]}>
        <cylinderGeometry args={[0.036, 0.045, 0.026, 20]} />
        <meshStandardMaterial color="#E7E3DA" roughness={0.3} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.229, 0]}>
        <cylinderGeometry args={[0.038, 0.036, 0.01, 20]} />
        <meshStandardMaterial color="#AEB4A8" roughness={0.25} metalness={0.85} />
      </mesh>
      {/* the claw marks, turned toward the camera */}
      <group rotation-y={0.7}>
        {claws.map((x, i) => (
          <mesh key={i} position={[x, 0.115, 0.047]} rotation-z={0.13 * (i - 1)}>
            <boxGeometry args={[0.008, 0.105, 0.004]} />
            <meshStandardMaterial
              color="#6FC2E0"
              emissive="#6FC2E0"
              emissiveIntensity={0.35}
              roughness={0.45}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Where the cap floats. The tassel hangs 0.2 below its centre and the idle
 * bob adds another 0.03, so anything less than that over the lid and the cap
 * saws through the top of the case.
 */
const CAP_DROP = 0.23;
const CAP_Y = CASE_TOP + 0.06 + CAP_DROP + 0.12;

function Cap({ reduced }: { reduced: boolean }) {
  const g = useRef<Group>(null);

  useFrame((state) => {
    if (reduced || !g.current) return;
    g.current.rotation.y = state.clock.elapsedTime * 0.25;
    g.current.position.y = CAP_Y + Math.sin(state.clock.elapsedTime * 1.1) * 0.03;
  });

  return (
    <group ref={g} position={[0, CAP_Y, 0]}>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.16, 0.19, 0.1, 16]} />
        <meshStandardMaterial color="#1B1720" roughness={0.8} />
      </mesh>
      <mesh rotation-y={Math.PI / 4}>
        <boxGeometry args={[0.52, 0.03, 0.52]} />
        <meshStandardMaterial color="#201B26" roughness={0.7} />
      </mesh>
      <mesh position={[0.17, -0.09, 0.17]}>
        <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD}
          emissiveIntensity={0.5}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      <Glow position={[0, 0, 0]} size={1.1} color={GOLD} opacity={0.2} />
    </group>
  );
}

/** Dust drifting slowly upward through the lamp light. */
function Dust({ reduced }: { reduced: boolean }) {
  const geo = useRef<BufferGeometry>(null);

  const positions = useMemo(() => {
    const count = 110;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 5.4;
      arr[i * 3 + 1] = Math.random() * 2.8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 5.4;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (reduced || !geo.current) return;
    const attr = geo.current.attributes.position;
    const arr = attr.array as Float32Array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] += delta * 0.05;
      if (arr[i] > 2.9) arr[i] = 0.05;
    }
    attr.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.026}
        color="#FFD9A0"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ scene */

/**
 * Keeps the whole diorama in frame on any aspect ratio — a tall phone needs a
 * much wider zoom-out than a desktop window. ROOM_W / ROOM_H are the projected
 * size of the room through this exact camera; `npm test` re-derives them.
 */
const ROOM_W = 9;
const ROOM_H = 9;

/**
 * Where the ring stands: the open floor on the right, the one stretch with
 * nothing in front of it and nothing behind it to be confused with.
 */
const PORTAL_POS: [number, number, number] = [2.45, 0, -0.55];

function SceneContent({ reduced, focus, picked, onPick, onPickItem, portal, charge }: Props) {
  /**
   * While a close-up is open nothing else asks to be tapped — including the
   * focused object itself, whose own parts are the interaction now.
   */
  const muted = focus !== null;
  const egg = { reduced, muted, onPick };

  /** The stage outstays the focus by one flight, so the way back is not black. */
  const [stage, setStage] = useState(false);
  useEffect(() => {
    if (focus === "credits") {
      setStage(true);
      return;
    }
    const t = setTimeout(() => setStage(false), FLIGHT * 1000);
    return () => clearTimeout(t);
  }, [focus]);

  return (
    <>
      <color attach="background" args={["#090B10"]} />

      {/* cool ambient from the open side, warm pools from the lamps */}
      <ambientLight intensity={0.75} color="#7C8CB4" />
      <hemisphereLight args={["#8095C4", "#2A2018", 0.55]} />
      <directionalLight position={[6, 7, 6]} intensity={0.95} color="#A8BEE6" />
      <pointLight position={[-1.4, 1.4, -2.0]} intensity={5} distance={3.6} color="#5AA6D8" />
      <pointLight position={[1.75, 1.9, 0.6]} intensity={7} distance={4} color={GOLD} />
      <pointLight position={[-2.45, 1.1, 0.7]} intensity={7} distance={4.5} color="#FFC47A" />
      <pointLight position={[0, 2.4, -2.5]} intensity={4} distance={6} color="#FFC98A" />

      <Shell />
      <Desk {...egg} />
      <DeskLamp reduced={reduced} />
      <StringLights reduced={reduced} />
      <BookStack />
      <Egg position={[-2.78, 1.75, -1.3]} id="snowboard" height={0.34} hit={[0.34, 0.46, 1.4]} {...egg}>
        <Snowboard />
      </Egg>
      <Egg position={[-2.25, 0, 1.7]} id="bici" height={0.95} hit={[1.25, 0.9, 0.7]} hitOffset={[0, 0.45, 0]} {...egg}>
        <FoldingBike />
      </Egg>
      <Egg position={[2.4, 0, 2.5]} id="kite" height={1.55} hit={[0.7, 1.5, 0.7]} hitOffset={[0, 0.72, 0]} {...egg}>
        <KiteGear />
      </Egg>
      {/* the pads are sized for a fingertip, not for the ball: at phone width
          the whole room is nine units across, so a 25 cm ball is eleven pixels.
          They reach as far as the neighbours allow — the closer pad wins where
          two overlap, and the ball is the nearest thing to the camera here. */}
      <Egg position={[-2.5, 0.125, 2.65]} id="basket" height={0.32} hit={[0.62, 0.62, 0.62]} {...egg}>
        <Basketball />
      </Egg>
      <Egg position={[-1.95, 0.105, 2.78]} id="volley" height={0.3} hit={[0.58, 0.58, 0.58]} {...egg}>
        <Volleyball />
      </Egg>
      <Dust reduced={reduced} />

      <LightPool position={[0.4, 0.016, -1.9]} radius={1.5} opacity={0.22} />
      <LightPool position={[-2.3, 0.016, 0.7]} radius={1.4} color="#FFC47A" opacity={0.26} />
      <LightPool position={[1.75, 0.016, 0.6]} radius={1.2} color={GOLD} opacity={0.18} />

      <Hotspot
        position={[-1.35, 0.825, -2.4]}
        label="Progetti"
        labelHeight={1.42}
        ring={0.5}
        muted={muted}
        reduced={reduced}
        onSelect={() => onPick({ kind: "section", id: "projects" })}
      >
        <Monitor
          focused={focus === "projects"}
          picked={picked}
          onPickItem={onPickItem}
        />
      </Hotspot>

      <Hotspot
        position={[2.35, 0, -2.42]}
        label="Esami"
        labelHeight={CAP_Y + 0.45}
        ring={0.62}
        ringOffset={[0, 0, 0.8]}
        muted={muted}
        reduced={reduced}
        onSelect={() => onPick({ kind: "section", id: "exams" })}
      >
        <Bookshelf
          focused={focus === "exams"}
          picked={picked}
          onPickItem={onPickItem}
          reduced={reduced}
          onPick={onPick}
        />
        <Cap reduced={reduced} />
      </Hotspot>

      <Hotspot
        position={[1.75, 0, 0.6]}
        label="Tesi"
        labelHeight={1.75}
        ring={0.58}
        muted={muted}
        reduced={reduced}
        onSelect={() => onPick({ kind: "section", id: "thesis" })}
      >
        <ThesisPiece
          reduced={reduced}
          focused={focus === "thesis"}
          picked={picked}
          onPickItem={onPickItem}
        />
      </Hotspot>

      <Hotspot
        position={[-2.5, 0, 0.7]}
        label="Grazie"
        labelHeight={2.35}
        ring={0.6}
        ringOffset={[0.4, 0, 0]}
        muted={muted}
        reduced={reduced}
        onSelect={() => onPick({ kind: "section", id: "credits" })}
      >
        {/* centred in the wall thickness */}
        <group position={[-HALF + WALL_T / 2 + 2.5, 0, 0]}>
          <Door focused={focus === "credits"} />
        </group>
      </Hotspot>

      {/* hidden objects — dimmer markers, no floor ring */}

      <Egg
        position={[-1.72, 0, -0.55]}
        id="laura"
        height={1.55}
        hit={[0.55, 1.3, 0.75]}
        hitOffset={[0, 0.65, 0.12]}
        {...egg}
      >
        {/* beside the desk chair, turned toward it */}
        <group rotation-y={Math.PI - 0.35}>
          <Figure />
        </group>
      </Egg>

      <Egg
        position={[0.93, 0, -2.28]}
        id="terminal"
        height={1.25}
        hit={[0.45, 1.05, 0.6]}
        hitOffset={[0, 0.52, 0]}
        {...egg}
      >
        <PcTower reduced={reduced} />
      </Egg>

      <Egg
        position={[0.45, 0.825, -1.75]}
        id="monster"
        height={0.55}
        hit={[0.24, 0.3, 0.24]}
        hitOffset={[0, 0.08, 0]}
        {...egg}
      >
        <MonsterCan charge={charge} reduced={reduced} />
      </Egg>

      {portal && (
        <Hotspot
          position={PORTAL_POS}
          label="Portale"
          labelHeight={1.95}
          ring={0.55}
          hit={[1.5, 1.7, 0.7]}
          hitOffset={[0, 0.85, 0]}
          muted={muted}
          reduced={reduced}
          onSelect={() => onPick({ kind: "portal" })}
        >
          {/* square to the camera, on the open side where nothing stands */}
          <group rotation-y={Math.PI / 4}>
            <Portal reduced={reduced} />
          </group>
        </Hotspot>
      )}



      {stage && <CreditsStage reduced={reduced} />}

      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.45}
        scale={7}
        blur={2.8}
        far={3}
        resolution={512}
        color="#000000"
        frames={1}
      />
    </>
  );
}

/** The room itself: near-isometric camera with a deliberately small orbit range. */
export default function Room({ reduced, focus, picked, onPick, onPickItem, portal, charge }: Props) {
  const controls = useRef<OrbitControlsImpl>(null);
  const [flying, setFlying] = useState(false);
  const view = focus ? FOCUS_VIEWS[focus] : ROOM_VIEW;

  return (
    <div className="stage">
      <Canvas
        orthographic
        dpr={DPR}
        camera={{ position: [11, 9, 11], zoom: 60, near: 0.1, far: 90 }}
        gl={{ antialias: true, powerPreference: "high-performance", toneMappingExposure: 1.15 }}
        onPointerMissed={() => {
          document.body.style.cursor = "auto";
          if (focus) onPickItem(null);
        }}
      >
        <Steady />
        <Suspense fallback={null}>
          <SceneContent
            portal={portal}
            charge={charge}
            reduced={reduced}
            focus={focus}
            picked={picked}
            onPick={onPick}
            onPickItem={onPickItem}
          />
        </Suspense>

        <CameraRig
          view={view}
          controls={controls}
          reduced={reduced}
          onFlight={setFlying}
          fit={[ROOM_W, ROOM_H]}
        />

        <OrbitControls
          ref={controls}
          enabled={!flying}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.55}
          minZoom={22 * view.zoom}
          maxZoom={110 * view.zoom}
          minPolarAngle={view.polar - view.spread.polar}
          maxPolarAngle={view.polar + view.spread.polar}
          minAzimuthAngle={view.azimuth - view.spread.azimuth}
          maxAzimuthAngle={view.azimuth + view.spread.azimuth}
        />
      </Canvas>
    </div>
  );
}
