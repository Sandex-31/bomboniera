/** Same format as the course's records.csv: id,field1,field2,field3 — field1 a
 *  word with no spaces or commas. Generated here so the 20M-row file never ships.
 *  Same mulberry32 as scripts/labs/seed.mjs, copied because this runs in the browser. */
export function makeRecords(words: string[], n: number, seed = 20261014): string {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pool = words.filter((w) => w && !/[\s,]/.test(w));
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    const w = pool[Math.floor(next() * pool.length)];
    lines.push(`${i},${w},${Math.floor(next() * 100000)},${(next() * 10000).toFixed(4)}`);
  }
  return lines.join("\n") + "\n";
}
