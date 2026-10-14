# Laboratori dei progetti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pagina `/#/progetti` dove i quattro progetti d'esame si usano davvero (C in WASM, SQLite nel browser, il frontend originale di Film Data) e se ne sfogliano sorgenti e documenti.

**Architecture:** Una pipeline Node (`scripts/labs/`, lanciata a mano con `npm run labs`, usa Docker per emcc e Maven) produce artefatti statici in `public/labs/<id>/`, che vengono committati. Il sito React aggiunge una route hash lazy che legge quegli artefatti: un Worker per i programmi C, `sql.js` per i database, un iframe con uno shim per il frontend di Film Data.

**Tech Stack:** React 19 + TS + Vite 7 (esistenti), `sql.js@1.14.2`, `highlight.js@11.12.0`, Docker `emscripten/emsdk:4.0.10` e `maven:3.9-eclipse-temurin-11`, Wikidata SPARQL, Handlebars 4.7.8 da CDN (solo dentro l'iframe di Film Data).

**Spec:** `docs/superpowers/specs/2026-10-14-laboratori-progetti-design.md`

## Global Constraints

- Sito statico: nessun backend, nessun Docker in CI. Gli artefatti di `public/labs/` sono committati.
- Il codice C dei laboratori **non si modifica**: si compila così com'è.
- Dati generati: PRNG `mulberry32`, seed `20261014`; ogni vista con dati generati mostra la targhetta **"dati generati per la demo"**.
- Dipendenze nuove ammesse: solo `sql.js` e `highlight.js` (+ `@types/sql.js` in dev). Nient'altro.
- Tutto ciò che i laboratori scaricano parte solo quando si apre il progetto (lazy).
- Percorsi a runtime sempre relativi a `import.meta.env.BASE_URL` (il sito vive in `/bomboniera/`).
- Esploratore del codice: scarta `.env*`, `*secret*`, `*.key`, `*.pem`, `serviceAccountKey*`, `node_modules`, `target`, `.idea`, `.venv`, `*.db`, binari, file > 300 KB; pattern di segreti (`password\s*[=:]\s*["'][^"']+["']`, `mongodb\+srv://`, `AKIA[0-9A-Z]{16}`, `-----BEGIN … PRIVATE KEY-----`) fermano il build.
- Stile: token CSS di `src/styles/global.css`; su telefono nessuno scroll orizzontale della pagina.
- ID dei progetti (cartelle e route): `food-delivery-db`, `lab-asd`, `film-data`, `catering`.
- Prerequisito per `npm run labs`: Docker Desktop avviato.
- **Scostamenti dalla spec decisi qui:** generi dei film in inglese minuscolo (il frontend originale chiede `genre/horror`); il `records.csv` di ex1 si genera nel browser invece di scaricarlo (stesso formato, zero MB); i Markdown in Documenti si mostrano come testo preformattato (niente parser); i programmi C girano in un Web Worker (la pagina non si blocca); il PDF del progetto di Basi di Dati va in Documenti come PDF intero invece che come pagine-immagine.

## Review Focus

1. **Programma C lento o infinito** (ex2 con dizionario da 660k parole): la pagina resta reattiva e "ferma" funziona. → Task 9 testa che `stop()` termini il worker e tenga l'output parziale.
2. **Lanciare due volte lo stesso esercizio**: il secondo run dà lo stesso output del primo (un'istanza emscripten non si riusa dopo `exit`). → Task 2 testa due run consecutivi.
3. **Query SQL che modifica il database** (`DELETE FROM ordine`): l'effetto si vede, "ripristina" torna ai dati originali. → Task 10 testa `reset()`.
4. **Sito servito sotto `/bomboniera/`**: tutti i fetch dei laboratori funzionano con `VITE_BASE=/bomboniera/`. → Task 12, build con base e controllo delle richieste.
5. **Titoli o ricerche con caratteri speciali** (`L'attimo fuggente`, `Amélie`, spazi nei generi, ricerca < 3 caratteri): lo shim trova il JSON giusto o risponde come il server vero. → Task 6 testa `matchFilms` e `apiPath`.

---

## File Structure

```
scripts/labs/
  index.mjs            ← runner: `npm run labs [-- step...]`
  util.mjs             ← ROOT, CACHE, TMP, outDir(id), ensureDir, writeJson, writeGz, sh, dockerPath
  seed.mjs             ← rng(seed) deterministico
  sources.mjs          ← percorsi sorgente per progetto (unica tabella)
  asd.mjs              ← emcc in Docker + dataset ASD
  catering.mjs         ← db + JUnit in Docker + query d'esempio
  delivery/schema.sql  ← schema tradotto dall'E-R
  delivery.mjs         ← seed + delivery.db
  film/wikidata.mjs    ← fetch + cache Wikidata
  film/build.mjs       ← API JSON, locandine, recensioni, chat
  film/site.mjs        ← copia e riscrive il frontend, estrae i grafici
  film/shim.js         ← axios/io finti dentro l'iframe (copiato in public)
  film/search.html     ← pagina di ricerca che compila il template hbs originale
  code.mjs             ← esporta sorgenti + docs.json, scansione segreti
  cache/               ← wikidata-films.json, commedia.txt (committati); tmp/ (ignorata)
scripts/check-labs.mjs ← self-check dei laboratori (aggiunto a npm test)
public/labs/<id>/      ← artefatti (committati)
src/Root.tsx           ← sceglie Qr / App / Labs in base all'hash, reagisce a hashchange
src/labs/
  route.ts  paths.ts  LabsPage.tsx  CodeTab.tsx  DocsTab.tsx  labs.css
  asd/records.ts  asd/worker.ts  asd/runner.ts  asd/AsdLab.tsx
  sql/db.ts  sql/SqlLab.tsx
  film/FilmLab.tsx
```

Modificati: `src/main.tsx`, `src/types.ts`, `src/data/projects.ts`, `src/sections/Projects.tsx`, `src/styles/global.css`, `package.json`, `.gitignore`, `README.md`.

---

### Task 1: Fondamenta della pipeline e del routing

**Files:**
- Create: `scripts/labs/index.mjs`, `scripts/labs/util.mjs`, `scripts/labs/seed.mjs`, `scripts/labs/sources.mjs`, `scripts/check-labs.mjs`, `src/labs/route.ts`, `src/labs/paths.ts`
- Modify: `package.json`, `.gitignore`, `src/types.ts:14-27`

**Interfaces:**
- Produces: `rng(seed?) → { next(): number, int(lo, hi): number, pick<T>(a: T[]): T }`; da `util.mjs`: `ROOT`, `CACHE`, `TMP`, `outDir(id)`, `ensureDir(p)`, `writeJson(p, data)`, `writeGz(p, data)`, `sh(cmd, args, opts?)`, `dockerPath(p)`; `SOURCES[id]`; `parseLabsHash(hash) → LabsRoute | null` con `LabsRoute = { page: 'labs', id?: string, tab: 'prova'|'codice'|'documenti', file?: string }`; `labsHash(id?, tab?, file?) → string`; `labsUrl(id, ...parts) → string`; `Project.lab?: 'asd' | 'sql' | 'site'`.

- [ ] **Step 1: Installa le dipendenze**

```bash
npm install sql.js@1.14.2 highlight.js@11.12.0
npm install -D @types/sql.js
```

- [ ] **Step 2: Scrivi il test che fallisce** — `scripts/check-labs.mjs`

```js
/**
 * Self-check of the project labs. Artifacts in public/labs are built by
 * `npm run labs` and committed; this checks they are there and that they work.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createServer } from "vite";
import { rng } from "./labs/seed.mjs";

const labs = (p) => new URL(`../public/labs/${p}`, import.meta.url);
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try {
  // the generator is deterministic: same seed, same data, readable diffs
  const a = rng(), b = rng();
  const sa = Array.from({ length: 5 }, () => a.int(1, 1000));
  assert.deepEqual(sa, Array.from({ length: 5 }, () => b.int(1, 1000)));
  const c = rng(1);
  assert.notDeepEqual(sa, Array.from({ length: 5 }, () => c.int(1, 1000)));

  const { parseLabsHash, labsHash } = await vite.ssrLoadModule("/src/labs/route.ts");
  assert.equal(parseLabsHash("#/"), null);
  assert.equal(parseLabsHash("#/qr"), null);
  assert.deepEqual(parseLabsHash("#/progetti"), { page: "labs", tab: "prova" });
  assert.deepEqual(parseLabsHash("#/progetti/lab-asd/codice/ex1%2Fsrc%2Fsort.c"), {
    page: "labs", id: "lab-asd", tab: "codice", file: "ex1/src/sort.c",
  });
  assert.deepEqual(parseLabsHash("#/progetti/lab-asd/boh"), { page: "labs", id: "lab-asd", tab: "prova" });
  assert.equal(labsHash("lab-asd", "codice", "ex1/src/sort.c"), "#/progetti/lab-asd/codice/ex1%2Fsrc%2Fsort.c");
  console.log("ok — labs: seed and routes");

  // ── later tasks append their checks here, above this line ──
} finally {
  await vite.close();
}
```

In `package.json` → `scripts`:

```json
"labs": "node scripts/labs/index.mjs",
"test": "node scripts/check.mjs && node scripts/check-labs.mjs",
```

- [ ] **Step 3: Esegui e verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `Cannot find module '.../scripts/labs/seed.mjs'`

- [ ] **Step 4: Implementa**

`scripts/labs/seed.mjs`:

```js
/** mulberry32: tiny, fast, deterministic. Same seed → same demo data on every build. */
export function rng(seed = 20261014) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}
```

`scripts/labs/util.mjs`:

```js
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const CACHE = join(ROOT, "scripts/labs/cache");
export const TMP = join(CACHE, "tmp");
export const outDir = (id) => join(ROOT, "public/labs", id);
export const ensureDir = (p) => (mkdirSync(p, { recursive: true }), p);
export const writeJson = (p, data) => (ensureDir(dirname(p)), writeFileSync(p, JSON.stringify(data)));
export const writeGz = (p, data) => (ensureDir(dirname(p)), writeFileSync(p, gzipSync(data, { level: 9 })));
/** Docker Desktop on Windows wants forward slashes. */
export const dockerPath = (p) => resolve(p).replace(/\\/g, "/");

export function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} → exit ${r.status}`);
  return r;
}
```

`scripts/labs/sources.mjs`:

```js
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const TG = join(HOME, "Downloads/Telegram Desktop");

/** Where each project lives on this machine. Adding a project = one entry here + one in src/data/projects.ts. */
export const SOURCES = {
  "lab-asd": {
    repo: join(HOME, "Workspace/laboratorio-algoritmi-2024-2025-main"),
    dictionary: join(TG, "dictionary.txt"),
    correctme: join(TG, "correctme.txt"),
    graph: join(TG, "italian_dist_graph.csv"),
  },
  catering: { zip: join(TG, "progetto - Pierri Salvatore.zip") },
  "film-data": { repo: join(HOME, "Workspace/Project_IUM_TWEB") },
  "food-delivery-db": { pdf: "D:/Backup/PROGETTO BD SALVATORE PIERRI.pdf" },
};
```

`scripts/labs/index.mjs`:

```js
/** npm run labs             → every step
 *  npm run labs -- asd film  → only those (catering before code: code reads the unzipped project) */
const STEPS = {
  asd: () => import("./asd.mjs"),
  catering: () => import("./catering.mjs"),
  delivery: () => import("./delivery.mjs"),
  film: () => import("./film/build.mjs"),
  code: () => import("./code.mjs"),
};
const only = process.argv.slice(2);
for (const name of only) if (!STEPS[name]) throw new Error(`step sconosciuto: ${name}`);
for (const [name, load] of Object.entries(STEPS)) {
  if (only.length && !only.includes(name)) continue;
  console.log(`\n→ ${name}`);
  await (await load()).default();
}
```

`src/labs/route.ts`:

```ts
export type LabsTab = "prova" | "codice" | "documenti";
export type LabsRoute = { page: "labs"; id?: string; tab: LabsTab; file?: string };

const TABS: LabsTab[] = ["prova", "codice", "documenti"];

/** "#/progetti[/<id>[/<tab>[/<file>]]]" → route; anything else → null. */
export function parseLabsHash(hash: string): LabsRoute | null {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (parts[0] !== "progetti") return null;
  const [, id, tab, file] = parts;
  const known = TABS.includes(tab as LabsTab);
  const route: LabsRoute = { page: "labs", tab: known ? (tab as LabsTab) : "prova" };
  if (id) route.id = id;
  if (id && known && file) route.file = decodeURIComponent(file);
  return route;
}

export const labsHash = (id?: string, tab: LabsTab = "prova", file?: string) =>
  "#/progetti" + (id ? `/${id}/${tab}` + (file ? `/${encodeURIComponent(file)}` : "") : "");
```

`src/labs/paths.ts`:

```ts
/** Artifact URL, correct under any VITE_BASE (the site lives in /bomboniera/). */
export const labsUrl = (id: string, ...parts: string[]) =>
  new URL(`${import.meta.env.BASE_URL}labs/${[id, ...parts].join("/")}`, window.location.href).href;
```

In `src/types.ts`, dentro `Project`, dopo `demo?: string;`:

```ts
  /** Kind of live demo in the lab page; artifacts live in public/labs/<id>/. No lab = code and docs only. */
  lab?: "asd" | "sql" | "site";
```

`.gitignore` (in coda):

```
scripts/labs/cache/tmp/
```

- [ ] **Step 5: Verifica che passi**

Run: `node scripts/check-labs.mjs && npm run typecheck`
Expected: `ok — labs: seed and routes`, nessun errore TS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/labs src/labs src/types.ts scripts/check-labs.mjs
git commit -m "Laboratori: pipeline, seed e route di base"
```

---

### Task 2: ASD — il C compilato in WASM

**Files:**
- Create: `scripts/labs/asd.mjs`, `src/labs/asd/records.ts`
- Output: `public/labs/lab-asd/{ex1,ex2,ex3,ex4}/{main,test}.{mjs,wasm}`, `public/labs/lab-asd/data/{commedia.txt.gz,words.txt.gz,dictionary.txt.gz,correctme.txt,graph.csv.gz}`, `scripts/labs/cache/commedia.txt`
- Test: `scripts/check-labs.mjs`

