import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  AdditiveBlending,
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import CameraRig from "./CameraRig";
import { glowTexture } from "./glow";
import Hotspot, { useTap } from "./Hotspot";
import Portal from "./Portal";
import Rotom from "./Rotom";
import Maze from "../components/Maze";
import Mirrors from "../components/Mirrors";
import Plan from "../components/Plan";
import Lamps from "../components/Lamps";
import Ski from "../components/Ski";
import Machine from "../components/Machine";
import Hack from "../components/Hack";
import Sagome from "../components/Sagome";
import Piece from "../components/Piece";
import {
  PIECES,
  drop as dropPiece,
  isDone as isFigureDone,
  isHome as isAttached,
  remeasure,
  revision as boardRevision,
  setDone as setFigureDone,
  subscribe as watchBoard,
} from "../lib/lost";
import { PISTES, RUNS as SKI_RUNS, loadSki, solvedSki, stationOf } from "../lib/ski";
import { COLS as LAMP_COLS, ROWS as LAMP_ROWS, START as LAMPS_START } from "../lib/lamps";
import { COLS, ROWS, buildMaze } from "../lib/maze";
import { FLOORS, SIZE } from "../lib/beam";
import { DOOR_W, DOOR_Z, HALF, PALETTE } from "../data/room";
import Window from "../components/Window";
import { usePersistentFlag } from "../hooks";
import { STAGES, jumpTo } from "../lib/stages";
import {
  DONE_GAP,
  HACK_KEY,
  LOST_KEY,
  TOMBINO_KEY,
  PUZZLE_KEY,
  groupTaps,
  keeperLines,
  onTrack,
  solved,
  starLine,
  tapeLine,
  wiredLine,
  bravoLine,
  tombinoLine,
} from "../data/puzzle";
import type { View } from "./focus";

/** Projected width of the island, the way ROOM_W frames the room. */
const VOID_W = 7;

/** How many screens stand around the island, and where. */
const PANELS = 5;
const RING_R = 2.15;
const PANEL_Y = 1.25;
const PANEL_W = 1.3;
const PANEL_H = 0.9;

const GLASS = "#0E1622";

/**
 * The machine is not one of the five: it has no screen out on the island and
 * nothing points at it. It rides in on the desk of the screen below, once
 * the map next door has been worked out, and there it sits.
 */
const MACHINE = 5;
const MACHINE_DESK = 0;

/**
 * The terminal, the same way: no screen of its own. It sits on the desk of
 * the eye, because the eye is what the light draws and this is what the
 * drawing is worth — a word, and the wires that come with it.
 */
const HACK = 6;
const HACK_DESK = 1;

/**
 * The window of silhouettes, on the desk of the ski map: the map's code is
 * what the lock it leads to opens with, so they belong on one screen.
 */
const SAGOME = 7;
const SAGOME_DESK = 4;

/**
 * The fragments of the figure: one on every screen, numbered from here.
 *
 * They are only handed out once the screens are wired, because before that a
 * window cannot leave the screen it came from — and five fragments that can
 * never be brought together are not a puzzle, they are five decorations.
 */
const PIECE = 10;

/** The screen the figure is assembled on: the fragments belong to its window. */
const MAZE = 0;

/** Corner brackets: the whole frame, since there is no frame. */
const BRACKET = 0.24;
const CORNERS = [
  [-1, 1],
  [1, 1],
  [-1, -1],
  [1, -1],
] as const;
const EDGE = "#8AD8FF";

let mazeCache: CanvasTexture | null = null;

/**
 * The maze, painted small on the face of its own screen.
 *
 * Without it the five screens are identical from the island and there is no
 * way to tell which one is worth walking up to. It is drawn too small to be
 * solved from out there — it says "something is on this one", nothing more.
 */
function mazeTexture() {
  if (mazeCache) return mazeCache;
  const W = 624;
  const H = 432;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const maze = buildMaze();
    const cell = Math.min((W - 40) / COLS, (H - 40) / ROWS);
    const x0 = (W - cell * COLS) / 2;
    const y0 = (H - cell * ROWS) / 2;

    ctx.fillStyle = "#0B121C";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(138, 216, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (maze.right[r][c] && c < COLS - 1) {
          ctx.moveTo(x0 + (c + 1) * cell, y0 + r * cell);
          ctx.lineTo(x0 + (c + 1) * cell, y0 + (r + 1) * cell);
        }
        if (maze.down[r][c] && r < ROWS - 1) {
          ctx.moveTo(x0 + c * cell, y0 + (r + 1) * cell);
          ctx.lineTo(x0 + (c + 1) * cell, y0 + (r + 1) * cell);
        }
      }
    }
    ctx.strokeRect(x0, y0, cell * COLS, cell * ROWS);
    ctx.stroke();
  }
  mazeCache = new CanvasTexture(canvas);
  mazeCache.colorSpace = SRGBColorSpace;
  return mazeCache;
}

let beamCache: CanvasTexture | null = null;

