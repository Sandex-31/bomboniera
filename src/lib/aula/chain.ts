/*
 * The ten exams of the lecture hall on the fifth floor, one puzzle each, and
 * the order a visitor who takes them one after the other would pass them in.
 */

export type ExamId = "arch" | "analisi" | "fisica" | "logica" | "lft" | "asd" | "bd" | "ium" | "so" | "si";

/** Every exam after the ones it needs: the order the debug stops land in. */
export const ORDER: readonly ExamId[] = ["arch", "analisi", "logica", "bd", "fisica", "asd", "lft", "ium", "so", "si"];
