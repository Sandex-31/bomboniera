import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, events } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { DPR, Steady } from "./Steady";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BackSide, type Intersection, type Object3D } from "three";
import CameraRig from "./CameraRig";
import { tappedJustNow, useTap } from "./Hotspot";
import FluteRose from "../components/FluteRose";
import type { Played } from "../lib/flute";
import Rotom from "./Rotom";
import Keeper from "./Keeper";
import { FLIGHT, type View } from "./focus";
import { moveMs, type Move } from "../lib/descent";
import { WELL_BUDS_KEY, WELL_CROWS_KEY, WELL_INSIDE_KEY, WELL_MURAL_KEY, WELL_PILLARS_KEY, WELL_TV_KEY, flameLine, insideFrom, muralLine, wallLine, wellLine } from "../data/puzzle";
import { Approach, Carried, FarSide, WALL_H, facing, onlySeen, onWall } from "./machines/hall";
import { SCREEN_Y, WALL_ANGLES, WELL_R, type WallId } from "./well/wall";
import Screen, { INSET, PANEL } from "./well/Screen";
import { savedPillars, type PillarsState } from "../lib/well/pillars";
import { savedTv, type TvState } from "../lib/well/tv";
import { savedCrows, type CrowsState } from "../lib/well/crows";
import { savedBuds, type BudsState } from "../lib/well/buds";
import { firstFlame, type Flames } from "../lib/well/flames";
import { lit, place, savedMural, type MuralState, type PieceId } from "../lib/well/mural";
import Altar, { PANEL_Y, PIT_R } from "./well/Altar";
import Overgrowth, { useStone } from "./well/Overgrowth";
import Mural from "../components/Mural";
import { useWallPillars } from "./well/WallPillars";
import { useWallTv } from "./well/WallTv";
import { useWallCrows } from "./well/WallCrows";
import { useWallBuds } from "./well/WallBuds";
import { rearmMusic, startMusic, stopMusic } from "../lib/wellMusic";

/*
 * The fourth floor: the well, in the rock under the machine room. A round
 * hall wider than the machine room's, dark stone and a dark floor, lit only
 * by the cold white light that falls through the hole the press made. An
 * altar stands in the middle, under the light; four walls stand round it,
 * each to be walked up to with a tap. It is the base the screens of the
 * walls are hung on.
 */

/** The hole above, straight over the middle: where the press broke the floor. */
const HOLE_Y = 2.55;
const HOLE_R = 0.55;

/** Width the camera fits, scaled up from the machine room's as the hall is. */
const FIT_W = 10;

/** Where Rotom floats in the hall, and comes in and goes out through the hole. */
const ASIDE: [number, number, number] = [-1.2, 0, 1.2];

/** What the camera can stand in front of: a wall, or the altar. */
export type Focus = WallId | "altar";

const HALL_VIEW: View = {
  target: [0, 0.95, 0],
  azimuth: Math.PI / 4,
  polar: 0.95,
  zoom: 1,
  spread: { azimuth: Math.PI, polar: 0.25 },
};

/** Up under the hole, looking at where Rotom is about to come through. */
const CEILING_VIEW: View = {
  target: [0, 1.5, 0],
  azimuth: Math.PI / 4,
  polar: 0.8,
  zoom: 2.2,
  spread: { azimuth: 0.1, polar: 0.05 },
};

/** Up from the hall below: the camera waits over the open well, where Rotom is about to rise. */
const PIT_VIEW: View = {
  target: [0, 0.3, 0],
  azimuth: Math.PI / 4,
  polar: 0.8,
  zoom: 2.2,
  spread: { azimuth: 0.1, polar: 0.05 },
};

/** Square in front of the mural over the altar, close enough for its pieces to be a finger wide on a phone. */
const PANEL_VIEW: View = {
  target: [0, PANEL_Y, 0],
  azimuth: Math.PI / 4,
  polar: 1.5,
  zoom: 4.4,
  spread: { azimuth: 0.05, polar: 0.03 },
};

