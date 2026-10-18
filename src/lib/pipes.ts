/**
 * The steam pipes of the machine room: a panel of copper on the wall, seven
 * pieces across and six down, with the three lines of the boilers coming in
 * on the left and four outlets on the right.
 *
 * Every outlet wants one line, the one with its shape: the round one drives
 * the gears, the triangle the organ, the square the press. The fourth outlet
 * has no shape at all and ends in a whistle that does nothing but waste
 * steam. A line is right when it reaches its own outlet and nothing else: no
 * open end where it leaks, no meeting with another line, no wrong outlet.
 *
 * Most pieces turn a quarter at a tap. Three are switches, with a lever that
 * sends the steam one way or the other; four are valves, turned open or shut.
 * Two are bridges, where two lines cross without touching. The panel was
 * found by a search for one with a single way through (every switch and
 * every valve used, and one valve that has to be left open), and `npm test`
 * searches it again rather than trusting this comment.
 */

import { PIPES_KEY } from "../data/puzzle";
import type { Shape } from "./boilers";

export const W = 7;
export const H = 6;

/** The four sides of a piece, as bits, clockwise from the top. */
export const N = 1;
export const E = 2;
export const S = 4;
export const WEST = 8;
export const SIDES = [N, E, S, WEST] as const;
const STEP: Record<number, [number, number]> = { [N]: [0, -1], [E]: [1, 0], [S]: [0, 1], [WEST]: [-1, 0] };
export const opposite = (d: number) => (d === N ? S : d === S ? N : d === E ? WEST : E);

const LETTER: Record<string, number> = { N, E, S, W: WEST };
const bits = (sides: string) => [...sides].reduce((m, c) => m | LETTER[c], 0);

/** Turns a set of sides `k` quarters clockwise. */
export const turn = (m: number, k: number) => {
  let out = m;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) out = ((out << 1) & 15) | (out >> 3);
  return out;
};

export type Piece =
  | { kind: "rot"; shape: "straight" | "elbow" | "tee" }
  | { kind: "bridge" }
  | { kind: "switch"; in: string; a: string; b: string }
  | { kind: "valve"; ports: string }
  | { kind: "fixed"; ports: string }
  | null;

/** How each turnable piece sits before it is turned at all. */
export const BASE = { straight: N | S, elbow: N | E, tee: N | E | S } as const;

/** The panel, by row from the top. */
export const GRID: Piece[][] = [
  [
    { kind: "rot", shape: "straight" },
    { kind: "rot", shape: "elbow" },
    { kind: "valve", ports: "EW" },
    { kind: "rot", shape: "tee" },
    { kind: "rot", shape: "elbow" },
    { kind: "valve", ports: "NS" },
    { kind: "rot", shape: "elbow" },
  ],
  [
    { kind: "rot", shape: "elbow" },
    { kind: "rot", shape: "straight" },
    { kind: "rot", shape: "elbow" },
    { kind: "rot", shape: "elbow" },
    { kind: "rot", shape: "elbow" },
    { kind: "rot", shape: "tee" },
    { kind: "rot", shape: "elbow" },
  ],
  [
    { kind: "rot", shape: "straight" },
    { kind: "rot", shape: "elbow" },
    { kind: "bridge" },
    { kind: "rot", shape: "straight" },
    { kind: "rot", shape: "elbow" },
    { kind: "rot", shape: "tee" },
    { kind: "rot", shape: "elbow" },
  ],
  [
    { kind: "rot", shape: "straight" },
    { kind: "rot", shape: "elbow" },
    { kind: "bridge" },
    { kind: "rot", shape: "elbow" },
    { kind: "rot", shape: "elbow" },
    { kind: "switch", in: "W", a: "N", b: "E" },
    { kind: "rot", shape: "straight" },
  ],
  [
    { kind: "rot", shape: "elbow" },
    { kind: "rot", shape: "elbow" },
    { kind: "rot", shape: "straight" },
    { kind: "rot", shape: "elbow" },
    { kind: "rot", shape: "straight" },
    { kind: "switch", in: "E", a: "S", b: "W" },
    { kind: "rot", shape: "tee" },
  ],
  [
    { kind: "valve", ports: "EW" },
    { kind: "rot", shape: "straight" },
    { kind: "switch", in: "W", a: "N", b: "E" },
    { kind: "rot", shape: "straight" },
    null,
    { kind: "rot", shape: "straight" },
    { kind: "valve", ports: "NS" },
  ],
];

/** Which row each line comes in on, at the left. */
export const INLETS: Record<Shape, number> = { tondo: 0, triangolo: 1, quadrato: 5 };

export type Outlet = Shape | "esca";
/** Which row each outlet leaves on, at the right. */
export const OUTLETS: Record<Outlet, number> = { quadrato: 0, esca: 1, tondo: 3, triangolo: 4 };

