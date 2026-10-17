import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BackSide, CanvasTexture, RepeatWrapping, SRGBColorSpace, type PointLight } from "three";
import CameraRig from "./CameraRig";
import { useTap } from "./Hotspot";
import Rotom from "./Rotom";
import { FLIGHT, type View } from "./focus";
import { moveMs, type Move } from "../lib/descent";

/*
 * The second floor: a round hall inside the first terrace of the upside-down
 * tower, the same warm stone and the same arches as its outside. Its walls
 * are written over in every script there is — this is Babel, where the
 * languages came apart — and for now they are only that: the puzzle of the
 * languages comes later and may read them, or rewrite them.
 */

/** How wide the hall is, and how high its wall stands. */
const HALL_R = 2.4;
const WALL_H = 1.9;
/** Where the shaft from the island comes through the ceiling. */
const HOLE_Y = 2.55;
const HOLE_R = 0.3;

const STONE = "#C49A64";
const STONE_DARK = "#B48A57";
const STONE_LIGHT = "#DDB884";
const SHADOW = "#2A1A10";

/** Width the camera fits, as on the island, so phones see all of it. */
const FIT_W = 7;

const HALL_VIEW: View = {
  target: [0, 0.95, 0],
  azimuth: Math.PI / 4,
  polar: 0.95,
  zoom: 1,
  /* round, like the island: the camera may go all the way round it */
  spread: { azimuth: Math.PI, polar: 0.25 },
};

/**
 * One band of writing per script, each the same few words in its own hand:
 * enough to read as language without saying anything in particular yet.
 * Runes and the rest come from the system's fonts, so a phone without one
 * shows its own fallback — the walls are scenery, not a clue, for now.
 */
const SCRIPTS = [
  "Ἐν ἀρχῇ ἦν ὁ λόγος καὶ ὁ λόγος ἦν πρὸς τὸν θεόν",
  "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ",
  "في البدء كان الكلمة والكلمة كان عند الله",
  "В начале было Слово, и Слово было у Бога",
  "आदि में वचन था और वचन परमेश्वर के साथ था",
  "初めに言があった。言は神と共にあった。",
  "ᚠᚢᚦᚨᚱᚲ ᚷᚹᚺᚾᛁᛃ ᛇᛈᛉᛊ ᛏᛒᛖᛗ ᛚᛜᛞᛟ",
  "Nel principio era il Verbo e il Verbo era presso Dio",
];

