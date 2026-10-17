import { glyph, tokens, type Script, type Token } from "../lib/scripts";
import { HIEROGLYPHS } from "../lib/hieroglyphs";

/*
 * Italian text written in one of the scripts of Babel. Words never break in
 * the middle: a line ends only where a space is, so the gaps between words —
 * the one thing every script shows plainly — stay where they belong.
 */

/** How thick a hieroglyph is drawn, on its 24×32 grid. */
const STROKE = 2.4;
/** A hieroglyph is narrower than it is tall. */
const ASPECT = 24 / 32;

/** The text as words, each a run of tokens, the spaces dropped. */
function words(text: string): Token[][] {
  const out: Token[][] = [[]];
  for (const t of tokens(text)) {
    if ("text" in t && t.text === " ") out.push([]);
    else out[out.length - 1].push(t);
  }
  return out.filter((w) => w.length);
}

export default function Glyphs({ script, text, size = 22 }: { script: Script; text: string; size?: number }) {
  return (
    <span className={`glyphs glyphs--${script}`} style={{ fontSize: size }}>
      {words(text).map((w, i) => (
        <span key={i} className="glyphs__word">
          {w.map((t, j) =>
            "text" in t ? (
              <span key={j}>{t.text}</span>
            ) : script === "egizi" ? (
              <svg key={j} viewBox="0 0 24 32" width={size * ASPECT} height={size} aria-hidden="true">
                <path
                  d={HIEROGLYPHS[t.letter]}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span key={j}>{glyph(script, t.letter)}</span>
            ),
          )}
        </span>
      ))}
    </span>
  );
}

/** The wall's font for the typed scripts: whichever symbol font the device has. */
const font = (size: number) => `${size}px "Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", serif`;

/** Words into lines no wider than `maxWidth`, measured with `ctx`. */
function layout(ctx: CanvasRenderingContext2D, script: Script, text: string, size: number, maxWidth: number) {
  ctx.font = font(size);
  const widthOf = (t: Token) =>
    "text" in t
      ? ctx.measureText(t.text).width
      : script === "egizi"
        ? size * ASPECT
        : ctx.measureText(glyph(script, t.letter)).width;
  const gap = size * 0.5;
  const lines: Token[][][] = [[]];
  let used = 0;
  for (const w of words(text)) {
    const width = w.reduce((s, t) => s + widthOf(t), 0);
    if (used > 0 && used + gap + width > maxWidth) {
      lines.push([]);
      used = 0;
    }
    used += (used > 0 ? gap : 0) + width;
    lines[lines.length - 1].push(w);
  }
  return { lines, widthOf, gap };
}

/** How many lines the text takes on the wall at this size. */
export const glyphLines = (ctx: CanvasRenderingContext2D, script: Script, text: string, size: number, maxWidth: number) =>
  layout(ctx, script, text, size, maxWidth).lines.length;

/**
 * The same, drawn on a canvas for the wall: lines wrapped at `maxWidth`,
 * the first one's middle at `y`, `x` the centre of every line. Uses the
 * context's current fill and stroke style.
 */
export function drawGlyphs(
  ctx: CanvasRenderingContext2D,
  script: Script,
  text: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
) {
  const { lines, widthOf, gap } = layout(ctx, script, text, size, maxWidth);
  ctx.textBaseline = "middle";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const paths = script === "egizi" ? HIEROGLYPHS.map((d) => new Path2D(d)) : [];
  lines.forEach((line, row) => {
    const width = line.reduce((s, w) => s + w.reduce((a, t) => a + widthOf(t), 0), 0) + gap * (line.length - 1);
    let cx = x - width / 2;
    const cy = y + row * size * 1.35;
    for (const w of line) {
      for (const t of w) {
        if ("text" in t) ctx.fillText(t.text, cx, cy);
        else if (script === "egizi") {
          ctx.save();
          ctx.translate(cx, cy - size / 2);
          ctx.scale(size / 32, size / 32);
          ctx.lineWidth = STROKE;
          ctx.stroke(paths[t.letter]);
          ctx.restore();
        } else ctx.fillText(glyph(script, t.letter), cx, cy);
        cx += widthOf(t);
      }
      cx += gap;
    }
  });
}
