import { useEffect, useState } from "react";
import hljs from "highlight.js/lib/core";
import c from "highlight.js/lib/languages/c";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import yaml from "highlight.js/lib/languages/yaml";
import plaintext from "highlight.js/lib/languages/plaintext";
import { labsHash } from "./route";
import { labsUrl } from "./paths";

Object.entries({ c, java, javascript, json, sql, xml, css, markdown, python, yaml, plaintext }).forEach(([n, l]) => hljs.registerLanguage(n, l));

type Entry = { path: string; lang: string; size: number };
type Row = { kind: "dir"; name: string; depth: number; key: string } | { kind: "file"; entry: Entry; depth: number; key: string };

/** Flat sorted paths → rows with a folder line wherever a new folder starts. */
function rows(index: Entry[]): Row[] {
  const out: Row[] = [];
  let prev: string[] = [];
  for (const entry of index) {
    const dirs = entry.path.split("/").slice(0, -1);
    let same = 0;
    while (same < dirs.length && dirs[same] === prev[same]) same++;
    for (let d = same; d < dirs.length; d++) out.push({ kind: "dir", name: dirs[d], depth: d, key: dirs.slice(0, d + 1).join("/") + "/" });
    out.push({ kind: "file", entry, depth: dirs.length, key: entry.path });
    prev = dirs;
  }
  return out;
}

export default function CodeTab({ id, file }: { id: string; file?: string }) {
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(labsUrl(id, "code/index.json")).then((r) => r.json()).then(setIndex).catch(() => setError("Non riesco a leggere l'elenco dei file."));
  }, [id]);
  const current = index?.find((e) => e.path === file) ?? index?.find((e) => /(^|\/)readme\.md$/i.test(e.path)) ?? index?.[0];
  useEffect(() => {
    if (!current) return;
    setHtml("");
    fetch(labsUrl(id, "code", ...current.path.split("/").map(encodeURIComponent)))
      .then((r) => r.text())
      .then((t) => setHtml(hljs.highlight(t, { language: current.lang }).value)) // highlight() escapes the source
      .catch(() => setError(`Non riesco ad aprire ${current.path}.`));
  }, [id, current]);
  if (error) return <p className="empty">{error}</p>;
  if (!index) return <p className="labs-loading">leggo i sorgenti…</p>;
  return (
    <div className="code">
      <ul className="code-tree">
        {rows(index).map((r) =>
          r.kind === "dir" ? (
            <li key={r.key} className="code-dir" style={{ paddingLeft: `${r.depth * 12}px` }}>{r.name}/</li>
          ) : (
            <li key={r.key} title={r.entry.path} style={{ paddingLeft: `${r.depth * 12}px` }}>
              <a href={labsHash(id, "codice", r.entry.path)} aria-current={r.entry === current ? "page" : undefined}>{r.entry.path.split("/").pop()}</a>
            </li>
          ),
        )}
      </ul>
      <figure className="code-view">
        <figcaption>{current?.path}</figcaption>
        <pre><code className="hljs" dangerouslySetInnerHTML={{ __html: html }} /></pre>
      </figure>
    </div>
  );
}