**Interfaces:**
- Consumes: `SOURCES['lab-asd']`, `sh`, `dockerPath`, `outDir`, `ensureDir`, `writeGz`, `CACHE`.
- Produces: `EXERCISES: { id: 'ex1'|'ex2'|'ex3'|'ex4', dir: string, main: string[], test: string[] }[]`; `makeRecords(words: string[], n: number, seed?: number): string` (righe `id,field1,field2,field3`, una per riga, `\n` finale); moduli emscripten ES6 con `default(opts) → Promise<{ callMain(args): number, FS }>`.

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs`, al segnaposto:

```js
  /* ASD: the student's own C, compiled to wasm, run as-is */
  async function runC(exUrl, args, files = {}) {
    const out = [];
    // a fresh module instance per run: emscripten can't call main twice after exit
    const mod = await (await import(`${exUrl.href}?run=${Math.random()}`)).default({
      print: (l) => out.push(l), printErr: (l) => out.push(l),
    });
    for (const [p, data] of Object.entries(files)) mod.FS.writeFile(p, data);
    let code = 0;
    try { code = mod.callMain(args) ?? 0; } catch (e) { if (e?.name === "ExitStatus") code = e.status; else throw e; }
    return { code, out, FS: mod.FS };
  }
  for (const ex of ["ex1", "ex2", "ex3", "ex4"]) {
    const t = await runC(labs(`lab-asd/${ex}/test.mjs`), []);
    assert.equal(t.code, 0, `${ex}: the course's unit tests fail in wasm:\n${t.out.join("\n")}`);
  }
  const ed = { "/dict.txt": "casa\ncassa\ncara\nvino\n", "/in.txt": "cssa" };
  const r1 = await runC(labs("lab-asd/ex2/main.mjs"), ["/dict.txt", "/in.txt"], ed);
  const r2 = await runC(labs("lab-asd/ex2/main.mjs"), ["/dict.txt", "/in.txt"], ed);
  assert.ok(r1.out.some((l) => l.startsWith("cssa:") && l.includes("cassa")), r1.out.join("\n"));
  assert.deepEqual(r1.out, r2.out, "a second run of the same program gives a different answer");

  const { makeRecords } = await vite.ssrLoadModule("/src/labs/asd/records.ts");
  const words = gunzipSync(readFileSync(labs("lab-asd/data/words.txt.gz"))).toString().split("\n");
  const csv = makeRecords(words, 1000);
  assert.match(csv.split("\n")[0], /^\d+,[^, ]+,\d+,\d+\.\d+$/);
  const s = await runC(labs("lab-asd/ex1/main.mjs"), ["/r.csv", "/s.csv", "2", "1"], { "/r.csv": csv });
  assert.equal(s.code, 0, s.out.join("\n"));
  const f2 = s.FS.readFile("/s.csv", { encoding: "utf8" }).trim().split("\n").map((l) => Number(l.split(",")[2]));
  assert.equal(f2.length, 1000);
  assert.ok(f2.every((v, i) => i === 0 || f2[i - 1] <= v), "ex1 did not sort by field2");
  for (const f of ["commedia.txt.gz", "dictionary.txt.gz", "correctme.txt", "graph.csv.gz"])
    assert.ok(existsSync(labs(`lab-asd/data/${f}`)), `missing lab-asd/data/${f}`);
  console.log("ok — lab-asd: 4 C test suites green, ex1 sorts, ex2 answers the same twice");
```

Se la riga `cssa:` non corrisponde al formato reale del tuo `ex2/src/main.c` (righe 107–112: `printf("%s:", word)` poi `" %s"` per parola), adatta l'asserzione a quel formato, non il C.

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `Cannot find module .../public/labs/lab-asd/ex1/test.mjs`

- [ ] **Step 3: Generatore dei record** — `src/labs/asd/records.ts`

```ts
/** Same format as the course's records.csv: id,field1,field2,field3 — field1 a
 *  word with no spaces or commas. Generated here so the 20M-row file never ships.
 *  Same mulberry32 as scripts/labs/seed.mjs, copied because this runs in the browser. */
export function makeRecords(words: string[], n: number, seed = 20261014): string {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pool = words.filter((w) => w && !/[\s,]/.test(w));
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    const w = pool[Math.floor(next() * pool.length)];
    lines.push(`${i},${w},${Math.floor(next() * 100000)},${(next() * 10000).toFixed(4)}`);
  }
  return lines.join("\n") + "\n";
}
```

- [ ] **Step 4: Script di build** — `scripts/labs/asd.mjs`

```js
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
  "-std=c11", "-O2", "-Iinclude",
  "-sMODULARIZE", "-sEXPORT_ES6", "-sINVOKE_RUN=0", "-sEXIT_RUNTIME=1",
  "-sEXPORTED_RUNTIME_METHODS=callMain,FS", "-sALLOW_MEMORY_GROWTH",
  "-sMAXIMUM_MEMORY=2gb", "-sSTACK_SIZE=16mb", "-sENVIRONMENT=web,worker,node",
];
const COMMEDIA_URL = "https://www.gutenberg.org/cache/epub/1012/pg1012.txt";

async function commedia() {
  const cached = join(CACHE, "commedia.txt");
  if (!existsSync(cached)) {
    const raw = await (await fetch(COMMEDIA_URL)).text();
    // keep only the poem: Gutenberg's header and licence footer are theirs, not Dante's
    const body = raw.split(/\*\*\* START OF[^\n]*\n/)[1].split(/\*\*\* END OF/)[0].trim();
    writeFileSync(ensureDir(CACHE) && cached, body + "\n");
  }
  return readFileSync(cached, "utf8");
}

