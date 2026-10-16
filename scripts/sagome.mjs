/**
 * The silhouettes in the window of silhouettes, made from real artwork.
 *
 * The coloured originals live in scripts/sagome-src/ and never in git or on
 * the site: only the black shape leaves this script, under a number that says
 * nothing about who it is (see CHARACTERS in src/lib/sagome.ts).
 *
 *   node scripts/sagome.mjs
 *
 * Where each original came from — the full-size file, "?format=original",
 * fetched with the wiki as Referer:
 *   samus     metroid.fandom.com            File:SSB Ultimate Samus render.png
 *   jak       jakanddaxter.fandom.com       File:Jak from TPL promo render.png
 *   steve     minecraft.fandom.com          File:Steve.png
 *   link      zelda.fandom.com              File:SSB Link Artwork.png
 *   batman    lego.fandom.com               File:Batman film suit adapted into a minifigure form.png
 *   knight    hollowknight.fandom.com       File:The Knight Idle.png
 *   lost      bindingofisaacrebirth.fandom.com  File:Character The Lost appearance.png
 *   yi        ninesols.fandom.com           File:Portrait_Yi.png
 *   penitent  blasphemous.fandom.com        File:Penitent One.png
 *   cuphead   cuphead.fandom.com            File:Cuphead.png
 *   crow      deathsdoor.fandom.com         File:Reaper_Stencil.png
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "vite";
import { decode, encode } from "./png.mjs";

/** The tallest a silhouette is kept, and the shortest it is grown to. */
const MAX_H = 480;
const MIN_H = 240;

/**
 * What each original needs before it is a clean shape. Most are already cut
 * out; two are not.
 *   crop   [x, y, w, h] of the original to keep
 *   flood  "light" or "dark": that background, wherever it touches the edge,
 *          becomes see-through
 *   drop   "light": every light pixel goes, wherever it is
 */
const PREP = {
  // a photo beside a minifigure: only the minifigure, on its white ground
  batman: { crop: [326, 0, 326, 417], flood: "light" },
  // a stencil: a dark crow in a white arch on a dark ground. The crow stands
  // on the foot of the arch, so its dark joins the ground's at the bottom
  // edge — inside the arch the ground is the white, so that is what goes
  crow: { crop: [122, 140, 156, 226], flood: "light" },
};

const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const isLight = (d, i) => d[i + 3] > 0 && luma(d, i) > 225;
const isDark = (d, i) => d[i + 3] > 0 && luma(d, i) < 70;

function crop(img, [x0, y0, w, h]) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((y0 + y) * img.width + x0) * 4;
    data.set(img.data.subarray(from, from + w * 4), y * w * 4);
  }
  return { width: w, height: h, data };
}

/** Clears every pixel that matches and is joined to the edge through matches. */
function flood(img, match) {
  const { width: w, height: h, data: d } = img;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !match(d, p * 4)) continue;
    seen[p] = 1;
    d[p * 4 + 3] = 0;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
}

/** The smallest box around everything still visible. */
function trim(img) {
  const { width: w, height: h, data: d } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] < 128) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) throw new Error("nothing left of it");
  return crop(img, [x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
}

/**
 * Scaled by a whole factor: down by averaging the alpha of each block, up by
 * repeating pixels — the small ones are pixel art, and pixel art stays sharp.
 */
function rescale(img) {
  const { width: w, height: h, data: d } = img;
  if (h > MAX_H) {
    const f = Math.ceil(h / MAX_H);
    const W = Math.floor(w / f), H = Math.floor(h / f);
    const out = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let a = 0;
        for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) a += d[((y * f + dy) * w + x * f + dx) * 4 + 3];
        out[(y * W + x) * 4 + 3] = a / (f * f);
      }
    }
    return { width: W, height: H, data: out };
  }
  if (h < MIN_H) {
    const f = Math.ceil(MIN_H / h);
    const W = w * f, H = h * f;
    const out = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) out[(y * W + x) * 4 + 3] = d[(Math.floor(y / f) * w + Math.floor(x / f)) * 4 + 3];
    }
    return { width: W, height: H, data: out };
  }
  return img;
}

/** Black where there is anything, nothing where there is not. No half measures. */
function blacken(img) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = 0;
    d[i + 3] = d[i + 3] >= 128 ? 255 : 0;
  }
  return img;
}

export function silhouette(original, prep = {}) {
  let img = { ...original, data: Uint8Array.from(original.data) };
  if (prep.crop) img = crop(img, prep.crop);
  if (prep.flood) flood(img, prep.flood === "light" ? isLight : isDark);
  if (prep.drop === "light") {
    for (let i = 0; i < img.data.length; i += 4) if (isLight(img.data, i)) img.data[i + 3] = 0;
  }
  return blacken(rescale(trim(img)));
}

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const { CHARACTERS } = await vite.ssrLoadModule("/src/lib/sagome.ts");
await vite.close();

mkdirSync(new URL("../public/media/sagome/", import.meta.url), { recursive: true });
for (const c of CHARACTERS) {
  const src = readFileSync(new URL(`./sagome-src/${c.id}.png`, import.meta.url));
  const out = silhouette(decode(src), PREP[c.id]);
  writeFileSync(new URL(`../public/${c.file}`, import.meta.url), encode(out));
  console.log(`${c.id.padEnd(9)} -> ${c.file}  ${out.width}x${out.height}`);
}
