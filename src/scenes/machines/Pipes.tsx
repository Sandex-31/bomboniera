import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MeshStandardMaterial, Shape as ShapePath, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { useTap } from "../Hotspot";
import {
  E,
  GRID,
  H,
  INLETS,
  N,
  OUTLETS,
  S,
  SIDES,
  SWITCHES,
  VALVES,
  W,
  WEST,
  BASE,
  type Flow,
  type Outlet,
  type PipesState,
} from "../../lib/pipes";
import type { Shape } from "../../lib/boilers";
import { COPPER, FarSide, IRON, SPOTS, onWall } from "./hall";

/*
 * The panel of steam pipes on the wall. Every piece is a tap: a fitting turns
 * a quarter clockwise, a switch throws its lever, a valve turns its wheel open
 * or shut. Steam shows as a shimmer running along the copper, tinted by the
 * line it belongs to; where it pours out of an open end it puffs. Nothing on
 * it is written: the inlets and outlets carry their shape, and that is all.
 */

/** One piece of the panel, in world units. */
export const CELL = 0.17;
const R = 0.022;

/** The steam of each line, faintly tinted so the three can be told apart along the copper. */
export const TINT: Record<Shape, string> = { tondo: "#FFC878", triangolo: "#8FCBFF", quadrato: "#9CF0A6" };

/** Where piece (x, y) sits on the panel: x to the right, y up, the panel facing out. */
const place = (x: number, y: number): [number, number, number] => [
  (x - (W - 1) / 2) * CELL,
  ((H - 1) / 2 - y) * CELL,
  0,
];

/** Which way a side points, on the panel. */
const AIM: Record<number, [number, number]> = { [N]: [0, 1], [E]: [1, 0], [S]: [0, -1], [WEST]: [-1, 0] };

/** Half a pipe, from the middle of a piece out to its side `d`. */
function Arm({ d, material, z = 0 }: { d: number; material: MeshStandardMaterial; z?: number }) {
  const [ax, ay] = AIM[d];
  return (
    <mesh position={[(ax * CELL) / 4, (ay * CELL) / 4, z]} rotation-z={ax ? Math.PI / 2 : 0} material={material}>
      <cylinderGeometry args={[R, R, CELL / 2 + 0.002, 10]} />
    </mesh>
  );
}

/** A flat shape in brass: on the flanges, the only thing on the panel that says anything. */
export function ShapeMark({ shape, size, color = "#D9A66A" }: { shape: Shape; size: number; color?: string }) {
  const geometry = useMemo(() => {
    const s = new ShapePath();
    if (shape === "tondo") s.absarc(0, 0, size, 0, Math.PI * 2, false);
    else if (shape === "triangolo") {
      s.moveTo(0, size * 1.1);
      s.lineTo(size * 1.05, -size * 0.75);
      s.lineTo(-size * 1.05, -size * 0.75);
      s.closePath();
    } else {
      s.moveTo(-size * 0.9, -size * 0.9);
      s.lineTo(size * 0.9, -size * 0.9);
      s.lineTo(size * 0.9, size * 0.9);
      s.lineTo(-size * 0.9, size * 0.9);
      s.closePath();
    }
    return s;
  }, [shape, size]);
  return (
    <mesh>
      <shapeGeometry args={[geometry]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} metalness={0.6} roughness={0.35} />
    </mesh>
  );
}

/** A flange at the edge of the panel, where a line comes in or an outlet leaves. */
function Flange({ x, y, side, shape, lit }: { x: number; y: number; side: number; shape: Shape | null; lit: boolean }) {
  const [px, py] = place(x, y);
  const [ax] = AIM[side];
  return (
    <group position={[px + (ax * CELL) / 2 + ax * 0.035, py, 0]}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[R * 2.1, R * 2.1, 0.03, 16]} />
        <meshStandardMaterial
          color={COPPER}
          emissive={lit ? "#FFD27A" : "#000000"}
          emissiveIntensity={lit ? 1.2 : 0}
          metalness={0.7}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[ax * 0.05, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[R, R, 0.07, 10]} />
        <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* the shape on a brass plate under the flange; the decoy has none */}
      <group position={[ax * 0.035, -0.07, 0.01]}>
        <mesh>
          <circleGeometry args={[0.032, 20]} />
          <meshStandardMaterial color="#2A2420" metalness={0.5} roughness={0.6} />
        </mesh>
        {shape && (
          <group position={[0, 0, 0.002]}>
            <ShapeMark shape={shape} size={0.018} color={lit ? "#FFE2A0" : "#D9A66A"} />
          </group>
        )}
      </group>
    </group>
  );
}

