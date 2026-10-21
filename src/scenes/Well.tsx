import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, events } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BackSide } from "three";
import CameraRig from "./CameraRig";
import { tappedJustNow, useTap } from "./Hotspot";
import Rotom from "./Rotom";
import Keeper from "./Keeper";
import { FLIGHT, type View } from "./focus";
import { moveMs, type Move } from "../lib/descent";
import { wallLine, wellLine } from "../data/puzzle";
import { Approach, Carried, FarSide, WALL_H, facing, onlySeen, onWall } from "./machines/hall";
import { SCREEN_Y, WALL_ANGLES, WELL_R, type WallId } from "./well/wall";
import Screen, { INSET, PANEL, type Painter } from "./well/Screen";
import { H, W } from "../lib/well/pixels";
import { SPRITES, drawSprite, type SpriteId } from "../lib/well/sprites";

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

/**
 * Until the walls have rooms of their own: a floor of tiles, a few sprites
 * standing on it, and a mark that only the UV light shows.
 */
function testWall(cast: SpriteId[]): Painter {
  return (ctx, t, uvAt) => {
    const tile = SPRITES.tile;
    for (let x = 0; x < W; x += tile.w)
      for (let y = H - tile.h * 3; y < H; y += tile.h) drawSprite(ctx, "tile", x, y, (x / tile.w + y / tile.h) % tile.frames);
    cast.forEach((id, i) => {
      const s = SPRITES[id];
      drawSprite(ctx, id, ((i + 1) * W) / (cast.length + 1) - s.w / 2, H - tile.h * 3 - s.h, Math.floor(t * 2));
    });
    ctx.fillStyle = "#FF4FD8";
    for (let x = 140; x < 180; x++)
      for (let y = 40; y < 80; y++) if ((x + y) % 6 === 0 && uvAt([x, y])) ctx.fillRect(x, y, 1, 1);
  };
}

/** What each wall shows until its task gives it its room, and whether it is dark or under the lantern. */
const TEST: Record<WallId, { paint: Painter; dark?: boolean; uv?: boolean }> = {
  tv: { paint: testWall(["chinchilla", "chest", "tv", "blockPink", "blockBlue", "switchGreen"]), uv: true },
  corvi: { paint: testWall(["porcupine", "switchYellow", "crow", "crow", "flame"]) },
  boccioli: { paint: testWall(["turtle", "bud", "bud", "switchPink"]) },
  pilastri: { paint: testWall(["ghost", "candle", "phone", "face"]), dark: true },
};

const WALLS = Object.keys(WALL_ANGLES) as WallId[];

