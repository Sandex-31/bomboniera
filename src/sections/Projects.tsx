import { useState } from "react";
import { projects } from "../data/projects";
import type { Project } from "../types";
import Media from "../components/Media";
import { labsHash } from "../labs/route";

const label = (i: number) => `PROJECT #${String(i + 1).padStart(2, "0")}`;

function Detail({ project, index, onBack }: { project: Project; index: number; onBack: () => void }) {
  return (
    <div className="detail">
      <button className="chip" onClick={onBack} style={{ marginBottom: 16 }}>
        ← tutti i progetti
      </button>
      <span className="eyebrow">
        {label(index)} · {project.year}
        {project.course ? ` · ${project.course}` : ""}
      </span>
      <h3>{project.title}</h3>
      <p>{project.description}</p>

      <div className="tags">
        {project.tech.map((t) => (
          <span className="tag tag--accent" key={t}>
            {t}
          </span>
        ))}
      </div>

      <Media items={project.media} />

      <div className="links">
        <a className="link-btn" href={labsHash(project.id)}>
          APRI IL LABORATORIO <span aria-hidden="true">→</span>
        </a>
        {project.github && (
          <a className="link-btn" href={project.github} target="_blank" rel="noreferrer noopener">
            GITHUB <span aria-hidden="true">↗</span>
          </a>
        )}
        {project.demo && (
          <a className="link-btn" href={project.demo} target="_blank" rel="noreferrer noopener">
            DEMO <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </div>
  );
}

export default function Projects() {
  const [openId, setOpenId] = useState<string | null>(null);
  const index = projects.findIndex((p) => p.id === openId);

  if (index >= 0) {
    return <Detail project={projects[index]} index={index} onBack={() => setOpenId(null)} />;
  }

  if (projects.length === 0) {
    return <p className="empty">La vetrina è ancora vuota.</p>;
  }

  return (
    <div className="card-list">
      {projects.map((project, i) => (
        // a link can't live inside the card's button, so it sits right under it
        <div key={project.id} className="card-wrap">
          <button className="card" onClick={() => setOpenId(project.id)}>
            <div className="card__top">
              <span className="card__name">{project.title}</span>
              <span className="card__grade">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="card__meta">
              {project.year}
              {project.course ? ` · ${project.course}` : ""}
            </div>
            <p className="card__summary">{project.summary}</p>
            <div className="tags">
              {project.tech.slice(0, 4).map((t) => (
                <span className="tag tag--accent" key={t}>
                  {t}
                </span>
              ))}
              {project.tech.length > 4 && <span className="tag">+{project.tech.length - 4}</span>}
            </div>
          </button>
          <a className="card__lab" href={labsHash(project.id)}>
            apri il laboratorio →
          </a>
        </div>
      ))}
    </div>
  );
}
