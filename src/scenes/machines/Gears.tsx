import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Shape as ShapePath, type Group } from "three";
import { useTap } from "../Hotspot";
import {
  BOARD_H,
  BOARD_W,
  MOTOR,
  PEGS,
  PIECE_BEHIND,
  RACK,
  SHAFTS,
  fits,
  type GearsState,
  type Pace,
  type Size,
  type Spin,
  type Turn,
} from "../../lib/gears";
import { Approach, COPPER, FarSide, IRON, SPOTS, onWall, machine } from "./hall";

/*
 * The gear board on the wall. A gear is taken off the rack under the board
 * with a tap, and put on a peg with another; a gear on a peg goes back to the
 * rack with a tap. Pegs it cannot go on say so with a shudder. The motor, on
 * the left, turns when the round line of steam reaches it, and everything
 * meshed with it turns too. Nothing is written: the shafts carry a badge
 * with an arrow for the way they want to turn, and a hare or a snail.
 */

/** One board unit, in world units. */
const U = 0.085;
/** How fast the motor turns when driven, in radians a second. */
const MOTOR_SPEED = 1.3;
/** The rack shows its gears at this scale, so the eight fit under the board. */
const RACK_SCALE = 0.6;

const WOOD = "#5A3A24";
const STEEL = "#8C8A86";

/** A peg on the board, in the panel's frame: x right, y up. */
const pegAt = (i: number): [number, number] => [(PEGS[i][0] - BOARD_W / 2) * U, (BOARD_H / 2 - PEGS[i][1]) * U + 0.12];

/** Where rack gear `k` sits, on the shelf under the board. */
/** The rack hangs in two rows under the board: the small and middling gears, then the large. */
const SHELF_Y = -(BOARD_H / 2 + 3) * U + 0.02;
const ROW_GAP = 0.27;
const rowOf = (k: number) => (RACK[k] === 3 ? 1 : 0);
/** The iron frame round board and rack: from the top of the board to under the lower row. */
const FRAME_TOP = 0.12 + ((BOARD_H + 6) * U) / 2 + 0.03;
const FRAME_BOTTOM = -(BOARD_H / 2 + 3) * U + 0.02 - ROW_GAP - 0.16;
const FRAME_H = FRAME_TOP - FRAME_BOTTOM;
const FRAME_MID = (FRAME_TOP + FRAME_BOTTOM) / 2;
const rackAt = (k: number): [number, number] => {
  // spread along their row by their sizes, as a real rack would hold them
  const row = RACK.map((_, j) => j).filter((j) => rowOf(j) === rowOf(k));
  const width = (j: number) => RACK[j] * 2 * U * RACK_SCALE + 0.045;
  const total = row.reduce((sum, j) => sum + width(j), -0.045);
  let x = -total / 2;
  for (const j of row) {
    if (j === k) break;
    x += width(j);
  }
  return [x + RACK[k] * U * RACK_SCALE, SHELF_Y - rowOf(k) * ROW_GAP];
};

