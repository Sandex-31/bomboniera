import { useEffect, useRef, useState } from "react";
import { PHRASES, rightSlots, titlesDone } from "../data/babel";
import { TITLES_KEY } from "../data/puzzle";

/*
 * The six slots on the lid: one for the work each phrase on the wall comes
 * from, in whatever order. A slot lights as soon as it names one of them,
 * and the lid opens on the sixth.
 */

export function loadSlots(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(TITLES_KEY) ?? "[]");
    const strings = Array.isArray(list) ? list.map((s) => (typeof s === "string" ? s : "")) : [];
    return PHRASES.map((_, i) => strings[i] ?? "");
  } catch {
    return PHRASES.map(() => "");
  }
}

export default function Sarcophagus({ onDone }: { onDone: () => void }) {
  const [slots, setSlots] = useState(loadSlots);
  /** Whether the lid has been told: once, and not again for a lid already open. */
  const told = useRef(titlesDone(slots));
  const right = rightSlots(slots);

  useEffect(() => {
    try {
      localStorage.setItem(TITLES_KEY, JSON.stringify(slots));
    } catch {
      /* storage unavailable — the titles are only lost on reload */
    }
    if (told.current || !titlesDone(slots)) return;
    told.current = true;
    onDone();
  }, [slots, onDone]);

  return (
    <div className="sarc">
      <ol className="sarc__slots">
        {slots.map((value, i) => (
          <li key={i}>
            <input
              className={`sarc__slot${right[i] ? " is-right" : ""}`}
              value={value}
              onChange={(e) => setSlots((was) => was.map((s, j) => (j === i ? e.target.value : s)))}
              aria-label={`Titolo ${i + 1}`}
              autoComplete="off"
              spellCheck={false}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
