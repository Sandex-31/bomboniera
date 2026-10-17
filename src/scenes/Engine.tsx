import { Suspense, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  BackSide,
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type PointLight,
} from "three";
import CameraRig from "./CameraRig";
import { useTap } from "./Hotspot";
import Rotom from "./Rotom";
import { FLIGHT, type View } from "./focus";
import { moveMs, type Move } from "../lib/descent";

/*
 * The third floor: the machine room, in the terrace below Babel. Dark brick
 * and iron where Babel is warm stone; boilers with their fires lit, copper
 * pipes round the wall, great gears turning, levers and gauges, and steam
 * now and then. All of it scenery for now: the puzzle of this floor comes
 * later, and the middle of the floor is left clear for it.
 */

/** How wide the hall is, and how high its wall stands: Babel's, so the camera fits it the same. */
const HALL_R = 2.4;
const WALL_H = 1.9;
/** Where the way down from the sarcophagus comes through the ceiling. */
const HOLE_Y = 2.55;
const HOLE_R = 0.3;

const BRICK = "#4A2A22";
const MORTAR = "#22140F";
const IRON = "#2E2A28";
const COPPER = "#B8733A";
const FIRE = "#FF6A1A";

/** Width the camera fits, as on the other floors, so phones see all of it. */
const FIT_W = 7;

/** How long Rotom takes to catch fire and come out of the smoke. Task 5 hands it over to `burn`. */
const BURN_MS = 4500;

const HALL_VIEW: View = {
  target: [0, 0.95, 0],
  azimuth: Math.PI / 4,
  polar: 0.95,
  zoom: 1,
  spread: { azimuth: Math.PI, polar: 0.25 },
};

/** Up under the hole, looking at where Rotom is about to come through, and where it burns. */
const CEILING_VIEW: View = {
  target: [0, 1.5, 0],
  azimuth: Math.PI / 4,
  polar: 0.8,
  zoom: 2,
  spread: { azimuth: 0.1, polar: 0.05 },
};

/** Straight across from where the camera first looks: the boilers stand there. */
const FAR = (-3 * Math.PI) / 4;
const BOILERS = [FAR - 1.1, FAR, FAR + 1.1];
const GEARS = [
  { a: FAR - 0.55, r: 0.36, y: 1.25, dir: 1 },
  { a: FAR + 0.55, r: 0.3, y: 1.3, dir: -1 },
];
const LEVERS = [FAR - 0.62, FAR - 0.48, FAR + 0.55];
/** How many arcs the pipes round the hall are cut into, to come and go one at a time. */
const PIPE_ARCS = 24;

/** Placed against the wall at angle `a`, `inset` in from it, turned to face the middle. */
function onWall(a: number, inset: number, y: number) {
  const r = HALL_R - inset;
  return {
    position: [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number],
    "rotation-y": -a - Math.PI / 2,
  };
}

/**
 * Shown only while it is on the far side of the hall from the camera. The
 * wall is drawn from the inside only, so its near half never stands in the
 * way; pipes and gears are solid all round, and on the near half they would
 * hang in front of everything. As the camera goes round, they come and go
 * with the wall behind them.
 */
function FarSide({ a, children }: { a: number; children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (!group.current) return;
    const towards = Math.atan2(camera.position.z, camera.position.x);
    group.current.visible = Math.cos(a - towards) < 0.25;
  });
  return <group ref={group}>{children}</group>;
}

/** Dark bricks in staggered courses, with pale mortar so they read in the firelight. */
function brickwork() {
  const w = 2048;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = MORTAR;
  ctx.fillRect(0, 0, w, h);
  const course = h / 16;
  const brick = 96;
  for (let row = 0; row < 16; row++) {
    for (let x = row % 2 ? -brick / 2 : 0; x < w; x += brick) {
      // a little uneven, as old bricks are
      const shade = 0.85 + ((row * 7 + x * 13) % 30) / 100;
      ctx.fillStyle = BRICK;
      ctx.globalAlpha = shade;
      ctx.fillRect(x + 3, row * course + 3, brick - 6, course - 6);
    }
  }
  ctx.globalAlpha = 1;
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  t.repeat.x = 2;
  return t;
}