/** Rotom's dive into the well once it opens: over it, down to the rim, and back up. Going down for good waits for a tap on the well. */
const DIVE: [number, number, number][] = [
  [0, 0.7, 0],
  [0, -0.15, 0],
  [0, 0.8, 0],
];
const DIVE_MS = 1000;

/** Where the camera stands to work a wall, and how high on it the screen is. */
const WALL_SPOT = { y: SCREEN_Y, zoom: 5.5, polar: 1.45 };

/** Standing in front of each wall, and the altar. */
const VIEWS: Record<Focus, View> = {
  tv: facing({ a: WALL_ANGLES.tv, ...WALL_SPOT }, WELL_R),
  corvi: facing({ a: WALL_ANGLES.corvi, ...WALL_SPOT }, WELL_R),
  boccioli: facing({ a: WALL_ANGLES.boccioli, ...WALL_SPOT }, WELL_R),
  pilastri: facing({ a: WALL_ANGLES.pilastri, ...WALL_SPOT }, WELL_R),
  altar: {
    target: [0, 0.5, 0],
    azimuth: Math.PI / 4,
    polar: 1.05,
    zoom: 2.4,
    spread: { azimuth: 0.4, polar: 0.2 },
  },
};

/** Where 3D Rotom goes when he enters the wall at angle `a`: into the middle of its screen, shrinking to nothing. */
function intoTheWall(a: number): [number, number, number] {
  return onWall(a, INSET + 0.05, SCREEN_Y, WELL_R).position;
}

const WALLS = Object.keys(WALL_ANGLES) as WallId[];

/** Marks the way up, so a tap that also lands on a screen can be kept off it. */
const HOLE = { userData: { hole: true } };
const marked = (o: Object3D | null, key: string): boolean => !!o && (o.userData[key] === true || marked(o.parent, key));

/**
 * What a tap may land on. From across the hall the hole in the ceiling stands
 * in front of the top of the far wall's screen: where the two overlap, the
 * screen has the tap, and the hole only what is clear of every screen.
 */
function reachable(hits: Intersection[]): Intersection[] {
  const seen = onlySeen(hits);
  return seen.some((h) => marked(h.object, "screen")) ? seen.filter((h) => !marked(h.object, "hole")) : seen;
}

