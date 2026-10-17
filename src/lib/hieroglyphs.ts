/**
 * The Egyptians' alphabet, drawn: one small figure per letter, in profile,
 * doing something whose Italian verb starts with that letter — a alzare,
 * b bere, c cadere... It is meant to be the script that can half be read
 * from the pictures alone, which is why the floor starts with it. h and q
 * have no fitting verb and take the real Egyptian signs for those sounds,
 * the reed shelter and the hill slope.
 *
 * Each figure is strokes on a 24×32 grid, feet on the bottom, facing right,
 * stroked round and thick by whoever draws it (SVG in the terminal, Path2D
 * on the wall), so the same data serves both.
 */

type P = [number, number];

/** A head: a small circle, which a thick stroke fills in. */
const head = ([x, y]: P) => `M${x - 1.4} ${y} a1.4 1.4 0 1 0 2.8 0 a1.4 1.4 0 1 0 -2.8 0`;
const line = (...pts: P[]) => "M" + pts.map(([x, y]) => `${x} ${y}`).join(" L");

/** Head, back and legs of someone standing; the arms are the letter. */
const standing = () => [head([12, 5]), line([12, 8], [12, 19]), line([9, 31], [12, 19], [15, 31])];
/** Someone sitting on the ground with their knees up. */
const sitting = () => [head([9, 8]), line([9, 11], [9, 22], [16, 22], [16, 31])];

const draw = (...parts: string[]) => parts.join(" ");

/** In alphabet order: a b c d e f g h i l m n o p q r s t u v z. */
export const HIEROGLYPHS: string[] = [
  // a — alzare: both arms to the sky
  draw(...standing(), line([7, 2], [12, 11], [17, 2])),
  // b — bere: a cup to the mouth
  draw(...standing(), line([12, 11], [16, 12], [15, 7]), line([13, 4], [17, 4], [16, 7], [14, 7], [13, 4]), line([12, 11], [10, 19])),
  // c — cadere: toppling over backwards
  draw(head([6, 8]), line([8, 11], [15, 19]), line([21, 14], [15, 19], [22, 22]), line([4, 16], [9, 12], [12, 6]), line([2, 31], [22, 31])),
  // d — dormire: stretched out on a bed
  draw(head([5, 19]), line([7, 20], [20, 20]), line([3, 30], [3, 23], [21, 23], [21, 30])),
  // e — entrare: walking in under a doorway
  draw(line([16, 31], [16, 4], [23, 4], [23, 31]), head([9, 6]), line([9, 9], [10, 20]), line([6, 31], [10, 20], [14, 31]), line([5, 16], [9, 11], [13, 17])),
  // f — fuggire: running off, looking back
  draw(head([9, 6]), line([11, 9], [13, 19]), line([3, 25], [8, 26], [13, 19], [19, 25], [21, 31]), line([5, 14], [11, 11], [17, 10])),
  // g — guardare: a hand over the eyes
  draw(...standing(), line([12, 11], [17, 9], [15, 4]), line([12, 11], [10, 19])),
  // h — the reed shelter, the Egyptian h
  draw(line([4, 30], [4, 6], [20, 6], [20, 26], [9, 26], [9, 12], [15, 12], [15, 20])),
  // i — inginocchiarsi: down on one knee
  draw(head([12, 10]), line([12, 13], [12, 23], [16, 30], [8, 31]), line([12, 15], [17, 19])),
  // l — lanciare: a stick about to fly
  draw(...standing(), line([12, 11], [6, 5]), line([4, 2], [8, 7]), line([12, 11], [18, 13])),
  // m — mangiare: sitting, a hand to the mouth
  draw(...sitting(), line([9, 13], [13, 15], [12, 9])),
  // n — nuotare: flat on the water
  draw(head([19, 14]), line([17, 15], [6, 17]), line([2, 14], [6, 17], [2, 20]), line([16, 15], [22, 11]), line([1, 24], [4, 22], [7, 24], [10, 22], [13, 24], [16, 22], [19, 24], [22, 22])),
  // o — offrire: a jar held out
  draw(...standing(), line([12, 12], [17, 14]), line([17, 9], [21, 9], [20, 15], [18, 15], [17, 9])),
  // p — pregare: both hands raised before the face
  draw(...standing(), line([12, 11], [17, 7]), line([12, 12], [18, 9])),
  // q — the hill slope, the Egyptian q
  "M2 28 Q12 2 22 28 L2 28",
  // r — remare: an oar, a boat
  draw(head([10, 10]), line([10, 13], [10, 22]), line([10, 15], [15, 15]), line([14, 12], [20, 31]), line([2, 24], [22, 24], [18, 29], [6, 29], [2, 24])),
  // s — sedere: on a stool
  draw(...sitting(), line([9, 12], [15, 18]), line([5, 22], [5, 31])),
  // t — tirare: drawing a bow
  draw(...standing(), line([12, 11], [19, 16]), line([12, 11], [14, 16], [19, 4]), line([14, 16], [19, 28]), "M19 4 Q25 16 19 28"),
  // u — urlare: hands round the mouth, a shout
  draw(...standing(), line([12, 11], [15, 13], [15, 7]), line([19, 5], [22, 3]), line([19, 8], [23, 8]), line([19, 11], [22, 13])),
  // v — vecchio: bent over a stick
  draw(head([14, 7]), line([13, 10], [10, 20]), line([8, 31], [10, 20], [13, 31]), line([13, 12], [18, 16]), line([18, 12], [19, 31])),
  // z — zappare: hoeing the ground
  draw(head([15, 9]), line([13, 11], [9, 21]), line([6, 31], [9, 21], [12, 31]), line([13, 13], [17, 19]), line([14, 13], [20, 26], [16, 30])),
];
