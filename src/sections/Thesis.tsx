import { thesis } from "../data/thesis";
import Media from "../components/Media";

export default function Thesis() {
  return (
    <div className="detail">
      <span className="eyebrow">{thesis.subtitle ?? "Tesi di laurea"}</span>
      <h3>{thesis.title}</h3>
      {thesis.supervisor && (
        <p className="card__meta" style={{ marginTop: 8 }}>
          Relatore · {thesis.supervisor}
        </p>
      )}

      <p style={{ marginTop: 16 }}>{thesis.abstract}</p>

      {thesis.tech.length > 0 && (
        <div className="tags">
          {thesis.tech.map((t) => (
            <span className="tag tag--accent" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}

      <ol className="flow">
        {thesis.steps.map((step) => (
          <li key={step.label}>
            <h4>{step.label}</h4>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>

      {thesis.architecture?.length ? (
        <>
          <span className="eyebrow">Architettura</span>
          <ul className="list-plain">
            {thesis.architecture.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </>
      ) : null}

      {thesis.results?.length ? (
        <div style={{ marginTop: 22 }}>
          <span className="eyebrow">Risultati</span>
          <ul className="list-plain">
            {thesis.results.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Media items={thesis.media} />

      {(thesis.pdf || thesis.repo) && (
        <div className="links">
          {thesis.pdf && (
            <a className="link-btn" href={thesis.pdf} target="_blank" rel="noreferrer noopener">
              PDF <span aria-hidden="true">↗</span>
            </a>
          )}
          {thesis.repo && (
            <a className="link-btn" href={thesis.repo} target="_blank" rel="noreferrer noopener">
              REPOSITORY <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
