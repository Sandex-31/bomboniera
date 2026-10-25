import { NUMBER } from "../well/pillars";

/*
 * Architettura degli Elaboratori: a short program on a corner of the
 * blackboard, run by hand. Register r0 starts on a digit of the well's
 * telephone, which one told by a drawing of the handset; whatever r0 holds
 * when the program ends is set on eight lever switches, in binary.
 */

export type Instr = {
  op: "MOV" | "ADD" | "SUB" | "SHL" | "SHR" | "AND" | "OR" | "XOR" | "JNZ" | "DEC";
  /** The register written, or for JNZ the one tested. */
  a: string;
  /** A register or a number; for JNZ, the line to jump to. */
  b?: string | number;
};

/** The fourth digit of the telephone: the handset on the board has its fourth box ringed. */
export const PHONE_DIGIT_INDEX = 3;

/** On the board, one instruction a line, numbered from 0 as the jump counts them. */
export const PROGRAM: readonly Instr[] = [
  { op: "MOV", a: "r1", b: 7 },
  { op: "MOV", a: "r2", b: 5 },
  { op: "SHL", a: "r1", b: 1 },
  { op: "ADD", a: "r1", b: "r0" },
  { op: "XOR", a: "r1", b: "r2" },
  { op: "ADD", a: "r0", b: 2 },
  { op: "DEC", a: "r2" },
  { op: "JNZ", a: "r2", b: 2 },
  { op: "SHR", a: "r1", b: 1 },
  { op: "OR", a: "r1", b: 128 },
  { op: "MOV", a: "r0", b: "r1" },
];

/** A program that has not ended after this many steps never will. */
const MAX_STEPS = 10_000;

/**
 * Runs `program` with `r0` set and every other register 0, and returns r0 at
 * the end. The registers are 8 bits: every write keeps its low byte, so a
 * carry out of the top is lost. `onJump` is told of every jump taken.
 */
export function run(program: readonly Instr[], r0: number, onJump?: () => void): number {
  const reg: Record<string, number> = { r0: r0 & 0xff };
  const val = (b: string | number | undefined) => (typeof b === "number" ? b : (reg[b ?? ""] ?? 0));
  let pc = 0;
  for (let steps = 0; pc < program.length; steps++) {
    if (steps > MAX_STEPS) throw new Error("the program never ends");
    const { op, a, b } = program[pc++];
    const x = reg[a] ?? 0;
    const y = val(b);
    if (op === "JNZ") {
      if (x !== 0) {
        pc = y;
        onJump?.();
      }
      continue;
    }
    const out = {
      MOV: y,
      ADD: x + y,
      SUB: x - y,
      SHL: x << y,
      SHR: x >>> y,
      AND: x & y,
      OR: x | y,
      XOR: x ^ y,
      DEC: x - 1,
    }[op];
    reg[a] = out & 0xff;
  }
  return reg.r0;
}

export const ARCH_ANSWER = run(PROGRAM, NUMBER[PHONE_DIGIT_INDEX]);

/** The eight levers, the leftmost the top bit: down (true) is a 1. */
export function checkArch(levers: boolean[]): boolean {
  return levers.length === 8 && levers.reduce((n, on) => (n << 1) | (on ? 1 : 0), 0) === ARCH_ANSWER;
}
