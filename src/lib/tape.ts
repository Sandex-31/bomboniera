import { SPOTS, STAR_POINT } from "../data/room";

/**
 * The tape, and the cipher that reads it.
 *
 * The star next door put each of the eight things on its own point of the
 * compass, and each of those things has a colour. That is the whole cipher:
 * a band of colour is a direction. Nothing here explains it and nothing
 * should — whoever has watched the star form has already seen it.
 *
 * The cipher is not quite a function. Two of the eight, the door and the
 * bookcase, are the same wood, so one colour means two directions and the
 * tape is ambiguous exactly where that brown turns up. Those are the bands
 * the machine's levers answer for: thirteen forks, eight thousand ways to
 * read the tape, and one that draws a line which never leaves the plate, never
 * crosses itself, never runs into what is already on the plate, and comes back to where it started.
 *
 * The route below is declared; everything else is worked out from it. The
 * test re-walks all eight thousand and fails unless exactly one closes.
 */

/** Eight directions, named clockwise from east, with the step each takes. */
export const DIRS = [
  { key: "E", step: [1, 0] },
  { key: "SE", step: [1, 1] },
  { key: "S", step: [0, 1] },
  { key: "SO", step: [-1, 1] },
  { key: "O", step: [-1, 0] },
  { key: "NO", step: [-1, -1] },
  { key: "N", step: [0, -1] },
  { key: "NE", step: [1, -1] },
] as const;

export type DirKey = (typeof DIRS)[number]["key"];

const dirAt = (angle: number) => DIRS[((Math.round((angle * 4) / Math.PI) % 8) + 8) % 8].key;

/**
 * Which direction each thing ended up pointing, read off the finished star.
 *
 * Taken from where the points actually landed rather than written down
 * again, so turning the star turns the cipher with it.
 */
export const COMPASS: Record<DirKey, string[]> = DIRS.reduce(
  (out, { key }) => ({ ...out, [key]: [] }),
  {} as Record<DirKey, string[]>,
);
for (const spot of SPOTS) {
  const point = STAR_POINT[spot.id];
  COMPASS[dirAt(Math.atan2(point.z, point.x))].push(spot.color);
}

/** Colour to the directions it could mean. Usually one. Once, two. */
export const CIPHER: Record<string, DirKey[]> = {};
for (const { key } of DIRS) {
  for (const colour of COMPASS[key]) (CIPHER[colour] ??= []).push(key);
}

/** The one colour that means two things, and the two things it means. */
export const AMBIGUOUS = Object.keys(CIPHER).find((c) => CIPHER[c].length > 1)!;
export const FORK = CIPHER[AMBIGUOUS];

/** The plate the tape is played out on, and where the needle starts. */
export const W = 22;
export const H = 22;
export const START: [number, number] = [5, 17];

/**
 * Who the line turns out to be, at the size it is really drawn.
 *
 * Eight pixels by eight: that is the whole creature, lifted off a screenshot
 * rather than drawn from memory, because anything more detailed would be an
 * invention. `h` is the light rim, `b` the body, `W` an eye, `P` a foot, and
 * the two dots under the eyes are the pupils.
 */
export const SPRITE = [
  "..hhhh..",
  ".hhbbhh.",
  "hhWbbWhh",
  "hh.bb.hh",
  "hbbbbbbh",
  "hbbbbbbh",
  ".hbbbbh.",
  ".Pb..bP.",
];

/** How many cells of the plate one of its pixels takes. */
export const SC = 2;

/** Where the sprite sits on the plate. */
export const ORIGIN: [number, number] = [3, 2];

export const INK: Record<string, string> = {
  h: "#AF986C",
  b: "#5A4D3B",
  W: "#F0F0E8",
  p: "#12100C",
  P: "#C86FA0",
};

/** What each of its pixels is, pupils worked out from the eyes above them. */
export const PIXELS: { x: number; y: number; ink: string }[] = SPRITE.flatMap((row, gy) =>
  [...row].flatMap((ch, gx) => {
    const kind = ch === "." && gy > 0 && SPRITE[gy - 1][gx] === "W" ? "p" : ch;
    return kind === "." ? [] : [{ x: gx, y: gy, ink: INK[kind] }];
  }),
);

