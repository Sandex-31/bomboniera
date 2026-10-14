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

// most linked films first: a cheap proxy for "films people know" (joining it.wikipedia here times out WDQS)
const TOP = `
SELECT ?film ?n WHERE {
  ?film wdt:P31 wd:Q11424; wikibase:sitelinks ?n.
  FILTER(?n >= 50)
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
