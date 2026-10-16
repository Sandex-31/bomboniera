import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { SAGOME_KEY } from "../data/puzzle";
import { CHARACTERS, bootAccepts, judge } from "../lib/sagome";

/** How long a refused word shakes before the field clears itself. */
const WRONG_MS = 1000;

/** How far a finger has to travel sideways to count as a swipe. */
const SWIPE = 40;

/**
 * One field, one word. A word it refuses shakes the field and then clears
 * itself, the way the terminal does; a word it takes is the caller's business.
 */
function Word({
  id,
  label,
  hint,
  refused,
  onWord,
}: {
  id: string;
  label: string;
  hint?: string;
  /** What a refused word is told. */
  refused: string;
  /** True when the word was taken. */
  onWord: (word: string) => boolean;
}) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  useEffect(() => {
    if (!wrong) return;
    const t = setTimeout(() => {
      setWrong(false);
      setValue("");
    }, WRONG_MS);
    return () => clearTimeout(t);
  }, [wrong]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || wrong) return;
    if (!onWord(value)) setWrong(true);
  };

  return (
    <form className={`sagome__word${wrong ? " is-wrong" : ""}`} onSubmit={submit}>
      <label className="sagome__label" htmlFor={id}>
        {label}
      </label>
      {hint && <p className="sagome__hint">{hint}</p>}
      <input
        id={id}
        ref={input}
        className="sagome__input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-invalid={wrong}
      />
      <p className="sagome__status" role="status">
        {wrong ? refused : "invio per confermare"}
      </p>
    </form>
  );
}

/**
 * The window of silhouettes.
 *
 * It starts on a three-letter word, which is what the mirrors drew. Then it
 * is a lightbox: one black shape at a time, and a button to say who it is.
 * Every name is right for somebody, and a right name earns only a laugh —
 * except that one of them answers to a second word.
 */
export default function Sagome({
  onBravo,
  onTombino,
}: {
  onBravo: () => void;
  onTombino: () => void;
}) {
  const [booted, setBooted] = useState(() => {
    try {
      return localStorage.getItem(SAGOME_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [at, setAt] = useState(0);
  const [asking, setAsking] = useState(false);
  const swipe = useRef<number | null>(null);

  const step = (by: number) => {
    setAsking(false);
    setAt((n) => (n + by + CHARACTERS.length) % CHARACTERS.length);
  };

  if (!booted) {
    return (
      <div className="sagome sagome--boot">
        <p className="sagome__boot">archivio sagome · accesso riservato</p>
        <Word
          id="sagome-boot"
          label="parola d'avvio · 3 lettere"
          refused="PAROLA ERRATA"
          onWord={(word) => {
            if (!bootAccepts(word)) return false;
            try {
              localStorage.setItem(SAGOME_KEY, "1");
            } catch {
              /* storage unavailable — it stays started for this visit */
            }
            setBooted(true);
            return true;
          }}
        />
      </div>
    );
  }

  const character = CHARACTERS[at];

  return (
    <div
      className="sagome"
      onKeyDown={(e) => {
        if (asking) return;
        if (e.key === "ArrowLeft") step(-1);
        if (e.key === "ArrowRight") step(1);
      }}
    >
      <div
        className="sagome__light"
        tabIndex={0}
        aria-label={`Sagoma ${at + 1} di ${CHARACTERS.length}`}
        onPointerDown={(e: PointerEvent) => {
          swipe.current = e.clientX;
        }}
        onPointerUp={(e: PointerEvent) => {
          const from = swipe.current;
          swipe.current = null;
          if (from === null || asking) return;
          if (e.clientX - from > SWIPE) step(-1);
          else if (from - e.clientX > SWIPE) step(1);
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {/* all of them at once, only one shown: the next one is never a load away */}
        {CHARACTERS.map((c, i) => (
          <img
            key={c.id}
            className={`sagome__shape${i === at ? " is-on" : ""}`}
            src={c.file}
            alt=""
            draggable={false}
          />
        ))}

        {asking && (
          <div className="sagome__ask">
            <Word
              key={character.id}
              id="sagome-name"
              label="chi è?"
              hint="indizio: Giapponese"
              refused="NON È LUI"
              onWord={(word) => {
                const verdict = judge(character.id, word);
                if (verdict === "wrong") return false;
                setAsking(false);
                if (verdict === "tombino") onTombino();
                else onBravo();
                return true;
              }}
            />
            <button type="button" className="sagome__cancel" onClick={() => setAsking(false)}>
              annulla
            </button>
          </div>
        )}
      </div>

      <div className="sagome__bar">
        <button type="button" className="sagome__arrow" onClick={() => step(-1)} aria-label="Sagoma precedente">
          ‹
        </button>
        <ol className="sagome__dots" aria-hidden="true">
          {CHARACTERS.map((c, i) => (
            <li key={c.id} className={i === at ? "is-on" : undefined} />
          ))}
        </ol>
        <button type="button" className="sagome__arrow" onClick={() => step(1)} aria-label="Sagoma successiva">
          ›
        </button>
      </div>

      <button type="button" className="sagome__accept" onClick={() => setAsking(true)} disabled={asking}>
        accetta
      </button>
    </div>
  );
}