/**
 * The eyes, as cells of the plate: what the needle has to get round.
 *
 * For the whole tape they are just two blocks in the way, and they are also
 * the reason the reading is unique — without them the line could close more
 * than one way. What they are only shows when it closes around them.
 */
export const EYES: [number, number][] = SPRITE.flatMap((row, gy) =>
  [...row].flatMap((ch, gx): [number, number][] =>
    ch === "W" ? [[ORIGIN[0] + gx * SC, ORIGIN[1] + gy * SC]] : [],
  ),
);

const STUDS: [number, number][] = PIXELS.filter((p) => p.ink === INK.W || p.ink === INK.p).flatMap(
  ({ x, y }) =>
    Array.from(
      { length: SC * SC },
      (_, i) =>
        [ORIGIN[0] + x * SC + (i % SC), ORIGIN[1] + y * SC + Math.floor(i / SC)] as [number, number],
    ),
);

/**
 * The route, band by band: the outline of somebody, walked clockwise.
 *
 * It is the outline of the sprite above, walked clockwise at twice its size,
 * traced rather than drawn — which is why it climbs the shoulders in ones
 * and twos the way pixels do. Who it is, is the point: it is not a shape,
 * it is a creature, and it is worth something later on.
 *
 * A lever set the wrong way goes unpunished for nine more bands on average
 * before the line walks into something, so there is no feeling the way
 * forward one lever at a time.
 */
const ROUTE: DirKey[] = [
  "N", "N", "N", "NO", "O", "N", "N", "N", "N", "N", "N", "N", "E", "NE", "N",
  "E", "NE", "N", "E", "E", "E", "E", "E", "E", "E", "S", "SE", "E", "S", "SE",
  "E", "S", "S", "S", "S", "S", "S", "S", "O", "SO", "S", "S", "S", "O", "O",
  "O", "N", "NO", "O", "O", "O", "SO", "S", "O", "O", "O",
];

/** The tape itself: one band of colour per step, and no other clue. */
export const BANDS: string[] = ROUTE.map(
  (dir) => COMPASS[dir].find((c) => CIPHER[c].includes(dir))!,
);

/** Which bands are the brown ones, in order. One lever answers for each. */
export const SLOTS: number[] = BANDS.map((c, i) => (c === AMBIGUOUS ? i : -1)).filter(
  (i) => i >= 0,
);

export type Walk = {
  /** Every cell the needle reached, in order, before it stopped. */
  cells: [number, number][];
  /** True only when it read the whole tape and came back to the start. */
  closed: boolean;
};

/**
 * Plays the tape with the levers as they stand.
 *
 * A lever set one way reads its brown band as the first of the two
 * directions, the other way as the second. The needle stops the moment it
 * would leave the plate, hit a stud, or step where it has already been — the
 * last cell of the walk is where it gave up, which is all the machine ever
 * admits to.
 */
export function follow(levers: boolean[]): Walk {
  const cells: [number, number][] = [START];
  const seen = new Set([START.join(",")]);
  let at: [number, number] = [...START];

  for (let i = 0; i < ROUTE.length; i++) {
    const slot = SLOTS.indexOf(i);
    const dir = slot >= 0 ? FORK[levers[slot] ? 0 : 1] : ROUTE[i];
    const step = DIRS.find((d) => d.key === dir)!.step;
    at = [at[0] + step[0], at[1] + step[1]];
    const home = at[0] === START[0] && at[1] === START[1];
    const last = i === ROUTE.length - 1;

    if (at[0] < 0 || at[1] < 0 || at[0] >= W || at[1] >= H) return { cells, closed: false };
    if (STUDS.some((s) => s[0] === at[0] && s[1] === at[1])) return { cells, closed: false };
    if (seen.has(at.join(",")) && !(last && home)) return { cells, closed: false };
    seen.add(at.join(","));
    cells.push([...at] as [number, number]);
  }

  const end = cells[cells.length - 1];
  return { cells, closed: end[0] === START[0] && end[1] === START[1] };
}

export const solvedTape = (levers: boolean[]) => follow(levers).closed;
