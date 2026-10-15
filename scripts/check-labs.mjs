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
  const real = allFilms.filter((f) => f.poster.endsWith(".jpg")).length;
  assert.ok(real >= allFilms.length * 0.95, `only ${real}/${allFilms.length} films have a real poster`);
  console.log(`ok — film-data: ${allFilms.length} films from Wikidata, each with poster and reviews (${real} real posters)`);

  /* the shim turns the original frontend's localhost calls into static files */
  const shimSrc = readFileSync(labs("film-data/site/shim.js"), "utf8");
  const win = {};
  new Function("window", shimSrc)(win);
  const { apiPath, matchFilms } = win.__shim;
  assert.equal(apiPath("http://localhost:3000/api/films/top10"), "../api/films/top10.json");
  assert.equal(apiPath("http://localhost:3000/api/films/genre/science fiction"), "../api/films/genre/science%20fiction.json");
  assert.equal(apiPath("http://localhost:3000/api/films/genre/science%20fiction"), "../api/films/genre/science%20fiction.json");
  assert.equal(apiPath("http://localhost:3000/api/films/12"), "../api/films/12.json");
  assert.equal(apiPath("http://localhost:3000/films/12/reviews"), "../api/films/12/reviews.json");
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

  const { excluded, findSecret } = await import("./labs/code.mjs");
  for (const p of [".env", "config/.env.local", "serviceAccountKey.json", "node_modules/x.js", "target/a.class", "keys/id.pem", "database/catering.db"])
    assert.ok(excluded(p), `${p} would be published`);
  assert.ok(!excluded("ex1/src/sort.c"));
  assert.ok(findSecret('const password = "hunter2";'));
  assert.ok(findSecret("mongodb+srv://u:p@cluster0.example.net"));
  assert.equal(findSecret("password: req.body.password"), null);
  for (const id of ["lab-asd", "catering", "film-data", "food-delivery-db", "so-centrale", "lft", "client-email"]) {
    const index = JSON.parse(readFileSync(labs(`${id}/code/index.json`), "utf8"));
    assert.ok(index.length > 0, `${id}: no code exported`);
    for (const f of index) assert.ok(!excluded(f.path), `${id}: ${f.path} should not be public`);
    for (const f of index) assert.ok(!/@(gmail|yahoo|hotmail)\./i.test(readFileSync(labs(`${id}/code/${f.path}`), "utf8")), `${id}: ${f.path} publishes an email address`);
    const docs = JSON.parse(readFileSync(labs(`${id}/docs.json`), "utf8"));
    for (const d of docs) assert.ok(existsSync(labs(`${id}/${d.src}`)), `${id}: missing doc ${d.src}`);
  }
  console.log("ok — code explorer: sources exported, nothing secret");

  /* MTDI: the switch of the exotic animals, break by break */
  const { run: runSwitch, ANIMALI, javaLines } = await vite.ssrLoadModule("/src/labs/mtdi/switch.ts");
  const all = ANIMALI.map(() => true);
  for (let v = 1; v <= 10; v++) assert.deepEqual(runSwitch(v, all), [String(v)], `case ${v} alone`);
  assert.deepEqual(runSwitch(11, all), ["default"]);
  assert.deepEqual(runSwitch(12, all), ["default"]);
  const no3 = all.map((b, i) => i !== 2);
  assert.deepEqual(runSwitch(3, no3), ["3", "4"], "fall-through from 3 stops at 4's break");
  assert.deepEqual(runSwitch(10, all.map((b, i) => i !== 9)), ["10", "default"], "no break on the last case falls into default");
  assert.deepEqual(runSwitch(1, all.map(() => false)), [...ANIMALI.map((a) => String(a.n)), "default"]);
  assert.ok(!javaLines(no3).some((l) => l.key === "3" && l.text.includes("break")), "case 3 lost its break");
  assert.equal(ANIMALI[8].verso, "Fenicottero: Kraaaah", "verses come from the report");
  console.log("ok — mtdi: switch, break and fall-through");

  /* Client Email: the server protocol of ServerMain.java, without sockets */
  const mail = await vite.ssrLoadModule("/src/labs/email/server.ts");
  assert.equal(mail.javaHash("ciao"), 3053332, "javaHash matches String.hashCode");
  const srv = mail.createMailServer();
  const box = { simone: [], laura: [], giacomo: [], admin: [] };
  const conn = (k) => ({ deliver: (t) => box[k].push(t) });
  srv.request("CLIENT:admin@example.com role: admin\n", conn("admin"));
  srv.request("CLIENT:Simone@Example.com\n", conn("simone"));
  srv.request("CLIENT:laura@example.com\n", conn("laura"));
  assert.ok(srv.console.includes("Client registrato: simone@example.com"), "login lowercases the address");
  const sent = mail.send("simone@example.com", "laura@example.com, giacomo@example.com; nessuno@example.com", "Ciao!", (i) => srv.request(i, conn("simone")));
  assert.deepEqual(sent.invalid, ["nessuno@example.com"], "unknown recipients are refused before the server");
  assert.equal(sent.sent.length, 2);
  assert.equal(box.laura.length, 1, "online recipient gets it at once");
  assert.deepEqual(mail.parse(box.laura[0]), { from: "simone@example.com", to: "laura@example.com", body: "Ciao!" });
  assert.equal(box.giacomo.length, 0, "offline recipient waits");
  assert.ok(box.admin.includes("Log: simone@example.com ha mandato una mail a laura@example.com"));
  srv.request("CLIENT:giacomo@example.com\n", conn("giacomo"));
  assert.equal(box.giacomo.length, 1, "queued mail is delivered at login");
  srv.disconnect("laura@example.com");
  srv.request("CLIENT:laura@example.com\n", conn("laura"));
  assert.equal(box.laura.length, 2, "logging in again refills the inbox, as the deleted delivered file did");
  srv.request("DELETE_MESSAGE\n" + box.laura[0], conn("laura"));
  assert.equal(srv.messages.filter((m) => mail.parse(m).to === "laura@example.com").length, 0, "DELETE_MESSAGE removes it");
  assert.deepEqual(mail.send("simone@example.com", "  ", "x", () => assert.fail("nothing to send")), { sent: [], invalid: [] });
  console.log("ok — email: delivery, queue, admin log, delete");

  /* Centrale nucleare: the engine against Atomo.c and Master.c */
  const so = await vite.ssrLoadModule("/src/labs/so/engine.ts");
  const d0 = () => ({ energy: 0, index: 0, Scorie: 0, attivatore: 1, scissioni: 0, energyRubata: 0, logInibitore: 0, Inibitore: 0 });
  let d = d0(); so.energy(d, 10, 7); assert.equal(d.energy, 60, "Energy(10,7) = 70-10");
  d = d0(); so.energy(d, 5, 5); assert.equal(d.energy, 20, "Energy(5,5) = 25-5");
  d = { ...d0(), energy: 100, Inibitore: 1 }; so.energy(d, 10, 7);
  assert.deepEqual([d.energy, d.energyRubata], [65, 94], "inhibitor: (100+60)/1.7 stolen, int truncation");
  assert.equal(so.cRand(1, 3), so.cRand(1, 3), "same second, same rand()");
  { const s = so.createSim({ ...so.RALLENTATA, STEP_MS: 100 }); so.step(s); assert.ok(s.born >= 100, `atoms born in the tick are counted for the canvas (${s.born})`); }
  const runTo = (over, secs = 200) => {
    const s = so.createSim({ ...so.RALLENTATA, ...over });
    for (let i = 0; i < secs * so.TICKS && !s.outcome; i++) so.step(s);
    return s;
  };
  assert.equal(runTo({ ENERGY_EXPLODE_THRESHOLD: -1e12, ENERGY_DEMAND: 0 }).outcome, "EXPLODE");
  assert.equal(runTo({ ENERGY_DEMAND: 1e12, ENERGY_EXPLODE_THRESHOLD: 1e15, N_NUOVI_ATOMI: 0 }).outcome, "BLACKOUT");
  assert.equal(runTo({ MAX_PROCESSI: 10 }).outcome, "MELTDOWN", "500 initial atoms cannot fork under ulimit 10");
  assert.equal(runTo({ NATOM: 0, N_NUOVI_ATOMI: 0, ENERGY_DEMAND: 0, SIM_DURATION: 2 }).outcome, "Tempo scaduto");
  assert.equal(runTo(so.ORIGINALI, 5).outcome, "MELTDOWN", "the original STEP of 0.5 ms forks past any ulimit");
  // extreme sliders still end, never NaN (N_MAX_ATOM 0: every atom has temp 0)
  for (const over of [{ NATOM: 0 }, { N_NUOVI_ATOMI: 0, NATOM: 0, SIM_DURATION: 3 }, { MAX_PROCESSI: 5 }, { N_MAX_ATOM: 0 }]) {
    const s = runTo(over);
    assert.ok(s.outcome, `no outcome for ${JSON.stringify(over)}`);
    assert.ok(Number.isFinite(s.d.energy), `energy is ${s.d.energy} for ${JSON.stringify(over)}`);
  }
  // the report is Master.c's printf block, line by line
  const masterC = readFileSync(labs("so-centrale/code/Master.c"), "utf8");
  const loop = masterC.slice(masterC.indexOf("while(1){"));
  const fmts = [...loop.matchAll(/printf\("((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\n$/, "")).slice(0, 13);
  const rep = runTo({ SIM_DURATION: 2, ENERGY_DEMAND: 0, ENERGY_EXPLODE_THRESHOLD: 1e15, N_NUOVI_ATOMI: 0, NATOM: 0 });
  const at = rep.out.indexOf(fmts[0]);
  assert.ok(at >= 0, "no report in the output");
  fmts.forEach((f, i) => {
    const re = new RegExp("^" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%d/g, "-?\\d+") + "$");
    assert.ok(re.test(rep.out[at + i]), `report line ${i}: "${rep.out[at + i]}" vs printf("${f}")`);
  });
  console.log("ok — centrale: Atomo.c energy, the four outcomes, Master.c report");

  const { renderToString } = await import("react-dom/server");
  const { createElement: h } = await import("react");
  const { default: LabsPage } = await vite.ssrLoadModule("/src/labs/LabsPage.tsx");
  const { projects } = await vite.ssrLoadModule("/src/data/projects.ts");
  const indexHtml = renderToString(h(LabsPage, { route: { page: "labs", tab: "prova" } }));
  for (const p of projects) assert.ok(indexHtml.includes(p.title.replace(/&/g, "&amp;")), `the index is missing ${p.title}`);
  const shell = renderToString(h(LabsPage, { route: { page: "labs", id: "lab-asd", tab: "codice" } }));
  for (const t of ["Prova", "Codice", "Documenti"]) assert.ok(shell.includes(t), `tab ${t} missing`);
  const mtdi = renderToString(h(LabsPage, { route: { page: "labs", id: "mtdi", tab: "prova" } }));
  assert.ok(mtdi.includes(">Prova<") && mtdi.includes(">Documenti<") && !mtdi.includes(">Codice<"), "mtdi: Prova and Documenti, no Codice");
  assert.ok(renderToString(h(LabsPage, { route: { page: "labs", id: "nope", tab: "prova" } })).includes("non esiste"));
  assert.deepEqual(
    projects.filter((p) => p.lab).map((p) => [p.id, p.lab]).sort(),
    [["catering", "sql"], ["client-email", "email"], ["film-data", "site"], ["food-delivery-db", "sql"], ["lab-asd", "asd"], ["mtdi", "mtdi"], ["so-centrale", "so"]],
  );
  console.log("ok — labs page renders index, shell and unknown id");

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

  const { default: ProjectsSection } = await vite.ssrLoadModule("/src/sections/Projects.tsx");
  const list = renderToString(h(ProjectsSection, {}));
  for (const p of projects) assert.ok(list.includes(`#/progetti/${p.id}`), `the room does not lead to the ${p.id} lab`);
  console.log("ok — the room links every project to its lab");
} finally {
  await vite.close();
}
