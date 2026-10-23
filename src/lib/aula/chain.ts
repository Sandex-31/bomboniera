import { exams } from "../../data/exams";
import { ARCH_ANSWER } from "./arch";
import { ASD_ANSWER } from "./asd";
import { ANALISI_ANSWER } from "./analisi";
import { FISICA_ANSWER } from "./fisica";
import { LOGICA_ANSWER } from "./logica";
import { LFT_ANSWER } from "./lft";
import { BD_ANSWER } from "./bd";
import { IUM_ANSWER } from "./ium";
import { SO_ANSWER } from "./so";

/*
 * The ten exams of the lecture hall on the fifth floor, one puzzle each, and
 * the order a visitor who takes them one after the other would pass them in.
 * What each needs, what a failure costs, and what the libretto reads: the
 * hall keeps one `AulaState` and every puzzle asks this file about it.
 */

export type ExamId = "arch" | "analisi" | "fisica" | "logica" | "lft" | "asd" | "bd" | "ium" | "so" | "si";

/** Every exam after the ones it needs: the order the debug stops land in. */
export const ORDER: readonly ExamId[] = ["arch", "analisi", "logica", "bd", "fisica", "asd", "lft", "ium", "so", "si"];

/** What each exam needs passed before it opens, as the degree had it. */
export const PREREQ: Record<ExamId, readonly ExamId[]> = {
  arch: [],
  analisi: [],
  logica: [],
  bd: [],
  fisica: ["analisi"],
  asd: ["arch"],
  lft: ["logica"],
  ium: ["lft", "bd"],
  so: ["asd", "fisica"],
  si: ["arch", "analisi", "fisica", "logica", "lft", "asd", "bd", "ium", "so"],
};

/** Each exam's entry in `src/data/exams.ts`, where its name comes from. */
export const EXAM_OF: Record<ExamId, string> = {
  arch: "architettura-elaboratori",
  analisi: "analisi-matematica",
  fisica: "fisica",
  logica: "logica",
  lft: "lft",
  asd: "algoritmi",
  bd: "basi-di-dati",
  ium: "IUM-TWEB",
  so: "sistemi-operativi",
  si: "intelligenza-artificiale",
};

/** An exam's name as the libretto and the debug stops write it. */
export const examName = (id: ExamId): string => exams.find((e) => e.id === EXAM_OF[id])?.name ?? id;

export type AulaState = {
  /** The exams passed, in the order they were. */
  passed: ExamId[];
  /** When each exam was last failed, for its appello. */
  failedAt: Partial<Record<ExamId, number>>;
  /** Analisi's first right answer has been turned down and stamped on the register. */
  analisiStamped: boolean;
  /** The prof of Sistemi Operativi's mood, drawn once when it is passed. */
  soGrade: number | null;
  laptop: "closed" | "on";
};

export const INITIAL: AulaState = { passed: [], failedAt: {}, analisiStamped: false, soGrade: null, laptop: "closed" };

const isExam = (v: unknown): v is ExamId => typeof v === "string" && v in PREREQ;
const isGrade = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 18 && (v as number) <= 30;

/**
 * The saved hall, or the untouched one when the save is missing or broken.
 * Whatever it does not know is dropped, and a failure stamped after `now` is
 * settled to `now`.
 */