/** A little gauge over an outlet: the needle sits up when its line arrives clean, and goes mad when two meet. */
function OutletGauge({
  x,
  y,
  state,
  reduced,
}: {
  x: number;
  y: number;
  state: "ok" | "mixed" | "none";
  reduced: boolean;
}) {
  const needle = useRef<Group>(null);
  useFrame((frame, dt) => {
    if (!needle.current) return;
    const t = frame.clock.elapsedTime;
    const goal = state === "ok" ? -0.2 : state === "mixed" ? (reduced ? 0 : Math.sin(t * 31) * 1.1) : 1.1;
    needle.current.rotation.z += (goal - needle.current.rotation.z) * Math.min(1, dt * (state === "mixed" ? 30 : 6));
  });
  const [px, py] = place(x, y);
  return (
    <group position={[px + CELL / 2 + 0.12, py + 0.02, 0.01]}>
      <mesh>
        <circleGeometry args={[0.035, 20]} />
        <meshStandardMaterial color="#EFE3C8" roughness={0.6} />
      </mesh>
      <group ref={needle} position={[0, 0, 0.003]} rotation-z={1.1}>
        <mesh position={[0, 0.014, 0]}>
          <planeGeometry args={[0.006, 0.028]} />
          <meshBasicMaterial color="#1A1410" />
        </mesh>
      </group>
    </group>
  );
}

