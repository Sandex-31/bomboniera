import { useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { useTap } from "../Hotspot";
import { NOTCHES, OBJECTS, canPut, tilt, weigh, type HoistState, type Place, type Thing } from "../../lib/hoist";
import { Approach, COPPER, FarSide, IRON, SPOTS, onWall } from "./hall";

/*
 * The hoist against the wall: a beam on a post, the cage hanging from its
 * short end down into a pit in the floor, five notches along its long end.
 * Beside it, a bench with a little two-pan scale, and the five things lying
 * on the floor in front. A thing is picked up with a tap and put down with
 * another: on a notch, on a pan, or back where it lay.
 */

/** Where the beam turns, how far out the cage hangs, and the step between notches. */
const PIVOT: [number, number] = [-0.1, 1.38];
const CAGE_ARM = 0.34;
const STEP = 0.14;
/** How far the beam leans when it tips: enough to read, never how much. */
const LEAN = 0.16;
/** The bench scale: its post, and how far out its pans hang. */
const SCALE: [number, number] = [0.52, 0.86];
const PAN_ARM = 0.2;
/** How far down a thing hangs from its hook, or a pan from the scale's beam. */
const DROP = 0.13;
const PAN_DROP = 0.2;
/** Where each thing lies when it is not hung or weighed. */
const HOME: Record<Thing, [number, number, number]> = {
  palla: [-0.14, 0.05, 0.42],
  incudine: [0.06, 0.05, 0.46],
  campana: [0.26, 0.05, 0.42],
  secchio: [0.46, 0.05, 0.46],
  ruota: [0.66, 0.05, 0.42],
};
/** The cage, down in the pit and up at the top. */
const CAGE_DOWN = -0.12;
const CAGE_UP = 0.62;

/**
 * The five things. They are drawn about the same size, and what they look
 * like says nothing about what they weigh: the big bucket is nearly empty,
 * the little anvil is solid.
 */
function Shape({ thing }: { thing: Thing }) {
  const iron = <meshStandardMaterial color="#3A3634" metalness={0.7} roughness={0.45} />;
  switch (thing) {
    case "palla":
      return (
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.05, 18, 14]} />
          {iron}
        </mesh>
      );
    case "incudine":
      return (
        <group position={[0, 0.02, 0]}>
          <mesh position={[0, 0.045, 0]}>
            <boxGeometry args={[0.1, 0.025, 0.045]} />
            {iron}
          </mesh>
          <mesh position={[0.06, 0.045, 0]} rotation-z={-Math.PI / 2}>
            <coneGeometry args={[0.018, 0.04, 8]} />
            {iron}
          </mesh>
          <mesh position={[0, 0.015, 0]}>
            <boxGeometry args={[0.05, 0.035, 0.04]} />
            {iron}
          </mesh>
        </group>
      );
    case "campana":
      return (
        <group>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.022, 0.05, 0.08, 16, 1, true]} />
            <meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.3} side={2} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <sphereGeometry args={[0.022, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      );
    case "secchio":
      return (
        <group>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.055, 0.045, 0.1, 16, 1, true]} />
            <meshStandardMaterial color="#6A6460" metalness={0.6} roughness={0.5} side={2} />
          </mesh>
          {/* a few lumps of coal at the bottom, no more */}
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[0.044, 0.044, 0.012, 12]} />
            <meshStandardMaterial color="#141210" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.055, 0.004, 6, 20, Math.PI]} />
            <meshStandardMaterial color="#8C8A86" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      );
    case "ruota":
      // a broken gear: a ring of teeth with a bite out of it
      return (
        <group position={[0, 0.055, 0]}>
          <mesh>
            <torusGeometry args={[0.04, 0.012, 8, 18, Math.PI * 1.6]} />
            <meshStandardMaterial color="#8A6A3A" metalness={0.7} roughness={0.4} />
          </mesh>
          {Array.from({ length: 7 }, (_, k) => {
            const t = (k / 7) * Math.PI * 1.6;
            return (
              <mesh key={k} position={[Math.cos(t) * 0.055, Math.sin(t) * 0.055, 0]} rotation-z={t}>
                <boxGeometry args={[0.018, 0.014, 0.02]} />
                <meshStandardMaterial color="#8A6A3A" metalness={0.7} roughness={0.4} />
              </mesh>
            );
          })}
        </group>
      );
  }
}

