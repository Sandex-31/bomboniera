/**
 * Three floors of mirrors, one beam.
 *
 * The beam enters the ground floor, is bounced around by the mirrors the
 * visitor places, and where it finally arrives it goes up a floor and carries
 * on. What it draws on the way is the point: each floor is one part of a
 * figure, and the three of them stacked are the whole of it.
 *
 * Everything here is derived from one list of corners per floor — the route,
 * the mirrors that make it, how many you are given, where the power cells sit,
 * and the cells the light has to end up covering. Move a corner and the whole
 * floor follows; `npm test` re-walks all three with the derived
 * mirrors and checks the drawing comes out exactly right.
 */

export const SIZE = 17;

export type Cell = [number, number];
/** 0 right, 1 down, 2 left, 3 up. */
export type Dir = 0 | 1 | 2 | 3;
export type Mirror = "/" | "\\";

const STEP: Cell[] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];
const key = ([r, c]: Cell) => `${r},${c}`;
const inside = ([r, c]: Cell) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;

/** Where a beam goes when it meets a mirror. */
export function bounce(dir: Dir, mirror: Mirror): Dir {
  const slash: Record<Dir, Dir> = { 0: 3, 3: 0, 2: 1, 1: 2 };
  const back: Record<Dir, Dir> = { 0: 1, 1: 0, 2: 3, 3: 2 };
  return mirror === "/" ? slash[dir] : back[dir];
}

/** Which mirror turns `from` into `to`. */
function mirrorFor(from: Dir, to: Dir): Mirror {
  return bounce(from, "/") === to ? "/" : "\\";
}

const dirOf = (a: Cell, b: Cell): Dir => {
  const dr = Math.sign(b[0] - a[0]);
  const dc = Math.sign(b[1] - a[1]);
  return STEP.findIndex(([sr, sc]) => sr === dr && sc === dc) as Dir;
};

/**
 * The route of each floor, corner by corner.
 *
 * The figure is three rings — the eye, the iris, the pupil — joined by
 * spokes, and each floor is one sector of the whole thing: it comes in along
 * a ring, dives down a spoke, works its way round the next ring in, and stops
 * somewhere near the middle. So no floor is ever "the eyelid" or "the iris" —
 * each is a piece of all three, which on its own is a scribble that means
 * nothing. Only the three of them stacked are a face.
 *
 * Each floor starts where the one below it finished, because that is where
 * the light comes up.
 */
const ROUTES: Cell[][] = [
  /* in from the right, over the lashes, down into the iris and the pupil */
  [
    [8, 16], [8, 14], [6, 14], [6, 12], [4, 12], [4, 10], [3, 10], [3, 8],
    [4, 8], [4, 6], [3, 6], [3, 5], [6, 5], [6, 11], [8, 11], [8, 9], [7, 9], [7, 7],
  ],
  /* out of the pupil, back along the spoke, round the bottom of the eye */
  [
    [7, 7], [9, 7], [9, 9], [8, 9], [8, 14], [10, 14], [10, 12], [12, 12],
    [12, 10], [13, 10], [13, 8], [12, 8], [12, 6], [13, 6], [13, 5], [12, 5],
  ],
  /* up the far side and back in along the last of the iris */
  [
    [12, 5], [12, 4], [10, 4], [10, 2], [6, 2], [6, 4], [4, 4], [4, 5],
    [10, 5], [10, 11], [9, 11],
  ],
];

/*
 * One power cell per straight run, and not one mirror more than the corners
 * between them — which together are what make the answer the only answer.
 *
 * Scattering the cells loosely along the route did not do it: a beam can
 * collect a handful of them and still come out having drawn something else.
 * With one cell per run, each facing the way the light has to arrive, and
 * exactly as many mirrors as there are corners, the route can be read back
 * out of the cells: two consecutive cells sit on two lines, the beam has
 * only one turn to spend getting from one to the other, and two crossing
 * lines meet in exactly one place. There is nothing left to choose.
 *
 * It is also why the puzzle is fair. Nothing says what is being drawn, but
 * everything needed to work out where the next mirror goes is on the grid.
 */

/** Steps of slack on top of the longest unfed run. Two is mean enough. */
const FUEL_SLACK = 2;

export type Floor = {
  source: { cell: Cell; dir: Dir };
  /** Where the light goes up to the next floor. */
  riser: Cell;
  /** Cells the beam has to end up covering: this floor's share of the figure. */
  figure: Cell[];
  /**
   * Power cells, each with the one direction it takes light from.
   *
   * Asking only that the beam go through them turned out to leave far too
   * many ways round — a route can collect the lot and draw something else
   * entirely. A cell that only charges from one side pins the route down
   * without saying a word about what is being drawn: all the visitor sees is
   * that this one wants light from the left.
   */
  nodes: { cell: Cell; dir: Dir }[];
  /** How many mirrors you are given. Exactly enough, never one spare. */
  budget: number;
  /**
   * How far the beam can travel on one charge. Sized to the longest run
   * between two power cells with a little to spare, so the way round is not
   * a rule anyone has to be told: go wide of a cell and the light dies.
   */
  fuel: number;
  /** The route as intended. Only the test is allowed to look at this. */
  solution: { cell: Cell; kind: Mirror }[];
};

