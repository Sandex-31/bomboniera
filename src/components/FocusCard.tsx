import { credits } from "../data/credits";
import { exams } from "../data/exams";
import { projects } from "../data/projects";
import { thesis } from "../data/thesis";
import type { FocusId } from "../scenes/focus";
import { IconClose } from "./Icons";

type Card = {
  eyebrow: string;
  title: string;
  body: string;
  meta?: string[];
  note?: string;
};

/** What the visitor should touch when nothing is picked yet. */
const HINTS: Record<FocusId, string> = {
  exams: "Sfila un libro dallo scaffale",
  projects: "Tocca una riga sullo schermo",
  thesis: "Tocca un passaggio della timeline",
  credits: "",
};

function lookup(section: FocusId, id: string | null): Card | null {
  if (section === "credits") {
    // nothing to pick apart here — the roll on the screen is the whole scene
    const first = credits[0];
    return first ? { eyebrow: "lo schermo", title: "Grazie", body: first.body } : null;
  }
  if (!id) return null;

  if (section === "exams") {
    const exam = exams.find((e) => e.id === id);
    if (!exam) return null;
    const grade = exam.grade === 31 ? "30L" : exam.grade?.toString();
    return {
      eyebrow: `Anno ${exam.year} · ${exam.cfu} CFU${grade ? ` · ${grade}` : ""}`,
      title: exam.name,
      body: exam.description,
      meta: exam.topics,
      note: exam.personalNote,
    };
  }

  if (section === "projects") {
    const project = projects.find((p) => p.id === id);
    if (!project) return null;
    return {
      eyebrow: [project.year, project.course].filter(Boolean).join(" · "),
      title: project.title,
      body: project.summary,
      meta: project.tech,
    };
  }

  const index = Number(id.replace("step-", ""));
  const step = thesis.steps[index];
  if (!step) return null;
  return {
    eyebrow: `Passaggio ${index + 1} di ${thesis.steps.length}`,
    title: step.label,
    body: step.body,
  };
}

type Props = {
  section: FocusId;
  id: string | null;
  onClose: () => void;
  onMore: () => void;
};

/**
 * The read-out for whatever is picked inside a close-up. It lives in the DOM
 * rather than in the canvas so it stays legible on a phone and reachable by a
 * screen reader, while the picking itself stays in 3D.
 */
export default function FocusCard({ section, id, onClose, onMore }: Props) {
  const card = lookup(section, id);

  if (!card) {
    return (
      <p className="focus-hint" aria-live="polite">
        {HINTS[section]}
      </p>
    );
  }

  return (
    <article className="focus-card" aria-live="polite">
      <header className="focus-card__head">
        <div>
          <p className="focus-card__eyebrow">{card.eyebrow}</p>
          <h2>{card.title}</h2>
        </div>
        <button className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Chiudi la scheda">
          <IconClose />
        </button>
      </header>

      <p className="focus-card__body">{card.body}</p>

      {card.meta && card.meta.length > 0 && (
        <ul className="focus-card__meta">
          {card.meta.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      {card.note && <p className="focus-card__note">{card.note}</p>}

      <button className="focus-card__more" onClick={onMore}>
        Apri la scheda completa →
      </button>
    </article>
  );
}
