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

/** The notebook's Plotly figures, kept interactive: one JSON each, drawn by charts/view.html.
 *  Figures over 1 MB (the world map with its geometry) stay in the notebook. */
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
      const fig = o.data?.["application/vnd.plotly.v1+json"];
      const json = fig && JSON.stringify(fig);
      if (!json || json.length > 1024 * 1024) continue;
      const name = `${String(list.length + 1).padStart(2, "0")}.json`;
      writeFileSync(join(dir, name), json);
      list.push({ src: `charts/${name}`, caption, title: (fig.layout?.title?.text ?? caption).split("<br>")[0] });
    }
  }
  writeJson(join(dir, "index.json"), list);
  copyFileSync(join(HERE, "chart.html"), join(dir, "view.html"));
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