/** The grid and its power cells, painted on the face of the screen that holds it. */
function beamTexture() {
  if (beamCache) return beamCache;
  const W = 624;
  const H = 432;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const cell = Math.min((W - 40) / SIZE, (H - 40) / SIZE);
    const x0 = (W - cell * SIZE) / 2;
    const y0 = (H - cell * SIZE) / 2;

    ctx.fillStyle = "#0B121C";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(138, 216, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= SIZE; i++) {
      ctx.moveTo(x0 + i * cell, y0);
      ctx.lineTo(x0 + i * cell, y0 + cell * SIZE);
      ctx.moveTo(x0, y0 + i * cell);
      ctx.lineTo(x0 + cell * SIZE, y0 + i * cell);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(138, 216, 255, 0.6)";
    for (const { cell: [r, c] } of FLOORS[0].nodes) {
      ctx.beginPath();
      ctx.arc(x0 + (c + 0.5) * cell, y0 + (r + 0.5) * cell, cell * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#E3B04B";
    ctx.beginPath();
    ctx.arc(
      x0 + (FLOORS[0].source.cell[1] + 0.5) * cell,
      y0 + (FLOORS[0].source.cell[0] + 0.5) * cell,
      cell * 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  beamCache = new CanvasTexture(canvas);
  beamCache.colorSpace = SRGBColorSpace;
  return beamCache;
}

let planCache: CanvasTexture | null = null;

/**
 * An empty plan and a row of paint, on the face of the screen that holds it.
 *
 * Empty is the whole of it: the walls are there because they are on the
 * screen anyway, and nothing that has to be worked out is ever drawn out
 * here — least of all where anything stands.
 */
function planTexture() {
  if (planCache) return planCache;
  const W = 624;
  const H = 432;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const side = H - 130;
    const unit = side / (HALF * 2);
    const x0 = (W - side) / 2;
    const y0 = 40;
    const at = (n: number) => y0 + (n + HALF) * unit;

    ctx.fillStyle = "#0B121C";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(138, 216, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= HALF * 2; i++) {
      ctx.moveTo(x0 + i * unit, y0);
      ctx.lineTo(x0 + i * unit, y0 + side);
      ctx.moveTo(x0, y0 + i * unit);
      ctx.lineTo(x0 + side, y0 + i * unit);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(138, 216, 255, 0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + side, y0);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, at(DOOR_Z - DOOR_W / 2));
    ctx.moveTo(x0, at(DOOR_Z + DOOR_W / 2));
    ctx.lineTo(x0, y0 + side);
    ctx.stroke();

    const swatch = side / PALETTE.length;
    PALETTE.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(x0 + i * swatch + 2, y0 + side + 30, swatch - 4, 34);
    });
  }
  planCache = new CanvasTexture(canvas);
  planCache.colorSpace = SRGBColorSpace;
  return planCache;
}

let lampsCache: CanvasTexture | null = null;

/** The lamps as they stand when nobody has touched them. */
function lampsTexture() {
  if (lampsCache) return lampsCache;
  const W = 624;
  const H = 432;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const cell = Math.min((W - 80) / LAMP_COLS, (H - 80) / LAMP_ROWS);
    const x0 = (W - cell * LAMP_COLS) / 2;
    const y0 = (H - cell * LAMP_ROWS) / 2;

    ctx.fillStyle = "#0B121C";
    ctx.fillRect(0, 0, W, H);
    LAMPS_START.forEach((on, i) => {
      const x = x0 + (i % LAMP_COLS) * cell;
      const y = y0 + Math.floor(i / LAMP_COLS) * cell;
      ctx.fillStyle = on ? "rgba(255, 217, 138, 0.85)" : "rgba(138, 216, 255, 0.12)";
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 5, cell - 10, cell - 10, 10);
      ctx.fill();
    });
  }
  lampsCache = new CanvasTexture(canvas);
  lampsCache.colorSpace = SRGBColorSpace;
  return lampsCache;
}

let skiCache: CanvasTexture | null = null;

/** The mountain in outline, painted on the face of the screen that holds it. */
function skiTexture() {
  if (skiCache) return skiCache;
  const W = 624;
  const H = 432;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const side = H - 60;
    const x0 = (W - side) / 2;
    const y0 = 30;
    const at = (n: number) => (n / 100) * side;

    ctx.fillStyle = "#0B121C";
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (const run of SKI_RUNS) {
      const a = stationOf(run.from);
      const b = stationOf(run.to);
      ctx.strokeStyle = PISTES[run.piste].ink;
      ctx.beginPath();
      ctx.moveTo(x0 + at(a.x), y0 + at(a.y));
      ctx.lineTo(x0 + at(b.x), y0 + at(b.y));
      ctx.stroke();
    }
  }
  skiCache = new CanvasTexture(canvas);
  skiCache.colorSpace = SRGBColorSpace;
  return skiCache;
}

/**
 * What each screen has on it. The others are still dark, and tapping one
 * does nothing but fly the camera to it — they get their contents in turn.
 */
const SCREENS: Record<
  number,
  {
    title: string;
    /** Built on demand, because some of them have something to report back. */
    body: (bus: { onSolved: () => void; onBravo: () => void }) => ReactNode;
    /** What the screen shows from across the island. The machine has no screen. */
    face?: () => CanvasTexture;
    width?: number;
  }
