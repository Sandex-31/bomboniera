import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { HACK_KEY } from "../data/puzzle";

/**
 * Only letters count: spacing, case and punctuation are not part of the
 * answer, and the doubled L is in there because that is how the name gets
 * written as often as not. Whoever recognised the creature has answered.
 */
const ANSWERS = ["animalwell", "animallwell"];
const bare = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
export const accepts = (word: string) => ANSWERS.includes(bare(word));

/** What falls down the back of the panel. Nothing here means anything. */
const GLYPHS = "アイウエオカキクケコサシスセソタチツテト0123456789<>/{}[]#$%&@*";
const COLUMNS = 11;

/** The three lines that type themselves out when the terminal opens. */
const BOOT = [
  "> rotom.db --connect  ................ ok",
  "> livello 7 cifrato   ........... bloccato",
  "> richiesta: 2 PAROLE - 7 & 4",
];

/** How long the granted sequence runs before the cables are laid. */
const GRANTED_MS = 1900;

function rainColumn() {
  return Array.from({ length: 26 }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("");
}

/**
 * The way into the database: a word, typed in.
 *
 * Nothing on this screen says what the word is. It is the name of the thing
 * the machine drew on its tape, which is the only place it can be read —
 * this terminal is the second half of that puzzle, not a puzzle of its own.
 */
export default function Hack({ onSolved }: { onSolved: () => void }) {
  const [done] = useState(() => {
    try {
      return localStorage.getItem(HACK_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [value, setValue] = useState(done ? "ANIMAL WELL" : "");
  const [state, setState] = useState<"idle" | "wrong" | "granted">(done ? "granted" : "idle");
  /** Lines of the boot log shown so far. */
  const [lines, setLines] = useState(done ? BOOT.length : 0);
  const input = useRef<HTMLInputElement>(null);
  const rain = useMemo(
    () =>
      Array.from({ length: COLUMNS }, (_, i) => ({
        text: rainColumn(),
        left: (i / COLUMNS) * 100,
        dur: 5 + Math.random() * 6,
        delay: -Math.random() * 8,
      })),
    [],
  );

  // the log types itself out, one line at a time, then the field is live
  useEffect(() => {
    if (lines >= BOOT.length) return;
    const t = setTimeout(() => setLines((n) => n + 1), 420);
    return () => clearTimeout(t);
  }, [lines]);

  // a refused word shakes the panel and then clears itself
  useEffect(() => {
    if (state !== "wrong") return;
    const t = setTimeout(() => {
      setState("idle");
      setValue("");
    }, 1000);
    return () => clearTimeout(t);
  }, [state]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (state === "granted") return;
    if (!accepts(value)) {
      setState("wrong");
      return;
    }
    setState("granted");
    try {
      localStorage.setItem(HACK_KEY, "1");
    } catch {
      /* storage unavailable — the run still counts */
    }
    input.current?.blur();
    setTimeout(onSolved, GRANTED_MS);
  };

  const live = lines >= BOOT.length;

  return (
    <div className={`hack is-${state}`} onPointerDown={() => input.current?.focus()}>
      <div className="hack__rain" aria-hidden="true">
        {rain.map((c, i) => (
          <span
            key={i}
            style={{ left: `${c.left}%`, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
          >
            {c.text}
          </span>
        ))}
      </div>
      <div className="hack__veil" aria-hidden="true" />
      <div className="hack__scan" aria-hidden="true" />

      <ol className="hack__log">
        {BOOT.slice(0, lines).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>

      <form className="hack__form" onSubmit={submit}>
        <label className="hack__label" htmlFor="hack-word">
          chiave di accesso
        </label>
        <div className="hack__field">
          <input
            id="hack-word"
            ref={input}
            className="hack__input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (state === "wrong") setState("idle");
            }}
            disabled={!live || state === "granted"}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-describedby="hack-status"
          />
          <div className="hack__ghost" aria-hidden="true">
            {[...value].map((ch, i) => (
              <span key={i} className="hack__ch" style={{ "--d": `${i * 55}ms` } as CSSProperties}>
                {ch === " " ? " " : ch}
              </span>
            ))}
            {state !== "granted" && <b className="hack__caret" />}
          </div>
          <span className="hack__rule" />
        </div>

        <p className="hack__status" id="hack-status" role="status">
          {state === "granted" ? (
            <span className="hack__granted">ACCESSO CONSENTITO</span>
          ) : state === "wrong" ? (
            <span className="hack__denied">ACCESSO NEGATO</span>
          ) : live ? (
            "invio per confermare"
          ) : (
            "handshake in corso…"
          )}
        </p>
      </form>
    </div>
  );
}