/** A thing where it is: a tap picks it up, or puts down what is in hand in its place. */
function Item({
  thing,
  held,
  hanging,
  onTap,
}: {
  thing: Thing;
  held: boolean;
  /** Hung from a hook: it dangles under it on a short chain. */
  hanging: boolean;
  onTap: (t: Thing) => void;
}) {
  const tap = useTap(() => onTap(thing));
  return (
    <group {...tap}>
      {hanging && (
        <mesh position={[0, -DROP / 2 + 0.02, 0]}>
          <cylinderGeometry args={[0.004, 0.004, DROP - 0.04, 6]} />
          <meshStandardMaterial color="#8C8A86" metalness={0.8} roughness={0.3} />
        </mesh>
      )}
      <group position={[0, hanging ? -0.11 : 0, 0]} scale={held ? 1.15 : 1}>
        <Shape thing={thing} />
        {held && (
          <mesh position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.085, 16, 12]} />
            <meshBasicMaterial color="#FFD27A" transparent opacity={0.18} depthWrite={false} />
          </mesh>
        )}
      </group>
      {/* a pad round it for a thumb */}
      <mesh position={[0, hanging ? -0.06 : 0.05, 0.03]}>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** A spot a thing can be put on: a hook, a pan, its place on the floor. */
function Spot({ onTap, r = 0.07, children }: { onTap: () => void; r?: number; children?: ReactNode }) {
  const tap = useTap(onTap);
  return (
    <group {...tap}>
      <mesh>
        <sphereGeometry args={[r, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {children}
    </group>
  );
}

export default function Hoist({
  state,
  winding,
  active,
  reduced,
  onPick,
  onChange,
}: {
  state: HoistState;
  /** The winch's shaft turns the right way. */
  winding: boolean;
  active: boolean;
  reduced: boolean;
  onPick: () => void;
  onChange: (next: HoistState) => void;
}) {
  const { a, y } = SPOTS.hoist;
  const [held, setHeld] = useState<Thing | null>(null);
  const beam = useRef<Group>(null);
  const scaleBeam = useRef<Group>(null);
  const pans = useRef<(Group | null)[]>([]);
  const cage = useRef<Group>(null);
  const drum = useRef<Group>(null);
  const lid = useRef<Group>(null);
  const rope = useRef<Mesh>(null);
  const tips = tilt(state);
  const leans = weigh(state);
  const up = tips === 0 && winding;

  useFrame((_, dt) => {
    const ease = reduced ? 1 : Math.min(1, dt * 3);
    if (beam.current) beam.current.rotation.z += (-tips * LEAN - beam.current.rotation.z) * ease;
    if (scaleBeam.current) {
      scaleBeam.current.rotation.z += (-leans * LEAN - scaleBeam.current.rotation.z) * ease;
      // the pans hang straight down whatever the beam does
      pans.current.forEach((p) => p && (p.rotation.z = -scaleBeam.current!.rotation.z));
    }
    if (cage.current) {
      const goal = up ? CAGE_UP : CAGE_DOWN;
      cage.current.position.y += (goal - cage.current.position.y) * (reduced ? 1 : Math.min(1, dt * 0.8));
    }
    if (rope.current && cage.current && beam.current) {
      // from the top of the cage up to the end of the beam, wherever both are
      const end = PIVOT[1] + Math.sin(beam.current.rotation.z) * -CAGE_ARM;
      const gap = Math.max(0.01, end - cage.current.position.y - 0.28);
      rope.current.scale.y = gap;
      rope.current.position.y = 0.28 + gap / 2;
    }
    if (drum.current && winding && !reduced) drum.current.rotation.z += dt * (up ? 1.5 : 0.6);
    if (lid.current) lid.current.position.x += ((state.crate ? 0.16 : 0) - lid.current.position.x) * ease;
  });

  /** Puts down what is in hand at `place`, if it fits there. */
  const putAt = (place: Place) => {
    if (!active) return onPick();
    if (!held || !canPut(state, held, place)) return;
    onChange({ ...state, where: { ...state.where, [held]: place } });
    setHeld(null);
  };
  const tapThing = (t: Thing) => {
    if (!active) return onPick();
    if (held === t) return setHeld(null);
    // a thing tapped with another in hand: the one in hand takes its place if it can
    if (
      held &&
      state.where[t] !== "posto" &&
      canPut({ ...state, where: { ...state.where, [t]: "posto" } }, held, state.where[t])
    ) {
      onChange({ ...state, where: { ...state.where, [held]: state.where[t], [t]: "posto" } });
      setHeld(null);
      return;
    }
    setHeld(t);
  };
  const crateTap = useTap(() => {
    if (!active) return onPick();
    if (!up) return;
    if (!state.crate) onChange({ ...state, crate: true });
    else if (!state.piece) onChange({ ...state, piece: true });
  });

  const at = (place: Place) => OBJECTS.filter((t) => state.where[t] === place);
  const item = (t: Thing, hanging = false) => (
    <Item key={t} thing={t} held={held === t} hanging={hanging} onTap={tapThing} />
  );

  return (
    <FarSide a={a}>
      <group {...onWall(a, 0.3, 0)}>
        <pointLight position={[0.2, 1.5, 0.7]} color="#FFC890" intensity={2.4} distance={2.4} />
        <pointLight position={[0.25, 0.35, 0.9]} color="#FFC890" intensity={1.6} distance={1.6} />
        {!active && (
          <group position={[0.2, y, 0]}>
            <Approach w={1.4} h={1.7} onPick={onPick} />
          </group>
        )}

        {/* the pit, and the cage in it */}
        <mesh position={[PIVOT[0] - CAGE_ARM, 0.003, 0.12]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.2, 24]} />
          <meshBasicMaterial color="#050302" />
        </mesh>
        <group ref={cage} position={[PIVOT[0] - CAGE_ARM, CAGE_DOWN, 0.12]}>
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} position={[sx * 0.11, 0.14, sz * 0.09]}>
                <boxGeometry args={[0.012, 0.28, 0.012]} />
                <meshStandardMaterial color={IRON} metalness={0.7} roughness={0.4} />
              </mesh>
            )),
          )}
          {[0, 0.28].map((yy) => (
            <mesh key={yy} position={[0, yy, 0]}>
              <boxGeometry args={[0.24, 0.012, 0.2]} />
              <meshStandardMaterial color={IRON} metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
          {/* the crate in it, its lid slid aside once opened, and in it a strip of card */}
          <group position={[0, 0.06, 0]} {...crateTap}>
            <mesh>
              <boxGeometry args={[0.16, 0.1, 0.12]} />
              <meshStandardMaterial color="#7A5232" roughness={0.9} />
            </mesh>
            <group ref={lid} position={[0, 0.055, 0]}>
              <mesh>
                <boxGeometry args={[0.17, 0.012, 0.13]} />
                <meshStandardMaterial color="#8A6040" roughness={0.9} />
              </mesh>
            </group>
            {state.crate && !state.piece && (
              <mesh position={[0, 0.052, 0]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[0.1, 0.06]} />
                <meshStandardMaterial color="#E8DCC0" emissive="#E8DCC0" emissiveIntensity={0.25} roughness={0.9} />
              </mesh>
            )}
          </group>
          {/* the rope up to the beam, as long as the gap */}
          <mesh ref={rope} position={[0, 0.28 + 0.5, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 1, 6]} />
            <meshStandardMaterial color="#8A7A5A" roughness={0.9} />
          </mesh>
        </group>

        {/* the post, the drum of the winch on it, and the beam */}
        <mesh position={[PIVOT[0], PIVOT[1] / 2, 0]}>
          <boxGeometry args={[0.06, PIVOT[1], 0.06]} />
          <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
        </mesh>
        <group position={[PIVOT[0], PIVOT[1], 0.12]}>
          <group ref={drum} position={[0, 0, -0.06]}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
              <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <boxGeometry args={[0.13, 0.012, 0.01]} />
              <meshStandardMaterial color="#3A3028" />
            </mesh>
          </group>
          <group ref={beam}>
            <mesh position={[(NOTCHES * STEP - CAGE_ARM) / 2 + 0.02, 0, 0]}>
              <boxGeometry args={[NOTCHES * STEP + CAGE_ARM + 0.1, 0.035, 0.04]} />
              <meshStandardMaterial color="#5A3A24" roughness={0.8} />
            </mesh>
            {Array.from({ length: NOTCHES }, (_, k) => {
              const n = (k + 1) as Place;
              const there = at(n)[0];
              return (
                <group key={k} position={[(k + 1) * STEP, -0.02, 0]}>
                  {/* the hook, hanging down from the notch */}
                  <mesh position={[0, -0.015, 0]}>
                    <torusGeometry args={[0.012, 0.003, 6, 12, Math.PI * 1.5]} />
                    <meshStandardMaterial color="#8C8A86" metalness={0.8} roughness={0.3} />
                  </mesh>
                  <group position={[0, -0.03, 0]}>
                    {there ? item(there, true) : <Spot onTap={() => putAt(n)} r={0.065} />}
                  </group>
                </group>
              );
            })}
          </group>
        </group>

        {/* the bench and the scale on it */}
        <mesh position={[SCALE[0], 0.27, 0.12]}>
          <boxGeometry args={[0.66, 0.035, 0.26]} />
          <meshStandardMaterial color="#5A3A24" roughness={0.85} />
        </mesh>
        {[-0.29, 0.29].map((dx) => (
          <mesh key={dx} position={[SCALE[0] + dx, 0.13, 0.12]}>
            <boxGeometry args={[0.03, 0.26, 0.2]} />
            <meshStandardMaterial color="#4A2E1C" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[SCALE[0], (SCALE[1] + 0.29) / 2, 0.12]}>
          <cylinderGeometry args={[0.012, 0.018, SCALE[1] - 0.29, 10]} />
          <meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.3} />
        </mesh>
        <group position={[SCALE[0], SCALE[1], 0.12]}>
          <group ref={scaleBeam}>
            <mesh>
              <boxGeometry args={[PAN_ARM * 2 + 0.04, 0.016, 0.016]} />
              <meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.3} />
            </mesh>
            {(["sinistra", "destra"] as const).map((side, k) => (
              <group key={side} position={[(k ? 1 : -1) * PAN_ARM, 0, 0]}>
                <group ref={(g) => void (pans.current[k] = g)}>
                  <mesh position={[0, -PAN_DROP / 2, 0]}>
                    <cylinderGeometry args={[0.003, 0.003, PAN_DROP, 6]} />
                    <meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.3} />
                  </mesh>
                  <group position={[0, -PAN_DROP, 0]}>
                    <mesh>
                      <cylinderGeometry args={[0.1, 0.085, 0.015, 20]} />
                      <meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.3} />
                    </mesh>
                    <Spot onTap={() => putAt(side)} r={0.1} />
                    {at(side).map((t, j) => (
                      <group key={t} position={[(j - (at(side).length - 1) / 2) * 0.09, 0.008, 0]}>
                        {item(t)}
                      </group>
                    ))}
                  </group>
                </group>
              </group>
            ))}
          </group>
        </group>

        {/* where the things lie, on the floor in front */}
        {OBJECTS.map((t) => (
          <group key={t} position={HOME[t]}>
            {state.where[t] === "posto" ? item(t) : <Spot onTap={() => putAt("posto")} r={0.06} />}
          </group>
        ))}
      </group>
    </FarSide>
  );
}
