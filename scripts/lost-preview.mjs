/**
 * The figure, on one page, so it can be worked on without playing the game.
 *
 * It draws what `src/lib/lost.ts` says, over the maze corridor it has to line
 * up with, with each fragment's window as a dashed box. Run it, open the file
 * it names, edit lost.ts, run it again.
 *
 *   node scripts/lost-preview.mjs
 */
import { writeFileSync } from "node:fs";
import { createServer } from "vite";

const CELL = 22;       // px per maze cell in the preview
const PAD = 20;
const TOP = 16;        // rows of room above the maze, for the head

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const { letterPath } = await vite.ssrLoadModule("/src/lib/maze.ts");
const { PIECES, boxPath } = await vite.ssrLoadModule("/src/lib/lost.ts");
await vite.close();

const px = (n) => PAD + n * CELL;
const py = (n) => PAD + (n + TOP) * CELL;
const trail = letterPath().map(([r, c]) => `${px(c + 0.5)},${py(r + 0.5)}`).join(" ");

const parts = PIECES.map((piece) => `
  <g transform="translate(${PAD} ${PAD + TOP * CELL}) scale(${CELL})"
     stroke="#8AD8FF" stroke-width="0.3" fill="none" stroke-linecap="butt" stroke-linejoin="miter">
    ${(piece.paths ?? []).map((d) => `<path d="${d}"/>`).join("")}
    ${(piece.boxes ?? []).map((b) => `<path d="${boxPath(b)}" fill="rgba(138,216,255,0.16)"/>`).join("")}
  </g>
  <rect x="${px(piece.view[0])}" y="${py(piece.view[1])}"
        width="${piece.view[2] * CELL}" height="${piece.view[3] * CELL}"
        fill="none" stroke="#2B3A50" stroke-dasharray="4 4"/>
  <text x="${px(piece.view[0]) + 4}" y="${py(piece.view[1]) - 4}"
        fill="#3D5273" font-family="monospace" font-size="11">${piece.title}</text>`).join("");

const w = px(22) + PAD;
const h = py(22) + PAD;
const out = new URL("../lost-preview.html", import.meta.url);
writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>the lost</title>
<body style="margin:0;background:#070B12">
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="${px(0)}" y="${py(0)}" width="${21 * CELL}" height="${21 * CELL}" fill="none" stroke="#223047" stroke-width="2"/>
  <polyline points="${trail}" fill="none" stroke="#E3B04B" stroke-width="${0.34 * CELL}"
            stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  ${parts}
</svg>`);

console.log(`scritto ${out.pathname.slice(1)} — aprilo nel browser`);
