import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, type Group, type Mesh, type PointLight } from "three";
import { tookTap, useTap } from "../Hotspot";
import { BLOWS, BREAK_MS, free, type Latches } from "../../lib/press";
import { COPPER, IRON, Lamp, machine } from "./hall";
import { ShapeMark } from "./Pipes";

/*
 * The press in the middle of the hall: an iron frame, a hammer hung from it
 * on a piston, the flywheel the gear board turns, and in front, the big
 * lever with its three latches. Pulled all the way down once the latches are
 * free, it sets the hammer going: three blows, and the floor gives way.
 */

/** The frame faces the way the camera first looks into the hall. */
const FACING = Math.PI / 4;
const FRAME_X = 0.5;
const BEAM_Y = 1.75;
/** The hammer's head: hung up, at the bottom of a blow, and gone through the floor. */
const HEAD_UP = 1.15;
const HEAD_DOWN = 0.18;
const HEAD_GONE = -0.12;
/** Where the piston rod ends, up inside the steam cylinder. */
const ROD_TOP = BEAM_Y + 0.15;
/** Where the floor gives way. */
export const HOLE_R = 0.55;
/** How far the lever's handle swings, from up to pulled. */
const LEVER_UP = -0.55;
const LEVER_DOWN = 1.05;
/** How far a finger drags, in pixels, to pull the lever all the way. */
const DRAG = 150;