> = {
  0: { title: "labirinto.exe", body: () => <Maze />, face: mazeTexture },
  1: { title: "specchi.exe", body: () => <Mirrors />, face: beamTexture, width: 480 },
  2: {
    title: "pianta.exe",
    body: ({ onSolved }) => <Plan onSolved={onSolved} />,
    face: planTexture,
    width: 400,
  },
  3: { title: "lampade.exe", body: () => <Lamps />, face: lampsTexture, width: 400 },
  4: {
    title: "comprensorio.exe",
    body: ({ onSolved }) => <Ski onSolved={onSolved} />,
    face: skiTexture,
    width: 460,
  },
  /* not screens: things that sit on the desk of one */
  [SAGOME]: {
    title: "sagome.exe",
    body: ({ onSolved, onBravo }) => <Sagome onTombino={onSolved} onBravo={onBravo} />,
    width: 420,
  },
  [HACK]: {
    title: "rotom.db",
    body: ({ onSolved }) => <Hack onSolved={onSolved} />,
    width: 420,
  },
  [MACHINE]: {
    title: "macchinario",
    body: ({ onSolved }) => <Machine onSolved={onSolved} />,
    width: 420,
  },
};

PIECES.forEach((piece, i) => {
  SCREENS[PIECE + i] = { title: piece.title, body: () => <Piece index={i} /> };
});

/** Half a step of offset, so no screen sits square in front of the keeper. */
const angleOf = (i: number) => ((i + 0.5) / PANELS) * Math.PI * 2 + Math.PI / 4;

const panelPos = (i: number): [number, number, number] => [
  Math.sin(angleOf(i)) * RING_R,
  PANEL_Y,
  Math.cos(angleOf(i)) * RING_R,
];

const ISLAND_VIEW: View = {
  target: [0, 1.05, 0],
  azimuth: Math.PI / 4,
  polar: 0.95,
  zoom: 1,
  /* the island is round and hides nothing, so the camera may go all the way
     round it — which is also the only way to read five screens in a ring */
  spread: { azimuth: Math.PI, polar: 0.25 },
};

/** Standing inside the ring, looking out at one screen. */
const panelView = (i: number): View => ({
  target: panelPos(i),
  /* brought back into -PI..PI, which is the only range the controls can
     clamp in: past it their limits wrap once and still miss, and the camera
     was pinned to the wrong edge the moment it landed */
  azimuth: Math.atan2(Math.sin(angleOf(i) + Math.PI), Math.cos(angleOf(i) + Math.PI)),
  polar: 1.45,
  zoom: 2.6,
  spread: { azimuth: 0.2, polar: 0.12 },
});

/* -------------------------------------------------------------- feedback */

/** One ring per tap, thrown off the keeper and gone in three quarters of a second. */
function Zap({ at }: { at: number }) {
  const mesh = useRef<Mesh>(null);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const p = Math.min(1, (performance.now() - at) / 750);
    m.scale.setScalar(0.3 + p * 2.2);
    (m.material as MeshBasicMaterial).opacity = 0.5 * (1 - p) ** 2;
  });

  return (
    <mesh ref={mesh} position={[0, 1.12, 0]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.3, 0.345, 40]} />
      <meshBasicMaterial color={EDGE} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}

const DOT_STEP = 0.16;
const DOT_GAP = 0.18;

/**
 * What has been tapped so far, as a row of lights over the keeper: one per
 * tap, with a space where a group closed. It is the only way to tell four taps
 * from three and a one, and it says nothing about what is being asked for.
 */