export default function Well({
  reduced,
  onScene,
  onUp,
  arrivedAt,
  first,
}: {
  reduced: boolean;
  /** Whether a scene is playing, for the desktop to clear itself. */
  onScene: (on: boolean) => void;
  /** The hole in the ceiling was tapped: back up to the machine room. */
  onUp: () => void;
  /** When the visitor came down, or -Infinity if they were already here. */
  arrivedAt: number;
  /** Whether that was the first time down, which is the long way. */
  first: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const [flying, setFlying] = useState(false);
  const [zapAt, setZapAt] = useState(0);
  /** The wall or the altar the camera stands in front of, if any. */
  const [focus, setFocus] = useState<Focus | null>(null);

  /*
   * Coming in: the camera waits under the hole, Rotom drops out of it as it
   * was in the machine room and flashes into Frost Rotom, says its line (the
   * first time only), and the camera stands back to take in the hall. A reload just finds it all
   * there.
   */
  const arriving = Number.isFinite(arrivedAt) && !reduced;
  const [move, setMove] = useState<Move | undefined>(() =>
    arriving ? { at: arrivedAt, kind: "in", dir: "down", fast: !first } : undefined,
  );
  const [view, setView] = useState<View>(arriving ? CEILING_VIEW : HALL_VIEW);
  const [scene, setScene] = useState(arriving);
  /** Rotom is saying its line on landing. */
  const [saying, setSaying] = useState(false);
  /** Rotom has gone into the walls, and is pixel art on whichever is worked. */
  const [inside, setInside] = useState(false);
  /** Rotom is saying its line on going into the first wall. */
  const [telling, setTelling] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
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
    setView(VIEWS[id]);
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
    setMove({ at: performance.now(), kind: "out", dir: "up", fast: true });
    timers.current.push(setTimeout(onUp, reduced ? 0 : moveMs(true) * 0.8));
  });
  const zap = useTap(() => {
    if (!scene) setZapAt(performance.now());
  });
  const altar = useTap(() => {
    if (focus !== "altar") pick("altar");
  });

  const wall = focus !== null && focus !== "altar" ? focus : null;
  const at: [number, number, number] = wall ? intoTheWall(WALL_ANGLES[wall]) : ASIDE;

  return (
    <Canvas
      orthographic
      dpr={[1, 1.75]}
      camera={{ position: [7, 5.6, 7], zoom: 60, near: 0.1, far: 90 }}
      events={(store) => ({ ...events(store), filter: (hits) => onlySeen(hits) })}
      onPointerMissed={back}
    >
      <color attach="background" args={["#05070B"]} />
      <ambientLight intensity={0.06} color="#9DB4D8" />
      <hemisphereLight args={["#CFE3FF", "#06080C", 0.05]} />
      {/* the cold white light of the machine room, falling through the hole onto the altar */}
      <spotLight position={[0, HOLE_Y - 0.1, 0]} angle={0.7} penumbra={1} color="#DCEBFF" intensity={40} distance={9} decay={1.2} />
      <pointLight position={[0, 1.4, 0]} color="#DCEBFF" intensity={2.5} distance={4.5} />

      {/* the floor: dark stone */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[WELL_R, 64]} />
        <meshStandardMaterial color="#14181F" roughness={0.9} />
      </mesh>
      {/* the wall, from the inside only */}
      <mesh position={[0, WALL_H / 2, 0]}>
        <cylinderGeometry args={[WELL_R, WELL_R, WALL_H, 64, 1, true]} />
        <meshStandardMaterial color="#232A36" side={BackSide} roughness={0.95} />
      </mesh>
      <mesh position={[0, WALL_H, 0]} rotation-x={-Math.PI / 2} visible={focus === null}>
        <ringGeometry args={[WELL_R, WELL_R + 0.12, 64]} />
        <meshStandardMaterial color="#2E3440" roughness={0.8} />
      </mesh>

      {/* the four walls, each a screen, walked up to with a tap */}
      {WALLS.map((id) => (
        <FarSide key={id} a={WALL_ANGLES[id]}>
          <Screen
            a={WALL_ANGLES[id]}
            paint={TEST[id].paint}
            onTap={() => {}}
            active={focus === id && !scene}
            dark={TEST[id].dark}
            uv={TEST[id].uv}
            reduced={reduced}
          />
          {focus !== id && (
            <group {...onWall(WALL_ANGLES[id], INSET, SCREEN_Y, WELL_R)}>
              <Approach w={PANEL.w} h={PANEL.h} onPick={() => pick(id)} />
            </group>
          )}
        </FarSide>
      ))}
      {telling && wall && (
        <Html position={onWall(WALL_ANGLES[wall], 0.9, SCREEN_Y + 0.3, WELL_R).position} center zIndexRange={[6, 0]}>
          <Keeper line={wallLine} last reduced={reduced} onNext={told} />
        </Html>
      )}

      {/* the altar, in the middle, under the light */}
      <mesh position={[0, 0.25, 0]} {...altar}>
        <cylinderGeometry args={[0.45, 0.55, 0.5, 24]} />
        <meshStandardMaterial color="#3A4150" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.51, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.4, 24]} />
        <meshStandardMaterial color="#8FA3BF" emissive="#6F8CB5" emissiveIntensity={0.35} roughness={0.5} />
      </mesh>

      {/* the way up: the hole in the ceiling, a rim and the light behind it. Tapping it goes back up. */}
      <group position={[0, HOLE_Y, 0]} visible={focus === null} {...up}>
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
            <Rotom form="frost" from="heat" move={move} reduced={reduced} zapAt={zapAt} awake />
          </Suspense>
        </group>
        {saying && (
          <Html position={[0, 2.1, 0]} center zIndexRange={[6, 0]}>
            <Keeper line={wellLine} last reduced={reduced} onNext={said} />
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
        minAzimuthAngle={view.spread.azimuth >= Math.PI ? -Infinity : view.azimuth - view.spread.azimuth}
        maxAzimuthAngle={view.spread.azimuth >= Math.PI ? Infinity : view.azimuth + view.spread.azimuth}
      />
    </Canvas>
  );
}
