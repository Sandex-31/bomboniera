import { useEffect, useState } from "react";
import Keeper from "../Keeper";
import { SENIA_KEY, seniaLine } from "../../data/puzzle";
import { FILE, HUNKS, IUM_ANSWER, checkIum, resolve, type Side } from "../../lib/aula/ium";
import { LFT_ANSWER } from "../../lib/aula/lft";

/*
 * The projector: the page in conflict, every hunk its two halves to tap,
 * and beside it the page as a browser would draw it, broken wherever the
 * wrong half is kept. Under it the commit box. The first time the file is
 * opened, Senia calls before anything else. Once passed, the commit stays
 * on the screen as `git log --oneline` prints it.
 */

export default function Ium({
  passed,
  onTry,
  onScene,
  reduced,
  firstTry,
}: {
  passed: boolean;
  onTry: (ok: boolean) => void;
  onScene: (on: boolean) => void;
  reduced: boolean;
  /** No answer given yet: the only time the call may come, so it never rings over an appello. */
  firstTry: boolean;
}) {
  const [choices, setChoices] = useState<(Side | null)[]>(() => HUNKS.map(() => null));
  const [message, setMessage] = useState("");
  const [calling, setCalling] = useState(() => {
    if (passed || !firstTry) return false;
    try {
      return !localStorage.getItem(SENIA_KEY);
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (calling) onScene(true);
    // once, as the sheet opens
  }, []);
  const hangUp = () => {
    try {
      localStorage.setItem(SENIA_KEY, "1");
    } catch {
      // private mode: she calls again next time
    }
    setCalling(false);
    onScene(false);
  };

  const shown = passed ? HUNKS.map((h) => h.right) : choices;
  const pick = (i: number, side: Side) => setChoices((cs) => cs.map((c, k) => (k === i ? side : c)));
  const commit = () => {
    const ok = checkIum(choices, message);
    setMessage("");
    onTry(ok);
  };

  return (
    <div className="aula-ium">
      {calling && (
        <div className="aula-ium__call aula-sheet__keep">
          <p>
            <span aria-hidden="true">📞</span> chiamata in arrivo · Senia
          </p>
          <Keeper line={seniaLine} last reduced={reduced} onNext={hangUp} />
        </div>
      )}
      {/* our own constant markup, nothing a visitor typed: drawn as the browser would */}
      <div className="aula-ium__preview aula-sheet__keep" aria-label="L'anteprima della pagina" dangerouslySetInnerHTML={{ __html: resolve(shown) }} />
      <div className="aula-ium__file aula-sheet__keep">
        {FILE.map((l, k) =>
          typeof l === "string" ? (
            <pre key={k}>{l}</pre>
          ) : (
            <Hunk key={k} n={l} ours={HUNKS[l].ours} theirs={HUNKS[l].theirs} chosen={shown[l]} onPick={passed ? undefined : (s) => pick(l, s)} />
          ),
        )}
      </div>
      {passed ? (
        <p className="aula-ium__log">
          <span>{IUM_ANSWER}</span> {LFT_ANSWER}
        </p>
      ) : (
        <form
          className="aula-ium__commit"
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim()) commit();
          }}
        >
          <label>
            git commit -m{" "}
            <input value={message} maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <button type="submit" className="aula-stub" disabled={!message.trim() || choices.includes(null)}>
            commit
          </button>
        </form>
      )}
    </div>
  );
}

function Hunk({ n, ours, theirs, chosen, onPick }: { n: number; ours: string[]; theirs: string[]; chosen: Side | null; onPick?: (s: Side) => void }) {
  const half = (side: Side, lines: string[]) => (
    <button
      type="button"
      className="aula-ium__half"
      aria-pressed={chosen === side}
      data-dropped={chosen !== null && chosen !== side}
      aria-label={`conflitto ${n + 1}: tieni ${side === "ours" ? "HEAD" : "senia"}`}
      onClick={() => onPick?.(side)}
    >
      {lines.join("\n")}
    </button>
  );
  return (
    <div className="aula-ium__hunk">
      <pre>{"<<<<<<< HEAD"}</pre>
      {half("ours", ours)}
      <pre>=======</pre>
      {half("theirs", theirs)}
      <pre>{">>>>>>> senia"}</pre>
    </div>
  );
}
