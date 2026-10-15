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
// documentation examples that look like secrets and are not (checked by hand, one by one)
const KNOWN_EXAMPLES = [/password: "secret123"/g]; // review-server/README.md, createUser example for "john_doe"
export const findSecret = (text) => {
  const clean = KNOWN_EXAMPLES.reduce((t, re) => t.replace(re, ""), text);
  return SECRETS.find((re) => re.test(clean))?.source ?? null;
};

const LANG = { ".c": "c", ".h": "c", ".java": "java", ".js": "javascript", ".mjs": "javascript", ".json": "json", ".sql": "sql", ".html": "xml", ".hbs": "xml", ".xml": "xml", ".css": "css", ".md": "markdown", ".py": "python", ".yml": "yaml", ".yaml": "yaml" };

/** What each lab shows in "Codice" and "Documenti". Paths in `docs` are relative to `root`. */
const PLAN = {
  "lab-asd": { root: SOURCES["lab-asd"].repo, files: "git", docs: ["Relazione es1.pdf", "Relazione es2.pdf", "Relazione es3.pdf", "Relazione es4.pdf"] },
  catering: { root: join(TMP, "catering/progetto"), files: "walk", docs: [], extraPdf: { src: SOURCES.catering.pdf, name: "gestire-il-personale.pdf", title: "Gestire il personale (analisi e casi d'uso)" } },
  "film-data": {
    root: SOURCES["film-data"].repo, files: "git",
    only: /^(TWEB\/solution\/|IUM\/Pulizia CSV\/(README\.md|requirements\.txt)$|README\.md$|Report\/[^/]+\.md$)/,
    docs: ["Report/IUM-TWEB Report.md", "QueryScreenshot/mainPage.jpeg", "QueryScreenshot/filmDetailPage.jpeg", "QueryScreenshot/searchPage.jpeg", "QueryScreenshot/mainPageQueryLog.png"],
  },
  "food-delivery-db": { root: join(ROOT, "scripts/labs/delivery"), files: "walk", docs: [], extraPdf: { src: SOURCES["food-delivery-db"].pdf, name: "progetto-bd.pdf", title: "Progetto di Basi di Dati (requisiti e schema E-R)" } },
  mtdi: {
    docs: [],
    extraPdf: [
      { src: SOURCES.mtdi.pdf, name: "mtdi-switch.pdf", title: "Attività di programmazione: switch-case e fall-through" },
      { src: SOURCES.mtdi.consegne, name: "mtdi-consegne.pdf", title: "Consegne delle attività del corso" },
    ],
  },
  "so-centrale": { root: SOURCES["so-centrale"].dir, files: "walk", only: /\.(c|h)$|^Makefile$/, docs: [] },
  lft: { root: SOURCES.lft.dir, files: "walk", only: /^LFT-[^/]+\/src\/[^/]+\.(java|txt|j)$/, docs: [] },
  "client-email": {
    root: SOURCES["client-email"].dir, files: "walk",
    only: /^(Client_Email\/(pom\.xml|src\/.+\.(java|fxml|css))|Server\/src\/.+\.java)$/, // not Server/messages.txt: old test mail
    // the demo accounts were real-looking addresses: published as placeholders
    rewrite: [[/Simonepanetti@gmail\.com/g, "simone@example.com"], [/Salvatorepierri@gmail\.com/g, "admin@example.com"], [/Giacomoporetti@yahoo\.it/g, "giacomo@example.com"], [/Lauraspadaro22@hotmail\.net/g, "laura@example.com"]],
    docs: [],
  },
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
    for (const path of plan.root ? list(plan.root, plan.files) : []) {
      if (excluded(path) || (plan.only && !plan.only.test(path))) continue;
      const abs = join(plan.root, path);
      const size = statSync(abs).size;
      if (size > 300 * 1024) continue;
      const text = (plan.rewrite ?? []).reduce((t, [re, to]) => t.replace(re, to), readFileSync(abs, "utf8"));
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
    for (const pdf of [plan.extraPdf ?? []].flat()) {
      copyFileSync(pdf.src, join(docDir, pdf.name));
      docs.push({ title: pdf.title, src: `docs/${pdf.name}`, kind: "pdf" });
    }
    writeJson(join(out, "docs.json"), docs);
    console.log(`  ${id}: ${index.length} file, ${docs.length} documenti`);
  }
}