/** The writing round the inside of the wall, drawn once into a canvas. */
function inscriptions() {
  const w = 2048;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = STONE;
  ctx.fillRect(0, 0, w, h);
  // courses of stone, so the wall reads as built and not poured
  ctx.strokeStyle = STONE_DARK;
  ctx.lineWidth = 3;
  for (let y = 0; y <= h; y += h / SCRIPTS.length) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const band = h / SCRIPTS.length;
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(band * 0.55)}px serif`;
  SCRIPTS.forEach((line, i) => {
    // carved: a light lip under a dark cut
    const y = band * (i + 0.5);
    let x = (i * 173) % 400;
    while (x < w) {
      ctx.fillStyle = STONE_LIGHT;
      ctx.fillText(line, x + 1.5, y + 1.5);
      ctx.fillStyle = SHADOW;
      ctx.fillText(line, x, y);
      x += ctx.measureText(line).width + 60;
    }
  });
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  // seen from inside the cylinder, so read the other way round
  t.wrapS = RepeatWrapping;
  t.repeat.x = -2;
  return t;
}

/** A bowl of fire on a short pillar, its light never quite steady. */
function Brazier({ angle, reduced }: { angle: number; reduced: boolean }) {
  const light = useRef<PointLight>(null);
  const r = HALL_R - 0.45;
  useFrame((state) => {
    if (!light.current || reduced) return;
    const t = state.clock.elapsedTime * 9 + angle * 7;
    light.current.intensity = 3.2 + Math.sin(t) * 0.5 + Math.sin(t * 2.3) * 0.3;
  });
  return (
    <group position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.06, 0.09, 0.5, 10]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.54, 0]}>
        <cylinderGeometry args={[0.16, 0.08, 0.1, 14]} />
        <meshStandardMaterial color="#3A2A1E" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <coneGeometry args={[0.1, 0.22, 10]} />
        <meshBasicMaterial color="#FFB45A" />
      </mesh>
      <pointLight ref={light} position={[0, 0.85, 0]} color="#FF9A4A" intensity={3.2} distance={3.2} />
    </group>
  );
}

/** Up under the shaft, looking at where Rotom is about to come through. */
const CEILING_VIEW: View = {
  target: [0, 1.9, 0],
  azimuth: Math.PI / 4,
  polar: 0.7,
  zoom: 2.2,
  spread: { azimuth: 0.1, polar: 0.05 },
};

export default function Babel({
  reduced,
  onScene,
  onUp,
  arrivedAt,
  first,
}: {
  reduced: boolean;
  /** Whether a scene is playing, for the desktop to clear itself. */
  onScene: (on: boolean) => void;
  /** The hole in the ceiling was tapped: back up to the island. */
  onUp: () => void;
  /** When the visitor came down, or -Infinity if they were already here. */
  arrivedAt: number;
  /** Whether that was the first time down, which is the long way. */
  first: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const [flying, setFlying] = useState(false);
  const [zapAt, setZapAt] = useState(0);
  const writing = useMemo(inscriptions, []);
  useEffect(() => () => writing.dispose(), [writing]);

  /*
   * Coming in: the camera waits under the shaft, Rotom drops out of it in
   * the form it had upstairs and flashes into this floor's, then the camera
   * stands back to take in the hall. A reload just finds it all there.
   */
  const arriving = Number.isFinite(arrivedAt) && !reduced;
  const [move, setMove] = useState<Move | undefined>(() =>
    arriving ? { at: arrivedAt, kind: "in", dir: "down", fast: !first } : undefined,
  );
  const [view, setView] = useState(arriving ? CEILING_VIEW : HALL_VIEW);
  const [scene, setScene] = useState(arriving);
  useEffect(() => {
    if (!arriving) return;
    const ms = moveMs(!first);
    const steps = [
      setTimeout(() => setView(HALL_VIEW), ms * 0.6),
      setTimeout(() => setScene(false), ms * 0.6 + FLIGHT * 1000),
    ];
    return () => steps.forEach(clearTimeout);
    // once, for the arrival this floor was mounted with
  }, []);
  useEffect(() => onScene(scene), [scene, onScene]);

  /** Back up the shaft: Rotom rises into it, and the island takes over. */
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(leaving.current), []);
  const up = useTap(() => {
    setScene(true);
    setMove({ at: performance.now(), kind: "out", dir: "up", fast: true });
    leaving.current = setTimeout(onUp, reduced ? 0 : moveMs(true) * 0.8);
  });
  const zap = useTap(() => setZapAt(performance.now()));

  /** Niches round the foot of the wall, as the tower has arches round its terraces. */
  const niches = useMemo(() => {
    const n = 14;
    return Array.from({ length: n }, (_, k) => (k / n) * Math.PI * 2 + 0.11);
  }, []);
  /** The way down, sealed: on the far side, where the camera first looks. */
  const door = (-3 * Math.PI) / 4;

  return (
    <Canvas
      orthographic
      dpr={[1, 1.75]}
      camera={{ position: [7, 5.6, 7], zoom: 60, near: 0.1, far: 90 }}
    >
      <color attach="background" args={["#05060A"]} />
      <ambientLight intensity={0.35} color="#FFD9A8" />
      <hemisphereLight args={["#FFE2B8", "#2A1A10", 0.5]} />

      {/* the floor, paved in rings */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[HALL_R, 48]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.95} />
      </mesh>
      {[0.8, 1.5, 2.1].map((r) => (
        <mesh key={r} rotation-x={-Math.PI / 2} position={[0, 0.003, 0]}>
          <ringGeometry args={[r, r + 0.03, 48]} />
          <meshBasicMaterial color={SHADOW} transparent opacity={0.35} />
        </mesh>
      ))}

      {/* the wall, drawn from the inside only: the near half is never in the
          way of the camera, the far half is always facing it */}
      <mesh position={[0, WALL_H / 2, 0]}>
        <cylinderGeometry args={[HALL_R, HALL_R, WALL_H, 64, 1, true]} />
        <meshStandardMaterial map={writing} side={BackSide} roughness={0.95} />
      </mesh>
      <mesh position={[0, WALL_H, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[HALL_R, HALL_R + 0.12, 64]} />
        <meshStandardMaterial color={STONE_LIGHT} roughness={0.85} />
      </mesh>

      {niches.map((a) =>
        Math.abs(Math.atan2(Math.sin(a - door), Math.cos(a - door))) < 0.4 ? null : (
          <mesh
            key={a}
            position={[Math.cos(a) * (HALL_R - 0.02), 0.3, Math.sin(a) * (HALL_R - 0.02)]}
            rotation-y={-a - Math.PI / 2}
          >
            <planeGeometry args={[0.2, 0.42]} />
            <meshStandardMaterial color={SHADOW} roughness={1} />
          </mesh>
        ),
      )}

      {/* the sealed way down: an arch in the wall, a slab across it */}
      <group
        position={[Math.cos(door) * (HALL_R - 0.03), 0, Math.sin(door) * (HALL_R - 0.03)]}
        rotation-y={-door - Math.PI / 2}
      >
        <mesh position={[0, 0.5, 0]}>
          <planeGeometry args={[0.8, 1.0]} />
          <meshStandardMaterial color={SHADOW} roughness={1} />
        </mesh>
        <mesh position={[0, 1.0, 0.001]}>
          <circleGeometry args={[0.4, 24, 0, Math.PI]} />
          <meshStandardMaterial color={SHADOW} roughness={1} />
        </mesh>
        <mesh position={[0, 0.62, 0.05]}>
          <boxGeometry args={[0.7, 1.24, 0.08]} />
          <meshStandardMaterial color="#6E5E4E" roughness={0.9} />
        </mesh>
      </group>

      {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((a) => (
        <Brazier key={a} angle={a} reduced={reduced} />
      ))}

      {/* the shaft from the island, coming through where the ceiling would
          be: a rim and a fall of pale light, so the hall stays open to the
          camera. Tapping it goes back up. */}
      <group position={[0, HOLE_Y, 0]} {...up}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[HOLE_R, HOLE_R + 0.06, 40]} />
          <meshStandardMaterial color="#3A3E45" metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[HOLE_R + 0.15, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <mesh position={[0, HOLE_Y - 0.5, 0]}>
        <cylinderGeometry args={[HOLE_R, HOLE_R * 1.6, 1, 24, 1, true]} />
        <meshBasicMaterial color="#8AD8FF" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <group {...zap}>
        <Suspense fallback={null}>
          <Rotom form="wash" from="base" move={move} reduced={reduced} zapAt={zapAt} awake />
        </Suspense>
      </group>

      <CameraRig
        view={view}
        controls={controls}
        reduced={reduced}
        onFlight={setFlying}
        fit={[FIT_W, FIT_W]}
      />
      <OrbitControls
        ref={controls}
        enabled={!flying}
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
