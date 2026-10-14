export type RunResult = { code: number | null; output?: string; ms: number };

/** One fresh worker per run: an emscripten instance can't run main twice, and terminate() is the only real "stop". */
export function runProgram(opts: {
  url: string;
  args: string[];
  files: Record<string, Uint8Array | string>;
  readBack?: string;
  onLine: (l: string) => void;
}) {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const t0 = Date.now();
  let settled = false;
  let finish!: (r: RunResult) => void;
  const done = new Promise<RunResult>((resolve) => {
    finish = (r) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };
  });
  worker.onmessage = (e: MessageEvent) => {
    if (e.data.type === "line") opts.onLine(e.data.line);
    if (e.data.type === "exit") {
      worker.terminate();
      finish({ code: e.data.code, output: e.data.output, ms: e.data.ms });
    }
  };
  worker.postMessage({ url: opts.url, args: opts.args, files: opts.files, readBack: opts.readBack });
  return {
    done,
    stop() {
      worker.terminate();
      finish({ code: null, ms: Date.now() - t0 });
    },
  };
}
