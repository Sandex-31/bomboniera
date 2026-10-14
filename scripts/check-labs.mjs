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

  // ── later tasks append their checks here, above this line ──
} finally {
  await vite.close();
}
