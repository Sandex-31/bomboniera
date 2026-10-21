import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Shape as ShapePath,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PointLight,
} from "three";
import { tookTap, useTap } from "../Hotspot";
import {
  DRAWER_BOILER,
  GREEN,
  RED,
  RIGHT_DAMPERS,
  SHAPES,
  release,
  rise,
  smoke,
  type BoilerState,
  type Damper,
  type Shape,
} from "../../lib/boilers";
import { COPPER, FAR, FIRE, FarSide, IRON, onWall, machine } from "./hall";

/*
 * The three boilers along the far wall. Seen from across the hall they are
 * scenery; walked up to, every part of them answers: the latch on the fire
 * door, the damper lever over it, the pedal of the bellows, and the ash
 * drawer under the square one. Rotom is put in through an open door by the
 * hall itself, which knows where Rotom is.
 */

/** Left to right as seen from the middle: the tondo, the triangolo, the quadrato. */
export const BOILER_ANGLES = [FAR - 1.1, FAR, FAR + 1.1];
/** How far in from the wall the boilers stand. */
const INSET = 0.42;
/**
 * The fire door, in the boiler's own frame: out past the curve of the body,
 * which reaches 0.313 at that height. Any closer and its middle, stamp and
 * all, sank into the iron.
 */
const DOOR: [number, number, number] = [0, 0.38, 0.34];

/** Where the mouth of boiler `i` is in the hall, for Rotom to be dropped into. */
export function doorAt(i: number): [number, number, number] {
  const { position, "rotation-y": turn } = onWall(BOILER_ANGLES[i], INSET, 0);
  // the door sits out in front of the boiler, along its own +z
  return [position[0] + Math.sin(turn) * 0.45, DOOR[1], position[2] + Math.cos(turn) * 0.45];
}

/** The needle, 0 at rest to 1 full, as an angle on the gauge: rest is far left. */
const needleAngle = (n: number) => 1.1 - 2.2 * n;
/** Where the needle sits once a boiler is going: the middle of the green. */
const RUNNING = (GREEN[0] + GREEN[1]) / 2;

