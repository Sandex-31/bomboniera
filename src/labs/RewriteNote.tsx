import { labsHash } from "./route";

/** Says plainly that a demo is a rewrite, and where the original code is. */
export default function RewriteNote({ id, files }: { id: string; files: string[] }) {
  return (
    <p className="rewrite-note">
      Riscrittura in TypeScript di {files.map((f, i) => <span key={f}>{i ? ", " : ""}<code>{f}</code></span>)}: stessa logica, nel browser.{" "}
      <a href={labsHash(id, "codice")}>Il codice originale →</a>
    </p>
  );
}