/** A gear: a disc with teeth all round, as many as its size allows at the same pitch. */
function Wheel({ size, color, rim }: { size: Size; color: string; rim?: string }) {
  const r = size * U;
  const teeth = size * 8;
  return (
    <group>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[r - 0.012, r - 0.012, 0.02, 32]} />
        <meshStandardMaterial
          color={color}
          metalness={0.75}
          roughness={0.4}
          emissive={rim ?? "#000000"}
          emissiveIntensity={rim ? 0.6 : 0}
        />
      </mesh>
      {Array.from({ length: teeth }, (_, k) => {
        const t = (k / teeth) * Math.PI * 2;
        return (
          <mesh key={k} position={[Math.cos(t) * (r - 0.004), Math.sin(t) * (r - 0.004), 0]} rotation-z={t}>
            <boxGeometry args={[0.022, 0.016, 0.02]} />
            <meshStandardMaterial color={color} metalness={0.75} roughness={0.4} />
          </mesh>
        );
      })}
      {/* spokes, so the turning shows, and the hub */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((t) => (
        <mesh key={t} position={[0, 0, 0.012]} rotation-z={t}>
          <boxGeometry args={[r * 1.6, 0.012, 0.006]} />
          <meshStandardMaterial color="#3A3028" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.012]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 14]} />
        <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

const flat = (draw: (s: ShapePath) => void) => {
  const s = new ShapePath();
  draw(s);
  return s;
};

/** The badge on a shaft: a curved arrow round the rim, and the hare or the snail in the middle. */
function Badge({ dir, pace }: { dir: Turn; pace: Pace }) {
  const animal = useMemo(
    () =>
      pace === "lepre"
        ? // a hare, sitting up: a body, a head, two long ears
          [
            flat((s) => s.absellipse(-0.004, -0.012, 0.022, 0.014, 0, Math.PI * 2, false, 0)),
            flat((s) => s.absellipse(0.018, 0.004, 0.009, 0.008, 0, Math.PI * 2, false, 0)),
            flat((s) => s.absellipse(0.016, 0.022, 0.003, 0.012, 0, Math.PI * 2, false, 0.2)),
            flat((s) => s.absellipse(0.022, 0.021, 0.003, 0.011, 0, Math.PI * 2, false, -0.25)),
          ]
        : // a snail: a round shell on a long low body
          [
            flat((s) => s.absarc(0, 0.002, 0.016, 0, Math.PI * 2, false)),
            flat((s) => {
              s.moveTo(-0.026, -0.016);
              s.lineTo(0.028, -0.016);
              s.lineTo(0.03, -0.008);
              s.lineTo(-0.022, -0.01);
              s.closePath();
            }),
            flat((s) => s.absellipse(0.026, -0.004, 0.003, 0.009, 0, Math.PI * 2, false, 0)),
          ],
    [pace],
  );
  return (
    <group>
      <mesh>
        <circleGeometry args={[0.062, 28]} />
        <meshStandardMaterial
          color="#D9B46A"
          emissive="#D9B46A"
          emissiveIntensity={0.25}
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      {/* the arrow: most of a ring, and its head where the turning goes */}
      <group scale={[dir === 1 ? -1 : 1, 1, 1]}>
        <mesh position={[0, 0, 0.002]} rotation-z={Math.PI * 0.6}>
          <torusGeometry args={[0.048, 0.005, 6, 24, Math.PI * 1.5]} />
          <meshBasicMaterial color="#2A1E14" />
        </mesh>
        <mesh
          position={[-0.048 * Math.cos(Math.PI * 0.1), -0.048 * Math.sin(Math.PI * 0.1) - 0.004, 0.002]}
          rotation-z={0}
        >
          <coneGeometry args={[0.011, 0.02, 3]} />
          <meshBasicMaterial color="#2A1E14" />
        </mesh>
      </group>
      {animal.map((shape, k) => (
        <mesh key={k} position={[0, 0, 0.003]}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color="#2A1E14" />
        </mesh>
      ))}
    </group>
  );
}

/** A peg, and whatever turns on it: tapping it puts the gear in hand on, or takes its own off. */
function PegSpot({
  i,
  state,
  spin,
  held,
  active,
  reduced,
  onTap,
}: {
  i: number;
  state: GearsState;
  spin: Spin;
  held: number | null;
  active: boolean;
  reduced: boolean;
  onTap: (i: number) => void;
}) {
  const wheel = useRef<Group>(null);
  const refused = useRef(-Infinity);
  const [x, y] = pegAt(i);
  const gear = state.placed[i];
  const size = i === MOTOR.peg ? MOTOR.size : gear !== undefined ? RACK[gear] : null;
  const shaft = SHAFTS.find((s) => s.peg === i);
  useFrame((frame, dt) => {
    const w = wheel.current;
    if (!w) return;
    const turning = spin.turning.get(i) ?? 0;
    if (!reduced) w.rotation.z -= turning * MOTOR_SPEED * dt;
    // jammed, it strains against the others
    const strain = spin.jam && spin.turning.has(i) && !reduced ? Math.sin(frame.clock.elapsedTime * 45) * 0.03 : 0;
    const shake = Math.max(0, 1 - (performance.now() - refused.current) / 350);
    w.position.x = strain + (reduced ? 0 : Math.sin(frame.clock.elapsedTime * 60) * shake * 0.015);
  });
  const tap = useTap(() => {
    if (active && held !== null && gear === undefined && !fits(state, i, RACK[held]))
      refused.current = performance.now();
    onTap(i);
  });
  return (
    <group position={[x, y, 0]} {...tap}>
      {/* the peg itself, and a pad round it for a thumb */}
      <mesh position={[0, 0, 0.01]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 0.04, 10]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <circleGeometry args={[Math.max(0.05, (size ?? 1) * U), 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={wheel} position={[0, 0, 0.025]}>
        {size !== null && <Wheel size={size} color={i === MOTOR.peg ? "#6E6A66" : "#B08A4A"} />}
      </group>
      {i === MOTOR.peg && (
        // the motor's cylinder, behind its gear, fed from below by the round line
        <mesh position={[0, 0, -0.02]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 20]} />
          <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
        </mesh>
      )}
      {shaft && (
        <group position={[0, 0, 0.075]}>
          <Badge dir={shaft.dir} pace={shaft.pace} />
        </group>
      )}
    </group>
  );
}

export default function Gears({
  state,
  spin,
  active,
  reduced,
  onPick,
  onChange,
}: {
  state: GearsState;
  spin: Spin;
  /** The camera stands in front of the board, so it answers. */
  active: boolean;
  reduced: boolean;
  onPick: () => void;
  onChange: (next: GearsState) => void;
}) {
  const { a, y } = SPOTS.gears;
  /** The rack gear in hand, if any. */
  const [held, setHeld] = useState<number | null>(null);
  const onRack = RACK.map((_, k) => !Object.values(state.placed).includes(k));

  const tapPeg = (i: number) => {
    if (!active) return onPick();
    if (i === MOTOR.peg) return;
    const gear = state.placed[i];
    if (gear !== undefined) {
      // back to the rack
      const placed = { ...state.placed };
      delete placed[i];
      onChange({ ...state, placed });
      return;
    }
    if (held === null || !fits(state, i, RACK[held])) return;
    onChange({ ...state, placed: { ...state.placed, [i]: held } });
    setHeld(null);
  };

  return (
    <FarSide a={a}>
      {/* stood off the wall so the curve of the bricks clears its corners */}
      <group {...onWall(a, 0.3, y - FRAME_MID)} {...machine("gears")}>
        <pointLight position={[0, 0.8, 0.55]} color="#FFC890" intensity={2.2} distance={2.2} />
        {!active && (
          <group position={[0, FRAME_MID, 0]}>
            <Approach w={(BOARD_W + 6) * U + 0.06} h={FRAME_H} onPick={onPick} />
          </group>
        )}
        {/* the board: planks in an iron frame */}
        <mesh position={[0, FRAME_MID, -0.04]}>
          <planeGeometry args={[(BOARD_W + 6) * U + 0.06, FRAME_H]} />
          <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.12, -0.035]}>
          <planeGeometry args={[(BOARD_W + 6) * U, (BOARD_H + 6) * U]} />
          <meshStandardMaterial color={WOOD} roughness={0.9} />
        </mesh>
        {/* the shelf of the rack */}
        <mesh position={[0, SHELF_Y - ROW_GAP / 2, -0.03]}>
          <planeGeometry args={[(BOARD_W + 6) * U, ROW_GAP + 0.2]} />
          <meshStandardMaterial color="#3A2A1C" roughness={0.9} />
        </mesh>
        {PEGS.map((_, i) => (
          <PegSpot
            key={i}
            i={i}
            state={state}
            spin={spin}
            held={held}
            active={active}
            reduced={reduced}
            onTap={tapPeg}
          />
        ))}
        {RACK.map((size, k) => (
          <RackSlot
            key={k}
            k={k}
            size={size}
            here={onRack[k]}
            held={held === k}
            piece={k === PIECE_BEHIND && !onRack[k] && !state.piece}
            active={active}
            onPick={onPick}
            onTake={() => setHeld(held === k ? null : k)}
            onPiece={() => onChange({ ...state, piece: true })}
          />
        ))}
      </group>
    </FarSide>
  );
}

