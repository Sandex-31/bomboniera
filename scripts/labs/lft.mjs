import { execFileSync } from "node:child_process";
import { copyFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ensureDir, outDir, ROOT, TMP } from "./util.mjs";
import { SOURCES } from "./sources.mjs";

/** The handed-in LFT-5.2 sources, untouched, plus LabMain, compiled for Java 8 (CheerpJ's JVM). */
export default async function lft() {
  const src = join(SOURCES.lft.dir, "LFT-5.2/src");
  const { jdk } = SOURCES.lft;
  const classes = join(TMP, "lft-classes");
  rmSync(classes, { recursive: true, force: true });
  ensureDir(classes);
  const java = readdirSync(src).filter((f) => f.endsWith(".java")).map((f) => join(src, f));
  execFileSync(join(jdk, "javac"), ["--release", "8", "-nowarn", "-d", classes, "-cp", join(src, "jasmin.jar"), ...java, join(ROOT, "scripts/labs/lft/LabMain.java")], { stdio: "inherit" });
  const out = ensureDir(outDir("lft"));
  execFileSync(join(jdk, "jar"), ["cf", join(out, "lft.jar"), "-C", classes, "."], { stdio: "inherit" });
  copyFileSync(join(src, "jasmin.jar"), join(out, "jasmin.jar"));
  console.log(`  lft.jar: ${java.length} sorgenti + LabMain`);
}
