/**
 * A maze whose one way through spells a letter.
 *
 * The trick is the order of work: the letter is carved first, as a corridor,
 * and everything else grows outward from it with Prim's algorithm, which only
 * ever opens a wall onto a cell nothing has reached yet. That keeps the whole
 * maze a tree, and in a tree there is exactly one route between two cells —
 * so the only way from the entrance to the exit is the letter itself. No
 * search, no retries, no "mostly unique".
 */

export const COLS = 21;
export const ROWS = 21;

/**
 * The corners of the corridor, as [row, col] from the top left, with the
 * straight runs between them filled in.
 *
 * The letter is deliberately not drawn with a ruler: each stroke steps a row
 * or two sideways partway along. Five dead straight runs can be followed
 * across the grid at a glance, which is no puzzle at all — and a letter this
 * size still reads as itself with a kink in every stroke. Parallel strokes
 * are kept two cells apart so the corridor never touches itself, which would
 * open a second way through; `npm test` fails if that ever stops being true.
 */
const CORNERS: [number, number][] = [
  [2, 20],
  [2, 14],
  [4, 14],
  [4, 8],
  [3, 8],
  [3, 4],
  [7, 4],
  [7, 6],
  [10, 6],
  [10, 12],
  [11, 12],
  [11, 16],
  [14, 16],
  [14, 14],
  [17, 14],
  [17, 0],
];

/** The cells the corridor passes through, corners expanded into runs. */
export function letterPath(): [number, number][] {
  const path: [number, number][] = [CORNERS[0]];
  for (let i = 1; i < CORNERS.length; i++) {
    const [r0, c0] = CORNERS[i - 1];
    const [r1, c1] = CORNERS[i];
    const stepR = Math.sign(r1 - r0);
    const stepC = Math.sign(c1 - c0);
    let r = r0;
    let c = c0;
    while (r !== r1 || c !== c1) {
      r += stepR;
      c += stepC;
      path.push([r, c]);
    }
  }
  return path;
}

export type Maze = {
  /** `right[r][c]` — wall between (r,c) and (r,c+1). */
  right: boolean[][];
  /** `down[r][c]` — wall between (r,c) and (r+1,c). */
  down: boolean[][];
  /** Where the corridor comes in and goes out, on the outer edge. */
  entrance: [number, number];
  exit: [number, number];
};

/** Deterministic noise: the same maze for everyone, every time. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grid = (rows: number, cols: number) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));

export function buildMaze(seed = 20260919): Maze {
  const right = grid(ROWS, COLS);
  const down = grid(ROWS, COLS);
  const seen = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => false));

  const open = (r0: number, c0: number, r1: number, c1: number) => {
    if (r0 === r1) right[r0][Math.min(c0, c1)] = false;
    else down[Math.min(r0, r1)][c0] = false;
  };

  // 1. the letter, carved as one corridor
  const path = letterPath();
  path.forEach(([r, c], i) => {
    seen[r][c] = true;
    if (i > 0) open(path[i - 1][0], path[i - 1][1], r, c);
  });

  // 2. everything else, grown outward from it
  const random = rng(seed);
  const frontier: [number, number, number, number][] = [];
  const offer = (r: number, c: number) => {
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || seen[nr][nc]) continue;
      frontier.push([r, c, nr, nc]);
    }
  };
  path.forEach(([r, c]) => offer(r, c));

  /**
   * How often the next wall to open is the one just added rather than any
   * of them. Always taking a random one (Prim) grows a bush of short stubs
   * that the eye discards in a second; always taking the last one (a
   * backtracker) grows one long snake. Mostly-the-last gives long winding
   * passages that still fork, which is the thing that is actually hard.
   */
  const FOLLOW_ON = 0.8;

  while (frontier.length) {
    const i =
      random() < FOLLOW_ON ? frontier.length - 1 : Math.floor(random() * frontier.length);
    const [r, c, nr, nc] = frontier.splice(i, 1)[0];
    // it may have been reached from somewhere else in the meantime
    if (seen[nr][nc]) continue;
    seen[nr][nc] = true;
    open(r, c, nr, nc);
    offer(nr, nc);
  }

  return { right, down, entrance: path[0], exit: path[path.length - 1] };
}

export type Cell = [number, number];

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

/** Is there a way from one cell straight into the next? */
export function passable(maze: Maze, [r, c]: Cell, [nr, nc]: Cell) {
  if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) return false;
  if (nr === r && nc === c + 1) return !maze.right[r][c];
  if (nr === r && nc === c - 1) return !maze.right[r][c - 1];
  if (nc === c && nr === r + 1) return !maze.down[r][c];
  if (nc === c && nr === r - 1) return !maze.down[r - 1][c];
  return false;
}

/**
 * Is this something the maze could actually have been walked into?
 *
 * A saved trail comes back from storage, which anyone can edit, so it is
 * checked rather than trusted: it has to start at the entrance, step only
 * through open walls, and never cross itself.
 */
export function validTrail(maze: Maze, trail: unknown): trail is Cell[] {
  if (!Array.isArray(trail) || trail.length === 0) return false;
  const cells = trail as Cell[];
  if (
    !cells.every(
      (cell) =>
        Array.isArray(cell) &&
        cell.length === 2 &&
        Number.isInteger(cell[0]) &&
        Number.isInteger(cell[1]),
    )
  ) {
    return false;
  }
  if (!same(cells[0], maze.entrance)) return false;
  const seen = new Set<string>();
  for (let i = 0; i < cells.length; i++) {
    const key = `${cells[i][0]},${cells[i][1]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (i > 0 && !passable(maze, cells[i - 1], cells[i])) return false;
  }
  return true;
}

/** The one route from the entrance to the exit, found the honest way. */
export function solve(maze: Maze): [number, number][] {
  const [sr, sc] = maze.entrance;
  const from = new Map<string, string | null>([[`${sr},${sc}`, null]]);
  const queue: [number, number][] = [[sr, sc]];

  while (queue.length) {
    const [r, c] = queue.shift() as [number, number];
    if (r === maze.exit[0] && c === maze.exit[1]) break;
    const moves: Cell[] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of moves) {
      if (!passable(maze, [r, c], [nr, nc]) || from.has(`${nr},${nc}`)) continue;
      from.set(`${nr},${nc}`, `${r},${c}`);
      queue.push([nr, nc]);
    }
  }

  const route: [number, number][] = [];
  let at: string | null | undefined = `${maze.exit[0]},${maze.exit[1]}`;
  while (at) {
    const [r, c] = at.split(",").map(Number);
    route.unshift([r, c]);
    at = from.get(at) ?? null;
  }
  return route;
}
