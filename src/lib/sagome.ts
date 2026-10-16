/**
 * The window of silhouettes, and the lock that comes after it.
 *
 * The window starts on the word the mirrors drew — an eye, in three letters.
 * Inside, a carousel of black silhouettes: every one of them can be named,
 * and naming one right earns nothing but a laugh. Only the crying ghost
 * answers to something else, and that word is what opens the way down.
 *
 * The lock is the ski area's code at last: the five figures the mountain
 * hands over and nothing until now had any use for.
 */
import { LOCK_KEY } from "../data/puzzle";
import { CODE } from "./ski";

/** Only letters count: spacing, case and punctuation are not part of a word. */
const bare = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** The word that starts the window. */
export const BOOT_WORD = "eye";

export const bootAccepts = (word: string) => bare(word) === BOOT_WORD;

export type Character = {
  id: string;
  /**
   * The silhouette, under public/. Numbered out of the order of this list,
   * so neither the name nor the position of the file says who it is.
   */
  file: string;
  /** Every way of naming it that counts, already bare. */
  names: string[];
};

/** In the order the carousel shows them. */
export const CHARACTERS: Character[] = [
  { id: "samus", file: "media/sagome/07.png", names: ["samus", "samusaran"] },
  {
    id: "jak",
    file: "media/sagome/03.png",
    names: ["jak", "daxter", "jakanddaxter", "jakedaxter", "jakdaxter"],
  },
  { id: "steve", file: "media/sagome/10.png", names: ["steve"] },
  { id: "link", file: "media/sagome/01.png", names: ["link"] },
  { id: "batman", file: "media/sagome/05.png", names: ["batman", "legobatman"] },
  { id: "knight", file: "media/sagome/11.png", names: ["hollowknight", "knight", "theknight"] },
  { id: "lost", file: "media/sagome/04.png", names: ["thelost", "lost"] },
  { id: "yi", file: "media/sagome/09.png", names: ["yi"] },
  {
    id: "penitent",
    file: "media/sagome/02.png",
    names: ["penitente", "ilpenitente", "thepenitentone", "penitentone", "penitent"],
  },
  { id: "cuphead", file: "media/sagome/08.png", names: ["cuphead"] },
  { id: "crow", file: "media/sagome/06.png", names: ["crow", "corvo", "ilcorvo", "thecrow"] },
];

/** The crying ghost: the only silhouette with a second word behind its name. */
export const LOST_ID = "lost";

/** What the ghost answers to, besides its name. The hint says Japanese. */
const UNDER_THE_GHOST = "tombino";

/**
 * What a word typed against a silhouette is worth: the way on, a laugh, or
 * nothing. The ghost's own name is only a laugh like any other.
 */
export function judge(id: string, word: string): "tombino" | "bravo" | "wrong" {
  const w = bare(word);
  if (id === LOST_ID && w === UNDER_THE_GHOST) return "tombino";
  const character = CHARACTERS.find((c) => c.id === id);
  return character && w && character.names.includes(w) ? "bravo" : "wrong";
}

/* ------------------------------------------------------------- the lock */

/** The ski area's code, not a copy of it. */
export const LOCK_CODE: readonly number[] = CODE;

const SHUT = () => LOCK_CODE.map(() => 0);

/** Wheel `i` turned by `by` notches, round from 9 back to 0. */
export function turn(digits: number[], i: number, by: number): number[] {
  return digits.map((d, j) => (j === i ? (((d + by) % 10) + 10) % 10 : d));
}

export const unlocked = (digits: number[]) =>
  digits.length === LOCK_CODE.length && digits.every((d, i) => d === LOCK_CODE[i]);

/** The wheels as they were left, believed only once they are five digits. */
export function loadLock(): number[] {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (
      Array.isArray(saved) &&
      saved.length === LOCK_CODE.length &&
      saved.every((d) => Number.isInteger(d) && d >= 0 && d <= 9)
    ) {
      return saved as number[];
    }
  } catch {
    /* unreadable or unparsable — the wheels start at zero */
  }
  return SHUT();
}
