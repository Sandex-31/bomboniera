import { useEffect, useState } from "react";

/** Milliseconds a letter takes to appear. */
const CHAR_MS = 28;

/**
 * The keeper's line, typed out rather than dropped on the screen whole.
 *
 * The button skips to the end of the line before it moves on, because someone
 * who reads faster than this should not have to wait for it — and someone who
 * has seen the line before should not have to watch it twice.
 */
export default function Keeper({
  line,
  last,
  reduced,
  onNext,
}: {
  line: string;
  last: boolean;
  reduced: boolean;
  onNext: () => void;
}) {
  const [shown, setShown] = useState(0);

  // a new line starts from nothing; reduced motion gets it all at once
  useEffect(() => setShown(reduced ? line.length : 0), [line, reduced]);

  useEffect(() => {
    if (shown >= line.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => clearTimeout(t);
  }, [shown, line]);

  const done = shown >= line.length;

  return (
    <div className={`keeper${done ? " is-said" : ""}`}>
      <p className="keeper__text">
        {line.slice(0, shown)}
        {!done && <span className="keeper__caret" />}
      </p>
      <button className="keeper__next" onClick={() => (done ? onNext() : setShown(line.length))}>
        {done ? (last ? "Ho capito" : "Avanti") : "Salta"}
      </button>
    </div>
  );
}
