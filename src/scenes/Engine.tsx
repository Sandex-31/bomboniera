import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, events, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  BackSide,
  CanvasTexture,
  Plane,
  Vector3,
  RepeatWrapping,
  SRGBColorSpace,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import CameraRig from "./CameraRig";
import { tappedJustNow, useTap } from "./Hotspot";
import Rotom from "./Rotom";
import Keeper from "./Keeper";
import CardPieces from "../components/CardPieces";
import Boilers, { BOILER_ANGLES, doorAt } from "./machines/Boilers";
import Pipes from "./machines/Pipes";
import Gears from "./machines/Gears";
import Hoist from "./machines/Hoist";
import Organ from "./machines/Organ";
import Press, { HOLE_R as PRESS_HOLE_R } from "./machines/Press";
import {
  BOILERS_KEY,
  GEARS_KEY,
  HOIST_KEY,
  ORGAN_KEY,
  PIPES_KEY,
  PRESS_KEY,
  boilerLine,
  cardLine,
  pressLine,
} from "../data/puzzle";
import { loadBoilers, steamOf, type BoilerState } from "../lib/boilers";
import { flow as steamFlow, loadPipes, type PipesState } from "../lib/pipes";
import { loadGears, spin as spinGears, type GearsState } from "../lib/gears";
import { loadHoist, type HoistState } from "../lib/hoist";
import { MELODY, assembled, loadOrgan, type OrganState, type PieceId } from "../lib/card";
import { organ as organVoice } from "../lib/organ";
import { BLOWS, BREAK_MS, LINE_MS, loadPress, type PressState } from "../lib/press";
import { FLIGHT, type View } from "./focus";
import { BURN_MS, moveMs, type Move } from "../lib/descent";
import {
  BRICK,
  COPPER,
  Carried,
  FAR,
  FarSide,
  focused,
  burning as lampsFor,
  HALL_R,
  IRON,
  MORTAR,
  PRESS_VIEW,
  SPOTS,
  WALL_H,
  facing,
  onlySeen,
  onWall,
  type MachineId,
} from "./machines/hall";

/*
 * The third floor: the machine room, in the terrace below Babel. Dark brick
 * and iron where Babel is warm stone; boilers, copper pipes round the wall,
 * great gears, levers and gauges. It is found cold and dark: Heat Rotom is
 * the only fire left, and the room comes back to life one machine at a time
 * as the visitor works them. Each machine is walked up to with a tap.
 */

/** Where the way down from the sarcophagus comes through the ceiling. */
const HOLE_Y = 2.55;
const HOLE_R = 0.3;

/** Width the camera fits, as on the other floors, so phones see all of it. */
const FIT_W = 7;

const HALL_VIEW: View = {
  target: [0, 0.95, 0],
  azimuth: Math.PI / 4,
  polar: 0.95,
  zoom: 1,
  spread: { azimuth: Math.PI, polar: 0.25 },
};

/** Up under the hole, looking at where Rotom is about to come through, and where it burns. */
/**
 * Where Rotom floats in the hall, and comes in and goes out through the
 * ceiling: off to the left of the press, which stands in the middle.
 */
const ASIDE: [number, number, number] = [-0.85, 0, 0.85];

const CEILING_VIEW: View = {
  target: [ASIDE[0], 1.5, ASIDE[2]],
  azimuth: Math.PI / 4,
  polar: 0.8,
  zoom: 2,
  spread: { azimuth: 0.1, polar: 0.05 },
};

/** Up from the well: the camera waits over the hole in the floor, where Rotom is about to rise. */
const HOLE_VIEW: View = {
  target: [0, 0.3, 0],
  azimuth: Math.PI / 4,
  polar: 0.8,
  zoom: 2,
  spread: { azimuth: 0.1, polar: 0.05 },
};

/** Standing in front of one boiler: they are worked one at a time, up close. */
// high enough to take in the smoke over the chimney, which is the one hint at the damper
const BOILER_VIEWS = BOILER_ANGLES.map((a) => facing({ a, y: 0.95, zoom: 2.9, polar: 1.12 }));

/** Standing in front of each machine. */
const VIEWS: Record<MachineId, View> = {
  boilers: BOILER_VIEWS[1],
  pipes: facing(SPOTS.pipes),
  gears: facing(SPOTS.gears),
  hoist: facing(SPOTS.hoist),
  organ: facing(SPOTS.organ),
  press: PRESS_VIEW,
};

