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
       (MIN(?date) AS ?released) (SAMPLE(?dur) AS ?duration) (SAMPLE(?img) AS ?image) (SAMPLE(?pst) AS ?poster)
       (GROUP_CONCAT(DISTINCT ?g; separator="|") AS ?genres) WHERE {
  VALUES ?film { ${ids.map((q) => `wd:${q}`).join(" ")} }
  OPTIONAL { ?film rdfs:label ?itL FILTER(LANG(?itL) = "it") }
  OPTIONAL { ?film rdfs:label ?enL FILTER(LANG(?enL) = "en") }
  OPTIONAL { ?film schema:description ?d FILTER(LANG(?d) = "it") }
  OPTIONAL { ?film wdt:P577 ?date }
  OPTIONAL { ?film wdt:P2047 ?dur }
  OPTIONAL { ?film wdt:P18 ?img }
  OPTIONAL { ?film wdt:P3383 ?pst }
  OPTIONAL { ?film wdt:P136 ?gi. ?gi rdfs:label ?g FILTER(LANG(?g) = "en") }
} GROUP BY ?film`;

const POSTER_NAME = /poster|locandina|affiche|plakat|cartel|cartaz|one.?sheet|theatrical/i;

/** Wikimedia rate-limits by User-Agent: on 429 wait what Retry-After asks, a few times, then give up. */
export async function politeFetch(url) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status !== 429 || attempt === 4) return res;
    const wait = Number(res.headers.get("retry-after")) || 30;
    console.log(`  429, riprovo tra ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

async function mwApi(base, params) {
  const res = await politeFetch(base + "?" + new URLSearchParams({ format: "json", formatversion: "2", ...params }));
  if (!res.ok) throw new Error(`${base} ${res.status}`);
  return res.json();
}

async function posterAmongImages(title) {
  const { query } = await mwApi("https://en.wikipedia.org/w/api.php", { action: "query", prop: "images", imlimit: "max", titles: title });
  const file = query.pages[0]?.images?.map((i) => i.title.replace(/^File:/, "")).find((n) => POSTER_NAME.test(n));
  return file?.replace(/ /g, "_");
}

/** English Wikipedia's infobox image — the theatrical poster for nearly every film, shown there as fair use. Cached like the Wikidata rows. */
export async function enwikiPosters(films, { refresh = false } = {}) {
  const file = join(ensureDir(CACHE), "enwiki-posters.json");
  if (existsSync(file) && !refresh) return JSON.parse(readFileSync(file, "utf8"));
  const posters = {};
  for (let i = 0; i < films.length; i += 50) {
    const qids = films.slice(i, i + 50).map((f) => f.qid);
    const { entities } = await mwApi("https://www.wikidata.org/w/api.php", { action: "wbgetentities", ids: qids.join("|"), props: "sitelinks", sitefilter: "enwiki" });
    const byTitle = new Map(qids.flatMap((q) => (entities[q]?.sitelinks?.enwiki ? [[entities[q].sitelinks.enwiki.title, q]] : [])));
    const { query } = await mwApi("https://en.wikipedia.org/w/api.php", { action: "query", prop: "pageimages", piprop: "name", pilicense: "any", pilimit: "50", redirects: "1", titles: [...byTitle.keys()].join("|") });
    const alias = new Map([...(query.normalized ?? []), ...(query.redirects ?? [])].map((x) => [x.from, x.to]));
    for (const [title, qid] of byTitle) {
      let t = title;
      while (alias.has(t)) t = alias.get(t);
      const page = query.pages.find((p) => p.title === t);
      // no page image (PageImages skips some infoboxes): the article file named like a poster, if any
      const name = page?.pageimage ?? (page && (await posterAmongImages(t)));
      if (name) posters[qid] = `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}`;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  writeFileSync(file, JSON.stringify(posters, null, 1));
  return posters;
}

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
      // P3383 is "film poster"; P18 is any image — set photos, logos, theme-park rides — so it only counts when it is named like a poster
      image: b.poster?.value ?? (POSTER_NAME.test(decodeURIComponent(b.image?.value ?? "")) ? b.image.value : null),
      genres: b.genres?.value ? b.genres.value.split("|") : [],
    }))
    .filter((f) => f.title && f.released)
    .sort((a, b) => order.get(a.qid) - order.get(b.qid));
  writeFileSync(file, JSON.stringify(films, null, 1));
  return films;
}
