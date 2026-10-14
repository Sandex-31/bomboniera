import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const CACHE = join(ROOT, "scripts/labs/cache");
export const TMP = join(CACHE, "tmp");
export const outDir = (id) => join(ROOT, "public/labs", id);
export const ensureDir = (p) => (mkdirSync(p, { recursive: true }), p);
export const writeJson = (p, data) => (ensureDir(dirname(p)), writeFileSync(p, JSON.stringify(data)));
export const writeGz = (p, data) => (ensureDir(dirname(p)), writeFileSync(p, gzipSync(data, { level: 9 })));
/** Docker Desktop on Windows wants forward slashes. */
export const dockerPath = (p) => resolve(p).replace(/\/g, "/");

export function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} → exit ${r.status}`);
  return r;
}