export default async function asd() {
  const src = SOURCES["lab-asd"];
  const out = ensureDir(outDir("lab-asd"));
  sh("docker", ["pull", IMAGE]);
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
```

- [ ] **Step 5: Lancia la pipeline e verifica**

Run: `npm run labs -- asd && node scripts/check-labs.mjs`
Expected: `ok — lab-asd: 4 C test suites green, ex1 sorts, ex2 answers the same twice`.
Se un `test` del corso fallisce solo in WASM (es. stack overflow nella edit distance ricorsiva), alza `-sSTACK_SIZE` — **non** toccare il C.

- [ ] **Step 6: Commit**

```bash
git add scripts/labs/asd.mjs scripts/labs/cache/commedia.txt src/labs/asd/records.ts public/labs/lab-asd scripts/check-labs.mjs
git commit -m "Laboratori: ASD compilato in WASM con i suoi dataset"
```

---

### Task 3: Cat & Ring — database vero e JUnit vero

**Files:**
- Create: `scripts/labs/catering.mjs`
- Output: `public/labs/catering/{catering.db,tests.json,queries.json}`; progetto estratto in `scripts/labs/cache/tmp/catering/progetto`

**Interfaces:**
- Consumes: `SOURCES.catering.zip`, `sh`, `dockerPath`, `TMP`, `outDir`, `ensureDir`, `writeJson`.
- Produces: `tests.json`: `{ total: number, failures: number, cases: { suite: string, name: string, time: number, ok: boolean, message?: string }[] }`; `queries.json`: `{ title: string, sql: string }[]`; `parseSurefire(xml: string) → cases[]`.

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs`:

```js
  /* SQL labs open with the same sql.js the page uses */
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs();
  const openFile = (p) => new SQL.Database(readFileSync(labs(p)));
  const tables = (db) => db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0].values.map((r) => r[0]);

  const cat = openFile("catering/catering.db");
  assert.ok(tables(cat).length >= 5, "catering.db has fewer tables than the project");
  for (const t of tables(cat)) cat.exec(`SELECT * FROM "${t}" LIMIT 1`);
  const junit = JSON.parse(readFileSync(labs("catering/tests.json"), "utf8"));
  assert.ok(junit.total > 0, "no JUnit cases recorded");
  assert.equal(junit.failures, 0, junit.cases.filter((c) => !c.ok).map((c) => c.name).join(", "));
  const catQueries = JSON.parse(readFileSync(labs("catering/queries.json"), "utf8"));
  for (const q of catQueries) assert.ok(cat.exec(q.sql).length, `catering example query returns nothing: ${q.title}`);
  console.log(`ok — catering: ${tables(cat).length} tables, ${junit.total} JUnit cases green`);
```

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `ENOENT ... catering/catering.db`

- [ ] **Step 3: Implementa** — `scripts/labs/catering.mjs`

```js
import { copyFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import initSqlJs from "sql.js";
import { dockerPath, ensureDir, outDir, sh, TMP, writeJson } from "./util.mjs";
import { SOURCES } from "./sources.mjs";

/** Surefire XML → the few fields the page shows. */
export function parseSurefire(xml) {
  const suite = (xml.match(/<testsuite[^>]*\sname="([^"]+)"/)?.[1] ?? "").split(".").pop();
  return [...xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)].map(([, attrs, , body = ""]) => {
    const name = attrs.match(/\sname="([^"]+)"/)?.[1] ?? "?";
    const time = Number(attrs.match(/\stime="([\d.]+)"/)?.[1] ?? 0);
    const fail = body.match(/<(failure|error)\b[^>]*?message="([^"]*)"/) ?? body.match(/<(failure|error)\b/);
    return { suite, name, time, ok: !fail, ...(fail && { message: fail[2] ?? fail[1] }) };
  });
}

export default async function catering() {
  const work = join(TMP, "catering");
  rmSync(work, { recursive: true, force: true });
  ensureDir(work);
  sh("tar", ["-xf", SOURCES.catering.zip, "-C", work]); // tar reads zip on Windows 10+ and Linux (bsdtar)
  const proj = join(work, "progetto");
  const out = ensureDir(outDir("catering"));

  // the database as the project shipped it, before the tests touch anything
  copyFileSync(join(proj, "database/catering.db"), join(out, "catering.db"));

  sh("docker", ["run", "--rm", "-v", `${dockerPath(proj)}:/p`, "-w", "/p", "maven:3.9-eclipse-temurin-11", "mvn", "-q", "-B", "test"]);
  const dir = join(proj, "target/surefire-reports");
  const cases = readdirSync(dir).filter((f) => /^TEST-.*\.xml$/.test(f)).flatMap((f) => parseSurefire(readFileSync(join(dir, f), "utf8")));
  writeJson(join(out, "tests.json"), { total: cases.length, failures: cases.filter((c) => !c.ok).length, cases });

  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync(join(out, "catering.db")));
  const names = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0].values.map((r) => r[0]);
  writeJson(join(out, "queries.json"), [
    { title: "Quante righe ha ogni tabella", sql: names.map((n) => `SELECT '${n}' AS tabella, COUNT(*) AS righe FROM "${n}"`).join("\nUNION ALL\n") + ";" },
    ...names.slice(0, 4).map((n) => ({ title: `Prime righe di ${n}`, sql: `SELECT * FROM "${n}" LIMIT 20;` })),
  ]);
  console.log(`  ${cases.length} casi JUnit, ${names.length} tabelle`);
}
```

- [ ] **Step 4: Lancia e verifica**

Run: `npm run labs -- catering && node scripts/check-labs.mjs`
Expected: `ok — catering: N tables, M JUnit cases green`. Se Maven segnala test falliti, **riportalo all'utente** invece di nasconderli: `tests.json` deve dire la verità, e l'asserzione `failures === 0` cambia solo con il suo consenso.

- [ ] **Step 5: Query di dominio**

Apri `catering.db` (`node -e` con sql.js, o qualunque client SQLite) e leggi tabelle e colonne vere. Aggiungi in testa all'array `writeJson(join(out, "queries.json"), [...])` 2–3 query che raccontano il dominio — es. eventi con i loro servizi e menù, compiti di cucina per turno — scritte con i nomi reali delle colonne. Rilancia `npm run labs -- catering` e `node scripts/check-labs.mjs` (ogni query deve restituire righe).

- [ ] **Step 6: Commit**

```bash
git add scripts/labs/catering.mjs public/labs/catering scripts/check-labs.mjs
git commit -m "Laboratori: Cat & Ring con il suo database e i test JUnit"
```

---

### Task 4: Food Delivery — schema dall'E-R e dati generati

**Files:**
- Create: `scripts/labs/delivery/schema.sql`, `scripts/labs/delivery.mjs`
- Output: `public/labs/food-delivery-db/{delivery.db,schema.sql,queries.json}`

**Interfaces:**
- Consumes: `rng`, `outDir`, `ensureDir`, `writeJson`, `ROOT`, `sql.js`.
- Produces: `delivery.db` con tabelle `utente, conto, metodo_pagamento, ristorante, portata, rider, ordine, ordine_portata, recensione`; `queries.json`: `{ title: string, sql: string }[]`.

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs`:

```js
  const del = openFile("food-delivery-db/delivery.db");
  for (const t of ["utente", "conto", "metodo_pagamento", "ristorante", "portata", "ordine", "ordine_portata", "rider", "recensione"])
    assert.ok(tables(del).includes(t), `delivery.db is missing ${t}`);
  const count = (db, sql) => db.exec(sql)[0].values[0][0];
  assert.ok(count(del, "SELECT COUNT(*) FROM ordine") >= 2500);
  assert.equal(del.exec("PRAGMA foreign_key_check").length, 0, "dangling foreign keys");
  const delQueries = JSON.parse(readFileSync(labs("food-delivery-db/queries.json"), "utf8"));
  for (const q of delQueries) {
    const res = del.exec(q.sql);
    assert.ok(res.length && res[0].values.length, `example query returns nothing: ${q.title}`);
  }
  console.log(`ok — delivery: ${count(del, "SELECT COUNT(*) FROM ordine")} orders, ${delQueries.length} example queries answer`);
```

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `ENOENT ... food-delivery-db/delivery.db`

- [ ] **Step 3: Schema** — `scripts/labs/delivery/schema.sql` (dallo schema E-R e dai requisiti del PDF)

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE utente (
  email          TEXT PRIMARY KEY,
  nome           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  telefono       TEXT NOT NULL,
  indirizzo      TEXT NOT NULL,
  premium        INTEGER NOT NULL DEFAULT 0 CHECK (premium IN (0, 1)),
  numero_ordini  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE conto (
  utente  TEXT PRIMARY KEY REFERENCES utente(email),
  saldo   REAL NOT NULL DEFAULT 0 CHECK (saldo >= 0)
);

CREATE TABLE metodo_pagamento (
  id       INTEGER PRIMARY KEY,
  utente   TEXT NOT NULL REFERENCES utente(email),
  tipo     TEXT NOT NULL CHECK (tipo IN ('carta', 'paypal', 'satispay')),
  ultime4  TEXT
);

CREATE TABLE ristorante (
  codice               INTEGER PRIMARY KEY,
  nome                 TEXT NOT NULL,
  descrizione          TEXT NOT NULL,
  tipo_cibo            TEXT NOT NULL,
  costo_spedizione     REAL NOT NULL CHECK (costo_spedizione >= 0),
  stelle               REAL NOT NULL DEFAULT 0 CHECK (stelle BETWEEN 0 AND 5),
  top_partner          INTEGER NOT NULL DEFAULT 0 CHECK (top_partner IN (0, 1)),
  ingresso_top_partner TEXT
);

CREATE TABLE portata (
  id          INTEGER PRIMARY KEY,
  ristorante  INTEGER NOT NULL REFERENCES ristorante(codice),
  titolo      TEXT NOT NULL,
  ingredienti TEXT NOT NULL,
  allergeni   TEXT NOT NULL DEFAULT '',
  prezzo      REAL NOT NULL CHECK (prezzo > 0),
  sconto      REAL NOT NULL DEFAULT 0 CHECK (sconto BETWEEN 0 AND 0.5)
);

CREATE TABLE rider (
  codice      INTEGER PRIMARY KEY,
  stato       TEXT NOT NULL CHECK (stato IN ('Disponibile', 'Occupato', 'Assente')),
  mezzo       TEXT NOT NULL CHECK (mezzo IN ('bicicletta', 'bicicletta elettrica', 'monopattino')),
  batteria_km REAL CHECK (batteria_km IS NULL OR batteria_km >= 0),
  lat         REAL NOT NULL,
  lon         REAL NOT NULL,
  consegne    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ordine (
  id               INTEGER PRIMARY KEY,
  utente           TEXT NOT NULL REFERENCES utente(email),
  ristorante       INTEGER NOT NULL REFERENCES ristorante(codice),
  rider            INTEGER REFERENCES rider(codice),
  creato_il        TEXT NOT NULL,
  orario_recapito  TEXT NOT NULL,
  stato            TEXT NOT NULL CHECK (stato IN ('consegnato', 'annullato_utente', 'annullato_ristorante', 'in_consegna')),
  reclamo          INTEGER NOT NULL DEFAULT 0 CHECK (reclamo IN (0, 1)),
  totale           REAL NOT NULL
);

CREATE TABLE ordine_portata (
  ordine   INTEGER NOT NULL REFERENCES ordine(id),
  portata  INTEGER NOT NULL REFERENCES portata(id),
  quantita INTEGER NOT NULL CHECK (quantita > 0),
  PRIMARY KEY (ordine, portata)
);

CREATE TABLE recensione (
  id          INTEGER PRIMARY KEY,
  utente      TEXT NOT NULL REFERENCES utente(email),
  ristorante  INTEGER NOT NULL REFERENCES ristorante(codice),
  valutazione INTEGER NOT NULL CHECK (valutazione BETWEEN 1 AND 5),
  commento    TEXT,
  mancia      REAL NOT NULL DEFAULT 0
);
```

- [ ] **Step 4: Seed** — `scripts/labs/delivery.mjs`

```js
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import initSqlJs from "sql.js";
import { rng } from "./seed.mjs";
import { ensureDir, outDir, ROOT, writeJson } from "./util.mjs";

const NOMI = ["Giulia", "Marco", "Sara", "Luca", "Chiara", "Matteo", "Elena", "Davide", "Francesca", "Andrea", "Martina", "Simone", "Alessia", "Federico", "Valentina", "Lorenzo"];
const COGNOMI = ["Rossi", "Bianchi", "Ferrero", "Gallo", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Conti", "Fontana", "Moretti"];
const VIE = ["via Po", "corso Vittorio Emanuele II", "via Garibaldi", "corso Francia", "via Nizza", "corso Regina Margherita", "via Roma", "corso Giulio Cesare"];
const CUCINE = {
  pizzeria: ["Margherita", "Diavola", "Capricciosa", "Quattro formaggi", "Marinara"],
  sushi: ["Uramaki salmone", "Nigiri tonno", "Gyoza", "Temaki", "Edamame"],
  piemontese: ["Agnolotti del plin", "Vitello tonnato", "Tajarin al burro", "Bonet", "Bagna cauda"],
  burger: ["Cheeseburger", "Bacon burger", "Veggie burger", "Patatine", "Onion rings"],
  poke: ["Poke salmone", "Poke tofu", "Poke tonno", "Edamame", "Mochi"],
  kebab: ["Kebab piadina", "Falafel", "Hummus", "Patatine", "Baklava"],
};
const ALLERGENI = ["glutine", "lattosio", "uova", "pesce", "soia", "frutta a guscio", ""];
const COMMENTI = ["Arrivato caldo e in orario.", "Porzioni generose.", "Il rider è stato gentilissimo.", "Un po' in ritardo ma buono.", "Freddo all'arrivo.", "Tornerò a ordinare.", "Mancava una bibita."];

export const QUERIES = [
  { title: "Chi merita il Top Partner (≥ 20 consegne, ≥ 4.5 stelle, ≤ 1,5% annullati, ≤ 2,5% reclami)", sql:
`SELECT r.nome, COUNT(*) AS consegnati, r.stelle
FROM ristorante r JOIN ordine o ON o.ristorante = r.codice AND o.stato = 'consegnato'
GROUP BY r.codice
HAVING consegnati >= 20 AND r.stelle >= 4.5
   AND (SELECT AVG(stato = 'annullato_ristorante') FROM ordine WHERE ristorante = r.codice) <= 0.015
   AND (SELECT AVG(reclamo) FROM ordine WHERE ristorante = r.codice) <= 0.025
ORDER BY r.stelle DESC, consegnati DESC;` },
  { title: "Rider disponibili con almeno 10 km di autonomia", sql:
`SELECT codice, mezzo, batteria_km, consegne FROM rider
WHERE stato = 'Disponibile' AND (mezzo = 'bicicletta' OR batteria_km >= 10)
ORDER BY consegne DESC;` },
  { title: "Clienti più fedeli e se sono Premium", sql:
`SELECT u.nome, u.premium, COUNT(o.id) AS ordini, ROUND(SUM(o.totale), 2) AS speso
FROM utente u JOIN ordine o ON o.utente = u.email
GROUP BY u.email ORDER BY ordini DESC LIMIT 10;` },
  { title: "Le portate più ordinate", sql:
`SELECT p.titolo, r.nome AS ristorante, SUM(op.quantita) AS pezzi
FROM ordine_portata op JOIN portata p ON p.id = op.portata JOIN ristorante r ON r.codice = p.ristorante
GROUP BY p.id ORDER BY pezzi DESC LIMIT 10;` },
];

export default async function delivery() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec(readFileSync(join(ROOT, "scripts/labs/delivery/schema.sql"), "utf8"));
  const r = rng();
  const ins = (t, row) => db.run(`INSERT INTO ${t} (${Object.keys(row)}) VALUES (${Object.keys(row).map(() => "?")})`, Object.values(row));
  const lastId = () => db.exec("SELECT last_insert_rowid()")[0].values[0][0];

  db.exec("BEGIN");
  const utenti = [];
  for (let i = 0; i < 300; i++) {
    const nome = `${r.pick(NOMI)} ${r.pick(COGNOMI)}`;
    const email = `${nome.toLowerCase().replace(/\s+/g, ".")}${i}@esempio.it`;
    utenti.push(email);
    ins("utente", { email, nome, password_hash: `$2b$10$demo${i}`, telefono: `3${r.int(10, 99)}${r.int(1000000, 9999999)}`, indirizzo: `${r.pick(VIE)} ${r.int(1, 180)}, Torino`, premium: r.next() < 0.2 ? 1 : 0 });
    ins("conto", { utente: email, saldo: Math.round(r.next() * 8000) / 100 });
    ins("metodo_pagamento", { utente: email, tipo: r.pick(["carta", "paypal", "satispay"]), ultime4: String(r.int(1000, 9999)) });
  }

  const menu = {};   // codice ristorante → id delle portate
  const bravi = new Set();
  for (let c = 1; c <= 40; c++) {
    const cucina = r.pick(Object.keys(CUCINE));
    // a handful of kitchens are excellent on purpose, so the Top Partner query has an answer
    if (c % 7 === 0) bravi.add(c);
    ins("ristorante", { codice: c, nome: `${r.pick(["Da", "Il", "La", "Officina", "Bottega"])} ${r.pick(COGNOMI)}`, descrizione: `Cucina ${cucina} a domicilio`, tipo_cibo: cucina, costo_spedizione: r.pick([0, 1.49, 1.99, 2.49, 2.99]) });
    menu[c] = CUCINE[cucina].map((titolo) => {
      ins("portata", { ristorante: c, titolo, ingredienti: `ingredienti della ricetta ${titolo.toLowerCase()}`, allergeni: r.pick(ALLERGENI), prezzo: Math.round((4 + r.next() * 14) * 100) / 100, sconto: r.next() < 0.15 ? 0.1 : 0 });
      return lastId();
    });
  }

  for (let k = 1; k <= 60; k++) {
    const mezzo = r.pick(["bicicletta", "bicicletta elettrica", "monopattino"]);
    ins("rider", { codice: k, stato: r.pick(["Disponibile", "Disponibile", "Occupato", "Assente"]), mezzo, batteria_km: mezzo === "bicicletta" ? null : Math.round(r.next() * 400) / 10, lat: 45.07 + r.next() * 0.04, lon: 7.65 + r.next() * 0.05 });
  }

  for (let o = 1; o <= 3000; o++) {
    const c = r.int(1, 40);
    const bravo = bravi.has(c);
    const roll = r.next();
    const stato = bravo ? "consegnato" : roll < 0.04 ? "annullato_ristorante" : roll < 0.08 ? "annullato_utente" : roll < 0.1 ? "in_consegna" : "consegnato";
    const giorno = new Date(Date.UTC(2025, 0, 1) + r.int(0, 600) * 86400000);
    const righe = Array.from({ length: r.int(1, 3) }, () => r.pick(menu[c]));
    ins("ordine", { id: o, utente: r.pick(utenti), ristorante: c, rider: stato === "annullato_ristorante" ? null : r.int(1, 60), creato_il: giorno.toISOString(), orario_recapito: `${r.int(12, 22)}:${r.pick(["00", "15", "30", "45"])}`, stato, reclamo: !bravo && r.next() < 0.05 ? 1 : 0, totale: 0 });
    for (const p of new Set(righe)) ins("ordine_portata", { ordine: o, portata: p, quantita: righe.filter((x) => x === p).length });
    if (stato === "consegnato" && r.next() < 0.35) {
      ins("recensione", { utente: r.pick(utenti), ristorante: c, valutazione: bravo ? (r.next() < 0.8 ? 5 : 4) : r.int(2, 5), commento: r.pick(COMMENTI), mancia: r.pick([0, 0, 0.5, 1, 2]) });
    }
  }

  db.exec(`
    UPDATE ordine SET totale = (SELECT ROUND(SUM(op.quantita * p.prezzo * (1 - p.sconto)), 2) FROM ordine_portata op JOIN portata p ON p.id = op.portata WHERE op.ordine = ordine.id);
    UPDATE utente SET numero_ordini = (SELECT COUNT(*) FROM ordine WHERE ordine.utente = utente.email);
    UPDATE rider SET consegne = (SELECT COUNT(*) FROM ordine WHERE ordine.rider = rider.codice AND stato = 'consegnato');
    UPDATE ristorante SET stelle = COALESCE((SELECT ROUND(AVG(valutazione), 1) FROM recensione WHERE recensione.ristorante = ristorante.codice), 0);
    UPDATE ristorante SET top_partner = 1, ingresso_top_partner = '2026-01-01' WHERE stelle >= 4.5;
    COMMIT;
  `);

  const out = ensureDir(outDir("food-delivery-db"));
  writeFileSync(join(out, "delivery.db"), db.export());
  copyFileSync(join(ROOT, "scripts/labs/delivery/schema.sql"), join(out, "schema.sql"));
  writeJson(join(out, "queries.json"), QUERIES);
  console.log("  delivery.db: 300 utenti, 40 ristoranti, 60 rider, 3000 ordini");
}
```

- [ ] **Step 5: Lancia e verifica**

Run: `npm run labs -- delivery && node scripts/check-labs.mjs`
Expected: `ok — delivery: 3000 orders, 4 example queries answer`

- [ ] **Step 6: Commit**

```bash
git add scripts/labs/delivery scripts/labs/delivery.mjs public/labs/food-delivery-db scripts/check-labs.mjs
git commit -m "Laboratori: database del delivery dallo schema E-R, dati generati"
```

---

### Task 5: Film Data — dati da Wikidata e API statica

**Files:**
- Create: `scripts/labs/film/wikidata.mjs`, `scripts/labs/film/build.mjs`, `scripts/labs/film/site.mjs` (vuoto per ora)
- Output: `scripts/labs/cache/wikidata-films.json`, `public/labs/film-data/api/films/{index,top10}.json`, `api/films/<id>.json`, `api/films/<id>/reviews.json`, `api/films/genre/<genere>.json`, `api/chat/<id>.json`, `posters/<id>.{jpg,svg}`

**Interfaces:**
- Consumes: `rng`, `writeJson`, `outDir`, `ensureDir`, `CACHE`.
- Produces: `Film = { id, title, year, releaseYear, description, tagline, duration, rating, genres: string[], poster }` con `poster` relativo a `site/` (`../posters/<id>.jpg|svg`); `FilmDetail = Film & { reviews: Review[] }`; `Review = { movie_title, critic_name, review_type: 'Fresh'|'Rotten', review_score: '<n>/5', review_content, review_date }`; `ChatMsg = { username, message, timestamp }`; `GENRES: string[]` (inglese minuscolo, include `horror`); file dei generi: `encodeURIComponent(genere) + ".json"`; `site.mjs` default export `(films, out) => Promise<void>`.

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs`:

```js
  const api = (p) => JSON.parse(readFileSync(labs(`film-data/api/${p}`), "utf8"));
  const allFilms = api("films/index.json");
  assert.ok(allFilms.length >= 300, `only ${allFilms.length} films`);
  assert.equal(new Set(allFilms.map((f) => f.id)).size, allFilms.length);
  for (const f of allFilms) {
    assert.ok(f.title && f.year && f.poster && Array.isArray(f.genres), `incomplete film ${f.id}`);
    assert.ok(f.rating >= 0 && f.rating <= 5);
    assert.ok(existsSync(labs(`film-data/posters/${f.poster.split("/").pop()}`)), `missing poster for ${f.title}`);
  }
  assert.ok(api("films/genre/horror.json").length > 0, "the horror slider would be empty");
  assert.equal(api("films/top10.json").length, 10);
  const one = api(`films/${allFilms[0].id}.json`);
  assert.ok(one.reviews.length >= 3 && one.reviews.every((r) => r.review_content && r.critic_name));
  console.log(`ok — film-data: ${allFilms.length} films from Wikidata, each with poster and reviews`);
```

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `ENOENT ... film-data/api/films/index.json`

- [ ] **Step 3: Fetch e cache da Wikidata** — `scripts/labs/film/wikidata.mjs`

```js
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE, ensureDir } from "../util.mjs";

const ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "bomboniera-labs/1.0 (salvatorepierri.com; one-off build script)";

async function sparql(query) {
  const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
  if (!res.ok) throw new Error(`Wikidata ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).results.bindings;
}

// films with an Italian Wikipedia page, most linked first: a cheap proxy for "films people know"
const TOP = `
SELECT ?film ?n WHERE {
  ?film wdt:P31 wd:Q11424; wikibase:sitelinks ?n.
  ?it schema:about ?film; schema:isPartOf <https://it.wikipedia.org/>.
  FILTER(?n >= 40)
} ORDER BY DESC(?n) LIMIT 500`;

const DETAILS = (ids) => `
SELECT ?film (SAMPLE(?itL) AS ?it) (SAMPLE(?enL) AS ?en) (SAMPLE(?d) AS ?desc)
       (MIN(?date) AS ?released) (SAMPLE(?dur) AS ?duration) (SAMPLE(?img) AS ?image)
       (GROUP_CONCAT(DISTINCT ?g; separator="|") AS ?genres) WHERE {
  VALUES ?film { ${ids.map((q) => `wd:${q}`).join(" ")} }
  OPTIONAL { ?film rdfs:label ?itL FILTER(LANG(?itL) = "it") }
  OPTIONAL { ?film rdfs:label ?enL FILTER(LANG(?enL) = "en") }
  OPTIONAL { ?film schema:description ?d FILTER(LANG(?d) = "it") }
  OPTIONAL { ?film wdt:P577 ?date }
  OPTIONAL { ?film wdt:P2047 ?dur }
  OPTIONAL { ?film wdt:P18 ?img }
  OPTIONAL { ?film wdt:P136 ?gi. ?gi rdfs:label ?g FILTER(LANG(?g) = "en") }
} GROUP BY ?film`;

/** Cached on disk and committed: the build must not depend on Wikidata being up. */
export async function wikidataFilms({ refresh = false } = {}) {
  const file = join(ensureDir(CACHE), "wikidata-films.json");
  if (existsSync(file) && !refresh) return JSON.parse(readFileSync(file, "utf8"));
  const ids = (await sparql(TOP)).map((b) => b.film.value.split("/").pop());
  const rows = [];
  for (let i = 0; i < ids.length; i += 50) {
    rows.push(...(await sparql(DETAILS(ids.slice(i, i + 50)))));
    await new Promise((r) => setTimeout(r, 1000)); // be polite to WDQS
  }
  const order = new Map(ids.map((q, i) => [q, i]));
  const films = rows
    .map((b) => ({
      qid: b.film.value.split("/").pop(),
      title: b.it?.value ?? b.en?.value,
      description: b.desc?.value ?? "",
      released: b.released?.value ?? null,
      duration: b.duration ? Math.round(Number(b.duration.value)) : null,
      image: b.image?.value ?? null,
      genres: b.genres?.value ? b.genres.value.split("|") : [],
    }))
    .filter((f) => f.title && f.released)
    .sort((a, b) => order.get(a.qid) - order.get(b.qid));
  writeFileSync(file, JSON.stringify(films, null, 1));
  return films;
}
```

- [ ] **Step 4: Dati dell'API e locandine** — `scripts/labs/film/build.mjs`

```js
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rng } from "../seed.mjs";
import { ensureDir, outDir, writeJson } from "../util.mjs";
import { wikidataFilms } from "./wikidata.mjs";
import site from "./site.mjs";

/** Wikidata genre labels ("horror film", "science fiction film") → the short English names the original dataset and frontend use. */
export const GENRES = ["drama", "comedy", "horror", "thriller", "action", "adventure", "science fiction", "fantasy", "animation", "crime", "romance", "war", "western", "musical", "documentary", "family", "mystery"];
export const normGenres = (labels) => [...new Set(labels.map((l) => GENRES.find((g) => l.toLowerCase().includes(g))).filter(Boolean))];

const CRITICI = ["Anna Ferri", "Paolo Sorrentini", "Laura Mancuso", "Gianni Ottone", "Marta Bellini", "Ugo Pastore", "Irene Volpe", "Carlo Neri", "Sofia Landi", "Pietro Galli"];
const FRASI = {
  Fresh: ["Una regia sicura che non perde mai il ritmo.", "Le interpretazioni reggono tutto il film.", "Invecchia benissimo: lo rivedrei domani.", "Il finale ripaga ogni minuto.", "Fotografia memorabile, musica perfetta."],
  Rotten: ["Parte bene e poi si perde.", "Troppo lungo per quello che ha da dire.", "La sceneggiatura non è all'altezza del cast.", "Belle immagini, poca sostanza.", "Il secondo atto è un'occasione mancata."],
};
const UTENTI = ["cinefila_92", "popcorn_e_basta", "sala3", "ultimafila", "rewind", "fotogramma", "titolidicoda", "ciakgirato"];

export function buildFilms(raw) {
  const r = rng();
  return raw.map((f, i) => {
    const id = i + 1;
    const year = Number(f.released.slice(0, 4));
    const from = Math.max(year, 2000);
    const reviews = Array.from({ length: r.int(3, 12) }, () => {
      const score = r.int(1, 5);
      const type = score >= 3 ? "Fresh" : "Rotten";
      const date = new Date(Date.UTC(r.int(from, 2026), r.int(0, 11), r.int(1, 28)));
      return { movie_title: f.title, critic_name: r.pick(CRITICI), review_type: type, review_score: `${score}/5`, review_content: `${r.pick(FRASI[type])} ${r.pick(FRASI[type])}`, review_date: date.toISOString().slice(0, 10) };
    });
    const rating = Math.round((reviews.reduce((s, x) => s + Number(x.review_score[0]), 0) / reviews.length) * 10) / 10;
    const chat = Array.from({ length: r.int(0, 6) }, (_, k) => ({ username: r.pick(UTENTI), message: r.pick(FRASI[r.next() < 0.7 ? "Fresh" : "Rotten"]), timestamp: new Date(Date.UTC(2026, 5, 1, 20, k * 3)).toISOString() }));
    return {
      id, title: f.title, year, releaseYear: year, description: f.description, tagline: "",
      duration: f.duration ?? r.int(85, 150), rating, genres: normGenres(f.genres),
      poster: `../posters/${id}.${f.image ? "jpg" : "svg"}`, image: f.image, reviews, chat,
    };
  });
}

const pub = ({ reviews, chat, image, ...film }) => film;

export function writeApi(films, out) {
  const api = join(out, "api");
  writeJson(join(api, "films/index.json"), films.map(pub));
  writeJson(join(api, "films/top10.json"), [...films].sort((a, b) => b.rating - a.rating || a.id - b.id).slice(0, 10).map(pub));
  for (const g of GENRES) writeJson(join(api, `films/genre/${encodeURIComponent(g)}.json`), films.filter((f) => f.genres.includes(g)).map(pub));
  for (const f of films) {
    writeJson(join(api, `films/${f.id}.json`), { ...pub(f), reviews: f.reviews });
    writeJson(join(api, `films/${f.id}/reviews.json`), f.reviews);
    writeJson(join(api, `chat/${f.id}.json`), f.chat);
  }
}

const COLORI = { horror: "#5b1a1a", comedy: "#a8741a", drama: "#2d3a5c", "science fiction": "#1d4d4f", animation: "#6a3d7a", action: "#7a2f1d", romance: "#8a3b5b" };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function typographic(f) {
  const lines = [];
  for (const w of f.title.split(" ")) {
    if (lines.length && (lines.at(-1) + " " + w).length <= 14) lines[lines.length - 1] += " " + w;
    else lines.push(w);
  }
  const bg = COLORI[f.genres[0]] ?? "#2a2a2a";
  const text = lines.map((l, k) => `<text x="150" y="${200 + (k - lines.length / 2) * 34}" fill="#f4ecd6" font-family="Georgia,serif" font-size="28" text-anchor="middle">${esc(l)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><rect width="300" height="450" fill="${bg}"/><rect x="14" y="14" width="272" height="422" fill="none" stroke="#e8d9a8" stroke-opacity=".5"/>${text}<text x="150" y="400" fill="#e8d9a8" font-family="monospace" font-size="16" text-anchor="middle">${f.year}</text></svg>`;
}

/** Free Commons image when there is one (P18 lives on Commons); otherwise a typographic poster, never a copyrighted one. */
export async function writePosters(films, out) {
  const dir = ensureDir(join(out, "posters"));
  for (const f of films) {
    if (f.image && !existsSync(join(dir, `${f.id}.jpg`))) {
      const res = await fetch(`${f.image.replace("http://", "https://")}?width=300`, { headers: { "User-Agent": "bomboniera-labs/1.0 (salvatorepierri.com)" } }).catch(() => null);
      if (res?.ok) writeFileSync(join(dir, `${f.id}.jpg`), Buffer.from(await res.arrayBuffer()));
    }
    if (!existsSync(join(dir, `${f.id}.jpg`))) {
      f.poster = `../posters/${f.id}.svg`;
      writeFileSync(join(dir, `${f.id}.svg`), typographic(f));
    }
  }
}

export default async function film() {
  const out = ensureDir(outDir("film-data"));
  const films = buildFilms(await wikidataFilms());
  await writePosters(films, out);
  writeApi(films, out);
  await site(films, out);
  console.log(`  ${films.length} film da Wikidata`);
}
```

`scripts/labs/film/site.mjs` (riempito nel Task 6):

```js
export default async function site() {}
```

- [ ] **Step 5: Lancia e verifica**

Run: `npm run labs -- film && node scripts/check-labs.mjs`
Expected: `ok — film-data: N films from Wikidata, ...` con N tra 300 e 500. Se la query TOP va in timeout, alza la soglia a `?n >= 60`. Controlla il peso: `du -sh public/labs/film-data/posters` sotto ~10 MB; se sopra, scendi a `?width=200`.

- [ ] **Step 6: Commit**

```bash
git add scripts/labs/film scripts/labs/cache/wikidata-films.json public/labs/film-data scripts/check-labs.mjs
git commit -m "Laboratori: film da Wikidata, API statica, recensioni generate"
```

---

### Task 6: Film Data — il frontend originale con lo shim

**Files:**
- Create: `scripts/labs/film/shim.js`, `scripts/labs/film/search.html`
- Modify: `scripts/labs/film/site.mjs`
- Output: `public/labs/film-data/site/**`, `public/labs/film-data/charts/{NN.png,index.json}`

**Interfaces:**
- Consumes: `SOURCES['film-data'].repo`, i film del Task 5, la struttura `api/` del Task 5.
- Produces: dentro l'iframe `window.axios = { get, create }`, `window.io()`, `window.__shim = { apiPath(url): string | null, matchFilms(list, q): Film[] }`; `REWRITES: [RegExp, string][]`; `charts/index.json`: `{ src: string, caption: string }[]`.

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs`:

```js
  /* the shim turns the original frontend's localhost calls into static files */
  const shimSrc = readFileSync(labs("film-data/site/shim.js"), "utf8");
  const win = {};
  new Function("window", shimSrc)(win);
  const { apiPath, matchFilms } = win.__shim;
  assert.equal(apiPath("http://localhost:3000/api/films/top10"), "../api/films/top10.json");
  assert.equal(apiPath("http://localhost:3000/api/films/genre/science fiction"), "../api/films/genre/science%20fiction.json");
  assert.equal(apiPath("http://localhost:3000/api/films/genre/science%20fiction"), "../api/films/genre/science%20fiction.json");
  assert.equal(apiPath("http://localhost:3000/api/films/12"), "../api/films/12.json");
  assert.equal(apiPath("http://localhost:3000/api/films/12/reviews"), "../api/films/12/reviews.json");
  assert.equal(apiPath("http://localhost:3000/api/nope"), null);
  const sample = [{ title: "L'attimo fuggente" }, { title: "Il favoloso mondo di Amélie" }, { title: "Alien" }];
  assert.deepEqual(matchFilms(sample, "amelie").map((f) => f.title), ["Il favoloso mondo di Amélie"]);
  assert.equal(matchFilms(sample, "l'attimo").length, 1);
  assert.deepEqual(matchFilms(sample, "al"), [], "under 3 characters the original server returns nothing");

  const page = (p) => readFileSync(labs(`film-data/site/${p}`), "utf8");
  for (const p of ["index.html", "film-detail-v2.html", "search.hbs", "javascripts/sliderScript.js", "javascripts/film-detail.js"]) {
    const src = page(p);
    assert.doesNotMatch(src, /["'`]\/(film-detail-v2|search)\b/, `${p} still links to a server route`);
    assert.doesNotMatch(src, /href="\/"/, `${p} still links to the server root`);
    assert.doesNotMatch(src, /cdn\.jsdelivr\.net\/npm\/axios|cdn\.socket\.io/, `${p} still loads the real network clients`);
  }
  assert.ok(JSON.parse(readFileSync(labs("film-data/charts/index.json"), "utf8")).length > 0, "no notebook charts");
  console.log("ok — film-data: original frontend rewired to static files");
```

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `ENOENT ... film-data/site/shim.js`

- [ ] **Step 3: Lo shim** — `scripts/labs/film/shim.js` (script classico, caricato in `<head>` prima degli script originali)

```js
/* Stands in for the three servers of the original project. The pages are the
   student's own; only the network is replaced by static JSON next to them. */
(function (window) {
  var API = "../api/";
  var fold = function (s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); };

  function apiPath(url) {
    var path = String(url).replace(/^https?:\/\/localhost:\d+/, "").replace(/^\/api(?=\/)/, "").split("?")[0];
    var m;
    if (path === "/films/top10") return API + "films/top10.json";
    if (path === "/films" || path === "/films/") return API + "films/index.json";
    if ((m = path.match(/^\/films\/genre\/(.+)$/))) return API + "films/genre/" + encodeURIComponent(decodeURIComponent(m[1])) + ".json";
    if ((m = path.match(/^\/films\/(\d+)\/reviews$/))) return API + "films/" + m[1] + "/reviews.json";
    if ((m = path.match(/^\/films\/(\d+)$/))) return API + "films/" + m[1] + ".json";
    return null;
  }

  /** Same rule as the original search: at least 3 characters, title contains the term (accents ignored). */
  function matchFilms(list, q) {
    var t = fold(q).trim();
    if (t.length < 3) return [];
    return list.filter(function (f) { return fold(f.title).indexOf(t) !== -1; });
  }

  function get(url) {
    var p = apiPath(url);
    if (!p) return Promise.reject({ response: { status: 404 }, message: "Not found: " + url });
    return fetch(p).then(function (r) {
      if (!r.ok) throw { response: { status: r.status }, message: "HTTP " + r.status };
      return r.json().then(function (data) { return { data: data, status: 200 }; });
    });
  }
  var axios = {
    get: get,
    create: function (cfg) {
      var base = (cfg && cfg.baseURL) || "";
      return { get: function (u) { return get(base + "/api" + u); } };
    },
  };

  /* socket.io, single-player: your messages echo back, the room is pre-filled */
  function io() {
    var handlers = {};
    var name = "ospite";
    var fire = function (ev, data) { (handlers[ev] || []).forEach(function (h) { h(data); }); };
    var sock = {
      on: function (ev, h) { (handlers[ev] = handlers[ev] || []).push(h); if (ev === "connect") setTimeout(h, 0); return sock; },
      emit: function (ev, data) {
        if (ev === "join-film-chat") {
          name = (data && data.username) || name;
          fetch(API + "chat/" + data.filmId + ".json").then(function (r) { return r.ok ? r.json() : []; }).then(function (msgs) {
            msgs.forEach(function (m) { fire("chat-message", m); });
            var users = [name];
            msgs.forEach(function (m) { if (users.indexOf(m.username) === -1) users.push(m.username); });
            fire("active-users", users);
          });
        }
        if (ev === "chat-message") fire("chat-message", { username: name, message: data.message, timestamp: new Date().toISOString() });
        return sock;
      },
      disconnect: function () {},
    };
    return sock;
  }

  window.axios = axios;
  window.io = io;
  window.__shim = { apiPath: apiPath, matchFilms: matchFilms };
})(window);
```

Nota: `index.js` crea `axios.create({ baseURL: 'http://localhost:3000' })` e chiama `/films/...` — il server montava il router sotto `/api`, per questo `create` aggiunge `/api`. Verifica in `Website/public/javascripts/index.js:9-12` che `baseURL` non includa già `/api`; se lo include, togli `"/api" +` da `create`.

- [ ] **Step 4: Pagina di ricerca** — `scripts/labs/film/search.html`. Il `search.html` originale è un template Handlebars renderizzato dal central-server (`app.js:67-105`); qui lo compila Handlebars nel browser con gli stessi campi.

```html
<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ricerca Film</title></head>
<body>
<script src="shim.js"></script>
<script src="https://cdn.jsdelivr.net/npm/handlebars@4.7.8/dist/handlebars.min.js"></script>
<script>
  // what central-server/app.js did for GET /search, minus the network
  (async function () {
    const q = new URLSearchParams(location.search).get("q") || "";
    const all = await (await fetch("../api/films/index.json")).json();
    const movies = window.__shim.matchFilms(all, q);
    const tpl = Handlebars.compile(await (await fetch("search.hbs")).text());
    const html = tpl({
      searchQuery: q, movies, movieCount: movies.length, hasResults: movies.length > 0,
      errorMessage: q.trim().length > 0 && q.trim().length < 3 ? "Search term must be at least 3 characters" : "",
    });
    document.open(); document.write(html); document.close();
  })();
</script>
</body>
</html>
```

- [ ] **Step 5: Copia, riscrittura e grafici** — `scripts/labs/film/site.mjs`

```js
import { copyFileSync, cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, writeJson } from "../util.mjs";
import { SOURCES } from "../sources.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Server routes → sibling files, network clients → shim. Applied to every copied .html/.hbs/.js. */
export const REWRITES = [
  [/(["'`])\/film-detail-v2\?/g, "$1film-detail-v2.html?"],
  [/(["'`])\/search\b/g, "$1search.html"],
  [/href="\/"/g, 'href="index.html"'],
  [/src="\/javascripts\//g, 'src="javascripts/'],
  [/<script[^>]+cdn\.jsdelivr\.net\/npm\/axios[^>]*><\/script>/g, ""],
  [/<script[^>]+cdn\.socket\.io[^>]*><\/script>/g, ""],
  [/<head>/, '<head><script src="shim.js"></script>'],
];
const rewrite = (s) => REWRITES.reduce((acc, [re, to]) => acc.replace(re, to), s);
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

/** Notebook outputs → PNGs, captioned with the closest markdown heading above them. */
function charts(notebook, out) {
  const nb = JSON.parse(readFileSync(notebook, "utf8"));
  const dir = join(out, "charts");
  rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  const list = [];
  let caption = "";
  for (const cell of nb.cells) {
    const src = [].concat(cell.source).join("");
    if (cell.cell_type === "markdown") caption = (src.match(/^#+\s*(.+)$/m)?.[1] ?? caption).trim();
    for (const o of cell.outputs ?? []) {
      const png = o.data?.["image/png"];
      if (!png || list.length >= 24) continue;
      const name = `${String(list.length + 1).padStart(2, "0")}.png`;
      writeFileSync(join(dir, name), Buffer.from([].concat(png).join(""), "base64"));
      list.push({ src: `charts/${name}`, caption });
    }
  }
  writeJson(join(dir, "index.json"), list);
}

export default async function site(films, out) {
  const web = join(SOURCES["film-data"].repo, "TWEB/solution/Website");
  const dest = join(out, "site");
  rmSync(dest, { recursive: true, force: true });
  cpSync(join(web, "public"), ensureDir(dest), { recursive: true });
  for (const v of ["index.html", "film-detail-v2.html"]) copyFileSync(join(web, "views", v), join(dest, v));
  copyFileSync(join(web, "views/search.html"), join(dest, "search.hbs"));
  for (const f of walk(dest)) if (/\.(html|hbs|js)$/.test(f)) writeFileSync(f, rewrite(readFileSync(f, "utf8")));
  copyFileSync(join(HERE, "shim.js"), join(dest, "shim.js"));
  copyFileSync(join(HERE, "search.html"), join(dest, "search.html"));
  charts(join(SOURCES["film-data"].repo, "IUM/JupiterNotebooks/CinemaInsights_StoryDrivenAnalysis.ipynb"), out);
}
```

Nota: `search.hbs` è il template del server ed è servito come testo a `search.html`; la regola `<head>` inserisce lo shim anche lì, innocuo perché `document.write` sostituisce la pagina e lo shim è già caricato.

- [ ] **Step 6: Lancia e verifica**

Run: `npm run labs -- film && node scripts/check-labs.mjs`
Expected: `ok — film-data: original frontend rewired to static files`

- [ ] **Step 7: Commit**

```bash
git add scripts/labs/film public/labs/film-data scripts/check-labs.mjs
git commit -m "Laboratori: frontend originale di Film Data su API statica"
```

---

### Task 7: Esploratore — esportazione sorgenti e documenti

**Files:**
- Create: `scripts/labs/code.mjs`
- Output: `public/labs/<id>/code/**`, `public/labs/<id>/code/index.json`, `public/labs/<id>/docs/**`, `public/labs/<id>/docs.json`

**Interfaces:**
- Consumes: `SOURCES`, `TMP` (progetto catering estratto dal Task 3), `outDir`, `ensureDir`, `writeJson`, `ROOT`.
- Produces: `code/index.json`: `{ path: string, lang: string, size: number }[]` ordinato per percorso; `docs.json`: `{ title: string, src: string, kind: 'pdf' | 'text' | 'image' }[]`; `excluded(path): boolean`; `findSecret(text): string | null`.

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs`:

```js
  const { excluded, findSecret } = await import("./labs/code.mjs");
  for (const p of [".env", "config/.env.local", "serviceAccountKey.json", "node_modules/x.js", "target/a.class", "keys/id.pem", "database/catering.db"])
    assert.ok(excluded(p), `${p} would be published`);
  assert.ok(!excluded("ex1/src/sort.c"));
  assert.ok(findSecret('const password = "hunter2";'));
  assert.ok(findSecret("mongodb+srv://u:p@cluster0.example.net"));
  assert.equal(findSecret("password: req.body.password"), null);
  for (const id of ["lab-asd", "catering", "film-data", "food-delivery-db"]) {
    const index = JSON.parse(readFileSync(labs(`${id}/code/index.json`), "utf8"));
    assert.ok(index.length > 0, `${id}: no code exported`);
    for (const f of index) assert.ok(!excluded(f.path), `${id}: ${f.path} should not be public`);
    const docs = JSON.parse(readFileSync(labs(`${id}/docs.json`), "utf8"));
    for (const d of docs) assert.ok(existsSync(labs(`${id}/${d.src}`)), `${id}: missing doc ${d.src}`);
  }
  console.log("ok — code explorer: sources exported, nothing secret");
```

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `Cannot find module '.../scripts/labs/code.mjs'`

- [ ] **Step 3: Implementa** — `scripts/labs/code.mjs`

```js
import { execFileSync } from "node:child_process";
import { copyFileSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { ensureDir, outDir, ROOT, TMP, writeJson } from "./util.mjs";
import { SOURCES } from "./sources.mjs";

const EXCLUDE = [
  /(^|\/)\.env/, /secret/i, /serviceAccountKey/i, /\.DS_Store$/,
  /(^|\/)(node_modules|target|\.idea|\.venv|bin|\.git|__pycache__)\//,
  /\.(key|pem|p12|db|sqlite|class|jar|o|exe|wasm|pt|pth|zip|png|jpe?g|gif|ico|pdf|mp4|ipynb)$/i,
];
export const excluded = (p) => EXCLUDE.some((re) => re.test(p));

const SECRETS = [/password\s*[=:]\s*["'][^"']+["']/i, /mongodb\+srv:\/\//, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
export const findSecret = (text) => SECRETS.find((re) => re.test(text))?.source ?? null;

const LANG = { ".c": "c", ".h": "c", ".java": "java", ".js": "javascript", ".mjs": "javascript", ".json": "json", ".sql": "sql", ".html": "xml", ".hbs": "xml", ".xml": "xml", ".css": "css", ".md": "markdown", ".py": "python", ".yml": "yaml", ".yaml": "yaml" };

/** What each lab shows in "Codice" and "Documenti". Paths in `docs` are relative to `root`. */
const PLAN = {
  "lab-asd": { root: SOURCES["lab-asd"].repo, files: "git", docs: ["Relazione es1.pdf", "Relazione es2.pdf", "Relazione es3.pdf", "Relazione es4.pdf"] },
  catering: { root: join(TMP, "catering/progetto"), files: "walk", docs: [] },
  "film-data": {
    root: SOURCES["film-data"].repo, files: "git",
    only: /^(TWEB\/solution\/|IUM\/Pulizia CSV\/(README\.md|requirements\.txt)$|README\.md$|Report\/[^/]+\.md$)/,
    docs: ["Report/IUM-TWEB Report.md", "QueryScreenshot/mainPage.jpeg", "QueryScreenshot/filmDetailPage.jpeg", "QueryScreenshot/searchPage.jpeg", "QueryScreenshot/mainPageQueryLog.png"],
  },
  "food-delivery-db": { root: join(ROOT, "scripts/labs/delivery"), files: "walk", docs: [], extraPdf: { src: SOURCES["food-delivery-db"].pdf, name: "progetto-bd.pdf", title: "Progetto di Basi di Dati (requisiti e schema E-R)" } },
};

const walk = (d, pre = "") => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n), `${pre}${n}/`) : [`${pre}${n}`]));
const list = (root, how) => (how === "git" ? execFileSync("git", ["-C", root, "ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean) : walk(root));
const kindOf = (p) => (/\.pdf$/i.test(p) ? "pdf" : /\.(png|jpe?g)$/i.test(p) ? "image" : "text");

export default async function code() {
  for (const [id, plan] of Object.entries(PLAN)) {
    const out = outDir(id);
    rmSync(join(out, "code"), { recursive: true, force: true });
    rmSync(join(out, "docs"), { recursive: true, force: true });
    const index = [];
    for (const path of list(plan.root, plan.files)) {
      if (excluded(path) || (plan.only && !plan.only.test(path))) continue;
      const abs = join(plan.root, path);
      const size = statSync(abs).size;
      if (size > 300 * 1024) continue;
      const text = readFileSync(abs, "utf8");
      if (text.includes("\u0000")) continue; // binary that slipped past the extension list
      const hit = findSecret(text);
      if (hit) throw new Error(`${id}: possibile segreto in ${path} (${hit}). Va tolto dal progetto d'origine prima di pubblicarlo.`);
      const dest = join(out, "code", path);
      ensureDir(dirname(dest));
      writeFileSync(dest, text);
      index.push({ path, lang: LANG[extname(path).toLowerCase()] ?? "plaintext", size });
    }
    index.sort((a, b) => a.path.localeCompare(b.path));
    writeJson(join(out, "code/index.json"), index);

    const docs = [];
    const docDir = ensureDir(join(out, "docs"));
    for (const d of plan.docs) {
      const name = d.split("/").pop();
      copyFileSync(join(plan.root, d), join(docDir, name));
      docs.push({ title: name.replace(/\.[^.]+$/, ""), src: `docs/${name}`, kind: kindOf(name) });
    }
    if (plan.extraPdf) {
      copyFileSync(plan.extraPdf.src, join(docDir, plan.extraPdf.name));
      docs.push({ title: plan.extraPdf.title, src: `docs/${plan.extraPdf.name}`, kind: "pdf" });
    }
    writeJson(join(out, "docs.json"), docs);
    console.log(`  ${id}: ${index.length} file, ${docs.length} documenti`);
  }
}
```

- [ ] **Step 4: Lancia e verifica**

Run: `npm run labs -- catering code && node scripts/check-labs.mjs`
Expected: `ok — code explorer: sources exported, nothing secret`. Se il build si ferma su un segreto vero, **fermati e dillo all'utente**: va tolto dal repo d'origine, non aggirato qui (né allargando le esclusioni senza il suo consenso).

- [ ] **Step 5: Commit**

```bash
git add scripts/labs/code.mjs public/labs scripts/check-labs.mjs
git commit -m "Laboratori: sorgenti e documenti esportati, con scansione dei segreti"
```

---

### Task 8: La pagina — route, indice, schede, Codice e Documenti

**Files:**
- Create: `src/Root.tsx`, `src/labs/LabsPage.tsx`, `src/labs/CodeTab.tsx`, `src/labs/DocsTab.tsx`, `src/labs/labs.css`, segnaposto `src/labs/asd/AsdLab.tsx`, `src/labs/sql/SqlLab.tsx`, `src/labs/film/FilmLab.tsx`
- Modify: `src/main.tsx`, `src/data/projects.ts`

**Interfaces:**
- Consumes: `parseLabsHash`, `labsHash`, `LabsRoute`, `LabsTab`, `labsUrl`, `projects`, `Project.lab`.
- Produces: `LabsPage({ route: LabsRoute })` default export; `CodeTab({ id, file? })`; `DocsTab({ id })`; i componenti demo hanno props `{ id: string }` e sono default export dei file sopra.

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs`:

```js
  const { renderToString } = await import("react-dom/server");
  const { createElement: h } = await import("react");
  const { default: LabsPage } = await vite.ssrLoadModule("/src/labs/LabsPage.tsx");
  const { projects } = await vite.ssrLoadModule("/src/data/projects.ts");
  const indexHtml = renderToString(h(LabsPage, { route: { page: "labs", tab: "prova" } }));
  for (const p of projects) assert.ok(indexHtml.includes(p.title), `the index is missing ${p.title}`);
  const shell = renderToString(h(LabsPage, { route: { page: "labs", id: "lab-asd", tab: "codice" } }));
  for (const t of ["Prova", "Codice", "Documenti"]) assert.ok(shell.includes(t), `tab ${t} missing`);
  assert.ok(renderToString(h(LabsPage, { route: { page: "labs", id: "nope", tab: "prova" } })).includes("non esiste"));
  assert.deepEqual(
    projects.filter((p) => p.lab).map((p) => [p.id, p.lab]).sort(),
    [["catering", "sql"], ["film-data", "site"], ["food-delivery-db", "sql"], ["lab-asd", "asd"]],
  );
  console.log("ok — labs page renders index, shell and unknown id");
```

Vite in SSR ignora gli import `.css`, quindi `import "./labs.css"` in `LabsPage` non dà problemi al test.

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `Failed to load url /src/labs/LabsPage.tsx`

- [ ] **Step 3: `lab` nei progetti** — in `src/data/projects.ts` aggiungi `lab: 'sql'` a `food-delivery-db` e `catering`, `lab: 'asd'` a `lab-asd`, `lab: 'site'` a `film-data`.

- [ ] **Step 4: Root e main** — `src/Root.tsx`

```tsx
import { lazy, Suspense, useEffect, useState } from "react";
import App from "./App";
import QrPage from "./components/QrPage";
import { parseLabsHash } from "./labs/route";

const LabsPage = lazy(() => import("./labs/LabsPage"));

/** #/qr → printing helper, #/progetti… → the labs, anything else → the room. */
export default function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  if (hash.replace(/^#\/?/, "") === "qr") return <QrPage />;
  const labs = parseLabsHash(hash);
  if (labs)
    return (
      <Suspense fallback={<p className="labs-loading">apro il laboratorio…</p>}>
        <LabsPage route={labs} />
      </Suspense>
    );
  return <App />;
}
```

`src/main.tsx` (sostituisce il contenuto):

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Root from "./Root";
import "./styles/global.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<StrictMode><Root /></StrictMode>);
```

Nota: cambiare scheda dentro i laboratori cambia l'hash e chiama `scrollTo(0, 0)`; se dà fastidio passando tra file in Codice, limita lo scroll ai cambi di `id`.

- [ ] **Step 5: Pagina** — `src/labs/LabsPage.tsx`

```tsx
import { lazy, Suspense, type ComponentType } from "react";
import { projects } from "../data/projects";
import type { Project } from "../types";
import { labsHash, type LabsRoute, type LabsTab } from "./route";
import CodeTab from "./CodeTab";
import DocsTab from "./DocsTab";
import "./labs.css";

type Lab = NonNullable<Project["lab"]>;
const DEMOS: Record<Lab, ComponentType<{ id: string }>> = {
  asd: lazy(() => import("./asd/AsdLab")),
  sql: lazy(() => import("./sql/SqlLab")),
  site: lazy(() => import("./film/FilmLab")),
};
const TRY: Record<Lab, string> = { asd: "esegui il codice C originale", sql: "interroga il database", site: "naviga il sito originale" };
const TABS: [LabsTab, string][] = [["prova", "Prova"], ["codice", "Codice"], ["documenti", "Documenti"]];

export default function LabsPage({ route }: { route: LabsRoute }) {
  const project = route.id ? projects.find((p) => p.id === route.id) : undefined;
  return (
    <main className="labs">
      <nav className="labs-bar">
        <a href={route.id ? labsHash() : "#/"} className="chip">← {route.id ? "tutti i progetti" : "torna alla stanza"}</a>
      </nav>
      {!route.id && <Index />}
      {route.id && !project && <p className="empty">Questo progetto non esiste. <a href={labsHash()}>Torna all'elenco</a>.</p>}
      {project && <Shell project={project} route={route} />}
    </main>
  );
}

function Index() {
  return (
    <>
      <h1 className="labs-title">Laboratori</h1>
      <p className="labs-lead">I progetti degli esami, quelli veri: si usano, non si leggono.</p>
      <div className="card-list">
        {projects.map((p) => (
          <a key={p.id} className="card" href={labsHash(p.id)}>
            <div className="card__top"><span className="card__name">{p.title}</span></div>
            <div className="card__meta">{p.year}{p.course ? ` · ${p.course}` : ""}</div>
            <p className="card__summary">{p.summary}</p>
            {p.lab && <span className="tag tag--accent">{TRY[p.lab]} →</span>}
          </a>
        ))}
      </div>
    </>
  );
}

function Shell({ project, route }: { project: Project; route: LabsRoute }) {
  const tabs = project.lab ? TABS : TABS.filter(([t]) => t !== "prova");
  const tab: LabsTab = project.lab || route.tab !== "prova" ? route.tab : "codice";
  const Demo = project.lab ? DEMOS[project.lab] : null;
  return (
    <>
      <span className="eyebrow">{project.year}{project.course ? ` · ${project.course}` : ""}</span>
      <h1 className="labs-title">{project.title}</h1>
      <p className="labs-lead">{project.description}</p>
      <div className="labs-tabs" role="tablist">
        {tabs.map(([t, label]) => (
          <a key={t} role="tab" aria-selected={t === tab} className={`chip${t === tab ? " chip--on" : ""}`} href={labsHash(project.id, t)}>{label}</a>
        ))}
      </div>
      <section className="labs-panel">
        {tab === "prova" && Demo && <Suspense fallback={<p className="labs-loading">carico la demo…</p>}><Demo id={project.id} /></Suspense>}
        {tab === "codice" && <CodeTab id={project.id} file={route.file} />}
        {tab === "documenti" && <DocsTab id={project.id} />}
      </section>
    </>
  );
}
```

- [ ] **Step 6: Codice** — `src/labs/CodeTab.tsx`

```tsx
import { useEffect, useState } from "react";
import hljs from "highlight.js/lib/core";
import c from "highlight.js/lib/languages/c";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import yaml from "highlight.js/lib/languages/yaml";
import plaintext from "highlight.js/lib/languages/plaintext";
import { labsHash } from "./route";
import { labsUrl } from "./paths";

Object.entries({ c, java, javascript, json, sql, xml, css, markdown, python, yaml, plaintext }).forEach(([n, l]) => hljs.registerLanguage(n, l));

type Entry = { path: string; lang: string; size: number };

export default function CodeTab({ id, file }: { id: string; file?: string }) {
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(labsUrl(id, "code/index.json")).then((r) => r.json()).then(setIndex).catch(() => setError("Non riesco a leggere l'elenco dei file."));
  }, [id]);
  const current = index?.find((e) => e.path === file) ?? index?.find((e) => /(^|\/)readme\.md$/i.test(e.path)) ?? index?.[0];
  useEffect(() => {
    if (!current) return;
    setHtml("");
    fetch(labsUrl(id, "code", ...current.path.split("/").map(encodeURIComponent)))
      .then((r) => r.text())
      .then((t) => setHtml(hljs.highlight(t, { language: current.lang }).value)) // highlight() escapes the source
      .catch(() => setError(`Non riesco ad aprire ${current.path}.`));
  }, [id, current]);
  if (error) return <p className="empty">{error}</p>;
  if (!index) return <p className="labs-loading">leggo i sorgenti…</p>;
  return (
    <div className="code">
      <ul className="code-tree">
        {index.map((e) => (
          <li key={e.path} title={e.path} style={{ paddingLeft: `${(e.path.split("/").length - 1) * 10}px` }}>
            <a href={labsHash(id, "codice", e.path)} aria-current={e === current ? "page" : undefined}>{e.path.split("/").pop()}</a>
          </li>
        ))}
      </ul>
      <figure className="code-view">
        <figcaption>{current?.path}</figcaption>
        <pre><code className="hljs" dangerouslySetInnerHTML={{ __html: html }} /></pre>
      </figure>
    </div>
  );
}
```

- [ ] **Step 7: Documenti** — `src/labs/DocsTab.tsx`

```tsx
import { useEffect, useState } from "react";
import { labsUrl } from "./paths";

type Doc = { title: string; src: string; kind: "pdf" | "text" | "image" };
const docUrl = (id: string, d: Doc) => labsUrl(id, ...d.src.split("/").map(encodeURIComponent));

export default function DocsTab({ id }: { id: string }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [open, setOpen] = useState(0);
  const [text, setText] = useState("");
  useEffect(() => { fetch(labsUrl(id, "docs.json")).then((r) => r.json()).then(setDocs).catch(() => setDocs([])); }, [id]);
  const doc = docs?.[open];
  useEffect(() => {
    if (doc?.kind === "text") fetch(docUrl(id, doc)).then((r) => r.text()).then(setText).catch(() => setText("Documento non disponibile."));
  }, [id, doc]);
  if (!docs) return <p className="labs-loading">cerco i documenti…</p>;
  if (!docs.length) return <p className="empty">Per questo progetto non ci sono documenti oltre al codice.</p>;
  return (
    <div className="docs">
      <div className="tags">
        {docs.map((d, i) => <button key={d.src} className={`chip${i === open ? " chip--on" : ""}`} onClick={() => setOpen(i)}>{d.title}</button>)}
      </div>
      {doc?.kind === "pdf" && (
        <>
          <iframe className="docs-pdf" src={docUrl(id, doc)} title={doc.title} />
          {/* iOS shows only the first page of a PDF in an iframe */}
          <a className="link-btn" href={docUrl(id, doc)} target="_blank" rel="noreferrer noopener">APRI IL PDF ↗</a>
        </>
      )}
      {doc?.kind === "image" && <img className="docs-img" src={docUrl(id, doc)} alt={doc.title} />}
      {doc?.kind === "text" && <pre className="docs-text">{text}</pre>}
    </div>
  );
}
```

- [ ] **Step 8: Stili** — `src/labs/labs.css`. Prima leggi `:root` in `src/styles/global.css`: usa `--gold`, `--jade` e i token di testo/sfondo con i loro nomi esatti al posto dei colori fissi qui sotto dove esiste un equivalente; controlla se `.chip--on` esiste già (se sì, togli la regola).

```css
.labs { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; min-height: 100dvh; box-sizing: border-box; }
.labs-bar { margin-bottom: 24px; }
.labs-title { font-family: "Newsreader", serif; font-size: clamp(28px, 6vw, 44px); margin: 8px 0; }
.labs-lead { max-width: 65ch; opacity: .85; }
.labs-tabs { display: flex; gap: 8px; margin: 24px 0 16px; flex-wrap: wrap; }
.labs-panel { min-width: 0; }
.labs-loading { opacity: .7; font-family: "JetBrains Mono", monospace; }
.chip--on { border-color: var(--gold); color: var(--gold); }
.demo-badge { display: inline-block; font: 11px "JetBrains Mono", monospace; letter-spacing: .08em; text-transform: uppercase; border: 1px dashed currentColor; padding: 2px 8px; border-radius: 99px; opacity: .8; }

.code { display: grid; grid-template-columns: minmax(180px, 260px) minmax(0, 1fr); gap: 16px; }
.code-tree { list-style: none; margin: 0; padding: 0; max-height: 70vh; overflow: auto; font: 13px/1.7 "JetBrains Mono", monospace; }
.code-tree a[aria-current] { color: var(--gold); }
.code-view { margin: 0; min-width: 0; }
.code-view figcaption { font: 12px "JetBrains Mono", monospace; opacity: .7; margin-bottom: 8px; overflow-wrap: anywhere; }
.code-view pre { margin: 0; max-height: 70vh; overflow: auto; padding: 16px; border-radius: 8px; background: rgba(0,0,0,.35); font: 13px/1.55 "JetBrains Mono", monospace; }
.hljs-keyword, .hljs-built_in, .hljs-type { color: var(--gold); }
.hljs-string, .hljs-attr { color: var(--jade); }
.hljs-comment { opacity: .55; font-style: italic; }
.hljs-number, .hljs-literal { color: #e7a07a; }
.hljs-title, .hljs-function { color: #9fc4ff; }

.docs-pdf { width: 100%; height: 75vh; border: 0; border-radius: 8px; background: #fff; margin: 16px 0 8px; }
.docs-img { max-width: 100%; border-radius: 8px; margin-top: 16px; }
.docs-text { white-space: pre-wrap; max-height: 75vh; overflow: auto; padding: 16px; background: rgba(0,0,0,.35); border-radius: 8px; }

@media (max-width: 700px) {
  .code { grid-template-columns: 1fr; }
  .code-tree { max-height: 30vh; }
}
```

- [ ] **Step 9: Segnaposto delle demo** — finché i Task 9–11 non arrivano, `src/labs/asd/AsdLab.tsx`, `src/labs/sql/SqlLab.tsx`, `src/labs/film/FilmLab.tsx` contengono ciascuno:

```tsx
export default function Demo({ id }: { id: string }) {
  return <p className="labs-loading">demo di {id} in arrivo</p>;
}
```

- [ ] **Step 10: Verifica**

Run: `npm test && npm run typecheck`
Expected: tutti gli `ok`, incluso `ok — labs page renders index, shell and unknown id`.
Poi `npm run dev` → `http://localhost:5173/#/progetti/lab-asd/codice`: albero a sinistra, `README.md` evidenziato; clic su `sort.c` aggiorna URL e file; "Documenti" mostra le 4 relazioni. "← torna alla stanza" riporta alla stanza. A 375 px nessuno scroll orizzontale.

- [ ] **Step 11: Commit**

```bash
git add src/Root.tsx src/main.tsx src/labs src/data/projects.ts scripts/check-labs.mjs
git commit -m "Laboratori: pagina /#/progetti con codice e documenti"
```

---

### Task 9: Prova — ASD nel Worker

**Files:**
- Create: `src/labs/asd/worker.ts`, `src/labs/asd/runner.ts`
- Modify: `src/labs/asd/AsdLab.tsx`, `src/labs/labs.css`

**Interfaces:**
- Consumes: `labsUrl`, `makeRecords`, artefatti del Task 2.
- Produces: `runProgram(opts: { url: string; args: string[]; files: Record<string, Uint8Array | string>; readBack?: string; onLine: (l: string) => void }) → { done: Promise<RunResult>; stop(): void }` con `RunResult = { code: number | null; output?: string; ms: number }` (`code: null` = fermato). Messaggi worker → pagina: `{ type: 'line', line }`, `{ type: 'exit', code, output?, ms }`.

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs` (il `Worker` vero non c'è in Node: si sostituisce con uno finto e si verifica il contratto del runner):

```js
  /* the runner: one fresh worker per run, stop() kills it and keeps the partial output */
  const { runProgram } = await vite.ssrLoadModule("/src/labs/asd/runner.ts");
  const posted = [];
  let terminated = false;
  globalThis.Worker = class {
    constructor() { setTimeout(() => this.onmessage?.({ data: { type: "line", line: "prima riga" } }), 0); }
    postMessage(m) { posted.push(m); }
    terminate() { terminated = true; }
  };
  const got = [];
  const run = runProgram({ url: "x/main.mjs", args: ["a"], files: { "/f": "z" }, onLine: (l) => got.push(l) });
  await new Promise((r) => setTimeout(r, 5));
  run.stop();
  const res = await run.done;
  assert.equal(res.code, null);
  assert.ok(terminated, "stop() leaves the worker running");
  assert.deepEqual(got, ["prima riga"], "partial output is lost on stop");
  assert.equal(posted[0].url, "x/main.mjs");
  delete globalThis.Worker;
  console.log("ok — asd runner: stop keeps partial output");
```

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `Failed to load url /src/labs/asd/runner.ts`

- [ ] **Step 3: Worker** — `src/labs/asd/worker.ts`

```ts
/// <reference lib="webworker" />
type Msg = { url: string; args: string[]; files: Record<string, Uint8Array | string>; readBack?: string };
type EmModule = { callMain(args: string[]): number | undefined; FS: { writeFile(p: string, d: Uint8Array | string): void; readFile(p: string, o: { encoding: "utf8" }): string } };

const post = (m: unknown) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = async (e: MessageEvent<Msg>) => {
  const { url, args, files, readBack } = e.data;
  const t0 = performance.now();
  try {
    const factory = (await import(/* @vite-ignore */ url)).default as (o: object) => Promise<EmModule>;
    const mod = await factory({ print: (line: string) => post({ type: "line", line }), printErr: (line: string) => post({ type: "line", line }) });
    for (const [p, data] of Object.entries(files)) mod.FS.writeFile(p, data);
    let code = 0;
    try {
      code = mod.callMain(args) ?? 0;
    } catch (err) {
      if ((err as { name?: string }).name !== "ExitStatus") throw err;
      code = (err as { status: number }).status;
    }
    let output: string | undefined;
    if (readBack) {
      try { output = mod.FS.readFile(readBack, { encoding: "utf8" }).split("\n").slice(0, 300).join("\n"); } catch { output = undefined; }
    }
    post({ type: "exit", code, output, ms: Math.round(performance.now() - t0) });
  } catch (err) {
    post({ type: "line", line: `errore: ${(err as Error).message}` });
    post({ type: "exit", code: -1, ms: Math.round(performance.now() - t0) });
  }
};
```

- [ ] **Step 4: Runner** — `src/labs/asd/runner.ts`

```ts
export type RunResult = { code: number | null; output?: string; ms: number };

/** One fresh worker per run: an emscripten instance can't run main twice, and terminate() is the only real "stop". */
export function runProgram(opts: {
  url: string;
  args: string[];
  files: Record<string, Uint8Array | string>;
  readBack?: string;
  onLine: (l: string) => void;
}) {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const t0 = Date.now();
  let settled = false;
  let finish!: (r: RunResult) => void;
  const done = new Promise<RunResult>((resolve) => (finish = (r) => { if (!settled) { settled = true; resolve(r); } }));
  worker.onmessage = (e: MessageEvent) => {
    if (e.data.type === "line") opts.onLine(e.data.line);
    if (e.data.type === "exit") { worker.terminate(); finish({ code: e.data.code, output: e.data.output, ms: e.data.ms }); }
  };
  worker.postMessage({ url: opts.url, args: opts.args, files: opts.files, readBack: opts.readBack });
  return { done, stop() { worker.terminate(); finish({ code: null, ms: Date.now() - t0 }); } };
}
```

- [ ] **Step 5: UI** — `src/labs/asd/AsdLab.tsx`

```tsx
import { useRef, useState } from "react";
import { labsUrl } from "../paths";
import { makeRecords } from "./records";
import { runProgram } from "./runner";

const gunzip = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${res.status}`);
  return new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
};
const decode = (u: Uint8Array) => new TextDecoder().decode(u);

type Ex = "ex1" | "ex2" | "ex3" | "ex4";
const TITLES: Record<Ex, string> = { ex1: "Merge Sort e Quick Sort", ex2: "Edit distance", ex3: "Tabella hash", ex4: "Grafo e BFS" };

export default function AsdLab({ id }: { id: string }) {
  const [ex, setEx] = useState<Ex>("ex1");
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<string>();
  const [running, setRunning] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const [n, setN] = useState(100000);
  const [field, setField] = useState("1");
  const [algo, setAlgo] = useState("1");
  const [input, setInput] = useState("");
  const [minLen, setMinLen] = useState(6);
  const [start, setStart] = useState("torino");

  const pick = (k: Ex) => { setEx(k); setLines([]); setStatus(""); setResult(undefined); };

  async function go(kind: "main" | "test") {
    setLines([]); setResult(undefined); setRunning(true);
    const data = (f: string) => labsUrl(id, "data", f);
    let args: string[] = [];
    let files: Record<string, Uint8Array | string> = {};
    let readBack: string | undefined;
    if (kind === "main") {
      setStatus("preparo i dati…");
      try {
        if (ex === "ex1") {
          files = { "/records.csv": makeRecords(decode(await gunzip(data("words.txt.gz"))).split("\n"), n) };
          args = ["/records.csv", "/sorted.csv", field, algo];
          readBack = "/sorted.csv";
        } else if (ex === "ex2") {
          const fallback = await (await fetch(data("correctme.txt"))).text();
          // the dynamic version is fast, but 660k words per typo still adds up: keep the text short
          const text = (input.trim() || fallback).split(/\s+/).slice(0, 20).join(" ");
          files = { "/dictionary.txt": await gunzip(data("dictionary.txt.gz")), "/correctme.txt": text };
          args = ["/dictionary.txt", "/correctme.txt"];
        } else if (ex === "ex3") {
          files = { "/commedia.txt": await gunzip(data("commedia.txt.gz")) };
          args = ["/commedia.txt", String(minLen)];
        } else {
          files = { "/graph.csv": await gunzip(data("graph.csv.gz")) };
          args = ["/graph.csv", start.trim().toLowerCase(), "/bfs.txt"];
          readBack = "/bfs.txt";
        }
      } catch {
        setRunning(false);
        setStatus("non riesco a scaricare i dati: controlla la connessione");
        return;
      }
    }
    setStatus(kind === "test" ? "eseguo gli unit test…" : "eseguo il programma…");
    const run = runProgram({
      url: labsUrl(id, ex, `${kind}.mjs`), args, files, readBack,
      onLine: (l) => setLines((p) => (p.length >= 2000 ? p : [...p, l])),
    });
    stopRef.current = run.stop;
    const r = await run.done;
    setRunning(false);
    setResult(r.output);
    setStatus(r.code === null ? `fermato dopo ${r.ms} ms` : `terminato con codice ${r.code} in ${r.ms} ms`);
  }

  return (
    <div className="asd">
      <div className="tags">
        {(Object.keys(TITLES) as Ex[]).map((k) => (
          <button key={k} className={`chip${k === ex ? " chip--on" : ""}`} disabled={running} onClick={() => pick(k)}>{TITLES[k]}</button>
        ))}
      </div>
      <form className="asd-form" onSubmit={(e) => { e.preventDefault(); go("main"); }}>
        {ex === "ex1" && (
          <>
            <label>Record<select value={n} onChange={(e) => setN(Number(e.target.value))}>{[1000, 100000, 1000000].map((v) => <option key={v} value={v}>{v.toLocaleString("it-IT")}</option>)}</select></label>
            <label>Campo<select value={field} onChange={(e) => setField(e.target.value)}><option value="1">1 · parola</option><option value="2">2 · intero</option><option value="3">3 · decimale</option></select></label>
            <label>Algoritmo<select value={algo} onChange={(e) => setAlgo(e.target.value)}><option value="1">Merge Sort</option><option value="2">Quick Sort</option></select></label>
          </>
        )}
        {ex === "ex2" && (
          <label className="asd-wide">Testo da correggere (vuoto = <code>correctme.txt</code> del corso, max 20 parole)
            <textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Quando avevo cinqve anni…" />
          </label>
        )}
        {ex === "ex3" && <label>Lunghezza minima<input type="number" min={1} max={20} value={minLen} onChange={(e) => setMinLen(Number(e.target.value))} /></label>}
        {ex === "ex4" && <label>Città di partenza<input value={start} onChange={(e) => setStart(e.target.value)} /></label>}
        <div className="links">
          <button className="link-btn" type="submit" disabled={running}>ESEGUI main_{ex} ▸</button>
          <button className="link-btn" type="button" disabled={running} onClick={() => go("test")}>UNIT TEST ✓</button>
          {running && <button className="link-btn" type="button" onClick={() => stopRef.current()}>FERMA ■</button>}
        </div>
      </form>
      {ex === "ex1" && <p className="demo-badge">record generati nel browser, stesso formato di records.csv</p>}
      <pre className="asd-term" aria-live="polite">{lines.join("\n")}{status && `\n— ${status}`}</pre>
      {result && (<><h4>Prime righe del file prodotto</h4><pre className="asd-term">{result}</pre></>)}
    </div>
  );
}
```

In `labs.css`:

```css
.asd-form { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: end; margin: 16px 0; }
.asd-form label { display: grid; gap: 4px; font-size: 13px; }
.asd-wide { flex: 1 1 100%; }
.asd-form textarea, .asd-form input, .asd-form select { font: inherit; padding: 8px; border-radius: 6px; max-width: 100%; box-sizing: border-box; }
.asd-term { min-height: 160px; max-height: 50vh; overflow: auto; padding: 16px; background: #0b0b0b; color: #d6f5d6; border-radius: 8px; font: 13px/1.5 "JetBrains Mono", monospace; white-space: pre-wrap; word-break: break-word; }
```

- [ ] **Step 6: Verifica**

Run: `npm test && npm run typecheck`
Expected: `ok — asd runner: stop keeps partial output` e tutti gli altri.
Nel browser (`npm run dev` → `#/progetti/lab-asd`):
- Merge Sort, 100.000 record, campo 2 → i messaggi del tuo `main` ("Inizio lettura records…") e le prime righe ordinate.
- Edit distance con "cinqve anni" → righe `cinqve: …`; mentre gira la pagina scorre e "FERMA" ferma, con l'output parziale visibile.
- Unit test di ogni esercizio → `terminato con codice 0`. Lancia due volte di fila lo stesso esercizio: stesso output.
- Grafo da "torino" → righe nel file prodotto; una città inesistente → il tuo programma dice la sua, con il codice di uscita visibile.

- [ ] **Step 7: Commit**

```bash
git add src/labs/asd src/labs/labs.css scripts/check-labs.mjs
git commit -m "Laboratori: ASD si esegue nel browser, in un worker"
```

---

### Task 10: Prova — database (Cat & Ring e Food Delivery)

**Files:**
- Create: `src/labs/sql/db.ts`
- Modify: `src/labs/sql/SqlLab.tsx`, `src/labs/labs.css`

**Interfaces:**
- Consumes: `labsUrl`, `sql.js`, `catering.db`, `delivery.db`, `queries.json`, `tests.json`.
- Produces: `openDb(bytes: Uint8Array, SQL: SqlJsStatic) → LabDb`; `loadDb(url: string) → Promise<LabDb>`; `LabDb = { tables(): string[]; run(sql: string): { columns: string[]; rows: unknown[][] }[]; reset(): void }`.

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs`:

```js
  const { openDb } = await vite.ssrLoadModule("/src/labs/sql/db.ts");
  const ldb = openDb(readFileSync(labs("food-delivery-db/delivery.db")), SQL);
  const before = ldb.run("SELECT COUNT(*) FROM ordine")[0].rows[0][0];
  ldb.run("DELETE FROM ordine_portata; DELETE FROM ordine;");
  assert.equal(ldb.run("SELECT COUNT(*) FROM ordine")[0].rows[0][0], 0, "the visitor's DELETE did not apply");
  ldb.reset();
  assert.equal(ldb.run("SELECT COUNT(*) FROM ordine")[0].rows[0][0], before, "reset does not restore the data");
  assert.throws(() => ldb.run("SELEC 1"), /syntax error/);
  assert.ok(ldb.tables().includes("rider"));
  console.log("ok — sql lab: queries apply, reset restores, errors surface");
```

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `Failed to load url /src/labs/sql/db.ts`

- [ ] **Step 3: `db.ts`**

```ts
import type { Database, SqlJsStatic } from "sql.js";

export type LabDb = {
  tables(): string[];
  run(sql: string): { columns: string[]; rows: unknown[][] }[];
  reset(): void;
};

/** In-memory copy of the original bytes: the visitor may break it, reset() brings it back. */
export function openDb(bytes: Uint8Array, SQL: SqlJsStatic): LabDb {
  let db: Database = new SQL.Database(bytes);
  return {
    tables: () =>
      db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values.map((r) => String(r[0])) ?? [],
    run: (sql) => db.exec(sql).map((r) => ({ columns: r.columns, rows: r.values })),
    reset() {
      db.close();
      db = new SQL.Database(bytes);
    },
  };
}

export async function loadDb(url: string): Promise<LabDb> {
  const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([import("sql.js"), import("sql.js/dist/sql-wasm.wasm?url")]);
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return openDb(new Uint8Array(await res.arrayBuffer()), SQL);
}
```

Se TypeScript non riconosce `?url`, controlla che esista `src/vite-env.d.ts` con `/// <reference types="vite/client" />`; se manca, crealo.

- [ ] **Step 4: UI** — `src/labs/sql/SqlLab.tsx`

```tsx
import { useEffect, useState } from "react";
import { labsUrl } from "../paths";
import { loadDb, type LabDb } from "./db";

const DB_FILE: Record<string, string> = { catering: "catering.db", "food-delivery-db": "delivery.db" };
type Query = { title: string; sql: string };
type Junit = { total: number; failures: number; cases: { suite: string; name: string; time: number; ok: boolean; message?: string }[] };
type Result = ReturnType<LabDb["run"]>;

export default function SqlLab({ id }: { id: string }) {
  const [db, setDb] = useState<LabDb | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);
  const [junit, setJunit] = useState<Junit | null>(null);
  const [sql, setSql] = useState("");
  const [res, setRes] = useState<Result>([]);
  const [error, setError] = useState("");
  const [fail, setFail] = useState("");

  useEffect(() => {
    loadDb(labsUrl(id, DB_FILE[id])).then(setDb).catch(() => setFail("Il database non si è caricato. Codice e documenti restano nelle altre schede."));
    fetch(labsUrl(id, "queries.json")).then((r) => r.json()).then((q: Query[]) => { setQueries(q); setSql(q[0]?.sql ?? ""); }).catch(() => {});
    if (id === "catering") fetch(labsUrl(id, "tests.json")).then((r) => r.json()).then(setJunit).catch(() => {});
  }, [id]);

  const exec = (text: string) => {
    if (!db) return;
    setSql(text);
    try { setRes(db.run(text)); setError(""); } catch (e) { setRes([]); setError((e as Error).message); }
  };

  if (fail) return <p className="empty">{fail}</p>;
  if (!db) return <p className="labs-loading">apro il database…</p>;
  return (
    <div className="sql">
      {id === "food-delivery-db" && <p className="demo-badge">dati generati per la demo</p>}
      <h4>Tabelle</h4>
      <div className="tags">{db.tables().map((t) => <button key={t} className="chip" onClick={() => exec(`SELECT * FROM "${t}" LIMIT 50;`)}>{t}</button>)}</div>
      <h4>Domande</h4>
      <div className="tags">{queries.map((q) => <button key={q.title} className="chip" onClick={() => exec(q.sql)}>{q.title}</button>)}</div>
      <textarea className="sql-editor" rows={7} value={sql} onChange={(e) => setSql(e.target.value)} spellCheck={false} aria-label="Query SQL" />
      <div className="links">
        <button className="link-btn" onClick={() => exec(sql)}>ESEGUI ▸</button>
        <button className="link-btn" onClick={() => { db.reset(); setRes([]); setError(""); }}>RIPRISTINA ↺</button>
      </div>
      {error && <p className="sql-error">{error}</p>}
      {res.length === 0 && !error && sql && <p className="labs-loading">nessuna riga</p>}
      {res.map((r, i) => (
        <div className="sql-table" key={i}>
          <table>
            <thead><tr>{r.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{r.rows.slice(0, 200).map((row, j) => <tr key={j}>{row.map((v, k) => <td key={k}>{v === null ? "NULL" : String(v)}</td>)}</tr>)}</tbody>
          </table>
          {r.rows.length > 200 && <p className="labs-loading">mostro 200 righe su {r.rows.length}</p>}
        </div>
      ))}
      {junit && (
        <section className="sql-junit">
          <h4>JUnit · {junit.total - junit.failures}/{junit.total} verdi</h4>
          <ul>{junit.cases.map((c) => <li key={c.suite + c.name}>{c.ok ? "✓" : "✗"} {c.suite} · {c.name} <small>{c.time}s</small>{c.message && <em> — {c.message}</em>}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
```

In `labs.css`:

```css
.sql-editor { width: 100%; font: 13px/1.5 "JetBrains Mono", monospace; padding: 12px; border-radius: 8px; margin: 12px 0 8px; box-sizing: border-box; }
.sql-error { color: #ff8a8a; font-family: "JetBrains Mono", monospace; }
.sql-table { overflow: auto; max-height: 60vh; margin-top: 16px; }
.sql-table table { border-collapse: collapse; font: 12px "JetBrains Mono", monospace; }
.sql-table th, .sql-table td { padding: 4px 10px; border-bottom: 1px solid rgba(255,255,255,.1); text-align: left; white-space: nowrap; }
.sql-junit ul { list-style: none; padding: 0; font: 13px/1.7 "JetBrains Mono", monospace; }
```

- [ ] **Step 5: Verifica**

Run: `npm test && npm run typecheck`
Expected: `ok — sql lab: queries apply, reset restores, errors surface`.
Nel browser: `#/progetti/food-delivery-db` → "Chi merita il Top Partner" dà righe; `DELETE FROM recensione;` poi `UPDATE ristorante SET stelle = 0;` → la stessa domanda non dà più niente; "RIPRISTINA" → torna. `#/progetti/catering` → tabelle vere e report JUnit tutto verde. Una query sbagliata mostra l'errore di SQLite sotto l'editor.

- [ ] **Step 6: Commit**

```bash
git add src/labs/sql src/labs/labs.css scripts/check-labs.mjs src/vite-env.d.ts
git commit -m "Laboratori: database interrogabili nel browser con sql.js"
```

---

### Task 11: Prova — Film Data nell'iframe

**Files:**
- Modify: `src/labs/film/FilmLab.tsx`, `src/labs/labs.css`

**Interfaces:**
- Consumes: `labsUrl`, `public/labs/film-data/site/index.html`, `charts/index.json`.

- [ ] **Step 1: Implementa** — `src/labs/film/FilmLab.tsx`

```tsx
import { useEffect, useState } from "react";
import { labsUrl } from "../paths";

type Chart = { src: string; caption: string };

export default function FilmLab({ id }: { id: string }) {
  const [charts, setCharts] = useState<Chart[]>([]);
  useEffect(() => { fetch(labsUrl(id, "charts/index.json")).then((r) => r.json()).then(setCharts).catch(() => {}); }, [id]);
  const site = labsUrl(id, "site/index.html");
  return (
    <div className="film">
      <p className="demo-badge">film veri da Wikidata · recensioni e chat generate per la demo</p>
      <div className="film-frame"><iframe src={site} title="Film Data Web App, il frontend originale" loading="lazy" /></div>
      <a className="link-btn" href={site} target="_blank" rel="noreferrer noopener">APRI A SCHERMO INTERO ↗</a>
      {charts.length > 0 && (
        <>
          <h4>Dal notebook di analisi (IUM)</h4>
          <div className="film-charts">
            {charts.map((c) => (
              <figure key={c.src}>
                <img src={labsUrl(id, c.src)} alt={c.caption || "grafico del notebook"} loading="lazy" />
                <figcaption>{c.caption}</figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

In `labs.css`:

```css
.film-frame { width: 100%; height: min(80vh, 900px); border-radius: 8px; overflow: hidden; margin: 12px 0; background: #000; }
.film-frame iframe { width: 100%; height: 100%; border: 0; }
.film-charts { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: 16px; }
.film-charts figure { margin: 0; }
.film-charts img { width: 100%; border-radius: 6px; background: #fff; }
.film-charts figcaption { font-size: 12px; opacity: .75; margin-top: 4px; }
```

- [ ] **Step 2: Verifica nel browser** (`npm run dev` → `#/progetti/film-data`)

- La home originale carica: carosello, slider horror popolato, locandine (Commons o tipografiche).
- Clic su una locandina → `film-detail-v2.html?id=N`: titolo, anno, generi, descrizione, recensioni; un messaggio in chat compare insieme a quelli pre-caricati.
- Ricerca "god" → `search.html?q=god` con i risultati nel template originale; "ab" → il messaggio di errore originale.
- Console dell'iframe: nessuna richiesta a `localhost`. Se un errore viene da `import axios from 'axios'` in `index.js` (import nudo che fallisce anche nel progetto originale servito così), lascialo: è il comportamento del codice originale e il resto della pagina non ne dipende. Se invece una funzione visibile non va, annota la causa e chiedi all'utente prima di riscrivere altro.

- [ ] **Step 3: Commit**

```bash
git add src/labs/film src/labs/labs.css
git commit -m "Laboratori: Film Data navigabile nel suo frontend originale"
```

---

### Task 12: Collegamento dalla stanza, base `/bomboniera/`, verifica finale

**Files:**
- Modify: `src/sections/Projects.tsx`, `src/styles/global.css`, `scripts/check-labs.mjs`, `README.md`

- [ ] **Step 1: Test che fallisce** — in `check-labs.mjs`:

```js
  const { default: ProjectsSection } = await vite.ssrLoadModule("/src/sections/Projects.tsx");
  const list = renderToString(h(ProjectsSection, {}));
  for (const p of projects) assert.ok(list.includes(`#/progetti/${p.id}`), `the room does not lead to the ${p.id} lab`);
  console.log("ok — the room links every project to its lab");
```

- [ ] **Step 2: Verifica che fallisca**

Run: `node scripts/check-labs.mjs`
Expected: FAIL — `the room does not lead to the food-delivery-db lab`

- [ ] **Step 3: Link** — `src/sections/Projects.tsx`: `import { labsHash } from "../labs/route";`.

In `Detail`, sostituisci il blocco `{(project.github || project.demo) && (<div className="links">…</div>)}` con un `.links` sempre presente che apre con:

```tsx
<div className="links">
  <a className="link-btn" href={labsHash(project.id)}>APRI IL LABORATORIO <span aria-hidden="true">→</span></a>
  {project.github && (/* il link GITHUB esistente, invariato */)}
  {project.demo && (/* il link DEMO esistente, invariato */)}
</div>
```

Nella lista, la card è un `<button>`: un `<a>` non può stare dentro un `<button>`. Avvolgi ogni card:

```tsx
<div key={project.id} className="card-wrap">
  <button className="card" onClick={() => setOpenId(project.id)}>{/* contenuto della card invariato */}</button>
  <a className="card__lab" href={labsHash(project.id)}>apri il laboratorio →</a>
</div>
```

(sposta la `key` dal `<button>` al `<div>`). In `src/styles/global.css`, accanto alle regole `.card`:

```css
.card-wrap { display: grid; gap: 6px; }
.card__lab { font: 12px "JetBrains Mono", monospace; color: var(--gold); justify-self: end; }
```

- [ ] **Step 4: Verifica che passi**

Run: `npm test`
Expected: tutti gli `ok` di `check.mjs` e di `check-labs.mjs`.

- [ ] **Step 5: Build sotto `/bomboniera/`**

PowerShell:

```powershell
$env:VITE_BASE='/bomboniera/'; npm run build; npx vite preview --base /bomboniera/
```

Apri `http://localhost:4173/bomboniera/#/progetti` e ripeti un caso per ciascuno dei Task 8–11. Nella scheda Network tutte le richieste dei laboratori vanno a `/bomboniera/labs/...`, nessuna a `/labs/...`. `ls dist/labs` mostra le quattro cartelle. Poi `Remove-Item Env:VITE_BASE`.

- [ ] **Step 6: Larghezza telefono**

DevTools a 375×812: indice, schede, terminale ASD, tabella SQL, iframe Film. In console: `document.documentElement.scrollWidth === 375` → `true` su ogni scheda.

- [ ] **Step 7: README** — in §2 (Struttura), dentro il blocco `src/`:

```text
  labs/                  ← pagina /#/progetti: demo vive, codice, documenti
```

e sotto il blocco:

```text
scripts/labs/            ← `npm run labs`: costruisce public/labs (serve Docker)
scripts/check-labs.mjs   ← self-check dei laboratori, parte di `npm test`
```

In §3, dopo il Passo 3:

```markdown
**Passo 3-bis — laboratori:** `npm run labs` (con Docker Desktop acceso) ricostruisce
`public/labs/`: compila il C di ASD in WebAssembly, esegue i test JUnit di Cat & Ring,
genera il database del delivery e prende i film da Wikidata (in cache in
`scripts/labs/cache/`). Il risultato si committa: il deploy non ha bisogno di Docker.
I percorsi dei progetti sul disco stanno in `scripts/labs/sources.mjs`; per aggiungerne
uno, una voce lì e una in `projects.ts` con il campo `lab`.
```

- [ ] **Step 8: Commit**

```bash
git add src/sections/Projects.tsx src/styles/global.css scripts/check-labs.mjs README.md
git commit -m "Laboratori: la stanza porta ai laboratori; README"
```
