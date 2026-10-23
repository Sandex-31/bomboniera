import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, events } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BackSide, type Intersection, type Object3D } from "three";
import CameraRig from "./CameraRig";
import { tappedJustNow, useTap } from "./Hotspot";
import Rotom from "./Rotom";
import Keeper from "./Keeper";
import { FLIGHT, type View } from "./focus";
import { moveMs, type Move } from "../lib/descent";
import { AULA_KEY, aulaLine } from "../data/puzzle";
import { INITIAL, ORDER, fail, loadAula, lockedFor, pass, type AulaState, type ExamId } from "../lib/aula/chain";
import Station from "./aula/Station";
import Libretto, { Booklet } from "./aula/Libretto";
import { Carried, onlySeen } from "./machines/hall";
import {
  BOARD,
  DESK,
  DESK_TOP,
  FIT_W,
  HALF_D,
  HALF_W,
  HALL_H,
  HOLE,
  LAB,
  PLATFORM,
  ROWS,
  ROW_DESK,
  ROW_SEAT,
  SCREEN,
  SIDE_BOARD,
  SPOTS,
  SPOT_MARK,
  TIER_D,
  TAP_W,
  tier,
  type Spot,
} from "./aula/spots";

/*
 * The fifth floor: a lecture hall, under the well. Tiers of benches step up
 * from the lecturer's desk to the entrance at the back; behind the desk the
 * big blackboard, beside it the projector screen, a side board on the left
 * wall between the windows and the front, a lab bench at the front right.
 * The light of the well comes down through a hole in the ceiling over the
 * entrance, and the windows give a pale daylight. Each exam is sat at its
 * own spot, walked up to with a tap.
 */

/** How wide the hole the well's floor gave way through is. */
const HOLE_R = 0.45;

/** Where Rotom sits: a seat in the back row, by the aisle. */
const SEAT: [number, number, number] = [2.4, tier(ROWS - 1).y + ROW_SEAT.h, tier(ROWS - 1).z + ROW_SEAT.dz];
/** Where he lands, on the floor under the hole. */
const LANDING: [number, number, number] = [HOLE[0], tier(ROWS).y, HOLE[2]];

const HALL_VIEW: View = {
  target: [0, 0.8, -0.3],
  azimuth: Math.PI / 4,
  polar: 1,
  zoom: 1,
  spread: { azimuth: 0.6, polar: 0.25 },
};

/** Up under the hole, looking at where Rotom is about to come through. */
const CEILING_VIEW: View = {
  target: [HOLE[0], tier(ROWS).y + 0.9, HOLE[2]],
  azimuth: Math.PI / 4,
  polar: 0.9,
  zoom: 2.4,
  spread: { azimuth: 0.1, polar: 0.05 },
};

/** Marks the way up, so a tap that lands on it and on a spot (`SPOT_MARK`) can be kept off the hole. */
const UP = { userData: { hole: true } };
const marked = (o: Object3D | null, key: string): boolean => !!o && (o.userData[key] === true || marked(o.parent, key));

/**
 * What a tap may land on. From the back of the hall the hole in the ceiling
 * stands in front of the benches under it: where the two overlap, the spot
 * has the tap, and the hole only what is clear of every spot.
 */
function reachable(hits: Intersection[]): Intersection[] {
  const seen = onlySeen(hits);
  return seen.some((h) => marked(h.object, "spot")) ? seen.filter((h) => !marked(h.object, "hole")) : seen;
}

const WOOD = "#6B4A33";
const WOOD_DARK = "#4A3324";
const PLASTER = "#C9C2B4";
const SLATE = "#1F3A2E";

/**
 * The desk, still waiting for its laptop: a labelled box, tapped to walk up
 * to it. The box is small; round it, while it is not the spot being
 * worked, an unseen one a finger wide on a phone takes the tap.
 */
/**
 * An exam still waiting for its puzzle: one right answer and one wrong, to
 * try the lock, the appello and the libretto with. Each puzzle's own task
 * puts the real one in its place.
 */
function Stub({ passed, onTry }: { passed: boolean; onTry: (ok: boolean) => void }) {
  return passed ? (
    <p>superato</p>
  ) : (
    <div style={{ display: "flex", gap: 12 }}>
      <button type="button" className="aula-stub" onClick={() => onTry(true)}>
        giusta
      </button>
      <button type="button" className="aula-stub" onClick={() => onTry(false)}>
        sbagliata
      </button>
    </div>
  );
}

