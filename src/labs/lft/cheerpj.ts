import { labsUrl } from "../paths";

const LOADER = "https://cjrtnc.leaningtech.com/4.3/loader.js"; // pinned; checked with a probe on 2026-10-15

declare global {
  function cheerpjInit(o?: object): Promise<void>;
  function cheerpjRunMain(cls: string, cp: string, ...args: string[]): Promise<number>;
  function cheerpOSAddStringFile(path: string, data: string): void;
  function cjFileBlob(path: string): Promise<Blob>;
}

let ready: Promise<void> | null = null;
/** CheerpJ is ~20 MB: fetched on the first run only, never when the page opens. */
function load() {
  ready ??= new Promise<void>((ok, ko) => {
    const s = document.createElement("script");
    s.src = LOADER;
    s.onload = () => cheerpjInit({ status: "none" }).then(ok, ko);
    s.onerror = () => { ready = null; ko(new Error("Il runtime Java non si è caricato")); };
    document.head.append(s);
  });
  return ready;
}

/** CheerpJ mounts this origin under /app. */
const appPath = (file: string) => "/app" + new URL(labsUrl("lft", file)).pathname;

let runs = 0;
export async function runLft(program: string, input: string) {
  await load();
  const n = ++runs; // /str files cannot be replaced: fresh names every run
  const prefix = `/str/lft${n}-`;
  cheerpOSAddStringFile(`${prefix}text.txt`, program);
  cheerpOSAddStringFile(`${prefix}input.txt`, input.trim() + "\n");
  const work = `/files/lft${n}/`;
  await cheerpjRunMain("LabMain", `${appPath("lft.jar")}:${appPath("jasmin.jar")}`, prefix, work);
  // a missing file (no Output.j after a syntax error) resolves to null rather than rejecting
  const read = (f: string) => cjFileBlob(work + f).then((b) => (b ? b.text() : ""), () => "");
  return { out: await read("out.txt"), jasmin: await read("Output.j") };
}
