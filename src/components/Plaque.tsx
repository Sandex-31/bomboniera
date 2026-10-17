import { useState, type FormEvent } from "react";
import { PHRASES, acceptsPhrase } from "../data/babel";
import Glyphs from "./Glyphs";

/**
 * One of the six slabs in the wall, up close: the phrase in its script, and
 * a line to write it in Italian. Only the letters are compared. Once read it
 * says what it says, in Italian, and asks for nothing more.
 */
export default function Plaque({
  index,
  solved,
  onSolved,
}: {
  index: number;
  solved: boolean;
  onSolved: () => void;
}) {
  const phrase = PHRASES[index];
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (acceptsPhrase(index, value)) return onSolved();
    setWrong(true);
    setValue("");
  };

  return (
    <div className={`plaque${solved ? " is-solved" : ""}`}>
      <p className="plaque__text">
        <Glyphs script={phrase.script} text={phrase.text} size={26} />
      </p>
      {solved ? (
        <p className="plaque__it">{phrase.text}</p>
      ) : (
        <form className={`plaque__form${wrong ? " is-wrong" : ""}`} onSubmit={submit} onAnimationEnd={() => setWrong(false)}>
          <input
            className="plaque__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="scrivila in italiano…"
            aria-label="La frase, in italiano"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="plaque__go">Traduci</button>
        </form>
      )}
    </div>
  );
}
