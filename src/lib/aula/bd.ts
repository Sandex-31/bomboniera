/*
 * Basi di Dati: two registers on the desk. One has the students, by name and
 * matricola; the other the outcomes of their exams, by matricola only. The
 * board asks for one student, and only the two read together can say who:
 * the outcomes do not know Rotom by name, and one of their matricole belongs
 * to nobody in the other register. The query is made of cards, and its one
 * row is the answer.
 */

/** The silhouettes of the first floor, Rotom, and the keeper, who first spoke as «?». */
export const STUDENTS: { name: string; matricola: number }[] = [
  { name: "samus", matricola: 904117 },
  { name: "jak", matricola: 911203 },
  { name: "steve", matricola: 897562 },
  { name: "link", matricola: 915830 },
  { name: "batman", matricola: 902281 },
  { name: "knight", matricola: 913649 },
  { name: "lost", matricola: 908870 },
  { name: "yi", matricola: 916004 },
  { name: "penitent", matricola: 899315 },
  { name: "cuphead", matricola: 910492 },
  { name: "crow", matricola: 905736 },
  { name: "rotom", matricola: 900151 },
  { name: "?", matricola: 907358 },
];

/** In the outcomes and in no student: knight's matricola with two digits swapped. */
export const STRAY = 913694;

type Esito = { matricola: number; esame: string; esito: "superato" | "bocciato" };
const e = (matricola: number, esame: string, esito: Esito["esito"]): Esito => ({ matricola, esame, esito });

/** As the prof wrote them down, appello by appello. */
export const ESITI: Esito[] = [
  e(904117, "analisi", "bocciato"),
  e(911203, "analisi", "superato"),
  e(897562, "analisi", "superato"),
  e(913649, "analisi", "superato"),
  e(916004, "analisi", "bocciato"),
  e(905736, "analisi", "superato"),
  e(900151, "analisi", "bocciato"),
  e(915830, "logica", "superato"),
  e(913649, "logica", "bocciato"),
  e(911203, "logica", "superato"),
  e(899315, "logica", "superato"),
  e(905736, "logica", "bocciato"),
  e(900151, "logica", "superato"),
  e(904117, "fisica", "superato"),
  e(900151, "fisica", "bocciato"),
  e(915830, "fisica", "superato"),
  e(STRAY, "fisica", "bocciato"),
  e(916004, "fisica", "superato"),
  e(913649, "fisica", "bocciato"),
  e(910492, "fisica", "superato"),
  e(902281, "architettura", "bocciato"),
  e(908870, "architettura", "superato"),
  e(899315, "architettura", "superato"),
  e(911203, "architettura", "bocciato"),
  e(907358, "architettura", "superato"),
  e(904117, "algoritmi", "superato"),
  e(897562, "algoritmi", "bocciato"),
  e(902281, "algoritmi", "superato"),
  e(908870, "algoritmi", "bocciato"),
  e(910492, "algoritmi", "superato"),
  e(907358, "algoritmi", "superato"),
];

/** The field cards, each with its register. */
export const FIELDS = ["studenti.nome", "studenti.matricola", "esiti.matricola", "esiti.esame", "esiti.esito"];
/** The value cards: the exams, the outcomes, and the one name the board gives. */
export const VALUES = ["analisi", "logica", "fisica", "architettura", "algoritmi", "superato", "bocciato", "rotom"];
/** How many conditions the WHERE has room for. */
export const MAX_WHERE = 3;

export type Query = { select: string; join: boolean; on: [string, string] | null; where: [field: string, op: "=" | "!=", value: string][] };

type Row = Record<string, string>;
const studenti: Row[] = STUDENTS.map((s) => ({ "studenti.nome": s.name, "studenti.matricola": String(s.matricola) }));
const esiti: Row[] = ESITI.map((x) => ({ "esiti.matricola": String(x.matricola), "esiti.esame": x.esame, "esiti.esito": x.esito }));

/**
 * The query, run. Without a JOIN it reads the register its SELECT is from;
 * with one, every pair of rows, kept where ON holds (all of them with no
 * ON). A field neither register read has makes every condition on it fail.
 */
export function runQuery(q: Query): string[][] {
  const rows = q.join
    ? studenti.flatMap((s) => esiti.map((x) => ({ ...s, ...x }))).filter((r) => !q.on || (r[q.on[0]] !== undefined && r[q.on[0]] === r[q.on[1]]))
    : q.select.startsWith("studenti.")
      ? studenti
      : esiti;
  return rows
    .filter((r) => q.where.every(([f, op, v]) => r[f] !== undefined && (r[f] === v) === (op === "=")))
    .map((r) => [r[q.select] ?? ""]);
}

/** What the board asks for. */
export const BD_TARGET = "La matricola di chi è stato bocciato in fisica, Rotom a parte.";

export const BD_ANSWER = 913649;

export function checkBd(rows: string[][]): boolean {
  return rows.length === 1 && rows[0].includes(String(BD_ANSWER));
}

/** The tutor, who has office hours and nothing else. */
export const TUTOR = [
  "Hai provato a scrivere la query in maiuscolo? Il server si sente più rispettato.",
  "Io all'esame ho messo DISTINCT ovunque e sono passato. Non chiedermi perché.",
  "Ricordati la chiave primaria. Quale? Quella giusta.",
  "Normalizza. Sempre. Anche il caffè, se puoi.",
  "Se la query non torna è colpa degli indici. O della luna.",
  "Il ricevimento è il martedì dalle 13 alle 13:05.",
];