/**
 * Where Rotom waits by boiler `i`, to be picked up and put in: out in front
 * of it and off to one side, low, where it hides neither the door nor the
 * gauge.
 */
function waitBy(i: number): [number, number, number] {
  const [x, , z] = doorAt(i);
  const a = BOILER_ANGLES[i];
  // towards the middle, and along the wall
  const out = [-Math.cos(a), -Math.sin(a)];
  const side = [-Math.sin(a), Math.cos(a)];
  return [x + out[0] * 0.35 + side[0] * 0.62, -0.24, z + out[1] * 0.35 + side[1] * 0.62];
}

/**
 * Where Rotom keeps while a machine on the wall at angle `a` is worked: off
 * to one side along the wall, out of the shot, so it never floats between
 * the camera and the machine.
 */
function outOfTheWay(a: number): [number, number, number] {
  // the side away from the boilers, which crowd the shot from the other
  const side = Math.sin(a - FAR) >= 0 ? 1 : -1;
  return [-Math.sin(a) * 2.25 * side, -0.2, Math.cos(a) * 2.25 * side];
}

/** How much light the hall has with no boiler lit, and what each lit one adds. */
// cold, the hall is near black: Rotom and the embers are all there is to go by
const DARK = { ambient: 0.04, hemi: 0.03 };
const PER_BOILER = { ambient: 0.15, hemi: 0.14 };

const GEARS = [
  { a: FAR - 0.55, r: 0.36, y: 1.25, dir: 1 },
  { a: FAR + 0.55, r: 0.3, y: 1.3, dir: -1 },
];
/** How many arcs the pipes round the hall are cut into, to come and go one at a time. */
const PIPE_ARCS = 24;

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

