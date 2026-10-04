/**
 * The figure hidden across the screens.
 *
 * The maze corridor is already a drawing — it spells its letter in gold once
 * the line is traced — and this is the rest of the picture: five fragments,
 * one on each screen, that only mean anything laid over the maze in the right
 * place. Everything here is in the maze's own grid, where one unit is one
 * cell and a whole number plus a half is the middle of one, which is where
 * the trail is drawn. That is the only reason the two ever meet.
 */

import { COLS, ROWS } from './maze';

/** The grain of the maze drawing, kept in step with the one Maze.tsx uses. */
export const CELL = 22;
export const PAD = 6;
export const UNITS = COLS * CELL + PAD * 2;

/** Used until the maze window is open and its real scale can be read. */
const FALLBACK_CELL = 15;

/** How far off a fragment may be dropped and still snap home, in pixels. */
export const TOL = 20;

export type Piece = {
  title: string;
  /** Strokes, as SVG paths in grid units. */
  paths?: string[];
  /** The eyes and the mouth: boxes, stepped into paths when they are drawn. */
  boxes?: { x: number; y: number; w: number; h: number; r: number }[];
  /** What this fragment's window shows of the grid: [x, y, w, h]. */
  view: [number, number, number, number];
};

/**
 * The grain everything is drawn on: one pixel of the figure, in maze cells.
 *
 * Bigger means a coarser, simpler sprite — fewer and longer steps. The half
 * is deliberate: the lattice is 0.5, 1.5, 2.5 …, which is where the middles
 * of the cells are, and the middles of the cells are where the gold runs. A
 * grain that missed them would draw a figure that never quite touches it.
 */
const GRAIN = 1;
const snap = (n: number) => Math.round((n - 0.5) / GRAIN) * GRAIN + 0.5;

/**
 * A line, stepped.
 *
 * The figure is a sprite, so nothing in it is allowed to be a curve: the path
 * is walked at the grain of half a cell and every move is either across or
 * down, which is what makes a diagonal come out as a staircase — the same
 * staircase the corridor itself is drawn with.
 */
function steps(points: [number, number][]) {
  /* walked closely first, so it is the grain that decides where the steps
     fall and not how far apart the points happen to be */
  const walked: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / (GRAIN / 2)));
    for (let k = 1; k <= n; k++) walked.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }

  let [x, y] = [snap(walked[0][0]), snap(walked[0][1])];
  let d = `M ${x} ${y}`;
  for (const point of walked.slice(1)) {
    const nx = snap(point[0]);
    const ny = snap(point[1]);
    /* the longer way first: the steps then lean the way the line is going */
    const first = Math.abs(ny - y) >= Math.abs(nx - x) ? ["V", "H"] : ["H", "V"];
    for (const axis of first) {
      if (axis === "V" && ny !== y) d += ` V ${ny}`;
      if (axis === "H" && nx !== x) d += ` H ${nx}`;
    }
    x = nx;
    y = ny;
  }
  return d;
}

/** A box with its corners taken off one step at a time, the way a sprite is. */
function pixelBox({ x, y, w, h, r }: { x: number; y: number; w: number; h: number; r: number }) {
  const c = snap(r);
  return (
    `M ${x + c} ${y} H ${x + w - c} V ${y + c} H ${x + w} V ${y + h - c} H ${x + w - c}` +
    ` V ${y + h} H ${x + c} V ${y + h - c} H ${x} V ${y + c} H ${x + c} Z`
  );
}

/**
 * The figure, traced off the drawing.
 *
 * The corridor is the whole of the body: it comes out of the top right of the
 * maze, runs along under the skull as its jaw, and winds all the way down to
 * the bottom left. So the skull is not on the grid at all — it stands above
 * the maze window, which is why these rows are negative.
 *
 * The skull is a circle and nothing else: one centre, one radius, and the two
 * halves are the same arc mirrored, so it cannot come out lopsided however
 * the steps fall. Where each half stops is where the gold is waiting for it —
 * the left on the run at row 3, the right on the run at row 2 — and those two
 * are at different heights because the corridor is, not because the head is.
 */
