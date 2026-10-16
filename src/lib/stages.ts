/**
 * Debug only: the puzzle chain as a list of stops, and a way to land on any
 * of them with everything before it already solved.
 *
 * Without it, testing the last screen means playing the other eight first
 * every time the board is wiped. Each stop writes the answers into storage
 * exactly as the screens would have saved them, so what comes up is what a
 * visitor who got that far would see — and the screens re-check all of it
 * on load, so a wrong answer here shows up as an unsolved screen.
 */
import {
  BEAM_KEY,
  HACK_KEY,
  LAMPS_KEY,
  LOCK_KEY,
  LOST_KEY,
  MACHINE_KEY,
  MAZE_KEY,
  PLAN_KEY,
  PUZZLE_KEY,
  SAGOME_KEY,
  SKI_KEY,
  TOMBINO_KEY,
} from "../data/puzzle";
import { buildMaze, solve } from "./maze";
import { FLOORS } from "./beam";
import { SPOTS, cellFor } from "../data/room";
import { ANSWER } from "./lamps";
import { STATIONS } from "./ski";
import { SLOTS, solvedTape } from "./tape";
import { LOCK_CODE } from "./sagome";

/** The lever bank that closes the tape, found the way the test finds it. */
function levers(): boolean[] {
  for (let n = 0; n < 1 << SLOTS.length; n++) {
    const bank = SLOTS.map((_, i) => Boolean((n >> i) & 1));
    if (solvedTape(bank)) return bank;
  }
  throw new Error("the tape has no reading");
}

/** In chain order. Landing on stop `i` solves this one and every one above it. */
export const STAGES: { label: string; key: string; solved: () => unknown }[] = [
  { label: "ritmo", key: PUZZLE_KEY, solved: () => "1" },
  { label: "labirinto", key: MAZE_KEY, solved: () => solve(buildMaze()) },
  {
    label: "specchi",
    key: BEAM_KEY,
    solved: () =>
      FLOORS.map((f) =>
        Object.fromEntries(f.solution.map(({ cell, kind }) => [cell.join(","), kind])),
      ),
  },
  {
    label: "pianta",
    key: PLAN_KEY,
    solved: () =>
      Object.fromEntries(SPOTS.map((s) => [s.id, { ...cellFor(s), color: s.color }])),
  },
  {
    label: "lampade",
    key: LAMPS_KEY,
    solved: () => ({ lit: ANSWER.map(() => false), pressed: ANSWER }),
  },
  {
    label: "comprensorio",
    key: SKI_KEY,
    solved: () =>
      Object.fromEntries(STATIONS.filter((s) => !s.given).map((s) => [s.id, String(s.alt)])),
  },
  { label: "macchinario", key: MACHINE_KEY, solved: levers },
  { label: "terminale", key: HACK_KEY, solved: () => "1" },
  { label: "figura", key: LOST_KEY, solved: () => "1" },
  { label: "avvio", key: SAGOME_KEY, solved: () => "1" },
  { label: "tombino", key: TOMBINO_KEY, solved: () => "1" },
  { label: "lucchetto", key: LOCK_KEY, solved: () => [...LOCK_CODE] },
];

/**
 * Wipes the whole chain, then solves the first `upTo` stops of it.
 * `upTo` 0 is the untouched puzzle, which is all the reset button is.
 */
export function jumpTo(upTo: number) {
  try {
    STAGES.forEach(({ key }) => localStorage.removeItem(key));
    STAGES.slice(0, upTo).forEach(({ key, solved }) => {
      const value = solved();
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    });
  } catch {
    /* storage unavailable — the remount still clears the session */
  }
}
