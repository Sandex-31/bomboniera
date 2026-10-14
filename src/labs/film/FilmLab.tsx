import { useEffect, useState } from "react";
import { labsUrl } from "../paths";

type Chart = { src: string; caption: string; title: string };

export default function FilmLab({ id }: { id: string }) {
  const [charts, setCharts] = useState<Chart[]>([]);
  useEffect(() => {
    fetch(labsUrl(id, "charts/index.json")).then((r) => r.json()).then(setCharts).catch(() => {});
  }, [id]);
  const site = labsUrl(id, "site/index.html");
  return (
    <div className="film">
      <p className="demo-badge">film veri da Wikidata · recensioni e chat generate per la demo</p>
      <div className="film-frame">
        <iframe src={site} title="Film Data Web App, il frontend originale" loading="lazy" />
      </div>
      <a className="link-btn" href={site} target="_blank" rel="noreferrer noopener">APRI A SCHERMO INTERO ↗</a>
      {charts.length > 0 && (
        <>
          <h4>Dal notebook di analisi (IUM), sui dati veri del dataset</h4>
          <div className="film-charts">
            {charts.map((c) => (
              <figure key={c.src}>
                <iframe src={`${labsUrl(id, "charts/view.html")}?f=${c.src.split("/").pop()}`} title={c.title} loading="lazy" />
                <figcaption>{c.caption}</figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