const CX = 10.5;
const CY = -5;
const R = 9.5;

/** Points along the skull, from the top down one side to the height `until`. */
function skull(side: -1 | 1, until: number): [number, number][] {
  const end = Math.acos(-(until - CY) / R);
  const n = Math.ceil((end / Math.PI) * 30);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (end * i) / n;
    return [CX + side * R * Math.sin(t), CY - R * Math.cos(t)] as [number, number];
  });
}

const SKULL_LEFT = skull(-1, 3.5);
const SKULL_RIGHT = skull(1, 2.5);

/** The eyes, mirrored about the middle of the skull. */
const EYE_W = 4;
const EYE_H = 4;
const EYE_DX = 5;
const EYE_Y = -5.5;
const eye = (side: -1 | 1) => ({
  x: CX + side * EYE_DX - EYE_W / 2,
  y: EYE_Y,
  w: EYE_W,
  h: EYE_H,
  r: 0.5,
});

/**
 * The mouth, the way the game draws it: a small block, a step wider at the
 * bottom than at the top.
 */
const MOUTH: string[] = [
  `M ${CX - 1} -0.5 H ${CX + 1} V 0.5 H ${CX + 2} V 1.5 H ${CX - 2} V 0.5 H ${CX - 1} Z`,
];

/** What runs down from the eyes, stepped, and mirrored like the eyes are. */
const tear = (side: -1 | 1): [number, number][] => {
  const x = CX + side * EYE_DX;
  const out = x + side;
  return [
    [x, -1.5],
    [x, -0.5],
    [out, -0.5],
    [out, 0.5],
    [x, 0.5],
    [x, 1.5],
  ];
};

/** The two folds that turn the corridor's staircase into a hanging body. */
const FOLD_UPPER: [number, number][] = [
  /* starts on the corner the corridor turns at, or the body hangs off nothing */
  [14.5, 4.5],
  [15.6, 5.3],
  [16.3, 6.2],
  [16.5, 7.4],
  [16, 8.4],
  [15.6, 9.4],
  [15.1, 10.6],
  [15.1, 11.5],
];

const FOLD_LOWER: [number, number][] = [
  [10.8, 10.5],
  [10.4, 12.5],
  [11, 13.5],
  [11.4, 14.5],
  [11.9, 15.5],
  [12.5, 16.4],
  [12.9, 17.5],
];

/**
 * One fragment per screen, in screen order.
 *
 * Nothing here draws a face on its own: half a skull is a curve, an eye is a
 * box, a fold is a squiggle. They only become a face over the maze, and only
 * once the maze has been walked — the gold is the jaw and the body, and
 * without it the head has nothing to sit on.
 */
export const PIECES: Piece[] = [
  {
    title: "frammento · mezzo cranio",
    paths: [steps(SKULL_LEFT)],
    boxes: [eye(-1)],
    view: [CX - R - 0.4, CY - R - 0.4, R + 0.4, R + 8.9],
  },
  {
    title: "frammento · mezzo cranio",
    paths: [steps(SKULL_RIGHT)],
    boxes: [eye(1)],
    view: [CX - 0.4, CY - R - 0.4, R + 0.4, R + 7.9],
  },
  {
    title: "frammento · bocca e pianto",
    paths: [...MOUTH, steps(tear(-1)), steps(tear(1))],
    view: [CX - EYE_DX - 1.5, -2, EYE_DX * 2 + 3, 4],
  },
  {
    title: "frammento · piega alta",
    paths: [steps(FOLD_UPPER)],
    view: [13.9, 3.9, 3.1, 8.1],
  },
  {
    title: "frammento · piega bassa",
    paths: [steps(FOLD_LOWER)],
    view: [9.9, 10.1, 3.5, 7.9],
  },
];

