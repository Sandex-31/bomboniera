import { ARCH_ANSWER } from "./arch";

/*
 * Algoritmi e Strutture Dati: the floor of the hall seen from above, laid on
 * the maze of the first floor. The benches are the nodes, the aisles between
 * them the edges, and each bit of Architettura's byte makes the aisles that
 * carry it slow or fast. The answer is the quickest way from the door to the
 * desk, bench by bench, as Dijkstra would find it.
 */

/** Each bench, on a cell of the first floor's maze, as [row, col]. */
export const NODES: { id: number; cell: [number, number] }[] = [
  { id: 0, cell: [18, 17] },
  { id: 1, cell: [18, 10] },
  { id: 2, cell: [18, 3] },
  { id: 3, cell: [14, 14] },
  { id: 4, cell: [14, 7] },
  { id: 5, cell: [10, 18] },
  { id: 6, cell: [10, 11] },
  { id: 7, cell: [10, 4] },
  { id: 8, cell: [6, 14] },
  { id: 9, cell: [6, 7] },
  { id: 10, cell: [2, 10] },
  { id: 11, cell: [2, 18] },
  { id: 12, cell: [2, 2] },
];

/** The door of the hall, at the bottom right, and the lecturer's desk at the top. */
export const DOOR = 0;
export const DESK = 10;

/** The aisles, each made slow or fast by bit `bit` of the byte (0 the lowest). */
export const EDGES: { a: number; b: number; bit: number }[] = [
  [0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 5], [3, 6], [4, 6],
  [4, 7], [5, 6], [6, 7], [5, 8], [6, 8], [6, 9], [7, 9], [8, 9], [8, 11], [8, 10],
  [9, 10], [9, 12], [11, 10], [12, 10], [0, 5], [2, 7], [5, 11], [7, 12],
].map(([a, b], k) => ({ a, b, bit: k % 8 }));

/** How long an aisle takes: a 1 bit is a clear aisle, a 0 one full of students. */
export const FAST = 1;
export const SLOW = 4;

/** How many CSS px a cell of the maze is on the sheet: 21 of them fill its width. */
export const CELL_PX = 13;

export function weights(byte: number): number[] {
  return EDGES.map((e) => ((byte >> e.bit) & 1 ? FAST : SLOW));
}

/** Dijkstra from the door to the desk; on a tie the bench with the lower id goes first. */
export function shortest(byte: number): number[] {
  const w = weights(byte);
  const dist = NODES.map(() => Infinity);
  const prev = NODES.map(() => -1);
  const done = NODES.map(() => false);
  dist[DOOR] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < NODES.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === DESK) break;
    done[u] = true;
    EDGES.forEach((e, k) => {
      const v = e.a === u ? e.b : e.b === u ? e.a : -1;
      if (v >= 0 && dist[u] + w[k] < dist[v]) {
        dist[v] = dist[u] + w[k];
        prev[v] = u;
      }
    });
  }
  const way = [DESK];
  while (way[0] !== DOOR) way.unshift(prev[way[0]]);
  return way;
}

/** The edge between two benches, if there is one. */
export const edgeOf = (a: number, b: number): number => EDGES.findIndex((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));

export const ASD_ANSWER = shortest(ARCH_ANSWER);

export function checkAsd(path: number[]): boolean {
  return path.length === ASD_ANSWER.length && path.every((n, i) => n === ASD_ANSWER[i]);
}
