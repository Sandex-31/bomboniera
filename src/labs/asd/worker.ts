/// <reference lib="webworker" />
type Msg = { url: string; args: string[]; files: Record<string, Uint8Array | string>; readBack?: string };
type EmModule = {
  callMain(args: string[]): number | undefined;
  FS: { writeFile(p: string, d: Uint8Array | string): void; readFile(p: string, o: { encoding: "utf8" }): string };
};

const post = (m: unknown) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = async (e: MessageEvent<Msg>) => {
  const { url, args, files, readBack } = e.data;
  const t0 = performance.now();
  try {
    const factory = (await import(/* @vite-ignore */ url)).default as (o: object) => Promise<EmModule>;
    const mod = await factory({ print: (line: string) => post({ type: "line", line }), printErr: (line: string) => post({ type: "line", line }) });
    for (const [p, data] of Object.entries(files)) mod.FS.writeFile(p, data);
    let code = 0;
    try {
      code = mod.callMain(args) ?? 0;
    } catch (err) {
      if ((err as { name?: string }).name !== "ExitStatus") throw err;
      code = (err as { status: number }).status;
    }
    let output: string | undefined;
    if (readBack) {
      try {
        output = mod.FS.readFile(readBack, { encoding: "utf8" }).split("\n").slice(0, 300).join("\n");
      } catch {
        output = undefined;
      }
    }
    post({ type: "exit", code, output, ms: Math.round(performance.now() - t0) });
  } catch (err) {
    post({ type: "line", line: `errore: ${(err as Error).message}` });
    post({ type: "exit", code: -1, ms: Math.round(performance.now() - t0) });
  }
};