/** The eyes and mouth, as the stepped outlines they are drawn with. */
export const boxPath = pixelBox;

/* ------------------------------------------------------------- the board */

/**
 * Where everything is, right now. It is a module and not React state because
 * the two halves never meet in the tree: the maze is inside one window, the
 * fragments are inside five others, and what matters is where they all are on
 * the glass — which only the DOM knows.
 */
const board = {
  /** The maze drawing, while its window is open. */
  maze: null as SVGSVGElement | null,
  /** Whether the corridor has actually been traced. */
  traced: false,
  /** Each open fragment, by index. */
  pieces: new Map<number, SVGSVGElement>(),
  /** Fragments sitting where they belong. */
  home: new Set<number>(),
  done: false,
};

const listeners = new Set<() => void>();

/** Bumped on every change, so React can watch the board from outside. */
let ticks = 0;
export const revision = () => ticks;

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit() {
  ticks += 1;
  listeners.forEach((fn) => fn());
}

/** Where the maze grid sits on the glass, and how big a cell is there. */
function grid() {
  const box = board.maze?.getBoundingClientRect();
  if (!box || !box.width) return null;
  const scale = box.width / UNITS;
  return { x: box.left + PAD * scale, y: box.top + PAD * scale, cell: CELL * scale };
}

/** The size a fragment draws itself at: the maze's, or a guess without it. */
export function cellSize() {
  return grid()?.cell ?? FALLBACK_CELL;
}

export function holdMaze(el: SVGSVGElement | null, traced: boolean) {
  board.maze = el;
  board.traced = traced;
  emit();
}

export function holdPiece(index: number, el: SVGSVGElement | null) {
  if (el) board.pieces.set(index, el);
  else board.pieces.delete(index);
}

export const isHome = (index: number) => board.home.has(index);
export const isDone = () => board.done;

export function setDone(done: boolean) {
  board.done = done;
  /* a figure that was finished in an earlier visit comes back finished: every
     fragment belongs to the maze window again, wherever it is opened from */
  if (done) PIECES.forEach((_, i) => board.home.add(i));
  else board.home.clear();
  emit();
}

/**
 * How far fragment `index` is from where it belongs, in pixels.
 *
 * The window is measured through `win` rather than on its own: a drop lands
 * before React has moved anything, so the fragment's own rectangle is a frame
 * out of date — but where it sits *inside* its window never is.
 */
function drift(index: number, at: { x: number; y: number }, win: HTMLElement | null) {
  const g = grid();
  const el = board.pieces.get(index);
  if (!g || !el || !win) return null;
  const box = el.getBoundingClientRect();
  const frame = win.getBoundingClientRect();
  const [vx, vy] = PIECES[index].view;
  return {
    dx: g.x + vx * g.cell - (at.x + box.left - frame.left),
    dy: g.y + vy * g.cell - (at.y + box.top - frame.top),
  };
}

/**
 * Where the window would have to sit for fragment `index` to be home, given
 * where it is now. Used to put the fragments back over the maze by themselves
 * once the figure has been finished once.
 */
export function home(index: number, at: { x: number; y: number }, win: HTMLElement | null) {
  const off = drift(index, at, win);
  return off && { x: at.x + off.dx, y: at.y + off.dy };
}

/**
 * Called when a fragment is let go. It answers with where the window should
 * actually sit — nudged home when it was dropped close enough, and left
 * exactly where it was dropped otherwise.
 */
export function drop(index: number, at: { x: number; y: number }, win: HTMLElement | null) {
  const off = drift(index, at, win);
  const home = !!off && Math.abs(off.dx) < TOL && Math.abs(off.dy) < TOL;
  if (home) board.home.add(index);
  else board.home.delete(index);

  const complete = board.traced && board.home.size === PIECES.length;
  if (complete !== board.done) board.done = complete;
  emit();

  return home && off ? { x: at.x + off.dx, y: at.y + off.dy } : at;
}

export { COLS, ROWS };