/** A place on the rack: its gear if it is there, lifted when in hand; behind one, a strip of card. */
function RackSlot({
  k,
  size,
  here,
  held,
  piece,
  active,
  onPick,
  onTake,
  onPiece,
}: {
  k: number;
  size: Size;
  here: boolean;
  held: boolean;
  piece: boolean;
  active: boolean;
  onPick: () => void;
  onTake: () => void;
  onPiece: () => void;
}) {
  const [x, yy] = rackAt(k);
  const tap = useTap(() => (!active ? onPick() : here ? onTake() : piece ? onPiece() : undefined));
  return (
    <group position={[x, yy + (held ? 0.03 : 0), held ? 0.04 : 0]} {...tap}>
      <mesh position={[0, 0, 0.06]}>
        <circleGeometry args={[Math.max(0.075, size * U * RACK_SCALE + 0.01), 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* the hook it hangs on */}
      <mesh position={[0, 0, -0.01]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
      </mesh>
      {here && (
        <group scale={RACK_SCALE}>
          <Wheel size={size} color="#B08A4A" rim={held ? "#FFD27A" : undefined} />
        </group>
      )}
      {piece && (
        <mesh position={[0, 0, 0.005]} rotation-z={0.2}>
          <planeGeometry args={[0.09, 0.05]} />
          <meshStandardMaterial color="#E8DCC0" emissive="#E8DCC0" emissiveIntensity={0.25} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}
