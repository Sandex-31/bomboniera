import { useMemo, useState } from "react";
import { exams } from "../data/exams";
import type { Exam } from "../types";

const formatGrade = (g: number) => (g >= 31 ? "30L" : String(g));

function Detail({ exam, onBack }: { exam: Exam; onBack: () => void }) {
  return (
    <div className="detail">
      <button className="chip" onClick={onBack} style={{ marginBottom: 16 }}>
        ← tutti gli esami
      </button>
      <span className="eyebrow">
        {exam.year}º anno · {exam.cfu} CFU
        {exam.grade !== undefined ? ` · voto ${formatGrade(exam.grade)}` : ""}
      </span>
      <h3>{exam.name}</h3>
      <p>{exam.description}</p>

      {exam.topics.length > 0 && (
        <div className="tags">
          {exam.topics.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}

      {exam.personalNote && (
        <p className="note">
          <small>nota personale</small>
          {exam.personalNote}
        </p>
      )}
    </div>
  );
}

export default function Exams() {
  const [year, setYear] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const years = useMemo(
    () => [...new Set(exams.map((e) => e.year))].sort((a, b) => a - b),
    [],
  );
  const visible = year === null ? exams : exams.filter((e) => e.year === year);
  const open = exams.find((e) => e.id === openId) ?? null;

  const graded = exams.filter((e) => e.grade !== undefined);
  const average = graded.length
    ? (graded.reduce((s, e) => s + (e.grade ?? 0), 0) / graded.length).toFixed(1)
    : "—";
  const cfu = exams.reduce((s, e) => s + e.cfu, 0);

  if (open) return <Detail exam={open} onBack={() => setOpenId(null)} />;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{exams.length}</b>
          <span>esami</span>
        </div>
        <div className="stat">
          <b>{cfu}</b>
          <span>CFU</span>
        </div>
        <div className="stat">
          <b>{average}</b>
          <span>media</span>
        </div>
      </div>

      <div className="filters" role="group" aria-label="Filtra per anno">
        <button className="chip" aria-pressed={year === null} onClick={() => setYear(null)}>
          tutti
        </button>
        {years.map((y) => (
          <button key={y} className="chip" aria-pressed={year === y} onClick={() => setYear(y)}>
            {y}º anno
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty">Nessun esame per questo filtro.</p>
      ) : (
        <div className="card-list">
          {visible.map((exam) => (
            <button key={exam.id} className="card" onClick={() => setOpenId(exam.id)}>
              <div className="card__top">
                <span className="card__name">{exam.name}</span>
                {exam.grade !== undefined && (
                  <span className="card__grade">{formatGrade(exam.grade)}</span>
                )}
              </div>
              <div className="card__meta">
                {exam.year}º anno · {exam.cfu} CFU
              </div>
              <p className="card__summary">{exam.description}</p>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