/** Steam pouring out of an open end: a short puff, over and over. */
function Leak({ x, y, side, reduced }: { x: number; y: number; side: number; reduced: boolean }) {
  const balls = useRef<(Mesh | null)[]>([]);
  useFrame((frame) => {
    balls.current.forEach((ball, k) => {
      if (!ball) return;
      const u = (((frame.clock.elapsedTime * 1.6 + k / 3) % 1) + 1) % 1;
      ball.visible = !reduced;
      const [ax, ay] = AIM[side];
      ball.position.set(ax * (0.01 + u * 0.09), ay * (0.01 + u * 0.09) + u * 0.04, 0.02 + u * 0.05);
      ball.scale.setScalar(0.012 + u * 0.035);
      (ball.material as MeshBasicMaterial).opacity = (1 - u) * 0.75;
    });
  });
  const [px, py] = place(x, y);
  const [ax, ay] = AIM[side];
  return (
    <group position={[px + (ax * CELL) / 2, py + (ay * CELL) / 2, 0]}>
      {[0, 1, 2].map((k) => (
        <mesh key={k} ref={(m) => void (balls.current[k] = m)}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#F2EEE8" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** One piece of the panel. Turnable pieces ease round to their turn. */
function Piece({
  x,
  y,
  state,
  material,
  active,
  onPick,
  onChange,
}: {
  x: number;
  y: number;
  state: PipesState;
  material: MeshStandardMaterial;
  active: boolean;
  onPick: () => void;
  onChange: (next: PipesState) => void;
}) {
  const p = GRID[y][x];
  const i = y * W + x;
  const spin = useRef<Group>(null);
  const wheel = useRef<Group>(null);
  const lever = useRef<Group>(null);
  const k = state.turns[i];
  const sw = SWITCHES.indexOf(i);
  const va = VALVES.indexOf(i);
  // turned angles accumulate, so a fourth quarter turn goes on round and does not unwind
  const angle = useRef(-k * (Math.PI / 2));
  useEffect(() => {
    const goal = -k * (Math.PI / 2);
    let next = goal;
    while (next > angle.current + 1e-6) next -= Math.PI * 2;
    if (angle.current - next > Math.PI * 1.01) next += Math.PI * 2;
    angle.current = next;
  }, [k]);
  useFrame((_, dt) => {
    const ease = Math.min(1, dt * 12);
    if (spin.current) spin.current.rotation.z += (angle.current - spin.current.rotation.z) * ease;
    if (wheel.current && va >= 0) {
      const goal = state.valves[va] ? 0 : Math.PI * 1.5;
      wheel.current.rotation.z += (goal - wheel.current.rotation.z) * Math.min(1, dt * 6);
    }
    if (lever.current && sw >= 0) {
      const goal = state.switches[sw] ? 0.7 : -0.7;
      lever.current.rotation.z += (goal - lever.current.rotation.z) * ease;
    }
  });

  const tap = useTap(() => {
    if (!active) return onPick();
    if (!p) return;
    if (p.kind === "rot") onChange({ ...state, turns: state.turns.map((t, j) => (j === i ? (t + 1) % 4 : t)) });
    else if (p.kind === "switch") onChange({ ...state, switches: state.switches.map((v, j) => (j === sw ? !v : v)) });
    else if (p.kind === "valve") onChange({ ...state, valves: state.valves.map((v, j) => (j === va ? !v : v)) });
  });

  const letter = { N, E, S, W: WEST } as Record<string, number>;
  let body = null;
  if (p?.kind === "rot") {
    const m = BASE[p.shape];
    body = (
      <group ref={spin} rotation-z={angle.current}>
        {SIDES.filter((d) => m & d).map((d) => (
          <Arm key={d} d={d} material={material} />
        ))}
        <mesh material={material}>
          <sphereGeometry args={[R * 1.35, 12, 10]} />
        </mesh>
      </group>
    );
  } else if (p?.kind === "bridge") {
    // the two ways across: one straight through, the other arching over it
    body = (
      <>
        <Arm d={N} material={material} />
        <Arm d={S} material={material} />
        <Arm d={E} material={material} z={0.035} />
        <Arm d={WEST} material={material} z={0.035} />
        <mesh position={[CELL / 2 - 0.01, 0, 0.018]} material={material}>
          <cylinderGeometry args={[R, R, 0.04, 8]} />
        </mesh>
      </>
    );
  } else if (p?.kind === "switch") {
    const live = letter[state.switches[sw] ? p.a : p.b];
    const shut = letter[state.switches[sw] ? p.b : p.a];
    const [sx, sy] = AIM[shut];
    // the lever stands in the corner no pipe runs to
    const free = SIDES.find((d) => !((letter[p.in] | letter[p.a] | letter[p.b]) & d)) ?? N;
    const [fx, fy] = AIM[free];
    body = (
      <>
        <Arm d={letter[p.in]} material={material} />
        <Arm d={live} material={material} />
        <Arm d={shut} material={material} />
        <mesh material={material}>
          <boxGeometry args={[R * 3.2, R * 3.2, R * 3.2]} />
        </mesh>
        {/* the shut side, capped in red inside the junction */}
        <mesh position={[sx * R * 2.2, sy * R * 2.2, 0]} rotation-z={sx ? Math.PI / 2 : 0}>
          <cylinderGeometry args={[R * 1.4, R * 1.4, 0.012, 14]} />
          <meshStandardMaterial color="#B0201A" roughness={0.5} />
        </mesh>
        <group position={[fx * CELL * 0.28, fy * CELL * 0.28, 0.03]}>
          <group ref={lever} rotation-z={state.switches[sw] ? 0.7 : -0.7}>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[0.01, 0.06, 0.01]} />
              <meshStandardMaterial color="#9A9A9A" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.062, 0]}>
              <sphereGeometry args={[0.014, 10, 8]} />
              <meshStandardMaterial color="#B0201A" roughness={0.5} />
            </mesh>
          </group>
        </group>
      </>
    );
  } else if (p?.kind === "valve") {
    const ports = [...p.ports].map((c) => letter[c]);
    body = (
      <>
        {ports.map((d) => (
          <Arm key={d} d={d} material={material} />
        ))}
        <group position={[0, 0, 0.035]}>
          <group ref={wheel}>
            <mesh>
              <torusGeometry args={[0.042, 0.007, 8, 20]} />
              <meshStandardMaterial color={state.valves[va] ? "#C9A227" : "#B0201A"} metalness={0.7} roughness={0.35} />
            </mesh>
            {[0, Math.PI / 3, (2 * Math.PI) / 3].map((t) => (
              <mesh key={t} rotation-z={t}>
                <boxGeometry args={[0.084, 0.006, 0.006]} />
                <meshStandardMaterial color="#8A7A5A" metalness={0.7} roughness={0.4} />
              </mesh>
            ))}
          </group>
        </group>
      </>
    );
  }

  return (
    <group position={place(x, y)} {...tap}>
      {/* the tap pad: the whole square of the piece, for a thumb */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[CELL * 0.98, CELL * 0.98]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {body}
    </group>
  );
}

export default function Pipes({
  state,
  flow,
  active,
  reduced,
  onPick,
  onChange,
}: {
  state: PipesState;
  flow: Flow;
  /** The camera stands in front of the panel, so its pieces answer. */
  active: boolean;
  reduced: boolean;
  onPick: () => void;
  onChange: (next: PipesState) => void;
}) {
  const { a, y } = SPOTS.pipes;
  /** One material per piece, so steam can run through each on its own. */
  const materials = useMemo(
    () =>
      Array.from(
        { length: W * H },
        () => new MeshStandardMaterial({ color: COPPER, metalness: 0.7, roughness: 0.35, emissive: "#000000" }),
      ),
    [],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  const tint = useMemo(() => new Color(), []);

  useFrame((frame) => {
    const t = frame.clock.elapsedTime;
    materials.forEach((m, i) => {
      const lines = flow.carries[i];
      if (!lines.length) {
        m.emissiveIntensity = 0;
        return;
      }
      tint.set(lines.length > 1 ? "#FFFFFF" : TINT[lines[0]]);
      m.emissive.copy(tint);
      // a shimmer that runs along: brighter in a band that moves from left to right
      const x = i % W;
      const yy = Math.floor(i / W);
      m.emissiveIntensity = reduced ? 0.45 : 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(t * 5 - (x + yy) * 0.9));
    });
  });

  const outletRows = Object.entries(OUTLETS) as [Outlet, number][];

  return (
    <FarSide a={a}>
      {/* stood off the wall far enough that the curve of the bricks clears its corners */}
      <group {...onWall(a, 0.22, y)}>
        {/* a caged lamp over the panel, so it can be worked with the boilers still cold */}
        <pointLight position={[0, H * CELL * 0.75, 0.55]} color="#FFC890" intensity={2.2} distance={2.2} />
        {/* the iron board the pipes are bolted to, in a copper frame */}
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[W * CELL + 0.42, H * CELL + 0.24]} />
          <meshStandardMaterial
            color={COPPER}
            emissive="#FF8A3A"
            emissiveIntensity={0.12}
            metalness={0.7}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0, -0.035]}>
          <planeGeometry args={[W * CELL + 0.38, H * CELL + 0.2]} />
          <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.6} />
        </mesh>
        {GRID.flatMap((row, py) =>
          row.map((_, px) => (
            <Piece
              key={`${px},${py}`}
              x={px}
              y={py}
              state={state}
              material={materials[py * W + px]}
              active={active}
              onPick={onPick}
              onChange={onChange}
            />
          )),
        )}
        {(Object.entries(INLETS) as [Shape, number][]).map(([line, row]) => (
          <Flange key={line} x={0} y={row} side={WEST} shape={line} lit={false} />
        ))}
        {outletRows.map(([out, row]) => (
          <group key={out}>
            <Flange x={W - 1} y={row} side={E} shape={out === "esca" ? null : out} lit={flow.outlets[out] === "ok"} />
            <OutletGauge x={W - 1} y={row} state={flow.outlets[out]} reduced={reduced} />
          </group>
        ))}
        {flow.leaks.slice(0, 8).map((l, k) => (
          <Leak key={k} x={l.x} y={l.y} side={l.side} reduced={reduced} />
        ))}
      </group>
    </FarSide>
  );
}