/** A boiler against the wall: its fire glowing through the door, a gauge over it. */
function Boiler({ angle, reduced }: { angle: number; reduced: boolean }) {
  const light = useRef<PointLight>(null);
  const needle = useRef<Group>(null);
  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime * 8 + angle * 5;
    if (light.current) light.current.intensity = 3 + Math.sin(t) * 0.5 + Math.sin(t * 2.7) * 0.35;
    // the pressure never quite settles
    if (needle.current) needle.current.rotation.z = -0.4 + Math.sin(t * 0.6) * 0.12 + Math.sin(t * 3.1) * 0.04;
  });
  const { position, "rotation-y": turn } = onWall(angle, 0.42, 0);
  return (
    <group position={position} rotation-y={turn}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 1.1, 20]} />
        <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.55} />
      </mesh>
      {[0.12, 0.98].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.315, 0.025, 8, 24]} />
          <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.55} />
      </mesh>
      {/* the chimney, up into the pipe that rings the hall */}
      <mesh position={[0, 1.55, -0.12]}>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 10]} />
        <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* the fire door, and the fire through it */}
      <mesh position={[0, 0.38, 0.305]}>
        <planeGeometry args={[0.26, 0.2]} />
        <meshStandardMaterial color="#1A0A04" emissive={FIRE} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 0.38, 0.3]}>
        <planeGeometry args={[0.32, 0.26]} />
        <meshStandardMaterial color="#15110F" metalness={0.5} roughness={0.6} />
      </mesh>
      <pointLight ref={light} position={[0, 0.45, 0.7]} color="#FF8A3A" intensity={3} distance={3.4} />
      {/* the gauge */}
      <group position={[0, 0.78, 0.31]}>
        <mesh>
          <circleGeometry args={[0.09, 24]} />
          <meshStandardMaterial color="#EFE3C8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -0.005]}>
          <circleGeometry args={[0.105, 24]} />
          <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
        </mesh>
        <group ref={needle} position={[0, 0, 0.004]} rotation-z={-0.4}>
          <mesh position={[0, 0.035, 0]}>
            <planeGeometry args={[0.012, 0.07]} />
            <meshBasicMaterial color="#B0201A" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** A great gear on the wall, turning slowly; its neighbour turns the other way. */
