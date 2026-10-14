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
  // Windows' own tar (bsdtar) reads zip; Git Bash's GNU tar on PATH does not
  sh(process.platform === "win32" ? "C:/Windows/System32/tar.exe" : "bsdtar", ["-xf", SOURCES.catering.zip, "-C", work]);
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
  const rows = (n) => db.exec(`SELECT COUNT(*) FROM "${n}"`)[0].values[0][0];
  // the shipped db is sparse on purpose: shifts, tasks and summary sheets are filled by the use cases at runtime
  writeJson(join(out, "queries.json"), [
    { title: "Il menù di ogni servizio", sql: `SELECT e.name AS evento, s.name AS servizio, s.service_date AS data, m.title AS menu, ms.name AS sezione, mi.description AS piatto
FROM Events e JOIN Services s ON s.event_id = e.id
LEFT JOIN Menus m ON m.id = s.approved_menu_id
LEFT JOIN MenuItems mi ON mi.menu_id = m.id
LEFT JOIN MenuSections ms ON ms.id = mi.section_id
ORDER BY s.id, ms.position, mi.position;` },
    { title: "Ricette e quante preparazioni richiedono", sql: `SELECT r.name AS ricetta, COUNT(rp.preparation_id) AS preparazioni
FROM Recipes r LEFT JOIN RecipePreparations rp ON rp.recipe_id = r.id
GROUP BY r.id ORDER BY preparazioni DESC, r.name;` },
    { title: "Chi può fare cosa", sql: `SELECT u.username, GROUP_CONCAT(r.role, ', ') AS ruoli
FROM Users u JOIN UserRoles ur ON ur.user_id = u.id JOIN Roles r ON r.id = ur.role_id
GROUP BY u.id ORDER BY u.username;` },
    { title: "Il personale", sql: `SELECT name, surname, role, occasional, vacationDays FROM Staff ORDER BY role, surname;` },
    { title: "Quante righe ha ogni tabella", sql: names.map((n) => `SELECT '${n}' AS tabella, COUNT(*) AS righe FROM "${n}"`).join(" UNION ALL ") + ";" },
    ...names.filter((n) => n !== "sqlite_sequence" && rows(n) > 0).map((n) => ({ title: `Prime righe di ${n}`, sql: `SELECT * FROM "${n}" LIMIT 20;` })),
  ]);  console.log(`  ${cases.length} casi JUnit, ${names.length} tabelle`);
}