function Placeholder({ id, focused, onPick }: { id: Spot; focused: boolean; onPick: () => void }) {
  const tap = useTap(onPick);
  return (
    <group position={SPOTS[id].position} {...SPOT_MARK}>
      {!focused && (
        <mesh {...tap}>
          <boxGeometry args={[TAP_W, TAP_W, TAP_W]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <mesh>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial color="#E8D9A8" emissive="#E8D9A8" emissiveIntensity={0.25} roughness={0.6} />
      </mesh>
      <Html position={[0, 0.3, 0]} center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
        <span className="aula-tag">
          {id}
        </span>
      </Html>
    </group>
  );
}

export default function Aula({
  reduced,
  onScene,
  onUp,
  arrivedAt,
  first,
}: {
  reduced: boolean;
  /** Whether a scene is playing, for the desktop to clear itself. */
  onScene: (on: boolean) => void;
  /** The hole in the ceiling was tapped: back up to the well. */
  onUp: () => void;
  /** When the visitor came down, or -Infinity if they were already here. */
  arrivedAt: number;
  /** Whether that was the first time down, which is the long way. */
  first: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const [flying, setFlying] = useState(false);
  const [zapAt, setZapAt] = useState(0);
  /** The spot the camera stands in front of, if any. */
  const [focus, setFocus] = useState<Spot | null>(null);

  /** The exams: what is passed, and when each was last failed. Saved on every change. */
  const [aula, setAula] = useState<AulaState>(() => {
    try {
      return loadAula(localStorage.getItem(AULA_KEY));
    } catch {
      return INITIAL;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(AULA_KEY, JSON.stringify(aula));
    } catch {
      // private mode: it will not be there next time
    }
  }, [aula]);
  /** The clock the appelli count down by: it only ticks while one of them does. */
  const [now, setNow] = useState(Date.now);
  const counting = ORDER.some((id) => lockedFor(aula.failedAt[id], now) > 0);
  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [counting]);
  const answer = (id: ExamId, ok: boolean) => {
    const t = Date.now();
    setNow(t);
    setAula((s) => (ok ? pass(s, id) : fail(s, id, t)));
  };
  const [booklet, setBooklet] = useState(false);

  /*
   * Coming in: the camera waits under the hole, Rotom drops out of it as
   * Frost Rotom and flashes into Fan Rotom, says his line (the first time
   * only), and the camera stands back to take in the hall while he goes to
   * sit at the back. A reload just finds him sitting there.
   */
  const arriving = Number.isFinite(arrivedAt) && !reduced;
  const [move, setMove] = useState<Move | undefined>(() =>
    arriving ? { at: arrivedAt, kind: "in", dir: "down", fast: !first } : undefined,
  );
  const [view, setView] = useState<View>(arriving ? CEILING_VIEW : HALL_VIEW);
  const [scene, setScene] = useState(arriving);
  /** Rotom is still where he landed, under the hole. */
  const [landed, setLanded] = useState(arriving);
  /** Rotom is saying his line on landing. */
  const [saying, setSaying] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!arriving) return;
    const ms = moveMs(!first);
    if (first) {
      // the first time down he has something to say, and the scene ends with it
      timers.current.push(setTimeout(() => setSaying(true), ms * 0.7));
    } else {
      // the short way is only the drop: the camera stands back and the scene is over
      timers.current.push(
        setTimeout(() => {
          setView(HALL_VIEW);
          setLanded(false);
        }, ms * 0.6),
        setTimeout(() => setScene(false), ms * 0.6 + FLIGHT * 1000),
      );
    }
    // once, for the arrival this floor was mounted with
  }, []);
  useEffect(() => onScene(scene), [scene, onScene]);
  const said = () => {
    setSaying(false);
    setLanded(false);
    setView(HALL_VIEW);
    timers.current.push(setTimeout(() => setScene(false), FLIGHT * 1000));
  };

  /** Walking up to a spot, and back to the whole hall. Not during a scene. */
  const pick = (id: Spot) => {
    if (scene) return;
    setFocus(id);
    setView(SPOTS[id].view);
  };
  const back = () => {
    if (scene || focus === null || tappedJustNow()) return;
    setFocus(null);
    setView(HALL_VIEW);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (booklet) setBooklet(false);
      else back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /*
   * Back up through the hole: Rotom flies over under it, rises into it, and
   * the well takes over, where he comes out as Frost Rotom again.
   */
  const up = useTap(() => {
    if (scene) return;
    setScene(true);
    setLanded(true);
    timers.current.push(
      setTimeout(
        () => {
          setMove({ at: performance.now(), kind: "out", dir: "up", fast: true });
          timers.current.push(setTimeout(onUp, reduced ? 0 : moveMs(true) * 0.8));
        },
        reduced ? 0 : 700,
      ),
    );
  });
  const zap = useTap(() => {
    if (!scene) setZapAt(performance.now());
  });

  return (
    <>
    <Canvas
      orthographic
      dpr={[1, 1.75]}
      camera={{ position: [7, 5.6, 7], zoom: 60, near: 0.1, far: 90 }}
      events={(store) => ({ ...events(store), filter: reachable })}
      onPointerMissed={back}
    >
      <color attach="background" args={["#0A0C10"]} />
      <ambientLight intensity={0.35} color="#F1E8DA" />
      <hemisphereLight args={["#E8F0FF", "#2A2018", 0.35]} />
      {/* daylight through the windows on the left */}
      <directionalLight position={[-6, 4, 1.5]} intensity={1.1} color="#DDE8F5" />
      {/* the cold white light of the well, falling through the hole onto the landing */}
      <spotLight position={[HOLE[0], HALL_H - 0.1, HOLE[2]]} angle={0.6} penumbra={1} color="#DCEBFF" intensity={18} distance={5} decay={1.2} />
      {/* and the lamp over the desk */}
      <pointLight position={[0, HALL_H - 0.3, PLATFORM.z]} color="#FFE6C0" intensity={2} distance={4} />

      {/* the box of the hall, from the inside only: the near walls and the ceiling never stand in the way */}
      <mesh position={[0, HALL_H / 2, 0]}>
        <boxGeometry args={[HALF_W * 2, HALL_H, HALF_D * 2]} />
        <meshStandardMaterial color={PLASTER} side={BackSide} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[HALF_W * 2, HALF_D * 2]} />
        <meshStandardMaterial color="#5A4E44" roughness={0.9} />
      </mesh>

      {/* the tiers, each a step up from the one in front, and the landing at the entrance */}
      {Array.from({ length: ROWS + 1 }, (_, k) => {
        const { z, y } = tier(k);
        const d = k === ROWS ? HALF_D - z : TIER_D;
        return (
          <mesh key={k} position={[0, y / 2, z + d / 2]}>
            <boxGeometry args={[HALF_W * 2, y, d]} />
            <meshStandardMaterial color={k % 2 ? "#6E6258" : "#665A50"} roughness={0.9} />
          </mesh>
        );
      })}
      {/* a long desk and a seat on every tier, short of the aisle on the right */}
      {Array.from({ length: ROWS }, (_, k) => {
        const { z, y } = tier(k);
        return (
          <group key={k} position={[-0.75, y, z]}>
            <mesh position={[0, ROW_DESK.h, ROW_DESK.dz]}>
              <boxGeometry args={[6.2, 0.04, 0.32]} />
              <meshStandardMaterial color={WOOD} roughness={0.7} />
            </mesh>
            <mesh position={[0, ROW_DESK.h / 2, ROW_DESK.dz + 0.15]}>
              <boxGeometry args={[6.2, ROW_DESK.h, 0.03]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
            </mesh>
            <mesh position={[0, ROW_SEAT.h, ROW_SEAT.dz]}>
              <boxGeometry args={[6.2, 0.04, 0.22]} />
              <meshStandardMaterial color={WOOD} roughness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* the lecturer's platform and desk */}
      <mesh position={[0, PLATFORM.h / 2, PLATFORM.z]}>
        <boxGeometry args={[5, PLATFORM.h, PLATFORM.d]} />
        <meshStandardMaterial color="#4E4038" roughness={0.85} />
      </mesh>
      <mesh position={[0, PLATFORM.h + DESK.h / 2, PLATFORM.z]}>
        <boxGeometry args={[DESK.w, DESK.h, DESK.d]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.75} />
      </mesh>
      <mesh position={[0, DESK_TOP + 0.01, PLATFORM.z]}>
        <boxGeometry args={[DESK.w + 0.06, 0.03, DESK.d + 0.06]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} />
      </mesh>

      {/* the big blackboard behind the desk, in a wooden frame, with a ledge for the chalk */}
      <group position={[BOARD.x, BOARD.y, -HALF_D + 0.03]}>
        <mesh>
          <boxGeometry args={[BOARD.w + 0.12, BOARD.h + 0.12, 0.03]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[BOARD.w, BOARD.h]} />
          <meshStandardMaterial color={SLATE} roughness={0.95} />
        </mesh>
        <mesh position={[0, -BOARD.h / 2 - 0.06, 0.06]}>
          <boxGeometry args={[BOARD.w, 0.03, 0.1]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
      </group>
      {/* the projector screen, pulled down from its roll */}
      <group position={[SCREEN.x, SCREEN.y, -HALF_D + 0.06]}>
        <mesh position={[0, SCREEN.h / 2 + 0.05, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, SCREEN.w + 0.15, 12]} />
          <meshStandardMaterial color="#3A3A40" roughness={0.6} />
        </mesh>
        <mesh>
          <planeGeometry args={[SCREEN.w, SCREEN.h]} />
          <meshStandardMaterial color="#EDEDE8" roughness={0.9} />
        </mesh>
      </group>
      {/* the side board on the left wall */}
      <group position={[-HALF_W + 0.03, SIDE_BOARD.y, SIDE_BOARD.z]} rotation-y={Math.PI / 2}>
        <mesh>
          <boxGeometry args={[SIDE_BOARD.w + 0.1, SIDE_BOARD.h + 0.1, 0.03]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[SIDE_BOARD.w, SIDE_BOARD.h]} />
          <meshStandardMaterial color={SLATE} roughness={0.95} />
        </mesh>
      </group>
      {/* the windows, further back on the left wall: pale sky in white frames */}
      {[0.3, 1.9].map((z) => (
        <group key={z} position={[-HALF_W + 0.02, 1.5, z]} rotation-y={Math.PI / 2}>
          <mesh>
            <boxGeometry args={[1.2, 1.5, 0.03]} />
            <meshStandardMaterial color="#E6E2D8" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[1.05, 1.35]} />
            <meshStandardMaterial color="#AFC8E0" emissive="#BFD6EE" emissiveIntensity={0.6} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.04, 1.35, 0.02]} />
            <meshStandardMaterial color="#E6E2D8" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* the lab bench at the front right */}
      <mesh position={[LAB.x, LAB.h / 2, LAB.z]}>
        <boxGeometry args={[LAB.w, LAB.h, LAB.d]} />
        <meshStandardMaterial color="#3E4A52" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[LAB.x, LAB.h + 0.015, LAB.z]}>
        <boxGeometry args={[LAB.w + 0.04, 0.03, LAB.d + 0.04]} />
        <meshStandardMaterial color="#20262B" roughness={0.4} />
      </mesh>

      {/* the ten exams, each at its own spot, and the desk with the libretto on it */}
      {ORDER.map((id) => (
        <Station key={id} id={id} state={aula} now={now} onTry={(ok) => answer(id, ok)} focused={focus === id} onPick={() => pick(id)}>
          {(p) => <Stub {...p} />}
        </Station>
      ))}
      <Placeholder id="desk" focused={focus === "desk"} onPick={() => pick("desk")} />
      <Booklet onOpen={() => setBooklet(true)} />

      {/* the way up: the hole in the ceiling over the entrance, a rim and the light behind it. Tapping it goes back up. */}
      <group position={HOLE} visible={focus === null} {...UP} {...up}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[HOLE_R, HOLE_R + 0.07, 40]} />
          <meshStandardMaterial color="#9DB4D8" emissive="#DCEBFF" emissiveIntensity={0.7} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[HOLE_R + 0.2, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <mesh position={[HOLE[0], (HALL_H + LANDING[1]) / 2, HOLE[2]]} visible={focus === null}>
        <cylinderGeometry args={[HOLE_R, HOLE_R * 1.6, HALL_H - LANDING[1], 32, 1, true]} />
        <meshBasicMaterial color="#DCEBFF" transparent opacity={0.07} depthWrite={false} />
      </mesh>

      <Carried at={landed ? LANDING : SEAT} size={0.5} instant={reduced}>
        {/* up close he would sit in front of whatever is on the front wall: he waits in the hall */}
        <group {...zap} visible={focus === null}>
          <Suspense fallback={null}>
            <Rotom form="fan" from="frost" move={move} reduced={reduced} zapAt={zapAt} awake />
          </Suspense>
        </group>
        {saying && (
          <Html position={[0, 2.1, 0]} center zIndexRange={[6, 0]}>
            <Keeper line={aulaLine} last reduced={reduced} onNext={said} />
          </Html>
        )}
      </Carried>

      <CameraRig view={view} controls={controls} reduced={reduced} onFlight={setFlying} fit={[FIT_W, FIT_W]} />
      <OrbitControls
        ref={controls}
        enabled={!flying && !scene && focus === null}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={view.polar - view.spread.polar}
        maxPolarAngle={view.polar + view.spread.polar}
        minAzimuthAngle={view.azimuth - view.spread.azimuth}
        maxAzimuthAngle={view.azimuth + view.spread.azimuth}
      />
    </Canvas>
    <Libretto state={aula} open={booklet} hidden={scene} onToggle={setBooklet} />
    </>
  );
}
