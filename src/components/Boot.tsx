import { useEffect, useRef, useState } from "react";
import { graduationConfig } from "../config";
import { usePrefersReducedMotion } from "../hooks";

const LINES = [
  "BOOTING UNIVERSITY.OS",
  "",
  "mounting /home/salvatore ........ <b>ok</b>",
  "loading memories ................ <b>ok</b>",
  "loading exams ................... <b>ok</b>",
  "loading projects ................ <b>ok</b>",
  "loading thesis .................. <b>ok</b>",
  "checking caffeine levels ........ <b>low</b>",
];

type Props = {
  /** Shown instead of the generic welcome when the QR carried a guest slug. */
  guestMessage?: string;
  /** true when this browser has already seen the full sequence. */
  seen: boolean;
  onStart: () => void;
};

export default function Boot({ guestMessage, seen, onStart }: Props) {
  const reduced = usePrefersReducedMotion();
  const instant = seen || reduced;

  const [shown, setShown] = useState(() => (instant ? LINES.length : 0));
  const [leaving, setLeaving] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);

  const done = shown >= LINES.length;
  const progress = Math.round((shown / LINES.length) * 100);

  useEffect(() => {
    if (instant) return;
    const id = window.setInterval(
      () => setShown((n) => (n >= LINES.length ? n : n + 1)),
      210,
    );
    return () => window.clearInterval(id);
  }, [instant]);

  // Move focus to START as soon as it appears, so the keyboard path is unbroken.
  useEffect(() => {
    if (done) startRef.current?.focus();
  }, [done]);

  const start = () => {
    if (reduced) return onStart();
    setLeaving(true);
    window.setTimeout(onStart, 460);
  };

  return (
    <div className={`boot${leaving ? " is-leaving" : ""}`} role="dialog" aria-label="Avvio">
      <div className="boot__inner">
        <p className="boot__name">{graduationConfig.handle}</p>
        <p className="boot__sub">
          <strong>{graduationConfig.degree}</strong> — {graduationConfig.university}
          <br />
          Graduation {graduationConfig.year}
        </p>

        <p className="boot__log" aria-live="polite">
          {LINES.slice(0, shown).map((line, i) => (
            <span key={i} dangerouslySetInnerHTML={{ __html: line + "\n" }} />
          ))}
          {done && <span>{"\nSYSTEM READY"}</span>}
        </p>

        <div className="boot__bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${progress}%` }} />
        </div>

        {guestMessage && done && (
          <p className="boot__sub" style={{ marginTop: 22, marginBottom: 0 }}>
            {guestMessage}
          </p>
        )}

        <div className="boot__actions">
          {done ? (
            <button ref={startRef} className="btn btn--primary" onClick={start}>
              PRESS START
            </button>
          ) : (
            <button className="btn btn--ghost" onClick={() => setShown(LINES.length)}>
              salta intro →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