/** One of the latches on the lever's base: a lamp with the sign of the machine it waits on. */
function Latch({ x, lit, sign }: { x: number; lit: boolean; sign: "quadrato" | "volano" | "organo" }) {
  return (
    <group position={[x, 0.32, 0.13]}>
      <mesh>
        <circleGeometry args={[0.045, 20]} />
        <meshStandardMaterial
          color={lit ? "#FFD27A" : "#2A2420"}
          emissive={lit ? "#FFB040" : "#000000"}
          emissiveIntensity={lit ? 1.2 : 0}
          roughness={0.5}
        />
      </mesh>
      <group position={[0, 0, 0.003]}>
        {sign === "quadrato" && <ShapeMark shape="quadrato" size={0.02} color={lit ? "#5A3A10" : "#8A7A5A"} />}
        {sign === "volano" && (
          // a little wheel with spokes
          <group>
            <mesh>
              <torusGeometry args={[0.022, 0.005, 6, 16]} />
              <meshBasicMaterial color={lit ? "#5A3A10" : "#8A7A5A"} />
            </mesh>
            {[0, Math.PI / 3, (2 * Math.PI) / 3].map((t) => (
              <mesh key={t} rotation-z={t}>
                <planeGeometry args={[0.044, 0.005]} />
                <meshBasicMaterial color={lit ? "#5A3A10" : "#8A7A5A"} />
              </mesh>
            ))}
          </group>
        )}
        {sign === "organo" && (
          // a whistle: a tall pipe with its mouth
          <group>
            <mesh>
              <planeGeometry args={[0.014, 0.05]} />
              <meshBasicMaterial color={lit ? "#5A3A10" : "#8A7A5A"} />
            </mesh>
            <mesh position={[0, -0.012, 0.001]}>
              <planeGeometry args={[0.014, 0.008]} />
              <meshBasicMaterial color={lit ? "#FFD27A" : "#2A2420"} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

export default function Press({
  latches,
  turning,
  pulled,
  finaleAt,
  broken,
  active,
  hidden,
  reduced,
  onPick,
  onPull,
}: {
  latches: Latches;
  /** The flywheel's shaft turns the right way. */
  turning: boolean;
  /** The lever has been pulled, now or on an earlier visit. */
  pulled: boolean;
  /** When it was pulled on this visit, or -Infinity if it was before. */
  finaleAt: number;
  /** The floor has given way. */
  broken: boolean;
  active: boolean;
  /**
   * Another machine is being worked. The camera looks at it across the
   * middle of the hall, so the press would stand right in front of it.
   */
  hidden: boolean;
  reduced: boolean;
  onPick: () => void;
  onPull: () => void;
}) {
  const head = useRef<Group>(null);
  const rod = useRef<Mesh>(null);
  const hole = useRef<PointLight>(null);
  const wheel = useRef<Group>(null);
  const handle = useRef<Group>(null);
  const chunks = useRef<(Mesh | null)[]>([]);
  const cracks = useRef<(Mesh | null)[]>([]);
  /** How far down the handle is being dragged, 0 to 1, while a finger has it. */
  const [drag, setDrag] = useState<{ from: number; pull: number } | null>(null);
  const refusedAt = useRef(-Infinity);
  const ready = free(latches);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) =>
      setDrag((d) => d && { ...d, pull: Math.max(0, Math.min(1, (e.clientY - d.from) / DRAG)) });
    const up = () => {
      tookTap();
      setDrag((d) => {
        if (d && d.pull > 0.92) onPull();
        return null;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag !== null, onPull]);

  useFrame((frame, dt) => {
    const t = performance.now() - finaleAt;
    // the hammer: hung up; three blows; then down through the floor
    let y = pulled ? HEAD_GONE : HEAD_UP;
    if (pulled && Number.isFinite(finaleAt) && !reduced && t < BREAK_MS) {
      y = HEAD_UP;
      for (const at of BLOWS) {
        const u = (t - (at - 450)) / 450;
        if (u >= 0 && u < 1) y = HEAD_UP + (HEAD_DOWN - HEAD_UP) * Math.pow(u, 3);
        const back = (t - at) / 600;
        if (back >= 0 && back < 1) y = HEAD_DOWN + (HEAD_UP - HEAD_DOWN) * Math.sin((back * Math.PI) / 2);
      }
    } else if (pulled && Number.isFinite(finaleAt) && !reduced && t < BREAK_MS + 800) {
      y = HEAD_DOWN + (HEAD_GONE - HEAD_DOWN) * Math.min(1, (t - BREAK_MS) / 800);
    }
    if (head.current) head.current.position.y = y;
    // the piston rod reaches from the head up into the cylinder, however far down the head is
    if (rod.current) {
      rod.current.scale.y = ROD_TOP - y;
      rod.current.position.y = (ROD_TOP + y) / 2;
    }
    if (hole.current) hole.current.intensity = broken ? 4 : 0;
    if (wheel.current && turning && !reduced) wheel.current.rotation.z -= dt * (pulled && t < BREAK_MS ? 6 : 1.4);
    if (handle.current) {
      const shake = Math.max(0, 1 - (performance.now() - refusedAt.current) / 400);
      const goal = pulled ? LEVER_DOWN : LEVER_UP + (LEVER_DOWN - LEVER_UP) * (drag?.pull ?? 0);
      handle.current.rotation.x += (goal - handle.current.rotation.x) * Math.min(1, dt * (drag ? 30 : 8));
      handle.current.rotation.z = reduced ? 0 : Math.sin(frame.clock.elapsedTime * 50) * shake * 0.08;
    }
    // the cracks, one more with each blow
    const blowsDone = pulled ? (Number.isFinite(finaleAt) ? BLOWS.filter((at) => t >= at).length : 3) : 0;
    cracks.current.forEach((c, k) => c && (c.visible = !broken && k < blowsDone * 2));
    // the floor plates, falling away once it breaks
    chunks.current.forEach((c, k) => {
      if (!c) return;
      const u = (t - BREAK_MS) / 1000;
      c.visible = !reduced && Number.isFinite(finaleAt) && u >= 0 && u < 1;
      if (!c.visible) return;
      const a = (k / chunks.current.length) * Math.PI * 2;
      c.position.set(Math.cos(a) * HOLE_R * 0.55, -u * u * 2.2, Math.sin(a) * HOLE_R * 0.55);
      c.rotation.set(u * (k % 2 ? 3 : -3), a, u * 2);
    });
  });

  const tap = useTap(() => {
    if (!active) onPick();
  });

  return (
    <>
    {/* a lamp over the press, so its iron reads against the dark; lit even
        while the press is hidden, as a light that comes and goes stutters the
        hall: see Boilers */}
    <Lamp position={[0.4, 2.3, 0.9]} intensity={3} distance={3.2} />
    {/* the light of the floor below, there from the start and only turned up when it breaks, for the same reason */}
    <pointLight ref={hole} position={[0, -0.1, 0]} color="#DCEBFF" intensity={0} distance={2.5} />
    <group {...machine("press")} visible={!hidden}>
      {/* the hole through the floor, and the cold white light of the floor below */}
      {broken && (
        <group>
          {/* shallow, or seen from above its far end would show under the hall */}
          <mesh position={[0, -0.15, 0]}>
            <cylinderGeometry args={[HOLE_R, HOLE_R, 0.3, 32, 1, true]} />
            <meshStandardMaterial color="#1A1614" side={BackSide} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.3, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[HOLE_R, 32]} />
            <meshBasicMaterial color="#EAF4FF" />
          </mesh>
        </group>
      )}
      {Array.from({ length: 6 }, (_, k) => (
        <mesh key={k} ref={(m) => void (chunks.current[k] = m)} visible={false}>
          <boxGeometry args={[0.32, 0.03, 0.22]} />
          <meshStandardMaterial color="#3A332E" metalness={0.5} roughness={0.75} />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        return (
          <mesh
            key={k}
            ref={(m) => void (cracks.current[k] = m)}
            position={[Math.cos(a) * 0.32, 0.006, Math.sin(a) * 0.32]}
            rotation={[-Math.PI / 2, 0, -a + (k % 2 ? 0.25 : -0.2)]}
            visible={false}
          >
            <planeGeometry args={[0.5, 0.015]} />
            <meshBasicMaterial color="#0A0806" />
          </mesh>
        );
      })}

      <group rotation-y={FACING} {...tap}>
        {/* the frame: two columns and the beam across them */}
        {[-FRAME_X, FRAME_X].map((x) => (
          <mesh key={x} position={[x, BEAM_Y / 2, 0]}>
            <boxGeometry args={[0.1, BEAM_Y, 0.14]} />
            <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, BEAM_Y, 0]}>
          <boxGeometry args={[FRAME_X * 2 + 0.16, 0.14, 0.18]} />
          <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
        </mesh>
        {/* the steam cylinder on top, fed by the square line */}
        <mesh position={[0, BEAM_Y + 0.2, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.28, 20]} />
          <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
        </mesh>
        {/* the hammer, on its piston */}
        <mesh ref={rod} position={[0, (ROD_TOP + HEAD_UP) / 2, 0]} scale-y={ROD_TOP - HEAD_UP}>
          <cylinderGeometry args={[0.035, 0.035, 1, 12]} />
          <meshStandardMaterial color="#9A9A9A" metalness={0.85} roughness={0.25} />
        </mesh>
        <group ref={head} position={[0, HEAD_UP, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
            <meshStandardMaterial color="#2A2624" metalness={0.7} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <boxGeometry args={[0.54, 0.04, 0.54]} />
            <meshStandardMaterial color="#4A4440" metalness={0.8} roughness={0.35} />
          </mesh>
        </group>
        {/* the flywheel, on the right column, turned by the gear board */}
        <group position={[FRAME_X + 0.09, 1.25, 0]} rotation-y={Math.PI / 2}>
          {/* its axle, out of the column */}
          <mesh position={[0, 0, -0.04]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
            <meshStandardMaterial color="#4A4440" metalness={0.75} roughness={0.4} />
          </mesh>
          <group ref={wheel}>
            <mesh>
              <torusGeometry args={[0.3, 0.035, 10, 32]} />
              <meshStandardMaterial color="#5A5450" metalness={0.75} roughness={0.4} />
            </mesh>
            {[0, Math.PI / 3, (2 * Math.PI) / 3].map((a) => (
              <mesh key={a} rotation-z={a}>
                <boxGeometry args={[0.6, 0.03, 0.03]} />
                <meshStandardMaterial color="#4A4440" metalness={0.75} roughness={0.4} />
              </mesh>
            ))}
          </group>
        </group>

        {/* the big lever, out in front, and its three latches */}
        <group position={[-0.62, 0, 0.55]}>
          {/* a tap on the base throws the lever too, once its latches let go */}
          <mesh
            position={[0, 0.2, 0]}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (!active) return onPick();
              if (pulled) return;
              if (!ready) {
                refusedAt.current = performance.now();
                return;
              }
              tookTap();
              onPull();
            }}
          >
            <boxGeometry args={[0.42, 0.4, 0.22]} />
            <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
          </mesh>
          <Latch x={-0.13} lit={latches.quadrato} sign="quadrato" />
          <Latch x={0} lit={latches.volano} sign="volano" />
          <Latch x={0.13} lit={latches.organo} sign="organo" />
          <group ref={handle} position={[0, 0.42, 0]} rotation-x={LEVER_UP}>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.6, 10]} />
              <meshStandardMaterial color="#9A9A9A" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.62, 0]}>
              <sphereGeometry args={[0.06, 16, 12]} />
              <meshStandardMaterial color="#B0201A" roughness={0.45} />
            </mesh>
            {/* a pad round the grip, for a thumb */}
            <mesh
              position={[0, 0.5, 0]}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (!active) return onPick();
                if (pulled) return;
                if (!ready) {
                  refusedAt.current = performance.now();
                  return;
                }
                setDrag({ from: e.nativeEvent.clientY, pull: 0 });
              }}
            >
              <sphereGeometry args={[0.16, 10, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
    </>
  );
}