/** A band of the gauge's face, from needle `a` to needle `b`. */
function Band({ a, b, color }: { a: number; b: number; color: string }) {
  const start = Math.PI / 2 + needleAngle(b);
  return (
    <mesh position={[0, 0, 0.002]}>
      <ringGeometry args={[0.055, 0.085, 24, 1, start, needleAngle(a) - needleAngle(b)]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/** The shape stamped on a fire door, which is also the shape of its line of steam. */
function Stamp({ shape }: { shape: Shape }) {
  const geometry = useMemo(() => {
    const s = new ShapePath();
    if (shape === "tondo") {
      s.absarc(0, 0, 0.045, 0, Math.PI * 2, false);
    } else if (shape === "triangolo") {
      s.moveTo(0, 0.05);
      s.lineTo(0.048, -0.034);
      s.lineTo(-0.048, -0.034);
      s.closePath();
    } else {
      s.moveTo(-0.04, -0.04);
      s.lineTo(0.04, -0.04);
      s.lineTo(0.04, 0.04);
      s.lineTo(-0.04, 0.04);
      s.closePath();
    }
    return s;
  }, [shape]);
  return (
    <mesh>
      <shapeGeometry args={[geometry]} />
      <meshStandardMaterial
        color="#D9A66A"
        emissive="#D9A66A"
        emissiveIntensity={0.35}
        metalness={0.6}
        roughness={0.35}
      />
    </mesh>
  );
}

const SMOKE_COLOR = { nero: "#141210", grigio: "#8C8782", chiaro: "#E6E2DC" } as const;
const SMOKE_OPACITY = { nero: 0.85, grigio: 0.55, chiaro: 0.18 } as const;
/** How long a puff lives: an over-aired fire's smoke is gone almost at once. */
const SMOKE_LIFE = { nero: 1.8, grigio: 1.4, chiaro: 0.45 } as const;

/** Smoke out of the chimney while the bellows work, its kind telling the damper. */
function Chimney({ kind, reduced }: { kind: keyof typeof SMOKE_COLOR | null; reduced: boolean }) {
  const balls = useRef<(Mesh | null)[]>([]);
  useFrame((state) => {
    balls.current.forEach((ball, k) => {
      if (!ball) return;
      const life = kind ? SMOKE_LIFE[kind] : 1;
      const u = ((state.clock.elapsedTime + k * (life / 5)) % life) / life;
      ball.visible = kind !== null && !reduced;
      if (!ball.visible || !kind) return;
      ball.position.set(Math.sin(k * 2.3) * 0.05 * u, u * 0.4, Math.cos(k * 1.9) * 0.05 * u);
      ball.scale.setScalar(0.05 + u * (kind === "nero" ? 0.16 : 0.11));
      const m = ball.material as MeshBasicMaterial;
      m.color.set(SMOKE_COLOR[kind]);
      m.opacity = (1 - u) * SMOKE_OPACITY[kind];
    });
  });
  return (
    // out of a vent halfway up the chimney, in front of the lit bricks: from
    // its top it rose over the wall into the dark, where black smoke, the one
    // that says "more air", could not be seen at all
    <group position={[0, 1.42, -0.04]}>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} ref={(m) => void (balls.current[k] = m)} visible={false}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Boiler({
  i,
  state,
  active,
  inside,
  reduced,
  onPick,
  onChange,
  onPedal,
  pumping,
  needle,
}: {
  i: number;
  state: BoilerState;
  /** The camera stands in front of the boilers, so the parts answer. */
  active: boolean;
  /** Rotom is in this one. */
  inside: boolean;
  reduced: boolean;
  onPick: (i: number) => void;
  onChange: (next: BoilerState) => void;
  onPedal: (i: number) => void;
  /** Whether the pedal of this boiler is held down. */
  pumping: boolean;
  /** Where its needle is while pumping, read every frame. */
  needle: React.RefObject<number>;
}) {
  const angle = BOILER_ANGLES[i];
  const lit = state.lit[i];
  const open = state.doors[i];
  const damper = state.dampers[i];
  const needleRef = useRef<Group>(null);
  const fire = useRef<MeshStandardMaterial>(null);
  const door = useRef<Group>(null);
  const drawer = useRef<Group>(null);
  const lever = useRef<Group>(null);
  const pedal = useRef<Group>(null);

  useFrame((frame, dt) => {
    const t = frame.clock.elapsedTime * 8 + angle * 5;
    const ease = Math.min(1, dt * 8);
    const n = pumping ? needle.current : lit ? RUNNING : 0;
    const shake = lit && !reduced && !pumping ? Math.sin(t * 0.6) * 0.03 + Math.sin(t * 3.1) * 0.01 : 0;
    if (needleRef.current) {
      const target = needleAngle(n + shake);
      needleRef.current.rotation.z = pumping
        ? target
        : needleRef.current.rotation.z + (target - needleRef.current.rotation.z) * ease;
    }
    // the fire comes up with the needle while pumping, and stays once lit
    const glow = lit ? 1.4 : pumping ? 0.25 + n * 1.4 : inside ? 0.5 : 0.18;
    if (fire.current) fire.current.emissiveIntensity = glow + (reduced || !(lit || pumping) ? 0 : Math.sin(t) * 0.15);
    if (door.current) door.current.rotation.y += ((open ? -1.9 : 0) - door.current.rotation.y) * ease;
    if (drawer.current) drawer.current.position.z += ((state.drawer ? 0.46 : 0.24) - drawer.current.position.z) * ease;
    if (lever.current) lever.current.rotation.z += (-damper * (Math.PI / 2) - lever.current.rotation.z) * ease;
    if (pedal.current)
      pedal.current.rotation.x += ((pumping ? 0.25 : -0.05) - pedal.current.rotation.x) * Math.min(1, dt * 16);
  });

  const set = (patch: Partial<BoilerState>) => onChange({ ...state, ...patch });
  const at = <T,>(list: T[], v: T) => list.map((x, k) => (k === i ? v : x));
  const walkUp = () => !active && onPick(i);

  // a lit boiler is left alone: its door, damper and pedal are done with
  const latchTap = useTap(() => (active ? !lit && set({ doors: at(state.doors, !open) }) : onPick(i)));
  const leverTap = useTap(() =>
    active ? !lit && set({ dampers: at(state.dampers, ((damper + 1) % 3) as Damper) }) : onPick(i),
  );
  const drawerTap = useTap(() => (active ? set({ drawer: !state.drawer }) : onPick(i)));
  const pieceTap = useTap(() => active && state.drawer && set({ piece: true }));
  const bodyTap = useTap(walkUp);

  const kind = pumping && !reduced ? smoke(damper, RIGHT_DAMPERS[i]) : null;
  const { position, "rotation-y": turn } = onWall(angle, INSET, 0);

  return (
    <group position={position} rotation-y={turn} {...machine("boilers")}>
      <group {...bodyTap}>
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
      </group>
      <Chimney kind={kind} reduced={reduced} />

      {/* the fire through the mouth, and the door over it, hinged on its left */}
      <mesh position={DOOR}>
        <planeGeometry args={[0.26, 0.2]} />
        <meshStandardMaterial ref={fire} color="#1A0A04" emissive={FIRE} emissiveIntensity={0.18} />
      </mesh>
      <group position={[DOOR[0] - 0.16, DOOR[1], DOOR[2] + 0.006]}>
        <group ref={door}>
          <group position={[0.16, 0, 0]} {...latchTap}>
            <mesh>
              <planeGeometry args={[0.32, 0.26]} />
              <meshStandardMaterial color="#15110F" metalness={0.5} roughness={0.6} side={2} />
            </mesh>
            <group position={[0, 0, 0.004]}>
              <Stamp shape={SHAPES[i]} />
            </group>
            {/* the latch: a brass handle on the free edge */}
            <mesh position={[0.12, 0, 0.02]} rotation-z={open ? 0 : Math.PI / 2}>
              <boxGeometry args={[0.025, 0.09, 0.025]} />
              <meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>

      {/* the gauge: no numbers, a green band to stop in and a red one past it */}
      <group position={[0, 0.78, 0.31]}>
        <mesh>
          <circleGeometry args={[0.09, 24]} />
          <meshStandardMaterial color="#EFE3C8" roughness={0.6} />
        </mesh>
        <Band a={GREEN[0]} b={GREEN[1]} color="#3E9A4A" />
        <Band a={RED} b={1} color="#B0201A" />
        <mesh position={[0, 0, -0.005]}>
          <circleGeometry args={[0.105, 24]} />
          <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
        </mesh>
        <group ref={needleRef} position={[0, 0, 0.004]} rotation-z={needleAngle(0)}>
          <mesh position={[0, 0.035, 0]}>
            <planeGeometry args={[0.012, 0.07]} />
            <meshBasicMaterial color="#1A1410" />
          </mesh>
        </group>
      </group>

      {/* the damper lever, on the front of the dome where it is seen: a round
          base with three notches, up, aside and down, and the arm pivoted at
          its middle. Up lets the most air in. A tap on the base throws it on
          to the next notch, and from down back up. */}
      <group position={[0, 1.22, 0.285]} rotation-x={-0.41} {...leverTap}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 24]} />
          <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.011]}>
          <ringGeometry args={[0.115, 0.13, 24]} />
          <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
        </mesh>
        {([0, 1, 2] as const).map((d) => (
          <mesh key={d} position={[Math.sin((d * Math.PI) / 2) * 0.095, Math.cos((d * Math.PI) / 2) * 0.095, 0.012]}>
            <circleGeometry args={[0.012, 12]} />
            <meshBasicMaterial color={d === damper ? "#F2E6C8" : "#5A5048"} />
          </mesh>
        ))}
        <group ref={lever} position={[0, 0, 0.02]} rotation-z={-damper * (Math.PI / 2)}>
          <mesh position={[0, 0.045, 0]}>
            <boxGeometry args={[0.022, 0.09, 0.018]} />
            <meshStandardMaterial color="#9A9A9A" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.095, 0.01]}>
            <sphereGeometry args={[0.026, 12, 8]} />
            <meshStandardMaterial color="#B0201A" roughness={0.5} />
          </mesh>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.022, 0.022, 0.03, 12]} />
            <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      </group>

      {/* the bellows on the floor beside it, and the pedal that works them */}
      {/* far enough out that the box clears the body and its copper hoop */}
      <group position={[-0.42, 0.05, 0.28]}>
        <mesh position={[0, 0.06, -0.05]}>
          <boxGeometry args={[0.16, 0.1, 0.2]} />
          <meshStandardMaterial color="#5A3A24" roughness={0.9} />
        </mesh>
        <group ref={pedal} position={[0, 0.02, 0.06]}>
          <mesh position={[0, 0.02, 0.06]}>
            <boxGeometry args={[0.16, 0.025, 0.16]} />
            <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.036, 0.06]}>
            <boxGeometry args={[0.12, 0.008, 0.12]} />
            <meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.35} />
          </mesh>
        </group>
        {/* a pad far bigger than the pedal, for a thumb */}
        <mesh
          position={[0, 0.08, 0.06]}
          onPointerDown={(e) => {
            if (!active) return;
            e.stopPropagation();
            if (!lit && inside) onPedal(i);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            if (!active) onPick(i);
          }}
        >
          <boxGeometry args={[0.34, 0.24, 0.42]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* the ash drawer, and in the square one's, a strip of punched card */}
      {i === DRAWER_BOILER && (
        <group ref={drawer} position={[0, 0.19, 0.24]}>
          <mesh {...drawerTap}>
            <boxGeometry args={[0.26, 0.08, 0.16]} />
            <meshStandardMaterial color="#1E1A17" metalness={0.5} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.09]} {...drawerTap}>
            <boxGeometry args={[0.1, 0.03, 0.03]} />
            <meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.3} />
          </mesh>
          {!state.piece && (
            <mesh position={[0, 0.042, 0.01]} rotation-x={-Math.PI / 2} {...pieceTap}>
              <planeGeometry args={[0.2, 0.1]} />
              {/* pale against the ash, or it is never seen */}
              <meshStandardMaterial color="#E8DCC0" emissive="#E8DCC0" emissiveIntensity={0.25} roughness={0.9} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}

/**
 * The row of boilers, and the bellows' timing. Pumping is timed here rather
 * than in each boiler because the pedal comes up wherever the finger leaves
 * the screen, not only on the pedal.
 */
export default function Boilers({
  state,
  active,
  which,
  inside,
  reduced,
  onPick,
  onChange,
  onOutcome,
}: {
  state: BoilerState;
  /** The camera stands in front of the boilers. */
  active: boolean;
  /** The one of them it stands in front of: only that one answers. */
  which: number;
  /** Which boiler Rotom is in, if any. */
  inside: number | null;
  reduced: boolean;
  /** A boiler was tapped from where it does not answer: walk up to it. */
  onPick: (i: number) => void;
  onChange: (next: BoilerState) => void;
  /** The pedal came up, or the needle hit the red: what came of it. */
  onOutcome: (i: number, outcome: "out" | "lit" | "spat") => void;
}) {
  const [pumping, setPumping] = useState<number | null>(null);
  const started = useRef(0);
  const needle = useRef(0);
  const light = useRef<PointLight>(null);

  const finish = (outcome: "out" | "lit" | "spat") => {
    if (pumping === null) return;
    const i = pumping;
    setPumping(null);
    needle.current = 0;
    onOutcome(i, outcome);
  };

  useEffect(() => {
    if (pumping === null) return;
    const up = () => {
      tookTap();
      finish(release(needle.current));
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  });

  useFrame((frame) => {
    if (light.current) {
      const t = frame.clock.elapsedTime * 8;
      const glow = state.lit.filter(Boolean).length * 1.6 + (pumping === null ? 0 : needle.current * 2.5);
      light.current.intensity = glow * (reduced ? 1 : 1 + Math.sin(t) * 0.15 + Math.sin(t * 2.7) * 0.1);
    }
    if (pumping === null) return;
    needle.current = rise(state.dampers[pumping], RIGHT_DAMPERS[pumping], performance.now() - started.current);
    // into the red the valve blows at once, pedal or no pedal
    if (release(needle.current) === "spat") finish("spat");
  });

  return (
    <>
      {/* One firelight for the row, not one per boiler, and outside FarSide:
          a light that comes or goes as the camera turns makes three.js
          recompile every material in the hall, and the hall stuttered. The
          machines' lamps stay out of FarSide for the same reason. */}
      <pointLight ref={light} {...onWall(FAR, 1.12, 0.45)} color="#FF8A3A" intensity={0} distance={4.2} />
      {BOILER_ANGLES.map((a, i) => (
        <FarSide key={a} a={a} id="boilers">
          <Boiler
            i={i}
            state={state}
            active={active && which === i}
            inside={inside === i}
            reduced={reduced}
            onPick={onPick}
            onChange={onChange}
            onPedal={(k) => {
              started.current = performance.now();
              needle.current = 0;
              setPumping(k);
            }}
            pumping={pumping === i}
            needle={needle}
          />
        </FarSide>
      ))}
    </>
  );
}
