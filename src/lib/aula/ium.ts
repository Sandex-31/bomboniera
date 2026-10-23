import { BD_ANSWER, STRAY } from "./bd";
import { LFT_ANSWER } from "./lft";

/*
 * IUM-TWEB: the page that books the appello, on the projector, the night
 * before the deadline, with Senia's half and Salvo's half in conflict. For
 * every hunk one side breaks the page, and the preview beside the file shows
 * how; one asks for the matricola Basi di Dati found. The file settled, the
 * commit's message is LFT's word, and its hash is the result.
 */

export type Side = "ours" | "theirs";

export const HUNKS: { ours: string[]; theirs: string[]; right: Side }[] = [
  {
    ours: [`  <h1 style="font-size: 15px; margin: 0 0 6px">Prenota l'appello</h1>`],
    theirs: [`  <h1 style="font-size: 15px; margin: 0 0 6px">Prenota l'appello<h1>`],
    right: "ours",
  },
  {
    ours: [`  <!-- Salvo: non toccare ->`],
    theirs: [`  <!-- Senia: non toccare -->`],
    right: "theirs",
  },
  {
    ours: [`  <p>Matricola: <b>${BD_ANSWER}</b></p>`],
    theirs: [`  <p>Matricola: <b>${STRAY}</b></p>`],
    right: "ours",
  },
  {
    ours: [`  <p>IUM-TWEB · 31 febbraio, ore 9:00</p>`],
    theirs: [`  <p>IUM-TWEB · 14 febbraio, ore 9:00</p>`],
    right: "theirs",
  },
  {
    ours: [`  <button style="background: #1A1410; color: #F4EFE2">Prenota</button>`],
    theirs: [`  <button style="background: #1A1410; color: #1A1410">Prenota</button>`],
    right: "ours",
  },
];

/** The file: its lines in common, and a hunk's index where the two halves differ. */
export const FILE: (string | number)[] = [
  `<section style="font-family: sans-serif; padding: 8px; background: #fff">`,
  0,
  1,
  `  <p>Corso: Tecnologie Web</p>`,
  2,
  3,
  4,
  `</section>`,
];

/** The file with each hunk settled; a hunk not settled yet keeps both halves, in git's markers. */
export function resolve(choices: (Side | null)[]): string {
  return FILE.flatMap((l) => {
    if (typeof l === "string") return [l];
    const h = HUNKS[l];
    const c = choices[l];
    return c ? h[c] : ["<<<<<<< HEAD", ...h.ours, "=======", ...h.theirs, ">>>>>>> senia"];
  }).join("\n");
}

/** FNV-1a, 32 bits over the UTF-8 bytes: the first 4 hex digits. */
export function hash(text: string): string {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(text)) h = Math.imul(h ^ b, 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 4);
}

const RIGHT = HUNKS.map((h) => h.right);

export const IUM_ANSWER = hash(resolve(RIGHT) + "\n" + LFT_ANSWER);

export function checkIum(choices: (Side | null)[], message: string): boolean {
  return choices.length === HUNKS.length && choices.every((c, i) => c === RIGHT[i]) && message.trim() === LFT_ANSWER;
}