/** A great gear on the wall, turning slowly once driven; its neighbour turns the other way. */
function Gear({
  a,
  r,
  y,
  dir,
  turning,
  reduced,
}: {
  a: number;
  r: number;
  y: number;
  dir: number;
  /** Whether anything drives it yet. */
  turning: boolean;
  reduced: boolean;
}) {
  const wheel = useRef<Group>(null);
  useFrame((_, dt) => {
    if (wheel.current && turning && !reduced) wheel.current.rotation.z += dir * 0.3 * dt;
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

/** The camera shaken by each blow of the hammer. */
function Shaker({ at, reduced }: { at: number; reduced: boolean }) {
  const offset = useRef(new Vector3());
  useFrame(({ camera }) => {
    camera.position.sub(offset.current);
    offset.current.set(0, 0, 0);
    if (reduced || !Number.isFinite(at)) return;
    const t = performance.now() - at;
    const hit = BLOWS.map((b) => t - b).find((d) => d >= 0 && d < 350);
    if (hit === undefined) return;
    const k = (1 - hit / 350) * 0.06;
    offset.current.set(Math.sin(t * 0.21) * k, Math.sin(t * 0.17 + 1) * k, Math.sin(t * 0.13 + 2) * k);
    camera.position.add(offset.current);
  });
  return null;
}

export default function Engine({
  reduced,
  onScene,
  onUp,
  onDown,
  deep,
  fromBelow,
  arrivedAt,
  first,
  start,
}: {
  reduced: boolean;
  /** Whether a scene is playing, for the desktop to clear itself. */
  onScene: (on: boolean) => void;
  /** The hole in the ceiling was tapped: back up to Babel. */
  onUp: () => void;
  /** Rotom has dropped through the hole the press made: on to the well. */
  onDown: (first: boolean) => void;
  /** Whether the visitor has been down to the well before. */
  deep: boolean;
  /** Whether they came up from the well, not down from Babel. */
  fromBelow: boolean;
  /** When the visitor came down, or -Infinity if they were already here. */
  arrivedAt: number;
  /** Whether that was the first time down, which is the long way. */
  first: boolean;
  /** A machine to start in front of instead of the whole hall: for looking at one on its own. */
  start?: MachineId;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const [flying, setFlying] = useState(false);
  /** The boilers, as the visitor left them. Which of them burn lights the hall. */
  const [boilers, setBoilers] = useState<BoilerState>(loadBoilers);
  useEffect(() => {
    try {
      localStorage.setItem(BOILERS_KEY, JSON.stringify(boilers));
    } catch {
      /* storage unavailable — the boilers still burn for this visit */
    }
  }, [boilers]);
  const burning = boilers.lit.filter(Boolean).length;
  /** The pipes, and where the steam of the lit boilers goes through them. */
  const [pipes, setPipes] = useState<PipesState>(loadPipes);
  useEffect(() => {
    try {
      localStorage.setItem(PIPES_KEY, JSON.stringify(pipes));
    } catch {
      /* storage unavailable — the panel still works for this visit */
    }
  }, [pipes]);
  const steam = useMemo(() => steamFlow(pipes, steamOf(boilers)), [pipes, boilers]);
  /** The gear board, and how it turns with the round line driving its motor or not. */
  const [gears, setGears] = useState<GearsState>(loadGears);
  useEffect(() => {
    try {
      localStorage.setItem(GEARS_KEY, JSON.stringify(gears));
    } catch {
      /* storage unavailable — the gears still turn for this visit */
    }
  }, [gears]);
  const driven = steam.outlets.tondo === "ok";
  const turning = useMemo(() => spinGears(gears, driven), [gears, driven]);
  /** The hoist: what hangs where, and whether its crate has been opened. */
  const [hoist, setHoist] = useState<HoistState>(loadHoist);
  useEffect(() => {
    try {
      localStorage.setItem(HOIST_KEY, JSON.stringify(hoist));
    } catch {
      /* storage unavailable — the hoist still works for this visit */
    }
  }, [hoist]);
  /** The organ: the card on its lectern, and whether the tune has been played. */
  const [organ, setOrgan] = useState<OrganState>(loadOrgan);
  useEffect(() => {
    try {
      localStorage.setItem(ORGAN_KEY, JSON.stringify(organ));
    } catch {
      /* storage unavailable — the organ still plays for this visit */
    }
  }, [organ]);
  /** The piece of card taken out of the pocket to be laid on the lectern. */
  const [inHand, setInHand] = useState<PieceId | null>(null);
  /** The whistle the organ sounds as it plays the tune back by itself. */
  const [playing, setPlaying] = useState<number | null>(null);
  /** The press: whether the big lever has been pulled. */
  const [press, setPress] = useState<PressState>(loadPress);
  useEffect(() => {
    try {
      localStorage.setItem(PRESS_KEY, JSON.stringify(press));
    } catch {
      /* storage unavailable — the press still falls for this visit */
    }
  }, [press]);
  /** When the lever was pulled on this visit, and whether the floor has given way yet. */
  const [finaleAt, setFinaleAt] = useState(-Infinity);
  const [broken, setBroken] = useState(press.pulled);
  /** Which line Rotom is saying, if any. */
  const [line, setLine] = useState(boilerLine);
  /** Which boiler Rotom has been put in, if any. Not kept: a reload finds it in the middle. */
  const [inside, setInside] = useState<number | null>(null);
  /** When Rotom was last blown out of a boiler, black with soot. */
  const [sootAt, setSootAt] = useState(-Infinity);
  /** Rotom says its line over the first boiler lit. */
  const [saying, setSaying] = useState(false);
  /** The machine the camera stands in front of, if any. */
  const [focus, setFocus] = useState<MachineId | null>(start ?? null);
  /** The same, for the tap filter, which is set up once with the canvas. */
  const focusRef = useRef(focus);
  focusRef.current = focus;
  focused.current = focus;
  lampsFor.current = burning;
  /** Which boiler, when it is the boilers. */
  const [which, setWhich] = useState(1);
  const [zapAt, setZapAt] = useState(0);
  const walls = useMemo(brickwork, []);
  useEffect(() => () => walls.dispose(), [walls]);

  /*
   * Coming in: the camera waits under the hole, Rotom drops out of it as it
   * was in Babel and, the first time, catches fire and comes out of the
   * smoke changed; then the camera stands back to take in the hall. Coming
   * up from the well it rises out of the hole in the floor instead, as
   * Frost Rotom until the flash.
   */
  const arriving = Number.isFinite(arrivedAt) && !reduced;
  const [move, setMove] = useState<Move | undefined>(() =>
    arriving ? { at: arrivedAt, kind: "in", dir: fromBelow ? "up" : "down", fast: !first } : undefined,
  );
  const [view, setView] = useState(arriving ? (fromBelow ? HOLE_VIEW : CEILING_VIEW) : start ? VIEWS[start] : HALL_VIEW);
  const [scene, setScene] = useState(arriving);
  useEffect(() => {
    if (!arriving) return;
    const ms = moveMs(!first) * 0.6 + (first ? moveMs(false) * 0.4 + BURN_MS : 0);
    const steps = [setTimeout(() => setView(HALL_VIEW), ms), setTimeout(() => setScene(false), ms + FLIGHT * 1000)];
    return () => steps.forEach(clearTimeout);
    // once, for the arrival this floor was mounted with
  }, []);
  useEffect(() => onScene(scene), [scene, onScene]);

  /** Walking up to a machine, and back to the whole hall. Not during a scene. */
  const pick = (id: MachineId) => {
    // in the dark there is nothing to see but the boilers: the rest waits for the first fire
    if (scene || burning === 0) return;
    setFocus(id);
    setView(VIEWS[id]);
  };
  const pickBoiler = (i: number) => {
    if (scene) return;
    setFocus("boilers");
    setWhich(i);
    setInside(null);
    setView(BOILER_VIEWS[i]);
  };
  const back = () => {
    if (scene || focus === null || tappedJustNow()) return;
    setFocus(null);
    setView(HALL_VIEW);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** Back up through the hole: Rotom rises into it, and Babel takes over. */
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(leaving.current), []);
  const up = useTap(() => {
    if (scene) return;
    setScene(true);
    setMove({ at: performance.now(), kind: "out", dir: "up", fast: true });
    leaving.current = setTimeout(onUp, reduced ? 0 : moveMs(true) * 0.8);
  });
  /*
   * Down through the hole the press made: Rotom comes over it, hangs there a
   * moment, then spirals in, and the well takes over. The long way the first
   * time, the short way after.
   */
  const [descending, setDescending] = useState(false);
  const down = useTap(() => {
    if (scene || !broken) return;
    const long = !deep;
    setScene(true);
    setDescending(true);
    leaving.current = setTimeout(
      () => {
        setMove({ at: performance.now(), kind: "out", dir: "down", fast: !long });
        leaving.current = setTimeout(() => onDown(long), reduced ? 0 : moveMs(!long) * 0.8);
      },
      reduced ? 0 : 900,
    );
  });
  const zap = useTap(() => {
    if (!scene) setZapAt(performance.now());
  });

  /*
   * Carrying Rotom. In front of the boilers it can be picked up and dropped
   * into an open door; it follows the finger across an upright plane through
   * the doors, so where it is let go is where the door is on the screen.
   */
  const [held, setHeld] = useState<[number, number, number] | null>(null);
  const plane = useMemo(() => {
    const [x, , z] = doorAt(which);
    const n = new Vector3(-x, 0, -z).normalize();
    return new Plane(n, -n.dot(new Vector3(x, 0, z)));
  }, [which]);
  const hit = useMemo(() => new Vector3(), []);
  const grab = (e: ThreeEvent<PointerEvent>) => {
    if (focus !== "boilers" || scene) return;
    e.stopPropagation();
    (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
    setInside(null);
    if (e.ray.intersectPlane(plane, hit)) setHeld([hit.x, hit.y, hit.z]);
  };
  const drag = (e: ThreeEvent<PointerEvent>) => {
    if (held && e.ray.intersectPlane(plane, hit)) setHeld([hit.x, hit.y, hit.z]);
  };
  const drop = () => {
    if (!held) return;
    const [x, y, z] = doorAt(which);
    setHeld(null);
    const near = Math.hypot(held[0] - x, held[1] - y, held[2] - z) < 0.3;
    if (near && boilers.doors[which] && !boilers.lit[which]) setInside(which);
  };
  /** Where Rotom floats: held, in a boiler's mouth, or in the middle. */
  const at: [number, number, number] = descending || (arriving && fromBelow && scene)
    ? [0, 0, 0]
    : held
    ? [held[0], held[1] - 1.12 * 0.5, held[2]]
    : inside !== null
      ? [doorAt(inside)[0], doorAt(inside)[1] - 1.12 * 0.35, doorAt(inside)[2]]
      : focus === "boilers"
        ? waitBy(which)
        : focus && focus !== "press"
          ? outOfTheWay(SPOTS[focus].a)
          : ASIDE;

  /** What came of the bellows. */
  const outcome = (i: number, what: "out" | "lit" | "spat") => {
    if (what === "lit") {
      const firstFire = burning === 0;
      setBoilers((b) => ({ ...b, lit: b.lit.map((l, k) => l || k === i) }));
      setInside(null);
      if (firstFire) {
        setLine(boilerLine);
        setScene(true);
        setSaying(true);
      }
    } else if (what === "spat") {
      setInside(null);
      setSootAt(performance.now());
    }
    // put out, it stays in the boiler for another go
  };
  const said = () => {
    setSaying(false);
    setScene(false);
  };

  /** The card laid whole for the first time: Rotom has something to say about it. */
  const changeOrgan = (next: OrganState) => {
    if (!assembled(organ.lectern) && assembled(next.lectern)) {
      setLine(cardLine);
      setScene(true);
      setSaying(true);
    }
    setOrgan(next);
  };
  /** The big lever pulled: three blows of the hammer, the floor gives way, Rotom has the last word. */
  const finale = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => finale.current.forEach(clearTimeout), []);
  const pull = () => {
    if (press.pulled) return;
    setPress({ pulled: true });
    setScene(true);
    const speak = () => {
      setLine(pressLine);
      setSaying(true);
    };
    if (reduced) {
      setBroken(true);
      speak();
      return;
    }
    setFinaleAt(performance.now());
    finale.current.push(
      setTimeout(() => setBroken(true), BREAK_MS),
      setTimeout(speak, LINE_MS),
    );
  };

  /** The tune pulled right: the organ plays it back by itself over its own track, then its latch springs. */
  const played = () => {
    setScene(true);
    void organVoice()
      .song(MELODY, (k) => setPlaying(MELODY[k].note))
      .then(() => {
        setPlaying(null);
        setOrgan((o) => ({ ...o, played: true }));
        setScene(false);
      });
  };

  /** The three latches of the big lever: each lets go once its machine is right. */
  const latches = {
    quadrato: steam.outlets.quadrato === "ok",
    volano: turning.shafts.volano === "ok",
    organo: organ.played,
  };

  /** The pieces of the punched card in the visitor's pocket. */
  const found: PieceId[] = [
    ...(boilers.piece ? (["A"] as const) : []),
    ...(gears.piece ? (["B"] as const) : []),
    ...(hoist.piece ? (["C"] as const) : []),
  ];

  return (
    <>
      <Canvas
        orthographic
        dpr={[1, 1.75]}
        camera={{ position: [7, 5.6, 7], zoom: 60, near: 0.1, far: 90 }}
        events={(store) => ({ ...events(store), filter: (hits) => onlySeen(hits, focusRef.current) })}
        onPointerMissed={back}
        onPointerUp={drop}
      >
        <color attach="background" args={["#0B0705"]} />
        <ambientLight intensity={DARK.ambient + PER_BOILER.ambient * burning} color="#FFC8A0" />
        <hemisphereLight args={["#FFD0A0", "#1A0E08", DARK.hemi + PER_BOILER.hemi * burning]} />
        {/* Heat Rotom is the one fire left: it lights the middle of the hall */}
        <pointLight position={[ASIDE[0], 1.2, ASIDE[2]]} color="#FF8A3A" intensity={1.6} distance={3.2} />

        {/* the floor: iron plates, riveted in rings, and once the press is
            through, a hole in the middle of them */}
        <mesh rotation-x={-Math.PI / 2}>
          {broken ? <ringGeometry args={[PRESS_HOLE_R, HALL_R, 48]} /> : <circleGeometry args={[HALL_R, 48]} />}
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
        <mesh position={[0, WALL_H, 0]} rotation-x={-Math.PI / 2} visible={focus === null}>
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
          .filter(
            (a) =>
              ![...BOILER_ANGLES, SPOTS.pipes.a, SPOTS.gears.a, SPOTS.hoist.a, SPOTS.organ.a].some(
                (b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.35,
              ),
          )
          .map((a) => (
            <FarSide key={a} a={a}>
              <mesh position={[Math.cos(a) * (HALL_R - 0.12), 0.98, Math.sin(a) * (HALL_R - 0.12)]}>
                <cylinderGeometry args={[0.03, 0.03, 1.64, 8]} />
                <meshStandardMaterial color={COPPER} metalness={0.7} roughness={0.35} />
              </mesh>
            </FarSide>
          ))}

        <Boilers
          state={boilers}
          active={focus === "boilers" && !scene}
          which={which}
          inside={inside}
          reduced={reduced}
          onPick={pickBoiler}
          onChange={setBoilers}
          onOutcome={outcome}
        />
        {GEARS.map((g) => (
          <FarSide key={g.a} a={g.a}>
            <Gear {...g} turning={driven && !turning.jam} reduced={reduced} />
          </FarSide>
        ))}
        {/* up close they puffed big white balls over the edge of the shot */}
        {burning > 0 && focus === null && (
          <>
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
          </>
        )}

        {/* the machines still to be built, each walked up to with a tap */}
        <Pipes
          state={pipes}
          flow={steam}
          active={focus === "pipes" && !scene}
          reduced={reduced}
          onPick={() => pick("pipes")}
          onChange={setPipes}
        />
        <Gears
          state={gears}
          spin={turning}
          active={focus === "gears" && !scene}
          reduced={reduced}
          onPick={() => pick("gears")}
          onChange={setGears}
        />
        <Hoist
          state={hoist}
          winding={turning.shafts.argano === "ok"}
          active={focus === "hoist" && !scene}
          reduced={reduced}
          onPick={() => pick("hoist")}
          onChange={setHoist}
        />
        <Organ
          state={organ}
          steam={steam.outlets.triangolo === "ok"}
          fan={turning.shafts.ventola}
          inHand={inHand}
          active={focus === "organ" && !scene}
          reduced={reduced}
          playing={playing}
          onPick={() => pick("organ")}
          onChange={changeOrgan}
          onLay={() => setInHand(null)}
          onPlayed={played}
        />

        {/* the way down from the sarcophagus, through where the ceiling would
          be: a rim and the dark above it. Tapping it goes back up. */}
        <group position={[ASIDE[0], HOLE_Y, ASIDE[2]]} visible={focus === null} {...up}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[HOLE_R, HOLE_R + 0.06, 40]} />
            {/* lit by the fire below, or it is lost against the dark */}
            <meshStandardMaterial
              color="#8C6A3E"
              emissive="#FF9A4A"
              emissiveIntensity={0.6}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[HOLE_R + 0.15, 24]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
        <mesh position={[ASIDE[0], HOLE_Y - 0.5, ASIDE[2]]} visible={focus === null}>
          <cylinderGeometry args={[HOLE_R, HOLE_R * 1.6, 1, 24, 1, true]} />
          <meshBasicMaterial color="#FFB070" transparent opacity={0.1} depthWrite={false} />
        </mesh>

        {/* the hole the press made, once it has: tapping it goes down */}
        <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} visible={broken && focus === null} {...down}>
          <circleGeometry args={[PRESS_HOLE_R + 0.1, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <Shaker at={finaleAt} reduced={reduced} />
        <Press
          latches={latches}
          turning={turning.shafts.volano === "ok"}
          pulled={press.pulled}
          finaleAt={finaleAt}
          broken={broken}
          active={focus === "press" && !scene}
          hidden={focus !== null && focus !== "press"}
          reduced={reduced}
          onPick={() => pick("press")}
          onPull={pull}
        />
        <Carried
          at={at}
          // its arms of plasma reach four times its width: at full size it hid a boiler and half the press
          size={inside !== null && !held ? 0.35 : focus === "boilers" ? 0.4 : 0.6}
          instant={!!held || reduced}
        >
          <group {...zap} onPointerDown={(e) => (zap.onPointerDown(e), grab(e))} onPointerMove={drag}>
            <Suspense fallback={null}>
              <Rotom
                form="heat"
                from={fromBelow ? "frost" : "wash"}
                fire={first && !fromBelow}
                move={move}
                reduced={reduced}
                zapAt={zapAt}
                sootAt={sootAt}
                awake
              />
            </Suspense>
          </group>
          {saying && (focus === null || focus === "boilers" || focus === "press") && (
            <Html position={[0, 2.1, 0]} center zIndexRange={[6, 0]}>
              <Keeper line={line} last reduced={reduced} onNext={said} />
            </Html>
          )}
        </Carried>
        {/* in front of a machine on the wall Rotom is out of the shot: it speaks from over the machine */}
        {saying && focus !== null && focus !== "boilers" && focus !== "press" && (
          <Html position={onWall(SPOTS[focus].a, 0.9, SPOTS[focus].y + 0.55).position} center zIndexRange={[6, 0]}>
            <Keeper line={line} last reduced={reduced} onNext={said} />
          </Html>
        )}

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
          minAzimuthAngle={view.spread.azimuth >= Math.PI ? -Infinity : view.azimuth - view.spread.azimuth}
          maxAzimuthAngle={view.spread.azimuth >= Math.PI ? Infinity : view.azimuth + view.spread.azimuth}
        />
      </Canvas>
      <CardPieces
        found={found.filter((p) => !organ.lectern.some((l) => l?.piece === p))}
        inHand={inHand}
        onTake={focus === "organ" && !scene ? setInHand : undefined}
      />
    </>
  );
}
