import { useEffect, useRef, useState } from "react";
import { commands, easterEggs, TOTAL_EGGS } from "../data/easterEggs";
import { graduationConfig } from "../config";
import type { SectionId } from "../types";

type Line = { kind: "in" | "out" | "err" | "sys"; text: string };

const PS1 = `${graduationConfig.name.split(" ")[0].toLowerCase()}@universita:~$`;

const WELCOME: Line[] = [
  { kind: "sys", text: "shell nascosta — sessione di recupero memoria" },
  { kind: "out", text: `Digita "help" per i comandi disponibili.` },
];

const QUICK = ["help", "about", "sudo graduate", "coffee --years 3"];

type Props = {
  found: string[];
  onOpenSection: (id: SectionId) => void;
  onClose: () => void;
};

export default function EasterEggs({ found, onOpenSection, onClose }: Props) {
  const [lines, setLines] = useState<Line[]>(WELCOME);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const run = (raw: string) => {
    const input = raw.trim();
    if (!input) return;

    setHistory((h) => [input, ...h].slice(0, 30));
    setCursor(-1);

    const [name, ...args] = input.split(/\s+/);
    const command = commands.find((c) => c.name === name.toLowerCase());

    if (!command) {
      setLines((l) => [
        ...l,
        { kind: "in", text: `${PS1} ${input}` },
        { kind: "err", text: `${name}: comando non trovato. Prova "help".` },
      ]);
      return;
    }

    if (command.name === "clear") {
      setLines([]);
      return;
    }

    const output = command.run(args).map<Line>((text) => ({ kind: "out", text }));
    setLines((l) => [...l, { kind: "in", text: `${PS1} ${input}` }, ...output]);

    if (command.name === "exit") window.setTimeout(onClose, 500);
    if (command.name === "thesis") window.setTimeout(() => onOpenSection("thesis"), 600);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = e.key === "ArrowUp" ? Math.min(cursor + 1, history.length - 1) : cursor - 1;
      setCursor(next);
      setValue(next < 0 ? "" : history[next]);
    }
  };

  return (
    <>
      <div className="terminal" style={{ height: "min(46dvh, 360px)" }}>
        <div className="terminal__out" ref={outRef} aria-live="polite">
          {lines.map((line, i) => (
            <div
              key={i}
              className={line.kind === "in" ? "cmd" : line.kind === "err" ? "err" : line.kind === "sys" ? "sys" : undefined}
            >
              {line.text}
            </div>
          ))}
        </div>

        <form
          className="terminal__form"
          onSubmit={(e) => {
            e.preventDefault();
            run(value);
            setValue("");
          }}
        >
          <span className="terminal__ps1" aria-hidden="true">
            {PS1}
          </span>
          <label className="sr-only" htmlFor="term-input">
            Comando
          </label>
          <input
            id="term-input"
            className="terminal__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
          />
        </form>
      </div>

      <div className="terminal__quick">
        {QUICK.map((q) => (
          <button key={q} onClick={() => run(q)}>
            {q}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <span className="eyebrow">
          Oggetti trovati — {found.length}/{TOTAL_EGGS}
        </span>
        <ul className="egg-list">
          {easterEggs.map((egg) => {
            const isFound = found.includes(egg.id);
            return (
              <li key={egg.id} className={isFound ? "is-found" : undefined}>
                <span className="dot" aria-hidden="true" />
                {isFound ? egg.label : "???"}
              </li>
            );
          })}
        </ul>
        {found.length < TOTAL_EGGS && (
          <p className="card__meta" style={{ marginTop: 12 }}>
            Guardati intorno nella stanza. Qualcosa reagisce al tocco.
          </p>
        )}
      </div>
    </>
  );
}