const at = (x: number, y: number) => y * W + x;
const piece = (x: number, y: number): Piece => (x >= 0 && y >= 0 && x < W && y < H ? GRID[y][x] : null);

/** The switches and the valves, each in reading order: their index in the state. */
const listOf = (kind: "switch" | "valve") =>
  GRID.flatMap((row, y) => row.flatMap((p, x) => (p?.kind === kind ? [at(x, y)] : [])));
export const SWITCHES = listOf("switch");
export const VALVES = listOf("valve");

export type PipesState = {
  /** Quarter turns of every piece, by cell; only the turnable ones count. */
  turns: number[];
  /** Each switch's lever: up sends the steam to its `a` side, down to its `b`. */
  switches: boolean[];
  /** Each valve: open or shut. */
  valves: boolean[];
};

/** The sides a piece has open, as it stands. A bridge has all four, in two channels. */
export function sidesOf(state: PipesState, x: number, y: number): number {
  const p = piece(x, y);
  if (!p) return 0;
  if (p.kind === "rot") return turn(BASE[p.shape], state.turns[at(x, y)]);
  if (p.kind === "fixed" || p.kind === "valve") return bits(p.ports);
  if (p.kind === "bridge") return N | E | S | WEST;
  return bits(p.in + p.a + p.b);
}

/**
 * Where steam that came in on side `entry` of a piece goes on to: the sides
 * it leaves by, `"sealed"` if it comes up against a closed valve or the shut
 * side of a switch (stopped, but not lost), or `"leak"` if the piece has no
 * opening there and the steam pours out of the pipe it came from.
 */
export function through(state: PipesState, x: number, y: number, entry: number): number[] | "sealed" | "leak" {
  const p = piece(x, y);
  if (!p) return "leak";
  if (p.kind === "bridge") return [opposite(entry)];
  if (p.kind === "switch") {
    const up = state.switches[SWITCHES.indexOf(at(x, y))];
    const into = LETTER[p.in];
    const live = LETTER[up ? p.a : p.b];
    if (entry === into) return [live];
    if (entry === live) return [into];
    return entry === LETTER[p.a] || entry === LETTER[p.b] ? "sealed" : "leak";
  }
  const m = sidesOf(state, x, y);
  if (!(m & entry)) return "leak";
  if (p.kind === "valve" && !state.valves[VALVES.indexOf(at(x, y))]) return "sealed";
  return SIDES.filter((d) => m & d && d !== entry);
}

export type Flow = {
  /** What became of each outlet. */
  outlets: Record<Outlet, "ok" | "mixed" | "none">;
  /** Each open end steam pours out of: the piece, and the side. */
  leaks: { x: number; y: number; side: number }[];
  /** Which lines run through each piece, by cell; a bridge can carry two. */
  carries: Shape[][];
};

/**
 * Where the steam of the lit lines goes. Each line is followed from its
 * inlet through every piece it can get into; what it touches decides it.
 */
export function flow(state: PipesState, steam: Record<Shape, boolean>): Flow {
  const carries: Shape[][] = Array.from({ length: W * H }, () => []);
  const leaks: Flow["leaks"] = [];
  const reached: Record<Shape, Set<Outlet>> = { tondo: new Set(), triangolo: new Set(), quadrato: new Set() };
  const leaking: Record<Shape, boolean> = { tondo: false, triangolo: false, quadrato: false };
  const mixed = new Set<Shape>();
  /** Which line holds each channel: a cell, or a bridge's two ways across. */
  const owner = new Map<string, Shape>();
  const outletAt = new Map(Object.entries(OUTLETS).map(([o, row]) => [row, o as Outlet]));
  const inletAt = new Map(Object.entries(INLETS).map(([l, row]) => [row, l as Shape]));

  for (const line of Object.keys(INLETS) as Shape[]) {
    if (!steam[line]) continue;
    const queue: [number, number, number][] = [[0, INLETS[line], WEST]];
    while (queue.length) {
      const [x, y, entry] = queue.pop()!;
      // the piece the steam came from, and its side it came out of: where a leak shows
      const back = { x: x + STEP[entry][0], y: y + STEP[entry][1], side: opposite(entry) };
      if (x < 0) {
        // back out on the left: into a boiler's mouth, or out into the room
        const other = inletAt.get(y);
        if (!other) {
          leaks.push(back);
          leaking[line] = true;
        } else if (other !== line) {
          mixed.add(line);
          if (steam[other]) mixed.add(other);
        }
        continue;
      }
      if (x >= W) {
        const out = outletAt.get(y);
        if (out) reached[line].add(out);
        else (leaks.push(back), (leaking[line] = true));
        continue;
      }
      if (y < 0 || y >= H) {
        leaks.push(back);
        leaking[line] = true;
        continue;
      }
      const next = through(state, x, y, entry);
      if (next === "leak") {
        leaks.push(back);
        leaking[line] = true;
        continue;
      }
      const channel =
        piece(x, y)?.kind === "bridge" ? `${x},${y},${entry === N || entry === S ? "|" : "-"}` : `${x},${y}`;
      const held = owner.get(channel);
      if (held && held !== line) {
        mixed.add(line);
        mixed.add(held);
        continue;
      }
      if (held) continue;
      owner.set(channel, line);
      if (!carries[at(x, y)].includes(line)) carries[at(x, y)].push(line);
      if (next === "sealed") continue;
      for (const d of next) queue.push([x + STEP[d][0], y + STEP[d][1], opposite(d)]);
    }
  }

  const outlets = {} as Flow["outlets"];
  for (const out of Object.keys(OUTLETS) as Outlet[]) {
    const lines = (Object.keys(reached) as Shape[]).filter((l) => reached[l].has(out));
    if (lines.some((l) => mixed.has(l))) outlets[out] = "mixed";
    else if (lines.length === 1 && lines[0] === out && !leaking[out] && reached[out].size === 1) outlets[out] = "ok";
    else outlets[out] = "none";
  }
  return { outlets, leaks, carries };
}

