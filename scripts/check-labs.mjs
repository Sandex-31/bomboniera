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