function Gear({ a, r, y, dir, reduced }: { a: number; r: number; y: number; dir: number; reduced: boolean }) {
  const wheel = useRef<Group>(null);
  useFrame((_, dt) => {
    if (wheel.current && !reduced) wheel.current.rotation.z += dir * 0.3 * dt;
  });
  const teeth = Math.round(r * 40);
  return (
    <group {...onWall(a, 0.1, y)}>
      <group ref={wheel}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[r, r, 0.06, 32]} />
          <meshStandardMaterial color="#6E5A44" metalness={0.75} roughness={0.4} />
        </mesh>
        {Array.from({ length: teeth }, (_, k) => {
          const t = (k / teeth) * Math.PI * 2;
          return (
            <mesh key={k} position={[Math.cos(t) * (r + 0.03), Math.sin(t) * (r + 0.03), 0]} rotation-z={t}>
              <boxGeometry args={[0.07, 0.05, 0.06]} />
              <meshStandardMaterial color="#6E5A44" metalness={0.75} roughness={0.4} />
            </mesh>
          );
        })}
        {/* spokes, so the turning shows */}
        {[0, Math.PI / 3, (2 * Math.PI) / 3].map((t) => (
          <mesh key={t} position={[0, 0, 0.035]} rotation-z={t}>
            <boxGeometry args={[r * 1.7, 0.04, 0.02]} />
            <meshStandardMaterial color="#4A3C2E" metalness={0.7} roughness={0.45} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.04]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
          <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

/** A lever on the wall, thrown one way or the other. Scenery until the puzzle needs it. */
function Lever({ a, up }: { a: number; up: boolean }) {
  return (
    <group {...onWall(a, 0.06, 0.5)}>
      <mesh>
        <boxGeometry args={[0.14, 0.22, 0.05]} />
        <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
      </mesh>
      <group position={[0, 0, 0.04]} rotation-x={up ? 0.5 : -0.5}>
        <mesh position={[0, 0.1, 0.02]} rotation-x={Math.PI / 2 - 0.2}>
          <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
          <meshStandardMaterial color="#9A9A9A" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[0, up ? 0.13 : -0.13, 0.13]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshStandardMaterial color="#B0201A" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** A puff of steam out of a pipe every few seconds: a few grey balls that swell, rise and fade. */
function Steam({ position, every, reduced }: { position: [number, number, number]; every: number; reduced: boolean }) {
  const balls = useRef<(Mesh | null)[]>([]);
  useFrame((state) => {
    balls.current.forEach((ball, k) => {
      if (!ball) return;
      const u = (((state.clock.elapsedTime + every * 0.37) % every) - k * 0.18) / 1.6;
      const on = !reduced && u > 0 && u < 1;
      ball.visible = on;
      if (!on) return;
      ball.position.set(Math.sin(k * 2.1) * 0.04 * u, u * 0.5, Math.cos(k * 1.7) * 0.04 * u);
      ball.scale.setScalar(0.05 + u * 0.16);
      (ball.material as MeshBasicMaterial).opacity = (1 - u) * 0.45;
    });
  });
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} ref={(m) => void (balls.current[k] = m)} visible={false}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#D8D4CE" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function Engine({
  reduced,
  onScene,
  onUp,
  arrivedAt,
  first,
}: {
  reduced: boolean;
  /** Whether a scene is playing, for the desktop to clear itself. */
  onScene: (on: boolean) => void;
  /** The hole in the ceiling was tapped: back up to Babel. */
  onUp: () => void;
  /** When the visitor came down, or -Infinity if they were already here. */
  arrivedAt: number;
  /** Whether that was the first time down, which is the long way. */
  first: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const [flying, setFlying] = useState(false);
  const [zapAt, setZapAt] = useState(0);
  const walls = useMemo(brickwork, []);
  useEffect(() => () => walls.dispose(), [walls]);

  /*
   * Coming in: the camera waits under the hole, Rotom drops out of it as it
   * was in Babel and, the first time, catches fire and comes out of the
   * smoke changed; then the camera stands back to take in the hall.
   */
  const arriving = Number.isFinite(arrivedAt) && !reduced;
  const [move, setMove] = useState<Move | undefined>(() =>
    arriving ? { at: arrivedAt, kind: "in", dir: "down", fast: !first } : undefined,
  );
  const [view, setView] = useState(arriving ? CEILING_VIEW : HALL_VIEW);
  const [scene, setScene] = useState(arriving);
  useEffect(() => {
    if (!arriving) return;
    const ms = moveMs(!first) * 0.6 + (first ? moveMs(false) * 0.4 + BURN_MS : 0);
    const steps = [
      setTimeout(() => setView(HALL_VIEW), ms),
      setTimeout(() => setScene(false), ms + FLIGHT * 1000),
    ];
    return () => steps.forEach(clearTimeout);
    // once, for the arrival this floor was mounted with
  }, []);
  useEffect(() => onScene(scene), [scene, onScene]);

  /** Back up through the hole: Rotom rises into it, and Babel takes over. */
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(leaving.current), []);
  const up = useTap(() => {
    if (scene) return;
    setScene(true);
    setMove({ at: performance.now(), kind: "out", dir: "up", fast: true });
    leaving.current = setTimeout(onUp, reduced ? 0 : moveMs(true) * 0.8);
  });
  const zap = useTap(() => {
    if (!scene) setZapAt(performance.now());
  });

  return (
    <Canvas
      orthographic
      dpr={[1, 1.75]}
      camera={{ position: [7, 5.6, 7], zoom: 60, near: 0.1, far: 90 }}
    >
      <color attach="background" args={["#0B0705"]} />
      <ambientLight intensity={0.5} color="#FFC8A0" />
      <hemisphereLight args={["#FFD0A0", "#1A0E08", 0.45]} />

      {/* the floor: iron plates, riveted in rings */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[HALL_R, 48]} />
        <meshStandardMaterial color="#3A332E" metalness={0.5} roughness={0.75} />
      </mesh>
      {[0.8, 1.6].map((r) => (
        <mesh key={r} rotation-x={-Math.PI / 2} position={[0, 0.003, 0]}>
          <ringGeometry args={[r, r + 0.03, 48]} />
          <meshBasicMaterial color="#14100D" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* the wall, from the inside only, like Babel's */}
      <mesh position={[0, WALL_H / 2, 0]}>
        <cylinderGeometry args={[HALL_R, HALL_R, WALL_H, 64, 1, true]} />
        <meshStandardMaterial map={walls} side={BackSide} roughness={0.95} />
      </mesh>
      <mesh position={[0, WALL_H, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[HALL_R, HALL_R + 0.12, 64]} />
        <meshStandardMaterial color={IRON} metalness={0.5} roughness={0.6} />
      </mesh>

      {/* copper pipes round the hall, high and low, in arcs that each come
          and go with the wall behind them */}
      {Array.from({ length: PIPE_ARCS }, (_, k) => (k * Math.PI * 2) / PIPE_ARCS).map((a) => (
        <FarSide key={a} a={a + Math.PI / PIPE_ARCS}>
          {[1.8, 0.16].map((y) => (
            <group key={y} position={[0, y, 0]} rotation-y={-a}>
              <mesh rotation-x={Math.PI / 2}>
                <torusGeometry args={[HALL_R - 0.12, y > 1 ? 0.05 : 0.035, 8, 6, (Math.PI * 2) / PIPE_ARCS]} />
                <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
              </mesh>
            </group>
          ))}
        </FarSide>
      ))}
      {/* and risers between them, every so often */}
      {Array.from({ length: 10 }, (_, k) => FAR + 0.42 + (k * Math.PI * 2) / 10)
        .filter((a) => !BOILERS.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.3))
        .map((a) => (
          <FarSide key={a} a={a}>
            <mesh position={[Math.cos(a) * (HALL_R - 0.12), 0.98, Math.sin(a) * (HALL_R - 0.12)]}>
              <cylinderGeometry args={[0.03, 0.03, 1.64, 8]} />
              <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
            </mesh>
          </FarSide>
        ))}

      {BOILERS.map((a) => (
        <FarSide key={a} a={a}>
          <Boiler angle={a} reduced={reduced} />
        </FarSide>
      ))}
      {GEARS.map((g) => (
        <FarSide key={g.a} a={g.a}>
          <Gear {...g} reduced={reduced} />
        </FarSide>
      ))}
      {LEVERS.map((a, k) => (
        <FarSide key={a} a={a}>
          <Lever a={a} up={k !== 1} />
        </FarSide>
      ))}
      <Steam
        position={[Math.cos(FAR - 1.75) * (HALL_R - 0.12), 1.86, Math.sin(FAR - 1.75) * (HALL_R - 0.12)]}
        every={4.2}
        reduced={reduced}
      />
      <Steam
        position={[Math.cos(FAR + 1.75) * (HALL_R - 0.12), 1.86, Math.sin(FAR + 1.75) * (HALL_R - 0.12)]}
        every={5.6}
        reduced={reduced}
      />

      {/* the way down from the sarcophagus, through where the ceiling would
          be: a rim and the dark above it. Tapping it goes back up. */}
      <group position={[0, HOLE_Y, 0]} {...up}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[HOLE_R, HOLE_R + 0.06, 40]} />
          {/* lit by the fire below, or it is lost against the dark */}
          <meshStandardMaterial color="#8C6A3E" emissive="#FF9A4A" emissiveIntensity={0.6} metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[HOLE_R + 0.15, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <mesh position={[0, HOLE_Y - 0.5, 0]}>
        <cylinderGeometry args={[HOLE_R, HOLE_R * 1.6, 1, 24, 1, true]} />
        <meshBasicMaterial color="#FFB070" transparent opacity={0.1} depthWrite={false} />
      </mesh>

      <group {...zap}>
        <Suspense fallback={null}>
          <Rotom form="heat" from="wash" move={move} reduced={reduced} zapAt={zapAt} awake />
        </Suspense>
      </group>

      <CameraRig view={view} controls={controls} reduced={reduced} onFlight={setFlying} fit={[FIT_W, FIT_W]} />
      <OrbitControls
        ref={controls}
        enabled={!flying && !scene}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={view.polar - view.spread.polar}
        maxPolarAngle={view.polar + view.spread.polar}
        minAzimuthAngle={view.spread.azimuth >= Math.PI ? -Infinity : view.azimuth - view.spread.azimuth}
        maxAzimuthAngle={view.spread.azimuth >= Math.PI ? Infinity : view.azimuth + view.spread.azimuth}
      />
    </Canvas>
  );
}
