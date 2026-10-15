/** The switch of the "Il banco delle scelte" activity (MTDI report, §6.1): the
 *  exotic animals the class first solves with if/else if, numbered 1–10. */
export const ANIMALI = [
  { n: 1, verso: "Leone: Roar!" },
  { n: 2, verso: "Scimmia: Uuh Uuh Aah Aah!" },
  { n: 3, verso: "Serpente: Ssssss" },
  { n: 4, verso: "Pappagallo: Craa! Craa!" },
  { n: 5, verso: "Delfino: Click Click" },
  { n: 6, verso: "Elefante: Pawoo!" },
  { n: 7, verso: "Tigre: Grrraaaawr!" },
  { n: 8, verso: "Panda: Munch munch" },
  { n: 9, verso: "Fenicottero: Kraaaah" },
  { n: 10, verso: "Coccodrillo: Snap Snap" },
];
export const DEFAULT_VERSO = "Nessun animale con questo numero";

/** Java semantics: jump to the matching case (or default), then run down until a break. Default is last. */
export function run(value: number, breaks: boolean[]): string[] {
  const start = ANIMALI.findIndex((a) => a.n === value);
  if (start < 0) return ["default"];
  const done: string[] = [];
  for (let i = start; i < ANIMALI.length; i++) {
    done.push(String(ANIMALI[i].n));
    if (breaks[i]) return done;
  }
  return [...done, "default"];
}

/** The switch as Java source; `key` tells which case a line belongs to, for highlighting. */
export function javaLines(breaks: boolean[]): { text: string; key: string | null }[] {
  const lines: { text: string; key: string | null }[] = [{ text: "switch (animale) {", key: null }];
  ANIMALI.forEach((a, i) => {
    const k = String(a.n);
    lines.push({ text: `    case ${a.n}:`, key: k });
    lines.push({ text: `        System.out.println("${a.verso}");`, key: k });
    if (breaks[i]) lines.push({ text: "        break;", key: k });
  });
  lines.push({ text: "    default:", key: "default" });
  lines.push({ text: `        System.out.println("${DEFAULT_VERSO}");`, key: "default" });
  lines.push({ text: "}", key: null });
  return lines;
}

/** The report's starting point, before the switch is introduced. */
export const IF_ELSE = [
  "if (animale == 1) {",
  '    System.out.println("Leone: Roar!");',
  "} else if (animale == 2) {",
  '    System.out.println("Scimmia: Uuh Uuh Aah Aah!");',
  "} else if (animale == 3) {",
  "    // … e così via fino a 10: dieci confronti scritti a mano",
  "}",
].join("\n");
