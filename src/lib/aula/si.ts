import type { Results } from "./chain";
import { ARCH_ANSWER } from "./arch";
import { ASD_ANSWER } from "./asd";
import { ANALISI_ANSWER } from "./analisi";
import { FISICA_ANSWER } from "./fisica";
import { LOGICA_ANSWER } from "./logica";
import { LFT_ANSWER } from "./lft";
import { BD_ANSWER } from "./bd";
import { IUM_ANSWER } from "./ium";
import { PROCS, SO_ANSWER } from "./so";

/*
 * Sistemi Intelligenti: the open libretto by the laptop, nine boxes for a
 * digit each and a page of constraints, every one on the result of another
 * exam. No constraint gives a box away; together they leave one way to fill
 * the nine, and that row of digits is the laptop's code.
 */

export type Constraint = {
  text: string;
  /** The result it is written on, and the chip that names it on the page. */
  uses: keyof Omit<Results, "si">;
  chip: string;
  /** The boxes it looks at, 0 to 8: the solver checks it once they are all filled. */
  cells: number[];
  holds: (a: number[]) => boolean;
};

const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function constraints(r: Omit<Results, "si">): Constraint[] {
  const ones = [...r.arch.toString(2)].filter((b) => b === "1").length;
  const rows = Array.from({ length: 8 }, (_, k) => !!((r.logica >> k) & 1));
  const word = [...r.lft];
  const matricola = String(r.bd);
  const hashDigit = Number([...r.ium].find((ch) => /\d/.test(ch)));
  const second = PROCS.find((p) => p.id === r.so[1])?.burst;
  return [
    {
      text: "La somma delle nove caselle è l'area di Analisi.",
      uses: "analisi",
      chip: "area di Analisi",
      cells: ALL,
      holds: (a) => a.reduce((s, d) => s + d, 0) === r.analisi,
    },
    {
      text: "Le cifre dispari sono tante quanti gli 1 del byte di Architettura.",
      uses: "arch",
      chip: "byte di Architettura",
      cells: ALL,
      holds: (a) => a.filter((d) => d % 2).length === ones,
    },
    {
      text: "Per n da 1 a 8: se la riga n della tavola di Logica dà 1, la casella n+1 è più grande della n; se dà 0, non lo è.",
      uses: "logica",
      chip: "tavola di Logica",
      cells: ALL,
      holds: (a) => rows.every((v, k) => v === a[k + 1] > a[k]),
    },
    {
      text: "Le caselle dalla 3 alla 8 sono la parola di LFT, una lettera per casella: lettere uguali, cifre uguali; lettere diverse, cifre diverse.",
      uses: "lft",
      chip: "parola di LFT",
      cells: [2, 3, 4, 5, 6, 7],
      holds: (a) => word.length === 6 && word.every((x, i) => word.every((y, j) => (x === y) === (a[2 + i] === a[2 + j]))),
    },
    {
      text: "Le caselle 1, 3 e 4, moltiplicate, fanno la corrente di Fisica in mA.",
      uses: "fisica",
      chip: "mA di Fisica",
      cells: [0, 2, 3],
      holds: (a) => a[0] * a[2] * a[3] === r.fisica,
    },
    {
      text: "La casella 1 vale le unità di scrittura di chi finisce per secondo a Sistemi Operativi.",
      uses: "so",
      chip: "ordine di Sistemi Operativi",
      cells: [0],
      holds: (a) => a[0] === second,
    },
    {
      text: "Le caselle 4, 6 e 9 sommano l'ultimo banco della via di Algoritmi prima della cattedra.",
      uses: "asd",
      chip: "via di Algoritmi",
      cells: [3, 5, 8],
      holds: (a) => a[3] + a[5] + a[8] === r.asd[r.asd.length - 2],
    },
    {
      text: "Nelle caselle 7 e 8 non c'è nessuna cifra della matricola di Basi di Dati.",
      uses: "bd",
      chip: "matricola di Basi di Dati",
      cells: [6, 7],
      holds: (a) => [6, 7].every((i) => !matricola.includes(String(a[i]))),
    },
    {
      text: "Le caselle 5 e 8 sommano l'unica cifra dell'hash di IUM.",
      uses: "ium",
      chip: "hash di IUM",
      cells: [4, 7],
      holds: (a) => a[4] + a[7] === hashDigit,
    },
  ];
}

/** Every way to fill the nine boxes with digits 0–9 that keeps all of `cs`, by backtracking, up to `limit` of them. */
export function solveAll(cs: Constraint[], limit = Infinity): number[][] {
  // each constraint is checked at the last of its boxes
  const at = ALL.map((i) => cs.filter((c) => Math.max(...c.cells) === i));
  const found: number[][] = [];
  const a: number[] = [];
  const fill = (i: number) => {
    if (found.length >= limit) return;
    if (i === 9) return void found.push([...a]);
    for (let d = 0; d <= 9; d++) {
      a[i] = d;
      if (at[i].every((c) => c.holds(a))) fill(i + 1);
    }
    a.length = i;
  };
  fill(0);
  return found;
}

const [ONLY] = solveAll(
  constraints({ arch: ARCH_ANSWER, asd: ASD_ANSWER, analisi: ANALISI_ANSWER, fisica: FISICA_ANSWER, logica: LOGICA_ANSWER, lft: LFT_ANSWER, bd: BD_ANSWER, ium: IUM_ANSWER, so: SO_ANSWER }),
  1,
);

/** The nine digits, the laptop's code. */
export const SI_ANSWER = ONLY.join("");

export const checkSi = (a: number[]): boolean => a.length === 9 && a.join("") === SI_ANSWER;
