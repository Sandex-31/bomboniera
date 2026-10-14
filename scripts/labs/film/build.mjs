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
