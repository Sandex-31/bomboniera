/** npm run labs             → every step
 *  npm run labs -- asd film  → only those (catering before code: code reads the unzipped project) */
const STEPS = {
  asd: () => import("./asd.mjs"),
  catering: () => import("./catering.mjs"),
  delivery: () => import("./delivery.mjs"),
  lft: () => import("./lft.mjs"),
  film: () => import("./film/build.mjs"),
  code: () => import("./code.mjs"),
};
const only = process.argv.slice(2);
for (const name of only) if (!STEPS[name]) throw new Error(`step sconosciuto: ${name}`);
for (const [name, load] of Object.entries(STEPS)) {
  if (only.length && !only.includes(name)) continue;
  console.log(`\n→ ${name}`);
  await (await load()).default();
}