export function loadAula(raw: string | null, now: number = Date.now()): AulaState {
  let v: unknown;
  try {
    v = JSON.parse(raw ?? "");
  } catch {
    return INITIAL;
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return INITIAL;
  const o = v as Record<string, unknown>;
  const failed = o.failedAt && typeof o.failedAt === "object" ? (o.failedAt as Record<string, unknown>) : {};
  return settle({
    passed: Array.isArray(o.passed) ? [...new Set(o.passed.filter(isExam))] : [],
    failedAt: Object.fromEntries(
      Object.entries(failed).filter(([id, t]) => isExam(id) && typeof t === "number" && Number.isFinite(t)),
    ),
    analisiStamped: o.analisiStamped === true,
    soGrade: isGrade(o.soGrade) ? o.soGrade : null,
    laptop: o.laptop === "on" ? "on" : "closed",
  }, now);
}

/**
 * Brings every failure stamped in the future, after the clock was moved back,
 * down to `now`. Its appello then runs out after one `APPELLO_MS` of real
 * time, and not only once the clock catches up with the stamp. Returns `s`
 * itself when nothing changes.
 */
export function settle(s: AulaState, now: number): AulaState {
  const ahead = Object.entries(s.failedAt).filter(([, t]) => t! > now);
  if (!ahead.length) return s;
  return { ...s, failedAt: { ...s.failedAt, ...Object.fromEntries(ahead.map(([id]) => [id, now])) } };
}

/** Passed, and only as long as everything it needs is too: a save that skips a prerequisite counts for nothing downstream. */
export function passed(s: AulaState, id: ExamId): boolean {
  return s.passed.includes(id) && open(s, id);
}

/** Everything it needs is passed. */
export function open(s: AulaState, id: ExamId): boolean {
  return PREREQ[id].every((p) => passed(s, p));
}

/** How long a failed exam stays shut before its next appello. */
export const APPELLO_MS = 30_000;

/** The ms left before the next appello. A failure in the future, a clock moved back, still locks for one appello at most. */
export function lockedFor(failedAt: number | undefined, now: number): number {
  if (failedAt === undefined) return 0;
  return Math.min(APPELLO_MS, Math.max(0, failedAt + APPELLO_MS - now));
}

/** What an answer comes to: passed, failed, or Analisi's first right one, failed and stamped on the register. */
export type Verdict = boolean | "stamp";

/** Starts the appello. A `stamp` also writes Analisi's right answer on the register, so the next appello takes it. */
export function fail(s: AulaState, id: ExamId, now: number, stamp = false): AulaState {
  return { ...s, failedAt: { ...s.failedAt, [id]: now }, analisiStamped: s.analisiStamped || stamp };
}

/** Records the exam passed; Sistemi Operativi draws its grade the first time, 18 to 30. Analisi passed has been stamped, however it got there. */
export function pass(s: AulaState, id: ExamId, rng: () => number = Math.random): AulaState {
  return {
    ...s,
    passed: s.passed.includes(id) ? s.passed : [...s.passed, id],
    analisiStamped: s.analisiStamped || id === "analisi",
    soGrade: id === "so" && s.soGrade === null ? 18 + Math.floor(rng() * 13) : s.soGrade,
  };
}

/** The libretto, in `ORDER`: «superato» for every exam passed, except Sistemi Operativi, which has its grade. */
export function libretto(s: AulaState): { id: ExamId; name: string; grade: string | null }[] {
  return ORDER.map((id) => ({
    id,
    name: examName(id),
    grade: !passed(s, id) ? null : id === "so" && s.soGrade !== null ? String(s.soGrade) : "superato",
  }));
}

/** The hall with the first `n` exams of `ORDER` passed, for the debug stops. The grade is fixed, so the stop is too. */
export function aulaUpTo(n: number): AulaState {
  return ORDER.slice(0, n).reduce((s, id) => pass(s, id, () => 0.5), INITIAL);
}

/** What each puzzle gives the ones after it. Each puzzle adds its own as it is built. */
export type Results = { arch: number; asd: number[]; analisi: number; fisica: number; logica: number; lft: string; bd: number; ium: string; so: number[] };

export function results(): Results {
  return { arch: ARCH_ANSWER, asd: ASD_ANSWER, analisi: ANALISI_ANSWER, fisica: FISICA_ANSWER, logica: LOGICA_ANSWER, lft: LFT_ANSWER, bd: BD_ANSWER, ium: IUM_ANSWER, so: SO_ANSWER };
}
