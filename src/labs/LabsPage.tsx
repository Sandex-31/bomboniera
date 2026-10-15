import { lazy, Suspense, type ComponentType } from "react";
import { projects } from "../data/projects";
import type { Project } from "../types";
import { labsHash, type LabsRoute, type LabsTab } from "./route";
import CodeTab from "./CodeTab";
import DocsTab from "./DocsTab";
import "./labs.css";

type Lab = NonNullable<Project["lab"]>;
const DEMOS: Record<Lab, ComponentType<{ id: string }>> = {
  asd: lazy(() => import("./asd/AsdLab")),
  sql: lazy(() => import("./sql/SqlLab")),
  site: lazy(() => import("./film/FilmLab")),
  mtdi: lazy(() => import("./mtdi/MtdiLab")),
};
const TRY: Record<Lab, string> = { asd: "esegui il codice C originale", sql: "interroga il database", site: "naviga il sito originale", mtdi: "gioca al banco delle scelte" };
const TABS: [LabsTab, string][] = [["prova", "Prova"], ["codice", "Codice"], ["documenti", "Documenti"]];

export default function LabsPage({ route }: { route: LabsRoute }) {
  const project = route.id ? projects.find((p) => p.id === route.id) : undefined;
  return (
    <main className="labs">
      <nav className="labs-bar">
        <a href={route.id ? labsHash() : "#/"} className="chip">← {route.id ? "tutti i progetti" : "torna alla stanza"}</a>
      </nav>
      {!route.id && <Index />}
      {route.id && !project && <p className="empty">Questo progetto non esiste. <a href={labsHash()}>Torna all&apos;elenco</a>.</p>}
      {project && <Shell project={project} route={route} />}
    </main>
  );
}

function Index() {
  return (
    <>
      <h1 className="labs-title">Laboratori</h1>
      <p className="labs-lead">I progetti degli esami, quelli veri: si usano, non si leggono.</p>
      <div className="card-list">
        {projects.map((p) => (
          <a key={p.id} className="card" href={labsHash(p.id)}>
            <div className="card__top"><span className="card__name">{p.title}</span></div>
            <div className="card__meta">{p.year}{p.course ? ` · ${p.course}` : ""}</div>
            <p className="card__summary">{p.summary}</p>
            {p.lab && <span className="tag tag--accent">{TRY[p.lab]} →</span>}
          </a>
        ))}
      </div>
    </>
  );
}

function Shell({ project, route }: { project: Project; route: LabsRoute }) {
  const tabs = TABS.filter(([t]) => (t !== "prova" || project.lab) && (t !== "codice" || !project.noCode));
  const tab: LabsTab = tabs.some(([t]) => t === route.tab) ? route.tab : tabs[0][0];
  const Demo = project.lab ? DEMOS[project.lab] : null;
  return (
    <>
      <span className="eyebrow">{project.year}{project.course ? ` · ${project.course}` : ""}</span>
      <h1 className="labs-title">{project.title}</h1>
      <p className="labs-lead">{project.description}</p>
      <div className="labs-tabs" role="tablist">
        {tabs.map(([t, label]) => (
          <a key={t} role="tab" aria-selected={t === tab} className={`chip${t === tab ? " chip--on" : ""}`} href={labsHash(project.id, t)}>{label}</a>
        ))}
      </div>
      <section className="labs-panel">
        {tab === "prova" && Demo && <Suspense fallback={<p className="labs-loading">carico la demo…</p>}><Demo id={project.id} /></Suspense>}
        {tab === "codice" && <CodeTab id={project.id} file={route.file} />}
        {tab === "documenti" && <DocsTab id={project.id} />}
      </section>
    </>
  );
}
