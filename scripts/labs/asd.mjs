import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE, dockerPath, ensureDir, outDir, sh, writeGz } from "./util.mjs";
import { SOURCES } from "./sources.mjs";

export const EXERCISES = [
  { id: "ex1", dir: "ex1", main: ["src/main.c", "src/sort.c"], test: ["src/test.c", "src/sort.c"] },
  { id: "ex2", dir: "ex2", main: ["src/main.c", "src/distance.c"], test: ["src/test.c", "src/distance.c"] },
  { id: "ex3", dir: "ex3", main: ["src/hashMain.c", "src/hashTable.c"], test: ["src/test_hashTable.c", "src/hashTable.c"] },
  { id: "ex4", dir: "ex3-4", main: ["src/main.c", "src/graph.c", "src/hashTable.c"], test: ["src/graphTest.c", "src/graph.c", "src/hashTable.c"] },
];

const IMAGE = "emscripten/emsdk:4.0.10";
const FLAGS = [
  "-std=c11", "-D_POSIX_C_SOURCE=200809L", "-O2", "-Iinclude",
  "-sMODULARIZE", "-sEXPORT_ES6", "-sINVOKE_RUN=0", "-sEXIT_RUNTIME=1",
  "-sEXPORTED_RUNTIME_METHODS=callMain,FS", "-sALLOW_MEMORY_GROWTH",
  "-sMAXIMUM_MEMORY=2gb", "-sSTACK_SIZE=16mb", "-sINITIAL_MEMORY=64mb", "-sENVIRONMENT=web,worker,node",
];
const COMMEDIA_URL = "https://gutenberg.pglaf.org/1/0/1/1012/1012-0.txt"; // official PG mirror: gutenberg.org's own certificate has expired

async function commedia() {
  const cached = join(ensureDir(CACHE), "commedia.txt");
  if (!existsSync(cached)) {
    // curl uses the OS certificate store, which is what a browser would trust
    sh("curl", ["-sSLf", "-o", cached, COMMEDIA_URL]);
    const raw = readFileSync(cached, "utf8");
    // keep only the poem: Gutenberg's header and licence footer are theirs, not Dante's
    const body = raw.split(/\*\*\* START OF[^\n]*\n/)[1].split(/\*\*\* END OF|End of (the )?Project Gutenberg/)[0].trim();
    writeFileSync(cached, body + "\n");
  }
  return readFileSync(cached, "utf8");
}

export default async function asd() {
  const src = SOURCES["lab-asd"];
  const out = ensureDir(outDir("lab-asd"));
  sh("docker", ["pull", "-q", IMAGE]);
  for (const ex of EXERCISES) {
    ensureDir(join(out, ex.id));
    for (const kind of ["main", "test"]) {
      sh("docker", [
        "run", "--rm",
        "-v", `${dockerPath(src.repo)}:/src:ro`, "-v", `${dockerPath(out)}:/out`,
        "-w", `/src/${ex.dir}`, IMAGE,
        "emcc", ...FLAGS, ...ex[kind], "-o", `/out/${ex.id}/${kind}.mjs`,
      ]);
    }
  }
  const text = await commedia();
  const data = ensureDir(join(out, "data"));
  writeGz(join(data, "commedia.txt.gz"), text);
  const words = [...new Set(text.toLowerCase().match(/[a-zàèéìòóù]+/g))];
  writeGz(join(data, "words.txt.gz"), words.join("\n"));
  writeGz(join(data, "dictionary.txt.gz"), readFileSync(src.dictionary));
  writeGz(join(data, "graph.csv.gz"), readFileSync(src.graph));
  copyFileSync(src.correctme, join(data, "correctme.txt"));
  console.log(`  ${EXERCISES.length} esercizi compilati, ${words.length} parole dalla Commedia`);
}
