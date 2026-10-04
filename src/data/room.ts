/**
 * The study, as a floor plan.
 *
 * A screen in the other room asks for this room back from memory. The two can
 * never check each other at runtime — one is a flat drawing, the other a 3D
 * scene, and they only meet in whoever is looking at both — so the numbers
 * live here once and `npm test` walks `src/scenes/Room.tsx` to confirm that
 * every position and every colour below is still literally in the scene.
 * Move the bike and the test says so.
 *
 * Nothing here says what is to be done with any of it.
 */

/** Half the room, in scene units: it runs from -3 to 3 on both axes. */
export const HALF = 3;

/** The gap in the left wall, so the plan can be oriented without a compass. */
export const DOOR_Z = 0.7;
export const DOOR_W = 1.2;

/** How many cells the plan is divided into, on each side. */
export const CELLS = 6;

/** One cell, in scene units. */
export const CELL = (HALF * 2) / CELLS;

/**
 * How far every object is kept from a cell line, in scene units.
 *
 * The room was not laid out on a grid, and three of the eight used to stand
 * all but exactly on one: from the isometric view there was no telling which
 * side of the line they were on, which turns a memory into a coin toss. They
 * were nudged a few tens of centimetres until every one of them sat well
 * inside its own cell, and the test re-measures that each run.
 */
export const MARGIN = 0.2;

/** Which cell a scene coordinate falls in. */
export const cellOf = (v: number) =>
  Math.min(CELLS - 1, Math.max(0, Math.floor((v + HALF) / CELL)));

/** The middle of a cell, in scene units: where a mark is drawn. */
export const middleOf = (n: number) => -HALF + (n + 0.5) * CELL;

export type Spot = {
  id: string;
  /** Read out where the outline cannot be seen. Never says colour or place. */
  label: string;
  x: number;
  z: number;
  /** The colour it is painted in the scene, as the scene paints it. */
  color: string;
  /** Its shape from above, drawn in a 24x24 box. */
  glyph: string;
};

/**
 * Eight things, far enough apart that no two can be mistaken for each other.
 *
 * Not every object in the room is here, and two of them share a colour — both
 * are true of the room, and neither is said anywhere.
 */
export const SPOTS: Spot[] = [
  {
    id: "snowboard",
    label: "la tavola da snowboard",
    x: -2.78,
    z: -1.3,
    color: "#4FA8C9",
    glyph: "M12 2c2.6 0 4 4.5 4 10s-1.4 10-4 10-4-4.5-4-10 1.4-10 4-10z",
  },
  {
    id: "bici",
    label: "la bici pieghevole",
    x: -2.25,
    z: 1.7,
    color: "#2F6B62",
    glyph:
      "M6.5 20a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17.5 20a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 14l3.5-6h4.5l1 2-3.5 4z",
  },
  {
    id: "kite",
    label: "la tavola da kite e lo zaino della vela",
    x: 2.4,
    z: 2.5,
    color: "#2B3A55",
    glyph:
      "M3 9h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM18 2c1.7 0 2.8 3.6 2.8 9s-1.1 9-2.8 9-2.8-3.6-2.8-9S16.3 2 18 2z",
  },
  {
    id: "monster",
    label: "la lattina sulla scrivania",
    x: 0.45,
    z: -1.75,
    color: "#6FC2E0",
    glyph: "M8 5c0-1.1 1.8-2 4-2s4 .9 4 2v14c0 1.1-1.8 2-4 2s-4-.9-4-2z",
  },
  {
    id: "tesi",
    label: "la teca della tesi",
    x: 1.75,
    z: 0.6,
    color: "#E3B04B",
    glyph: "M4 19h16v3H4zM6 19v-7a6 6 0 0 1 12 0v7z",
  },
  {
    id: "libreria",
    label: "la libreria",
    x: 2.35,
    z: -2.42,
    color: "#5A4130",
    glyph: "M3 2h18v20H3zm2 2v4h14V4zm0 6v4h14v-4zm0 6v4h14v-4z",
  },
  {
    id: "libri",
    label: "la pila di libri per terra",
    x: 0.6,
    z: 1.6,
    color: "#5E4C70",
    glyph: "M4 5h16v4H4zM5 10.5h14v4H5zM4 16h16v4H4z",
  },
  {
    id: "porta",
    label: "la porta",
    x: -2.5,
    z: 0.7,
    color: "#5A4130",
    glyph: "M6 2h12v20H6zm9.2 9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z",
  },
];

/**
 * Twelve colours, all of them off something really in the room.
 *
 * Seven are answers and five are not, and every one of the five stands beside
 * an answer it could be mistaken for. They are in no useful order on purpose:
 * two shades that need comparing are never next to each other.
 */
export const PALETTE = [
  "#4FA8C9",
  "#3E2C20",
  "#E3B04B",
  "#2F6B62",
  "#C1662C",
  "#5E4C70",
  "#6FC2E0",
  "#5A4130",
  "#42607C",
  "#FFB25E",
  "#2B3A55",
  "#4C6B55",
];

export type Mark = { col: number; row: number; color: string | null };

/** The cell a thing really stands in. */
export const cellFor = (spot: Spot) => ({ col: cellOf(spot.x), row: cellOf(spot.z) });

/* -------------------------------------------------------------- the star */

/**
 * What the eight turn into once they are all where they belong.
 *
 * The room was never laid out on a circle, so joining the objects where they
 * stand would draw a tangle. They are taken in the order they sit around the
 * middle and then pulled out onto one ring, three apart each time — eight
 * points, every one visited once, which is the one way eight corners make a
 * star instead of an octagon. The drawing moves; the answer above does not.
 */
export const STAR_R = 2.35;

const angleOf = (spot: Spot) => Math.atan2(spot.z, spot.x);
const ROUND = [...SPOTS].sort((a, b) => angleOf(a) - angleOf(b));

/**
 * Which two have to come to rest on a letter.
 *
 * The ring is turned until the thesis case is due east; the door then falls
 * due west on its own, because the room happens to put those two opposite
 * each other in the order things go round the middle. That is luck, not
 * design, so the test checks both letters every run rather than trusting it.
 */
const DUE_EAST = "tesi";
const EAST_AT = ROUND.findIndex((spot) => spot.id === DUE_EAST);

/** Where each one is pulled to: its own place in the ring, regularised. */
export const STAR_POINT: Record<string, { x: number; z: number }> = Object.fromEntries(
  ROUND.map((spot, i) => {
    const turn = ((i - EAST_AT) * 2 * Math.PI) / SPOTS.length;
    return [spot.id, { x: Math.cos(turn) * STAR_R, z: Math.sin(turn) * STAR_R }];
  }),
);

/** The order the lines are drawn in, skipping two every time. */
export const STAR: string[] = ROUND.map((_, k) => ROUND[(k * 3) % SPOTS.length].id);

/**
 * Whether the plan is the room.
 *
 * All of it or none of it: there is no partial credit anywhere in here, and
 * no count of how many landed. Being told "six of eight" would turn eight
 * memories into eight guesses with a search attached.
 */
export function solvedPlan(marks: Record<string, Mark>): boolean {
  return SPOTS.every((spot) => {
    const mark = marks[spot.id];
    const cell = cellFor(spot);
    return (
      !!mark && mark.color === spot.color && mark.col === cell.col && mark.row === cell.row
    );
  });
}