export default function Well({
  reduced,
  onScene,
  onUp,
  onDown,
  deep,
  fromBelow,
  arrivedAt,
  first,
}: {
  reduced: boolean;
  /** Whether a scene is playing, for the desktop to clear itself. */
  onScene: (on: boolean) => void;
  /** The hole in the ceiling was tapped: back up to the machine room. */
  onUp: () => void;
  /** Rotom has dived into the open well: on to the hall below. */
  onDown: (first: boolean) => void;
  /** Whether the visitor has been down to the hall before. */
  deep: boolean;
  /** Whether they came up from the hall, not down from the machine room. */
  fromBelow: boolean;
  /** When the visitor came down, or -Infinity if they were already here. */
  arrivedAt: number;
  /** Whether that was the first time down, which is the long way. */
  first: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const stone = useStone();
  const [flying, setFlying] = useState(false);
  const [zapAt, setZapAt] = useState(0);
  /** The wall or the altar the camera stands in front of, if any. */
  const [focus, setFocus] = useState<Focus | null>(null);

  /*
   * Coming in: the camera waits under the hole, Rotom drops out of it as it
   * was in the machine room and flashes into Frost Rotom, says its line (the
   * first time only), and the camera stands back to take in the hall. A reload just finds it all
   * there. Coming up from the hall below it rises out of the well instead,
   * as it was down there until the flash.
   */
  const arriving = Number.isFinite(arrivedAt) && !reduced;
  const [move, setMove] = useState<Move | undefined>(() =>
    arriving ? { at: arrivedAt, kind: "in", dir: fromBelow ? "up" : "down", fast: !first } : undefined,
  );
  const [view, setView] = useState<View>(arriving ? (fromBelow ? PIT_VIEW : CEILING_VIEW) : HALL_VIEW);
  const [scene, setScene] = useState(arriving);
  /** Rotom is saying its line on landing. */
  const [saying, setSaying] = useState(false);
  /** Rotom has gone into the walls, and is pixel art on whichever is worked. */
  const [inside, setInside] = useState(() => {
    try {
      return insideFrom(localStorage.getItem(WELL_INSIDE_KEY));
    } catch {
      return false;
    }
  });
  /** Rotom is saying its line on going into the first wall. */
  const [telling, setTelling] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    rearmMusic();
    return () => {
      timers.current.forEach(clearTimeout);
      stopMusic(0);
    };
  }, []);
  useEffect(() => {
    if (!arriving) return;
    const ms = moveMs(!first);
    if (first) {
      // the first time down it has something to say, and the scene ends with it
      timers.current.push(setTimeout(() => setSaying(true), ms * 0.7));
    } else {
      // the short way is only the drop: the camera stands back and the scene is over
      timers.current.push(
        setTimeout(() => setView(HALL_VIEW), ms * 0.6),
        setTimeout(() => setScene(false), ms * 0.6 + FLIGHT * 1000),
      );
    }
    // once, for the arrival this floor was mounted with
  }, []);
  useEffect(() => onScene(scene), [scene, onScene]);
  const said = () => {
    setSaying(false);
    setView(HALL_VIEW);
    timers.current.push(setTimeout(() => setScene(false), FLIGHT * 1000));
  };

  /** Walking up to a wall or the altar, and back to the whole hall. Not during a scene. */
  const pick = (id: Focus) => {
    if (scene) return;
    setFocus(id);
    setView(id === "altar" && lit(flames()) && !mural.done ? PANEL_VIEW : VIEWS[id]);
    // the first wall: Rotom flies into it while the camera walks up, then has its say
    if (id !== "altar" && !inside) {
      setScene(true);
      timers.current.push(setTimeout(() => setTelling(true), reduced ? 0 : FLIGHT * 1000));
    }
  };
  const told = () => {
    setTelling(false);
    setInside(true);
    setScene(false);
    try {
      localStorage.setItem(WELL_INSIDE_KEY, "1");
    } catch {
      // private mode: he will say it again next time
    }
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

  /** Back up through the hole: Rotom rises into it, and the machine room takes over. */
  const up = useTap(() => {
    if (scene) return;
    setScene(true);
    stopMusic(reduced ? 300 : moveMs(true) * 0.8);
    setMove({ at: performance.now(), kind: "out", dir: "up", fast: true });
    timers.current.push(setTimeout(onUp, reduced ? 0 : moveMs(true) * 0.8));
  });
  /*
   * Down into the open well: Rotom comes over it, hangs there a moment, then
   * spirals in, and the hall below takes over. The long way the first time,
   * the short way after.
   */
  const [descending, setDescending] = useState(false);
  const down = useTap(() => {
    if (scene || !open) return;
    const long = !deep;
    setScene(true);
    setDescending(true);
    stopMusic(reduced ? 300 : 900 + moveMs(!long) * 0.8);
    timers.current.push(
      setTimeout(
        () => {
          setMove({ at: performance.now(), kind: "out", dir: "down", fast: !long });
          timers.current.push(setTimeout(() => onDown(long), reduced ? 0 : moveMs(!long) * 0.8));
        },
        reduced ? 0 : 900,
      ),
    );
  });
  const zap = useTap(() => {
    if (!scene) setZapAt(performance.now());
  });

  /** The fourth wall's state, which the pillars of every wall write to; kept as it changes. */
  const [pillars, setPillars] = useState<PillarsState>(savedPillars);
  const keepPillars = (next: PillarsState) => {
    setPillars(next);
    try {
      localStorage.setItem(WELL_PILLARS_KEY, JSON.stringify(next));
    } catch {
      // private mode: it will not be there next time
    }
  };
  /** The UV lantern, switched on and off with a button once it has been taken. */
  const [uvOn, setUvOn] = useState(false);
  /** The flame of the fourth wall has flown: Rotom says its line. */
  const [flaming, setFlaming] = useState<WallId | null>(null);
  /** The first wall's state, kept as it changes. */
  const [tvState, setTvState] = useState<TvState>(savedTv);
  const keepTv = (next: TvState) => {
    setTvState(next);
    try {
      localStorage.setItem(WELL_TV_KEY, JSON.stringify(next));
    } catch {
      // private mode: it will not be there next time
    }
  };
  /** The second wall's state, kept as it changes. */
  const [crowsState, setCrowsState] = useState<CrowsState>(savedCrows);
  const keepCrows = (next: CrowsState) => {
    setCrowsState(next);
    try {
      localStorage.setItem(WELL_CROWS_KEY, JSON.stringify(next));
    } catch {
      // private mode: it will not be there next time
    }
  };
  /** The third wall's state, kept as it changes. */
  const [budsState, setBudsState] = useState<BudsState>(savedBuds);
  const keepBuds = (next: BudsState) => {
    setBudsState(next);
    try {
      localStorage.setItem(WELL_BUDS_KEY, JSON.stringify(next));
    } catch {
      // private mode: it will not be there next time
    }
  };
  /** Which walls have given their flame, from their states. */
  const flames = (): Flames => ({ tv: tvState.flame, corvi: crowsState.flame, boccioli: budsState.flame, pilastri: pillars.flame });
  /** When each flame taken this visit sets off from its wall for its candle on the altar. */
  const [flights, setFlights] = useState<Partial<Record<WallId, number>>>({});
  /** The flame of `wall` was just taken: it rises out of the screen and flies to its candle, and if it is the floor's first the scene says its line. */
  const flamed = (wall: WallId) => {
    setFlights((f) => ({ ...f, [wall]: performance.now() + (reduced ? 0 : 1800) }));
    if (!firstFlame({ ...flames(), [wall]: true }, wall)) return;
    timers.current.push(
      setTimeout(() => {
        // wherever the visitor walked to meanwhile, the line is said in the hall, where it is in view
        setFocus(null);
        setView(HALL_VIEW);
        setScene(true);
        setFlaming(wall);
      }, reduced ? 0 : 1800),
    );
  };
  /** The community mural on the altar, kept as it changes. */
  const [mural, setMural] = useState<MuralState>(savedMural);
  /**
   * The finale, once the mural is whole: the last piece is seen landing, Rotom
   * says its line, then the well opens and he dives in. A reload finds the
   * well open.
   */
  const [finale, setFinale] = useState<"landing" | "saying" | null>(null);
  /** Where Rotom is in his dive, if he is diving. */
  const [dive, setDive] = useState<[number, number, number] | null>(null);
  const placed = (slot: number, piece: PieceId | null) => {
    const next = place(mural, slot, piece);
    setMural(next);
    try {
      localStorage.setItem(WELL_MURAL_KEY, JSON.stringify(next));
    } catch {
      // private mode: it will not be there next time
    }
    if (!next.done || mural.done) return;
    setScene(true);
    setFinale("landing");
    timers.current.push(
      setTimeout(() => {
        setFinale("saying");
        setView(VIEWS.altar);
      }, reduced ? 0 : 900),
    );
  };
  const muralSaid = () => {
    setFinale(null);
    if (reduced) {
      setScene(false);
      return;
    }
    DIVE.forEach((p, i) => timers.current.push(setTimeout(() => setDive(p), i * DIVE_MS)));
    timers.current.push(
      setTimeout(() => {
        setDive(null);
        setScene(false);
      }, DIVE.length * DIVE_MS),
    );
  };
  const open = mural.done && lit(flames()) && finale === null;

  const wall4 = useWallPillars({ state: pillars, set: keepPillars, uvOn, onFlame: () => flamed("pilastri") });
  const { onNote: tvNote, ...wall1 } = useWallTv({
    state: tvState,
    set: keepTv,
    pillars,
    setPillars: keepPillars,
    uvOn,
    onFlame: () => flamed("tv"),
  });

  const { onNote: crowsNote, ...wall2 } = useWallCrows({
    state: crowsState,
    set: keepCrows,
    pillars,
    setPillars: keepPillars,
    uvOn,
    onFlame: () => flamed("corvi"),
  });

  const { onNote: budsNote, ...wall3 } = useWallBuds({
    state: budsState,
    set: keepBuds,
    pillars,
    setPillars: keepPillars,
    uvOn,
    onFlame: () => flamed("boccioli"),
  });

  const wall = focus !== null && focus !== "altar" ? focus : null;
  /**
   * Where the flute's notes go. Each wall's room, once it has one, sets
   * `flute.current` to its own rules while it is the wall worked (and clears
   * it on leaving); until then the notes only sound.
   */
  const flute = useRef<(p: Played) => void>(() => {});
  useEffect(() => {
    flute.current = wall === "tv" ? tvNote : wall === "corvi" ? crowsNote : wall === "boccioli" ? budsNote : () => {};
    return () => {
      flute.current = () => {};
    };
  });
  const at: [number, number, number] = descending
    ? DIVE[0]
    : arriving && fromBelow && scene
      ? [0, 0, 0]
      : wall
        ? intoTheWall(WALL_ANGLES[wall])
        : (dive ?? ASIDE);

  return (
    <>
    <Canvas
      orthographic
      dpr={DPR}
      camera={{ position: [7, 5.6, 7], zoom: 60, near: 0.1, far: 90 }}
      events={(store) => ({ ...events(store), filter: reachable })}
      onPointerMissed={back}
      onPointerUp={startMusic}
    >
      <color attach="background" args={["#05070B"]} />
      <Steady />
      <ambientLight intensity={0.06} color="#9DB4D8" />
      <hemisphereLight args={["#CFE3FF", "#06080C", 0.05]} />
      {/* the cold white light of the machine room, falling through the hole onto the altar */}
      <spotLight position={[0, HOLE_Y - 0.1, 0]} angle={0.7} penumbra={1} color="#DCEBFF" intensity={40} distance={9} decay={1.2} />
      <pointLight position={[0, 1.4, 0]} color="#DCEBFF" intensity={2.5} distance={4.5} />

      {/* the floor: dark stone */}
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[PIT_R, WELL_R, 64]} />
        {stone.floor ? <meshStandardMaterial map={stone.floor} color="#7A8090" roughness={0.9} /> : <meshStandardMaterial color="#14181F" roughness={0.9} />}
      </mesh>
      {/* the wall, from the inside only */}
      <mesh position={[0, WALL_H / 2, 0]}>
        <cylinderGeometry args={[WELL_R, WELL_R, WALL_H, 64, 1, true]} />
        {stone.wall ? (
          <meshStandardMaterial map={stone.wall} color="#C0C8D8" side={BackSide} roughness={0.95} />
        ) : (
          <meshStandardMaterial color="#232A36" side={BackSide} roughness={0.95} />
        )}
      </mesh>
      {/* grass, moss and fireflies, as in a room of the game */}
      <Overgrowth reduced={reduced} />
      <mesh position={[0, WALL_H, 0]} rotation-x={-Math.PI / 2} visible={focus === null}>
        <ringGeometry args={[WELL_R, WELL_R + 0.12, 64]} />
        <meshStandardMaterial color="#2E3440" roughness={0.8} />
      </mesh>

      {/* the four walls, each a screen, walked up to with a tap */}
      {WALLS.map((id) => (
        <FarSide key={id} a={WALL_ANGLES[id]}>
          <Screen a={WALL_ANGLES[id]} {...(id === "tv" ? wall1 : id === "corvi" ? wall2 : id === "boccioli" ? wall3 : wall4)} active={focus === id && !scene} uv={pillars.uv && uvOn} reduced={reduced} />
          {focus !== id && (
            <group {...onWall(WALL_ANGLES[id], INSET, SCREEN_Y, WELL_R)}>
              <Approach w={PANEL.w} h={PANEL.h} onPick={() => pick(id)} />
            </group>
          )}
        </FarSide>
      ))}
      {flaming && (
        <Html position={[0, 1.5, 0]} center zIndexRange={[6, 0]}>
          <Keeper
            line={flameLine}
            last
            reduced={reduced}
            onNext={() => {
              setFlaming(null);
              setScene(false);
            }}
          />
        </Html>
      )}
      {telling && wall && (
        <Html position={onWall(WALL_ANGLES[wall], 0.9, SCREEN_Y + 0.3, WELL_R).position} center zIndexRange={[6, 0]}>
          <Keeper line={wallLine} last reduced={reduced} onNext={told} />
        </Html>
      )}

      {/* the altar, in the middle, under the light, on the slab over the well */}
      <Altar
        flames={flames()}
        flying={flights}
        open={open}
        reduced={reduced}
        onPick={() => focus !== "altar" && pick("altar")}
        panel={focus === "altar" && lit(flames()) && (!mural.done || finale === "landing") ? <Mural state={mural} onPlace={placed} /> : null}
      />
      {/* the open well, once the mural is whole: tapping it goes down */}
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} visible={open && focus === null} {...down}>
        <circleGeometry args={[PIT_R + 0.1, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {finale === "saying" && (
        <Html position={[0, 1.5, 0]} center zIndexRange={[6, 0]}>
          <Keeper line={muralLine} last reduced={reduced} onNext={muralSaid} />
        </Html>
      )}

      {/* the way up: the hole in the ceiling, a rim and the light behind it. Tapping it goes back up. */}
      <group position={[0, HOLE_Y, 0]} visible={focus === null} {...HOLE} {...up}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[HOLE_R, HOLE_R + 0.07, 40]} />
          <meshStandardMaterial color="#9DB4D8" emissive="#DCEBFF" emissiveIntensity={0.7} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[HOLE_R + 0.15, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <mesh position={[0, HOLE_Y / 2, 0]} visible={focus === null}>
        <cylinderGeometry args={[HOLE_R, HOLE_R * 1.7, HOLE_Y, 32, 1, true]} />
        <meshBasicMaterial color="#DCEBFF" transparent opacity={0.07} depthWrite={false} />
      </mesh>

      <Carried at={at} size={wall ? 0.02 : 0.6} instant={reduced}>
        {/* once inside the walls, he is the one on the screen */}
        <group {...zap} visible={!(wall && inside && !scene)}>
          <Suspense fallback={null}>
            <Rotom form="frost" from={fromBelow ? "fan" : "heat"} move={move} reduced={reduced} zapAt={zapAt} awake />
          </Suspense>
        </group>
        {saying && (
          <Html position={[0, 2.1, 0]} center zIndexRange={[6, 0]}>
            <Keeper line={wellLine} last reduced={reduced} onNext={said} />
          </Html>
        )}
      </Carried>

      <CameraRig view={view} controls={controls} reduced={reduced} onFlight={setFlying} fit={[FIT_W, FIT_W]} zoomable />
      <OrbitControls
        ref={controls}
        enabled={!flying && !scene}
        enableRotate={focus === null}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={view.polar - view.spread.polar}
        maxPolarAngle={view.polar + view.spread.polar}
        minAzimuthAngle={view.spread.azimuth >= Math.PI ? -Infinity : view.azimuth - view.spread.azimuth}
        maxAzimuthAngle={view.spread.azimuth >= Math.PI ? Infinity : view.azimuth + view.spread.azimuth}
      />
    </Canvas>
    {wall && !scene && <FluteRose onNote={(p) => flute.current(p)} />}
    {wall && !scene && pillars.uv && (
      <button
        type="button"
        aria-label="Lanterna UV"
        aria-pressed={uvOn}
        onClick={() => setUvOn((on) => !on)}
        style={{
          position: "fixed",
          left: 12,
          bottom: 12,
          zIndex: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "2px solid #9DB4D8",
          background: uvOn ? "#8A4BFF" : "rgba(10,14,22,.72)",
          color: uvOn ? "#fff" : "#DCEBFF",
          padding: 0,
          touchAction: "manipulation",
        }}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 3h6M12 3v2M8 8a4 4 0 0 1 8 0v8H8zM7 16h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
          {uvOn && <path d="M3 9l2 1M21 9l-2 1M4 14l2-.5M20 14l-2-.5" />}
        </svg>
      </button>
    )}
    </>
  );
}