/** All three lines where they belong. */
export const solved = (f: Flow) =>
  f.outlets.tondo === "ok" && f.outlets.triangolo === "ok" && f.outlets.quadrato === "ok";

/** How the panel is found: every piece turned some way, every lever down, every valve open. */
export const START: PipesState = {
  turns: Array.from({ length: W * H }, (_, i) => (i * 7 + Math.floor(i / W) * 3 + 1) % 4),
  switches: SWITCHES.map(() => false),
  valves: VALVES.map(() => true),
};

/**
 * The way through, as the search found it: how each piece the steam passes
 * through is turned, each lever, each valve. Pieces off the way keep their
 * starting turn, since they could be any.
 */
const ROUTE: Record<string, string> = {
  "0,0": "EW",
  "0,1": "SW",
  "0,2": "NS",
  "0,3": "NS",
  "0,4": "NE",
  "1,0": "SW",
  "1,1": "NS",
  "1,2": "NE",
  "1,3": "ES",
  "1,4": "NW",
  "1,5": "EW",
  "2,1": "ES",
  "2,4": "NS",
  "3,0": "ESW",
  "3,1": "NW",
  "3,2": "EW",
  "3,3": "SW",
  "3,4": "NE",
  "4,0": "SW",
  "4,1": "NE",
  "4,2": "SW",
  "4,3": "NE",
  "4,4": "EW",
  "5,1": "NEW",
  "6,0": "ES",
  "6,1": "NW",
  "6,3": "EW",
  "6,4": "ESW",
};
const LEVERS: Record<string, "a" | "b"> = { "5,3": "b", "5,4": "b", "2,5": "a" };
const TAPS: Record<string, boolean> = { "0,5": true, "2,0": false, "5,0": false, "6,5": false };

export function solvedPipes(): PipesState {
  const turns = [...START.turns];
  for (const [cell, sides] of Object.entries(ROUTE)) {
    const [x, y] = cell.split(",").map(Number);
    const p = GRID[y][x];
    if (p?.kind !== "rot") throw new Error(`${cell} does not turn`);
    const k = [0, 1, 2, 3].find((q) => turn(BASE[p.shape], q) === bits(sides));
    if (k === undefined) throw new Error(`${cell} cannot be turned to ${sides}`);
    turns[at(x, y)] = k;
  }
  const cellOf = (i: number) => `${i % W},${Math.floor(i / W)}`;
  return {
    turns,
    switches: SWITCHES.map((i) => LEVERS[cellOf(i)] === "a"),
    valves: VALVES.map((i) => TAPS[cellOf(i)]),
  };
}

/** The stored panel, read back: anything malformed is the panel as found. */
export function pipesFrom(stored: string | null): PipesState {
  try {
    const v = JSON.parse(stored ?? "null") as Partial<PipesState> | null;
    const flags = (list: unknown, n: number): list is boolean[] =>
      Array.isArray(list) && list.length === n && list.every((b) => typeof b === "boolean");
    if (
      !v ||
      !Array.isArray(v.turns) ||
      v.turns.length !== W * H ||
      !v.turns.every((k) => Number.isInteger(k) && k >= 0 && k < 4) ||
      !flags(v.switches, SWITCHES.length) ||
      !flags(v.valves, VALVES.length)
    )
      return START;
    return { turns: v.turns, switches: v.switches, valves: v.valves };
  } catch {
    return START;
  }
}

export function loadPipes(): PipesState {
  try {
    return pipesFrom(localStorage.getItem(PIPES_KEY));
  } catch {
    return START;
  }
}
