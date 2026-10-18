import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { DoubleSide, Shape as ShapePath, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { useTap } from "../Hotspot";
import {
  CARD,
  HANDLES,
  PIECE,
  PINS,
  ROWS,
  STRIP,
  assembled,
  step,
  type Handle,
  type Laid,
  type OrganState,
  type PieceId,
} from "../../lib/card";
import { organ, type Voice } from "../../lib/organ";
import { Approach, BRASS, COPPER, FarSide, IRON, SPOTS, onWall, machine } from "./hall";

/*
 * The steam organ on the wall: six brass whistles over a windchest, a chain
 * hanging from each with a handle of its own shape, and under them the
 * lectern the punched card is laid on. A chain is pulled by pressing its
 * handle and let go by letting go: a short pull a short note, a long one a
 * long note. Until the fan overhead turns the right way the handles are lost
 * in the steam that hangs there; without the triangle line the whistles only
 * hiss.
 */

/** Where the six handles hang, across the front, and how far apart. */
const SPACING = 0.24;
const handleX = (k: number) => (k - (ROWS - 1) / 2) * SPACING;
const CHEST_Y = 1.05;
const HANDLE_Y = 0.73;
/** How far down a chain comes when it is pulled. */
const PULL = 0.08;

/** The card, as laid on the lectern: a column's width, a row's height, the margins. */
const COL_W = 0.1;
const ROW_H = 0.052;
const TOP_M = 0.05;
const BOTTOM_M = 0.02;
const SHAPE_M = 0.07;
const JAG = 0.014;
const CARD_H = TOP_M + ROWS * ROW_H + BOTTOM_M;
/** The lectern's three slots: the first one wider, for the margin the handles' shapes are printed on. */
const SLOT_W = [SHAPE_M + STRIP * COL_W, STRIP * COL_W, STRIP * COL_W];
const LECTERN_W = SLOT_W.reduce((a, b) => a + b, 0);
const slotX = (s: number) => -LECTERN_W / 2 + SLOT_W.slice(0, s).reduce((a, b) => a + b, 0);
const LECTERN_Y = 0.16;

/** Each handle's shape, flat: also what is printed down the card's margin. */
function handleShape(h: Handle, r: number): ShapePath {
  const s = new ShapePath();
  if (h === "tondo") s.absarc(0, 0, r, 0, Math.PI * 2, false);
  else if (h === "triangolo") {
    s.moveTo(0, r * 1.1);
    s.lineTo(r * 1.05, -r * 0.75);
    s.lineTo(-r * 1.05, -r * 0.75);
    s.closePath();
  } else if (h === "quadrato") {
    s.moveTo(-r * 0.85, -r * 0.85);
    s.lineTo(r * 0.85, -r * 0.85);
    s.lineTo(r * 0.85, r * 0.85);
    s.lineTo(-r * 0.85, r * 0.85);
    s.closePath();
  } else if (h === "stella") {
    for (let k = 0; k < 10; k++) {
      const a = Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r * 1.1;
      if (k === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    s.closePath();
  } else if (h === "mezzaluna") {
    s.absarc(0, 0, r, Math.PI * 0.25, Math.PI * 1.75, false);
    s.absarc(r * 0.45, 0, r * 0.72, Math.PI * 1.62, Math.PI * 0.38, true);
  } else {
    // a drop: round below, pointed above
    s.moveTo(0, r * 1.2);
    s.quadraticCurveTo(r * 1.05, -r * 0.1, 0, -r * 0.9);
    s.quadraticCurveTo(-r * 1.05, -r * 0.1, 0, r * 1.2);
  }
  return s;
}

function Mark({ h, r, color }: { h: Handle; r: number; color: string }) {
  const shape = useMemo(() => handleShape(h, r), [h, r]);
  return (
    <mesh>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={color} side={DoubleSide} />
    </mesh>
  );
}

/** One piece of the card, drawn as it is: torn edges, holes, pin holes, and on the first, the shapes. */
function CardPiece({ piece }: { piece: PieceId }) {
  const index = ["A", "B", "C"].indexOf(piece);
  const margin = index === 0 ? SHAPE_M : 0;
  const w = margin + STRIP * COL_W;
  const { left, right, holes } = PIECE[piece];
  const outline = useMemo(() => {
    const s = new ShapePath();
    const rowY = (j: number) => CARD_H - TOP_M - j * ROW_H;
    s.moveTo(0, CARD_H);
    s.lineTo(w, CARD_H);
    // down the right edge, along its tear
    for (let j = 0; j <= ROWS; j++) s.lineTo(w + (right ? right[j] * JAG : 0), rowY(j));
    s.lineTo(w, 0);
    s.lineTo(0, 0);
    // and up the left
    for (let j = ROWS; j >= 0; j--) s.lineTo(left ? left[j] * JAG : 0, rowY(j));
    s.closePath();
    return s;
  }, [w, left, right]);
  const cols = Array.from({ length: STRIP }, (_, c) => index * STRIP + c);
  /** The torn edges, drawn along, so where two pieces meet shows. */
  const tears = useMemo(() => {
    const rowY = (j: number) => CARD_H - TOP_M - j * ROW_H;
    const along = (x0: number, t: readonly number[]) =>
      [[x0, CARD_H, 0.002], ...t.map((d, j) => [x0 + d * JAG, rowY(j), 0.002]), [x0, 0, 0.002]] as [
        number,
        number,
        number,
      ][];
    return [left ? along(0, left) : null, right ? along(w, right) : null].filter(Boolean) as [
      number,
      number,
      number,
    ][][];
  }, [w, left, right]);
  return (
    <group>
      <mesh>
        <shapeGeometry args={[outline]} />
        <meshStandardMaterial
          color="#E8DCC0"
          emissive="#E8DCC0"
          emissiveIntensity={0.3}
          roughness={0.9}
          side={DoubleSide}
        />
      </mesh>
      {tears.map((points, k) => (
        <Line key={k} points={points} color="#7A6440" lineWidth={1.6} />
      ))}
      {holes.map((x) => (
        <mesh key={x} position={[margin + x * COL_W, CARD_H - TOP_M / 2, 0.001]}>
          <circleGeometry args={[0.011, 14]} />
          <meshBasicMaterial color="#2A2018" side={DoubleSide} />
        </mesh>
      ))}
      {cols.flatMap((col, c) =>
        CARD.map((row, r) => {
          const hole = row[col];
          if (!hole) return null;
          const x = margin + (c + 0.5) * COL_W;
          const y = CARD_H - TOP_M - (r + 0.5) * ROW_H;
          return (
            <mesh key={`${r},${c}`} position={[x, y, 0.001]}>
              {hole === "foro" ? <circleGeometry args={[0.014, 16]} /> : <planeGeometry args={[0.075, 0.022]} />}
              <meshBasicMaterial color="#2A2018" side={DoubleSide} />
            </mesh>
          );
        }),
      )}
      {index === 0 &&
        HANDLES.map((h, r) => (
          <group key={h} position={[SHAPE_M / 2, CARD_H - TOP_M - (r + 0.5) * ROW_H, 0.001]}>
            <Mark h={h} r={0.014} color="#5A4630" />
          </group>
        ))}
    </group>
  );
}

/** A piece laid in its slot, turned over as it was laid. */
function LaidPiece({ laid, slot }: { laid: Laid; slot: number }) {
  const margin = laid.piece === "A" ? SHAPE_M : 0;
  const w = margin + STRIP * COL_W;
  // laid in its slot, the slot's left end against the piece's left end however it faces
  return (
    <group position={[slotX(slot) + (laid.flipH ? w : 0), LECTERN_Y + (laid.flipV ? CARD_H : 0), 0.02]}>
      <group scale={[laid.flipH ? -1 : 1, laid.flipV ? -1 : 1, 1]}>
        <CardPiece piece={laid.piece} />
      </group>
    </group>
  );
}

/** Steam hanging in front of the handles: as thick as the fan leaves it. */
function Fog({ thick, reduced }: { thick: number; reduced: boolean }) {
  const puffs = useRef<(Mesh | null)[]>([]);
  useFrame((frame) => {
    const t = frame.clock.elapsedTime;
    puffs.current.forEach((p, k) => {
      if (!p) return;
      const m = p.material as MeshBasicMaterial;
      m.opacity += (thick * 0.9 - m.opacity) * 0.05;
      p.visible = m.opacity > 0.01;
      if (!reduced) p.position.x = handleX(k % ROWS) + Math.sin(t * 0.4 + k) * 0.05;
    });
  });
  return (
    <>
      {Array.from({ length: ROWS * 2 }, (_, k) => (
        <mesh
          key={k}
          ref={(m) => void (puffs.current[k] = m)}
          position={[handleX(k % ROWS), HANDLE_Y + (k < ROWS ? 0.03 : -0.08), 0.12 + (k < ROWS ? 0 : 0.02)]}
        >
          <sphereGeometry args={[0.15, 12, 10]} />
          <meshBasicMaterial color="#D8D4CE" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

export default function Organ({
  state,
  steam,
  fan,
  inHand,
  active,
  reduced,
  playing,
  onPick,
  onChange,
  onLay,
  onPlayed,
}: {
  state: OrganState;
  /** The triangle line reaches the organ. */
  steam: boolean;
  /** What the fan overhead does: clears the steam, thickens it, or nothing. */
  fan: "ok" | "wrong" | "still" | "jam";
  /** The piece of card taken out of the pocket, if any. */
  inHand: PieceId | null;
  active: boolean;
  reduced: boolean;
  /** The whistle the organ is sounding by itself, while it plays the tune back. */
  playing: number | null;
  onPick: () => void;
  onChange: (next: OrganState) => void;
  /** A piece went from hand to lectern, or from lectern back to the pocket. */
  onLay: () => void;
  onPlayed: () => void;
}) {
  const { a, y } = SPOTS.organ;
  const whole = assembled(state.lectern);
  /** How much of the tune has been pulled right so far. */
  const done = useRef(0);
  const [pulled, setPulled] = useState<number | null>(null);
  const pullStart = useRef(0);
  const voice = useRef<Voice | null>(null);
  const chains = useRef<(Group | null)[]>([]);
  const wisps = useRef<(Mesh | null)[]>([]);
  const sounded = useRef<number[]>(Array(ROWS).fill(-Infinity));

  useEffect(() => {
    if (pulled === null) return;
    // timed by when the finger went down and came up, not by when this code
    // got to hear of it: the first pull also wakes the sound, which can hold
    // the page up long enough to turn a short pull into a long one
    const up = (e: PointerEvent) => {
      const k = pulled;
      const held = e.timeStamp - pullStart.current;
      setPulled(null);
      voice.current?.stop();
      voice.current = null;
      if (!steam || !whole || state.played) return;
      const before = done.current;
      done.current = step(before, k, held);
      // a wrong note: a sour hiss, and the tune starts over
      if (done.current <= before && before > 0) organ().puff();
      if (done.current === CARD[0].length) {
        done.current = 0;
        onPlayed();
      }
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  });

  useFrame((frame, dt) => {
    chains.current.forEach((c, k) => {
      if (!c) return;
      const goal = pulled === k ? -PULL : 0;
      c.position.y += (goal - c.position.y) * Math.min(1, dt * 18);
    });
    wisps.current.forEach((w, k) => {
      if (!w) return;
      if (playing === k || pulled === k) sounded.current[k] = frame.clock.elapsedTime;
      const u = Math.min(1, (frame.clock.elapsedTime - sounded.current[k]) / 0.8);
      w.visible = !reduced && u < 1 && steam;
      w.position.y = 0.05 + u * 0.12;
      w.scale.setScalar(0.03 + u * 0.06);
      (w.material as MeshBasicMaterial).opacity = (1 - u) * 0.6;
    });
  });

  const press = (k: number, at: number) => {
    if (!active) return onPick();
    if (playing !== null) return;
    pullStart.current = at;
    setPulled(k);
    if (steam) voice.current = organ().start(k);
    else organ().puff();
  };

  /** A tap on a slot: lays the piece in hand there, or turns over the one lying there. */
  const tapSlot = (s: number) => {
    if (!active) return onPick();
    const lectern = [...state.lectern];
    const there = lectern[s];
    if (inHand) {
      // whatever lay there goes back to the pocket; the piece in hand may have lain elsewhere
      const from = lectern.findIndex((l) => l?.piece === inHand);
      if (from >= 0) lectern[from] = null;
      lectern[s] = { piece: inHand, flipH: false, flipV: false };
      onChange({ ...state, lectern });
      onLay();
      return;
    }
    if (!there) return;
    // four ways round, in turn: as it was, back to front, upside down, both
    const turn = (Number(there.flipH) + 2 * Number(there.flipV) + 1) % 4;
    lectern[s] = { ...there, flipH: Boolean(turn & 1), flipV: Boolean(turn & 2) };
    onChange({ ...state, lectern });
  };
  const eject = (s: number) => {
    if (!active) return onPick();
    if (!state.lectern[s]) return;
    const lectern = [...state.lectern];
    lectern[s] = null;
    onChange({ ...state, lectern });
    onLay();
  };

  return (
    <FarSide a={a}>
      <group {...onWall(a, 0.3, 0)} {...machine("organ")}>
        <pointLight position={[0, 1.4, 0.8]} color="#FFC890" intensity={2.4} distance={2.4} />
        <pointLight position={[0, 0.35, 0.8]} color="#FFC890" intensity={1.4} distance={1.6} />
        {!active && (
          <group position={[0, y, 0]}>
            <Approach w={1.6} h={1.8} onPick={onPick} />
          </group>
        )}

        {/* the windchest, and the whistles on it, tallest and lowest first */}
        <mesh position={[0, CHEST_Y, 0]}>
          <boxGeometry args={[ROWS * SPACING + 0.08, 0.12, 0.16]} />
          <meshStandardMaterial color="#5A3A24" roughness={0.8} />
        </mesh>
        {HANDLES.map((h, k) => {
          const tall = 0.5 - k * 0.05;
          return (
            <group key={h} position={[handleX(k), CHEST_Y + 0.06, 0]}>
              <mesh position={[0, tall / 2, 0]}>
                <cylinderGeometry args={[0.03, 0.03, tall, 16]} />
                <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
              </mesh>
              {/* the mouth, where the steam speaks */}
              <mesh position={[0, 0.07, 0.031]}>
                <planeGeometry args={[0.03, 0.02]} />
                <meshBasicMaterial color="#1A120C" />
              </mesh>
              <mesh ref={(m) => void (wisps.current[k] = m)} position={[0, 0.05, 0.05]} visible={false}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color="#F2EEE8" transparent opacity={0} depthWrite={false} />
              </mesh>
            </group>
          );
        })}

        {/* the chains and their handles */}
        {HANDLES.map((h, k) => (
          <group key={h} position={[handleX(k), 0, 0.06]}>
            <group ref={(g) => void (chains.current[k] = g)}>
              <mesh position={[0, (CHEST_Y + HANDLE_Y) / 2, 0]}>
                <cylinderGeometry args={[0.004, 0.004, CHEST_Y - HANDLE_Y, 6]} />
                <meshStandardMaterial color="#8C8A86" metalness={0.8} roughness={0.3} />
              </mesh>
              <group position={[0, HANDLE_Y - 0.03, 0]}>
                <mesh position={[0, 0, -0.004]}>
                  <circleGeometry args={[0.05, 20]} />
                  <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} side={DoubleSide} />
                </mesh>
                <Mark h={h} r={0.03} color="#F2E6C8" />
              </group>
            </group>
            {/* the pad stays put while the chain comes down, or the finger lets go of nothing */}
            <mesh
              position={[0, HANDLE_Y - 0.06, 0.03]}
              onPointerDown={(e) => {
                e.stopPropagation();
                press(k, e.nativeEvent.timeStamp);
              }}
            >
              <boxGeometry args={[0.17, 0.2, 0.1]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        ))}
        <Fog thick={fan === "ok" ? 0 : fan === "wrong" ? 1 : 0.85} reduced={reduced} />

        {/* the lectern: a board, a rail with the pins, and a lever under each slot */}
        <mesh position={[0, LECTERN_Y + CARD_H / 2, 0]}>
          <planeGeometry args={[LECTERN_W + 0.08, CARD_H + 0.08]} />
          <meshStandardMaterial color="#4A2E1C" roughness={0.9} />
        </mesh>
        <mesh position={[0, LECTERN_Y + CARD_H + 0.02, 0.01]}>
          <boxGeometry args={[LECTERN_W + 0.08, 0.02, 0.02]} />
          <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
        </mesh>
        {PINS.map((x) => {
          const s = Math.min(2, Math.floor(x / STRIP));
          const px = slotX(s) + (s === 0 ? SHAPE_M : 0) + (x - s * STRIP) * COL_W;
          return (
            <mesh key={x} position={[px, LECTERN_Y + CARD_H - TOP_M / 2, 0.012]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.008, 0.008, 0.03, 10]} />
              <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
            </mesh>
          );
        })}
        {[0, 1, 2].map((s) => (
          <Slot key={s} s={s} laid={state.lectern[s]} onTap={tapSlot} onEject={eject} />
        ))}
        {/* once the card is whole, the latch under the keyboard: sprung when the tune is played */}
        <mesh position={[0, CHEST_Y - 0.09, 0.09]} rotation-z={state.played ? 0.9 : 0}>
          <boxGeometry args={[0.1, 0.022, 0.02]} />
          <meshStandardMaterial
            color={state.played ? "#FFD27A" : IRON}
            emissive={state.played ? "#FFB040" : "#000000"}
            emissiveIntensity={state.played ? 0.9 : 0}
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      </group>
    </FarSide>
  );
}

/** One slot of the lectern: what lies in it, a pad to tap it, and the lever that lifts its piece out. */
function Slot({
  s,
  laid,
  onTap,
  onEject,
}: {
  s: number;
  laid: Laid | null;
  onTap: (s: number) => void;
  onEject: (s: number) => void;
}) {
  const tap = useTap(() => onTap(s));
  const lift = useTap(() => onEject(s));
  const w = SLOT_W[s];
  return (
    <group>
      {/* the slot's outline, faint, so an empty lectern shows where pieces go */}
      <mesh position={[slotX(s) + w / 2, LECTERN_Y + CARD_H / 2, 0.005]}>
        <planeGeometry args={[w - 0.01, CARD_H - 0.01]} />
        <meshBasicMaterial color="#2E1C10" />
      </mesh>
      {laid && <LaidPiece laid={laid} slot={s} />}
      <mesh position={[slotX(s) + w / 2, LECTERN_Y + CARD_H / 2, 0.06]} {...tap}>
        <planeGeometry args={[w, CARD_H]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* the lever that lifts the piece back out */}
      <group position={[slotX(s) + w / 2, LECTERN_Y - 0.05, 0.03]} {...lift}>
        <mesh rotation-z={laid ? -0.5 : 0.5}>
          <boxGeometry args={[0.07, 0.014, 0.014]} />
          <meshStandardMaterial color="#9A9A9A" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[laid ? 0.03 : -0.03, laid ? -0.017 : -0.017, 0]}>
          <sphereGeometry args={[0.014, 10, 8]} />
          <meshStandardMaterial color="#B0201A" roughness={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