function buildFloor(route: Cell[]): Floor {
  const source = dirOf(route[0], route[1]);
  const cells: Cell[] = [route[0]];
  const solution: { cell: Cell; kind: Mirror }[] = [];

  for (let i = 1; i < route.length; i++) {
    const dir = dirOf(route[i - 1], route[i]);
    const [dr, dc] = STEP[dir];
    let at = route[i - 1];
    while (!same(at, route[i])) {
      at = [at[0] + dr, at[1] + dc];
      cells.push(at);
    }
    // every corner but the last is a mirror; the last cell is the riser
    if (i < route.length - 1) {
      solution.push({ cell: route[i], kind: mirrorFor(dir, dirOf(route[i], route[i + 1])) });
    }
  }

  /* one per run, in the middle of it, facing the way the light arrives */
  const nodes: { cell: Cell; dir: Dir }[] = [];
  for (let i = 1; i < route.length; i++) {
    const dir = dirOf(route[i - 1], route[i]);
    const [dr, dc] = STEP[dir];
    const steps = Math.abs(route[i][0] - route[i - 1][0]) + Math.abs(route[i][1] - route[i - 1][1]);
    const half = Math.max(1, Math.round(steps / 2));
    nodes.push({ cell: [route[i - 1][0] + dr * half, route[i - 1][1] + dc * half], dir });
  }

  /* the longest the light ever has to go unfed, plus a little slack */
  const stops = [
    0,
    ...nodes.map(({ cell: spot }) => cells.findIndex((c) => same(c, spot))),
    cells.length - 1,
  ];
  const longest = stops.slice(1).reduce((most, to, i) => Math.max(most, to - stops[i]), 0);

  return {
    source: { cell: route[0], dir: source },
    riser: route[route.length - 1],
    figure: cells,
    nodes,
    budget: solution.length,
    fuel: longest + FUEL_SLACK,
    solution,
  };
}

export const FLOORS: Floor[] = ROUTES.map(buildFloor);

export type Step = { cell: Cell; dir: Dir; fuel: number };

export type Trace = {
  /** Every cell the light passes through, in order, and the way it entered. */
  steps: Step[];
  /** True when it arrived at the riser instead of dying somewhere. */
  arrived: boolean;
};

/**
 * Walks the beam through a floor with the mirrors that are on it now.
 *
 * It stops when it leaves the grid, or comes back to somewhere
 * it has already been travelling the same way — which is how a pair of mirrors
 * facing each other is stopped from spinning the light forever.
 */
export function trace(floor: Floor, mirrors: Map<string, Mirror>): Trace {
  const seen = new Set<string>();
  const steps: Step[] = [];

  const feeds = new Set(floor.nodes.map((n) => `${key(n.cell)}:${n.dir}`));

  let at = floor.source.cell;
  let dir = floor.source.dir;
  let fuel = floor.fuel;

  for (let guard = 0; guard < SIZE * SIZE * 4; guard++) {
    if (!inside(at)) break;
    const state = `${key(at)}:${dir}`;
    if (seen.has(state)) break;
    seen.add(state);

    // a cell feeds the beam only from the side it faces, and fills it right up
    if (feeds.has(state)) fuel = floor.fuel;
    steps.push({ cell: at, dir, fuel });

    if (same(at, floor.riser) && steps.length > 1) return { steps, arrived: true };
    if (fuel <= 0) break;

    const mirror = mirrors.get(key(at));
    if (mirror) dir = bounce(dir, mirror);
    const [dr, dc] = STEP[dir];
    at = [at[0] + dr, at[1] + dc];
    fuel -= 1;
  }

  return { steps, arrived: false };
}

/** How many power cells the beam has fed from, and whether it got out. */
export function charge(floor: Floor, mirrors: Map<string, Mirror>) {
  const walked = trace(floor, mirrors);
  const through = new Set(walked.steps.map((s) => `${key(s.cell)}:${s.dir}`));
  const fed = new Set(
    floor.nodes
      .filter((node) => through.has(`${key(node.cell)}:${node.dir}`))
      .map((node) => key(node.cell)),
  );
  return {
    lit: new Set(walked.steps.map((s) => key(s.cell))),
    fed,
    power: fed.size,
    arrived: walked.arrived,
    cells: walked.steps.map((s) => s.cell),
  };
}

/**
 * A floor is done when the beam leaves it fully fed: every power cell been
 * through, and the way up reached. Reaching the way up on a half charge is
 * not enough — that is the whole reason the route is the length it is.
 */
export function complete(floor: Floor, mirrors: Map<string, Mirror>) {
  const state = charge(floor, mirrors);
  return state.arrived && state.power === floor.nodes.length;
}
