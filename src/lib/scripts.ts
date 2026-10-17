/**
 * The six scripts of Babel, the second floor: each a cipher of the Italian
 * alphabet, one symbol per letter, in alphabet order. Salvo made them. The
 * Egyptians are drawn rather than typed (see `hieroglyphs.ts`), because a
 * phone that has the font for them is the exception.
 *
 * Kept apart from the scene so the chats can be checked against them without
 * a renderer: every letter of a wall phrase must already have turned up in
 * the chats the visitor can read by then.
 */

export type Script = "egizi" | "stelle" | "blocchi" | "tubi" | "onde" | "esagrammi";

/** The Italian alphabet: no j, k, w, x or y. */
export const LETTERS = "abcdefghilmnopqrstuvz";

/**
 * The typed scripts, a symbol per letter of `LETTERS`. The blocks had a
 * hyphen for their r, which read as punctuation; it is a striped block now.
 */
export const ALPHABETS: Record<Exclude<Script, "egizi">, string[]> = {
  stelle: [..."✳✬✴✶✵◓✻✿◒✺✦✰✾❃★✡✱✷✲✪◑"],
  blocchi: [..."▔▌▪█▧▭▀▯▉✚❘▓‗░▤▩❚‖▂✜▅"],
  tubi: [..."╮┦⌎┞╰⌒┟⌔╭┬┌╯┼┴╵⌍╷┧┐├┤"],
  onde: [..."≴≿⊱≳≵⊰⋞⋚≲≦⋭⊽≸⋧⋉≼≶≧⋨⋗≺"],
  esagrammi: [..."䷶䷫䷒䷅䷔䷨䷧䷟䷂䷐䷺䷏䷪䷣䷕䷴䷓䷾䷌䷬䷿"],
};

/** What is written as itself in every script: the gaps and stops between words. */
const PASS = " ,.…?!'’";

/** A letter of the alphabet by its place in `LETTERS`, or a mark passed through. */
export type Token = { letter: number } | { text: string };

/** Lower case, accents off: è and é are both e on these walls. */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Italian text as letters and marks. Anything the scripts cannot write is a mistake in the text. */
export function tokens(s: string): Token[] {
  return [...fold(s)].map((ch) => {
    const letter = LETTERS.indexOf(ch);
    if (letter >= 0) return { letter };
    if (PASS.includes(ch)) return { text: ch };
    throw new Error(`«${ch}» cannot be written in the scripts of Babel (in «${s}»)`);
  });
}

/** Only the letters: what an answer is compared on, as on the island's terminal. */
export const bare = (s: string) => fold(s).replace(/[^a-z]/g, "");

export const glyph = (script: Exclude<Script, "egizi">, letter: number) => ALPHABETS[script][letter];