function Dots({ counts, failedAt }: { counts: number[]; failedAt: number }) {
  const group = useRef<Group>(null);

  const spots = useMemo(() => {
    const xs: number[] = [];
    let x = 0;
    for (const n of counts) {
      for (let i = 0; i < n; i++) {
        xs.push(x);
        x += DOT_STEP;
      }
      x += DOT_GAP;
    }
    const mid = (x - DOT_GAP - DOT_STEP) / 2;
    return xs.map((v) => v - mid);
  }, [counts]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const since = performance.now() - failedAt;
    g.children.forEach((child, i) => {
      // a wrong attempt goes out from the end back to the start, like a fuse
      const dead = failedAt > 0 ? (since - (spots.length - 1 - i) * 90) / 220 : 0;
      const m = (child as Mesh).material as MeshBasicMaterial;
      m.opacity = Math.max(0, 1 - Math.max(0, dead));
    });
  });

  return (
    <group ref={group} position={[0, 1.95, 0]}>
      {spots.map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshBasicMaterial color={failedAt > 0 ? "#E4674A" : EDGE} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------------------------------------- what it says */

/** Milliseconds a letter takes to appear. */
const CHAR_MS = 28;

/**
 * The keeper's line, typed out rather than dropped on the screen whole.
 *
 * The button skips to the end of the line before it moves on, because someone
 * who reads faster than this should not have to wait for it — and someone who
 * has seen the line before should not have to watch it twice.
 */
function Keeper({
  line,
  last,
  reduced,
  onNext,
}: {
  line: string;
  last: boolean;
  reduced: boolean;
  onNext: () => void;
}) {
  const [shown, setShown] = useState(0);

  // a new line starts from nothing; reduced motion gets it all at once
  useEffect(() => setShown(reduced ? line.length : 0), [line, reduced]);

  useEffect(() => {
    if (shown >= line.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => clearTimeout(t);
  }, [shown, line]);

  const done = shown >= line.length;

  return (
    <div className={`keeper${done ? " is-said" : ""}`}>
      <p className="keeper__text">
        {line.slice(0, shown)}
        {!done && <span className="keeper__caret" />}
      </p>
      <button className="keeper__next" onClick={() => (done ? onNext() : setShown(line.length))}>
        {done ? (last ? "Ho capito" : "Avanti") : "Salta"}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- screens */

/**
 * One of the five. Empty on purpose — what goes on them is the puzzle, and it
 * gets built one screen at a time.
 */
function Panel({
  index,
  risenAt,
  picked,
  dimmed,
  reduced,
  onPick,
}: {
  index: number;
  /** When the screens came up, or -Infinity if they were already up. */
  risenAt: number;
  picked: boolean;
  dimmed: boolean;
  reduced: boolean;
  onPick: () => void;
}) {
  // a plain lookup would tell TypeScript every screen has a face, and only
  // one of them does
  const face = index in SCREENS ? SCREENS[index].face : undefined;
  const group = useRef<Group>(null);
  const tap = useTap(onPick);
  const [x, y, z] = panelPos(index);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    // each screen comes up a beat after the one before it
    const p = Math.min(1, Math.max(0, (performance.now() - risenAt - index * 130) / 700));
    const e = 1 - (1 - p) ** 3;

    // nothing holds them up, so they have to look like they are holding
    // themselves up: a slow drift, each screen on its own beat
    const t = state.clock.elapsedTime + index * 1.7;
    g.position.y = y - 2.6 * (1 - e) + (reduced ? 0 : Math.sin(t * 0.7) * 0.035);
    g.rotation.z = reduced ? 0 : Math.sin(t * 0.47) * 0.018;
    g.scale.setScalar(Math.max(0.0001, e));
  });

  return (
    <group
      ref={group}
      position={[x, y, z]}
      rotation-y={angleOf(index) + Math.PI}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
      {...tap}
    >
      {/* the pane: dark glass, or what this screen has on it */}
      <mesh>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial
          map={face ? face() : null}
          color={face ? "#FFFFFF" : GLASS}
          transparent
          opacity={dimmed ? 0.4 : face ? 0.95 : 0.82}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* the light it sits in, which is all that holds it up */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[PANEL_W + 0.34, PANEL_H + 0.34]} />
        <meshBasicMaterial
          map={glowTexture()}
          color={EDGE}
          transparent
          opacity={picked ? 0.3 : 0.14}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>

      {/* four corner brackets instead of a frame: it reads as a screen without
          drawing a box around something that is meant to be floating */}
      {CORNERS.map(([sx, sy], i) => (
        <group key={i} position={[(sx * PANEL_W) / 2, (sy * PANEL_H) / 2, 0.004]}>
          <mesh position={[(-sx * BRACKET) / 2, 0, 0]}>
            <boxGeometry args={[BRACKET, 0.022, 0.022]} />
            <meshStandardMaterial
              color={EDGE}
              emissive={EDGE}
              emissiveIntensity={picked ? 1.6 : 0.7}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, (-sy * BRACKET) / 2, 0]}>
            <boxGeometry args={[0.022, BRACKET, 0.022]} />
            <meshStandardMaterial
              color={EDGE}
              emissive={EDGE}
              emissiveIntensity={picked ? 1.6 : 0.7}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}


/* ---------------------------------------------------------------- the wires
 * What the database pays out: five cables laid across the floor of the island,
 * from under the keeper to the foot of every screen. They are laid once, with
 * everyone watching, and then they are simply part of the place — which is the
 * point, because a window now travels along them.
 */

/** Off the floor by just enough not to fight with it for the same pixels. */
const WIRE_Y = 0.016;

/** How long one cable takes to run out, and the wait between them. */
const WIRE_RUN = 900;
const WIRE_STEP = 150;

/** From the hub, round a slack bend, out to the foot of screen `i` and up it. */
function wireCurve(i: number) {
  const a = angleOf(i);
  const at = (r: number, turn: number, y: number) =>
    new Vector3(Math.sin(a + turn) * r, y, Math.cos(a + turn) * r);
  /* low tension, or the spline overshoots the foot and the cable kinks back
     on itself right where it is meant to go up the screen */
  return new CatmullRomCurve3(
    [
      new Vector3(0, WIRE_Y, 0),
      at(0.7, 0.2, WIRE_Y),
      at(1.5, -0.04, WIRE_Y),
      at(RING_R - 0.04, 0, WIRE_Y),
      at(RING_R, 0, PANEL_Y - PANEL_H / 2 - 0.06),
    ],
    false,
    "catmullrom",
    0.35,
  );
}

function Wires({ at, reduced }: { at: number; reduced: boolean }) {
  /** One tube for the cable, one fatter one for the light around it. */
  const tubes = useMemo(
    () =>
      Array.from({ length: PANELS }, (_, i) => {
        const curve = wireCurve(i);
        return {
          curve,
          core: new TubeGeometry(curve, 90, 0.014, 6, false),
          glow: new TubeGeometry(curve, 90, 0.05, 6, false),
        };
      }),
    [],
  );
  const dots = useRef<(Mesh | null)[]>([]);

  useEffect(
    () => () =>
      tubes.forEach((t) => {
        t.core.dispose();
        t.glow.dispose();
      }),
    [tubes],
  );

  useFrame((state) => {
    const now = performance.now();
    tubes.forEach(({ core, glow, curve }, i) => {
      // the cable runs out from the hub: the far end simply is not there yet
      const p = Math.min(1, Math.max(0, (now - at - i * WIRE_STEP) / WIRE_RUN));
      for (const g of [core, glow]) {
        const count = g.index?.count ?? 0;
        g.setDrawRange(0, Math.ceil(count * p));
      }

      // and a light goes down it, over and over, once it is there
      const dot = dots.current[i];
      if (!dot) return;
      dot.visible = p >= 1 && !reduced;
      if (!dot.visible) return;
      const t = (state.clock.elapsedTime * 0.22 + i * 0.2) % 1;
      dot.position.copy(curve.getPointAt(t));
    });
  });

  return (
    <group>
      {/* the hub, under the keeper, where all five of them start */}
      <mesh rotation-x={-Math.PI / 2} position={[0, WIRE_Y, 0]}>
        <ringGeometry args={[0.1, 0.17, 32]} />
        <meshBasicMaterial color={EDGE} transparent opacity={0.5} blending={AdditiveBlending} depthWrite={false} />
      </mesh>

      {tubes.map(({ core, glow }, i) => (
        <group key={i}>
          <mesh geometry={glow}>
            <meshBasicMaterial color="#3FA9FF" transparent opacity={0.1} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh geometry={core}>
            <meshBasicMaterial color="#5FC6FF" transparent opacity={0.7} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh ref={(m) => { dots.current[i] = m; }} visible={false}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshBasicMaterial color="#E9FFFF" transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ scene */

/**
 * Memoised, because it sits under the desktop: dragging the maze moves the
 * fragments riding on it, which re-renders the desktop on every pointer move,
 * and none of that is any business of the 3D scene.
 */
const Island = memo(function Island({
  reduced,
  onExit,
  onOpen,
  starred,
  calling,
  taped,
  hacked,
  linked,
  tombino,
}: {
  reduced: boolean;
  onExit: () => void;
  /** Which screen the camera is at, so its window can follow it. */
  onOpen: (index: number | null) => void;
  /** The star on the plan has drawn itself: step back and let the keeper talk. */
  starred: boolean;
  /** Something has just turned up on another screen's desk. Go and look. */
  calling: boolean;
  /** The machine has drawn what it draws, and that wants a word too. */
  taped: boolean;
  /** The database has just opened: stand back, the wires are being laid. */
  hacked: boolean;
  /** Whether the cables are down at all — they outlive the moment they arrive. */
  linked: boolean;
  /** Whether the word under the crying ghost has been found. */
  tombino: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const [flying, setFlying] = useState(false);

  /** Tap times, in performance.now() ms. One attempt at a time. */
  const [taps, setTaps] = useState<number[]>([]);
  /** The last few taps, kept apart from the attempt so their rings can finish. */
  const [rings, setRings] = useState<number[]>([]);
  const [failedAt, setFailedAt] = useState(0);
  const [zapAt, setZapAt] = useState(0);
  const [open, setOpen] = usePersistentFlag(PUZZLE_KEY);
  const [picked, setPicked] = useState<number | null>(null);
  /** Which line the keeper is on, or null when it has nothing to say. */
  const [saying, setSaying] = useState<number | null>(null);
  /** Its one word about the star, once the camera is back on it. */
  const [aboutStar, setAboutStar] = useState(false);
  /** And its one word about what the machine drew. */
  const [aboutTape, setAboutTape] = useState(false);
  /** And the one it has about the cables, once they are down. */
  const [aboutWires, setAboutWires] = useState(false);
  /** And its word about the ghost's word, once the camera is back on it. */
  const [aboutTombino, setAboutTombino] = useState(false);
  const tombinoBefore = useRef(tombino);
  /** Already open when the visitor arrived: the screens are simply there. */
  const risenAt = useRef(open ? -Infinity : 0);
  /** The same for the cables: laid in front of the visitor, or long since. */
  const wiredAt = useRef(linked ? -Infinity : 0);

  const counts = useMemo(() => groupTaps(taps), [taps]);

  // the desktop follows the camera: leaving a screen takes its window away,
  // whether it was Escape, a tap in the void or another screen
  useEffect(() => onOpen(picked), [picked, onOpen]);
  /**
   * Memoised, and it has to be: the rig starts a flight whenever the view it
   * is handed is a new object. Building one inline every render means a new
   * object every frame, so the camera arrives and immediately sets off again.
   */
  const view = useMemo(() => (picked === null ? ISLAND_VIEW : panelView(picked)), [picked]);

  const onZap = () => {
    const now = performance.now();
    setZapAt(now);
    setRings((r) => [...r.slice(-5), now]);
    if (open) return;

    // a long enough silence throws the attempt away and starts a new one
    const from = taps.length && now - taps[taps.length - 1] > DONE_GAP ? [] : taps;
    const next = [...from, now];
    const c = groupTaps(next);

    if (solved(c)) {
      // it has something to say before anything comes up
      setSaying(0);
      setTaps([]);
      setFailedAt(0);
      return;
    }
    if (!onTrack(c)) {
      setTaps(next);
      setFailedAt(now);
      return;
    }
    setFailedAt(0);
    setTaps(next);
  };

  const zap = useTap(onZap);

  /** Forward through the lines; the screens come up on the last one. */
  const sayNext = () => {
    const next = (saying ?? 0) + 1;
    if (next < keeperLines.length) {
      setSaying(next);
      return;
    }
    setSaying(null);
    risenAt.current = performance.now() + 200;
    setOpen(true);
  };

  /*
   * The star finishes inside a window, with the camera up against the screen
   * that holds it. The keeper is behind the visitor at that point, so the
   * view goes back to the middle of the island first and it speaks once it
   * has landed — otherwise it would be talking off screen.
   */
  useEffect(() => {
    if (!starred) return;
    setPicked(null);
    const t = setTimeout(() => setAboutStar(true), reduced ? 0 : 900);
    return () => clearTimeout(t);
  }, [starred, reduced]);

  /* and the cables need the whole ring in frame to be worth watching */
  useEffect(() => {
    if (!hacked) return;
    // reduced motion gets them already down, the way a reload does
    wiredAt.current = reduced ? -Infinity : performance.now() + 400;
    setPicked(null);
    // it waits for the last cable to reach its screen before saying anything
    const t = setTimeout(
      () => setAboutWires(true),
      reduced ? 0 : 400 + WIRE_RUN + (PANELS - 1) * WIRE_STEP,
    );
    return () => clearTimeout(t);
  }, [hacked, reduced]);

  /* the ghost's word is found in a window too: step back to the keeper first */
  useEffect(() => {
    if (!tombino || tombinoBefore.current) return;
    tombinoBefore.current = true;
    setPicked(null);
    const t = setTimeout(() => setAboutTombino(true), reduced ? 0 : 900);
    return () => clearTimeout(t);
  }, [tombino, reduced]);

  /* the same for the machine: it finishes on a desk, so step back first */
  useEffect(() => {
    if (!taped) return;
    setPicked(null);
    const t = setTimeout(() => setAboutTape(true), reduced ? 0 : 900);
    return () => clearTimeout(t);
  }, [taped, reduced]);

  /*
   * A thing has arrived on another screen's desk, and the visitor is standing
   * in front of the one they just finished. Fly them over: a window that
   * opens where nobody is looking may as well not have opened.
   */
  useEffect(() => {
    if (!calling) return;
    const t = setTimeout(() => setPicked(MACHINE_DESK), reduced ? 0 : 700);
    return () => clearTimeout(t);
  }, [calling, reduced]);

  // a wrong attempt shows itself going out, then the row is cleared
  useEffect(() => {
    if (!failedAt) return;
    const t = setTimeout(() => {
      setTaps([]);
      setFailedAt(0);
    }, 900);
    return () => clearTimeout(t);
  }, [failedAt]);

  // and an attempt left half-finished quietly gives up
  useEffect(() => {
    if (!taps.length || open || failedAt) return;
    const t = setTimeout(() => setTaps([]), DONE_GAP);
    return () => clearTimeout(t);
  }, [taps, open, failedAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (picked !== null) setPicked(null);
      else onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, onExit]);

  return (
    <Canvas
      orthographic
      dpr={[1, 1.75]}
      camera={{ position: [7, 5.6, 7], zoom: 60, near: 0.1, far: 90 }}
      onPointerMissed={() => setPicked(null)}
    >
      <color attach="background" args={["#05060A"]} />
      <ambientLight intensity={0.45} color="#6E7FB0" />
      <pointLight position={[0, 3.4, 1.6]} intensity={7} distance={12} color="#8AD8FF" />

      {/* the island you land on */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[2.4, 48]} />
        <meshStandardMaterial color="#141A26" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
        <ringGeometry args={[2.3, 2.37, 48]} />
        <meshBasicMaterial color={EDGE} transparent opacity={0.3} />
      </mesh>

      {/* the keeper: everything here answers to it */}
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
        {...zap}
      >
        {/* a pad the size of a fingertip, since the thing itself is small */}
        <mesh position={[0, 1.12, 0]}>
          <boxGeometry args={[1.3, 1.5, 1.3]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <Suspense fallback={null}>
          <Rotom reduced={reduced} zapAt={zapAt} awake={!open && saying === null} />
        </Suspense>
      </group>

      {saying !== null && keeperLines[saying] && (
        <Html position={[0, 2.1, 0]} center zIndexRange={[6, 0]}>
          <Keeper
            key={saying}
            line={keeperLines[saying]}
            last={saying === keeperLines.length - 1}
            reduced={reduced}
            onNext={sayNext}
          />
        </Html>
      )}

      {aboutStar && (
        <Html position={[0, 2.1, 0]} center zIndexRange={[6, 0]}>
          <Keeper
            key="star"
            line={starLine}
            last
            reduced={reduced}
            onNext={() => setAboutStar(false)}
          />
        </Html>
      )}

      {aboutTape && (
        <Html position={[0, 2.1, 0]} center zIndexRange={[6, 0]}>
          <Keeper
            key="tape"
            line={tapeLine}
            last
            reduced={reduced}
            onNext={() => setAboutTape(false)}
          />
        </Html>
      )}

      {linked && <Wires at={wiredAt.current} reduced={reduced} />}

      {aboutWires && (
        /* over the windows, not under them: this is the one line said while
           the desktop is still full, since the windows no longer close */
        <Html position={[0, 2.1, 0]} center zIndexRange={[80, 60]}>
          <Keeper
            key="wires"
            line={wiredLine}
            last
            reduced={reduced}
            onNext={() => setAboutWires(false)}
          />
        </Html>
      )}

      {aboutTombino && (
        /* over the windows: by now the screens are wired and theirs stay open */
        <Html position={[0, 2.1, 0]} center zIndexRange={[80, 60]}>
          <Keeper
            key="tombino"
            line={tombinoLine}
            last
            reduced={reduced}
            onNext={() => setAboutTombino(false)}
          />
        </Html>
      )}

      {!reduced && rings.map((t) => <Zap key={t} at={t} />)}
      {!open && counts.length > 0 && <Dots counts={counts} failedAt={failedAt} />}

      {open &&
        Array.from({ length: PANELS }, (_, i) => (
          <Panel
            key={i}
            index={i}
            risenAt={risenAt.current}
            picked={picked === i}
            dimmed={picked !== null && picked !== i}
            reduced={reduced}
            onPick={() => setPicked(i)}
          />
        ))}

      <Hotspot
        position={[-0.95, 0, -2.95]}
        label="Torna nella stanza"
        labelHeight={1.95}
        ring={0.55}
        hit={[1.6, 1.7, 0.7]}
        hitOffset={[0, 0.85, 0]}
        muted={picked !== null}
        reduced={reduced}
        onSelect={onExit}
      >
        <group rotation-y={Math.PI / 4}>
          <Portal reduced={reduced} color="#E3B04B" />
        </group>
      </Hotspot>

      <CameraRig
        view={view}
        controls={controls}
        reduced={reduced}
        onFlight={setFlying}
        fit={[VOID_W, VOID_W]}
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
        /* always passed, never left out: a limit dropped from the props is
           not lifted but reset to zero, which pinned the island to one angle
           and yanked the camera there as soon as it landed */
        minAzimuthAngle={view.spread.azimuth >= Math.PI ? -Infinity : view.azimuth - view.spread.azimuth}
        maxAzimuthAngle={view.spread.azimuth >= Math.PI ? Infinity : view.azimuth + view.spread.azimuth}
      />
    </Canvas>
  );
});

/**
 * The other side of the portal.
 *
 * A round island with a keeper in the middle and, once it is satisfied, five
 * screens standing around it. The screens are empty: what goes on them is the
 * puzzle, and it gets built one at a time.
 */
export default function Puzzle(props: { reduced: boolean; onExit: () => void }) {
  /**
   * Bumping this remounts everything below, which is the whole reset: every
   * piece of progress is read back from storage on mount, refs included, so
   * nothing can be left over from before the jump.
   */
  const [run, setRun] = useState(0);
  const jump = (upTo: number) => {
    jumpTo(upTo);
    setRun((n) => n + 1);
  };
  return <Desk key={run} {...props} onJump={jump} />;
}

function Desk({
  reduced,
  onExit,
  onJump,
}: {
  reduced: boolean;
  onExit: () => void;
  /** Debug: wipe the chain and land with its first `upTo` stops solved. */
  onJump: (upTo: number) => void;
}) {
  /** Open windows, bottom of the pile first. */
  const [stack, setStack] = useState<number[]>([]);
  /** The star has finished drawing itself, and the keeper wants a word. */
  const [starred, setStarred] = useState(false);
  /** Whether the machine is on the desk. Earned once, then simply true. */
  const [hasMachine, setHasMachine] = useState(() => solvedSki(loadSki()));
  /** And whether it has just turned up, which is worth flying over for. */
  const [calling, setCalling] = useState(false);
  /** The machine has drawn its creature, and the keeper wants a word. */
  const [taped, setTaped] = useState(false);
  /**
   * The database is open, which is also what wires the screens together: from
   * here on a window belongs to the desktop, not to the screen it came from.
   */
  const [linked, setLinked] = usePersistentFlag(HACK_KEY);
  /** Whether the five fragments have been laid over the maze. */
  const [figure, setFigure] = usePersistentFlag(LOST_KEY);
  /** Whether the word under the crying ghost has been found. */
  const [tombino, setTombino] = usePersistentFlag(TOMBINO_KEY);
  /**
   * When a silhouette was last named right. The laugh is said on the glass,
   * not over the keeper: the visitor is up against a screen with the keeper
   * behind them, and flying back to it would close the window they are using.
   */
  const [bravoAt, setBravoAt] = useState(0);
  /**
   * A fragment that has been laid in the right place stops being a window at
   * all: its window closes and the maze draws it from then on, so it moves,
   * shrinks and closes with the maze, and dragging it drags the maze. Its own
   * screen no longer hands it out. Which fragments those are lives on the
   * board, because the drag that decides it happens outside React.
   */
  useSyncExternalStore(watchBoard, boardRevision);
  /** The wires being laid, which is a thing to watch and then it is over. */
  const [laying, setLaying] = useState(false);

  /** What each screen does when it is finished with. Most do nothing. */
  const solvedOn = (index: number) => {
    if (index === 2) setStarred(true);
    if (index === 4) {
      setHasMachine(true);
      setCalling(true);
    }
    if (index === MACHINE) setTaped(true);
    if (index === SAGOME) setTombino(true);
    if (index === HACK) {
      setLinked(true);
      setLaying(true);
    }
  };

  /**
   * What goes inside each window, built once. The desktop re-renders on every
   * pointer move while the maze is dragged, and handing a window the very same
   * element lets React skip its contents — the maze alone is nine hundred
   * walls. The callback reads the latest `solvedOn` through a ref, so building
   * once does not freeze it.
   */
  const solvedRef = useRef(solvedOn);
  solvedRef.current = solvedOn;
  const bodies = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(SCREENS).map((k) => [
          k,
          SCREENS[Number(k)].body({
            onSolved: () => solvedRef.current(Number(k)),
            onBravo: () => setBravoAt(performance.now()),
          }),
        ]),
      ),
    [],
  );

  useEffect(() => setFigureDone(figure), [figure]);

  // the wires draw themselves once, then they are simply how things are
  useEffect(() => {
    if (!laying) return;
    const t = setTimeout(() => setLaying(false), reduced ? 600 : 3200);
    return () => clearTimeout(t);
  }, [laying, reduced]);

  const shut = (index: number) => setStack((open) => open.filter((n) => n !== index));

  const raise = (index: number) =>
    setStack((open) =>
      open[open.length - 1] === index ? open : [...open.filter((n) => n !== index), index],
    );

  /**
   * Stable, because the island watches it: a new function every render would
   * make its effect fire every render.
   */
  const show = useCallback(
    (index: number | null) => {
      if (index === null || !(index in SCREENS)) {
        // once the screens are wired, leaving one no longer takes its window
        if (!linked) setStack([]);
        return;
      }
      // a screen can carry more than its own window: the machine rides on one
      // desk, the terminal on another
      const arriving = [
        index,
        ...(index === MACHINE_DESK && hasMachine ? [MACHINE] : []),
        ...(index === HACK_DESK ? [HACK] : []),
        ...(index === SAGOME_DESK ? [SAGOME] : []),
        ...(linked && index < PIECES.length && !isAttached(index) ? [PIECE + index] : []),
      ];
      setStack((open) =>
        linked ? [...open.filter((n) => !arriving.includes(n)), ...arriving] : arriving,
      );
    },
    // the board decides which fragments a screen still has to hand out
    [hasMachine, linked, boardRevision()],
  );

  return (
    <div className="stage">
      <Island
        reduced={reduced}
        onExit={onExit}
        onOpen={show}
        starred={starred}
        calling={calling}
        taped={taped}
        hacked={laying}
        linked={linked}
        tombino={tombino}
      />

      {/* the desktop: each screen its own window, stacked in the order they
          were last touched, and none of them nailed down */}
      {stack.map((index, depth) => {
        const piece = index >= PIECE ? index - PIECE : null;
        return (
          <Window
            key={index}
            title={SCREENS[index].title}
            start={{ x: 16 + depth * 24, y: 74 + depth * 24 }}
            width={SCREENS[index].width}
            glass={piece !== null}
            z={depth}
            onFocus={() => raise(index)}
            onClose={() => shut(index)}
            // the fragments are drawn at the maze's scale, so they hear about it
            onScale={index === MAZE ? remeasure : undefined}
            onDrop={
              piece === null
                ? undefined
                : (at, win) => {
                    const landed = dropPiece(piece, at, win);
                    // home: it is part of the maze drawing now, not a window
                    if (isAttached(piece)) shut(index);
                    if (isFigureDone()) setFigure(true);
                    return landed;
                  }
            }
          >
            {bodies[index]}
          </Window>
        );
      })}
      {bravoAt > 0 && (
        <div className="keeper-float">
          <Keeper
            key={bravoAt}
            line={bravoLine}
            last
            reduced={reduced}
            onNext={() => setBravoAt(0)}
          />
        </div>
      )}
      <button className="void-exit ghost-btn" onClick={onExit}>
        Torna nella stanza
      </button>
      {/* debug: back to an untouched puzzle, or straight to any point of it */}
      <div className="void-reset">
        <button onClick={() => onJump(0)}>⟲ ricomincia il puzzle</button>
        <select
          aria-label="Salta a un punto del puzzle"
          value=""
          onChange={(e) => onJump(Number(e.target.value))}
        >
          <option value="" disabled>
            ⇥ salta a…
          </option>
          {STAGES.map(({ label }, i) => (
            <option key={label} value={i + 1}>
              risolti fino a: {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
