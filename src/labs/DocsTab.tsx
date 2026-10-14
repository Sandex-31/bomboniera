import { useEffect, useState } from "react";
import { labsUrl } from "./paths";

type Doc = { title: string; src: string; kind: "pdf" | "text" | "image" };
const docUrl = (id: string, d: Doc) => labsUrl(id, ...d.src.split("/").map(encodeURIComponent));

export default function DocsTab({ id }: { id: string }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [open, setOpen] = useState(0);
  const [text, setText] = useState("");
  useEffect(() => { fetch(labsUrl(id, "docs.json")).then((r) => r.json()).then(setDocs).catch(() => setDocs([])); }, [id]);
  const doc = docs?.[open];
  useEffect(() => {
    if (doc?.kind === "text") fetch(docUrl(id, doc)).then((r) => r.text()).then(setText).catch(() => setText("Documento non disponibile."));
  }, [id, doc]);
  if (!docs) return <p className="labs-loading">cerco i documenti…</p>;
  if (!docs.length) return <p className="empty">Per questo progetto non ci sono documenti oltre al codice.</p>;
  return (
    <div className="docs">
      <div className="tags">
        {docs.map((d, i) => <button key={d.src} className={`chip${i === open ? " chip--on" : ""}`} onClick={() => setOpen(i)}>{d.title}</button>)}
      </div>
      {doc?.kind === "pdf" && (
        <>
          <iframe className="docs-pdf" src={docUrl(id, doc)} title={doc.title} />
          {/* iOS shows only the first page of a PDF in an iframe */}
          <a className="link-btn" href={docUrl(id, doc)} target="_blank" rel="noreferrer noopener">APRI IL PDF ↗</a>
        </>
      )}
      {doc?.kind === "image" && <img className="docs-img" src={docUrl(id, doc)} alt={doc.title} />}
      {doc?.kind === "text" && <pre className="docs-text">{text}</pre>}
    </div>
  );
}
