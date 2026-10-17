import { useEffect, useState } from "react";
import { unlockedChats, type Chat } from "../data/babel";
import { CHAT_KEY } from "../data/puzzle";
import Folk, { FolkHead } from "./Folk";
import Glyphs from "./Glyphs";

/*
 * The terminal in the column: conversations overheard between the peoples of
 * Babel, each in their own script, never translated. What they are about is
 * only ever shown, by the two figures acting it out over the messages.
 */

/** How long between one message and the next, as if typed. */
const LINE_MS = 1100;

function loadSeen(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export default function Chats({ solved, reduced }: { solved: number[]; reduced: boolean }) {
  const [seen, setSeen] = useState(loadSeen);
  const [open, setOpen] = useState<Chat | null>(null);
  /** Messages of the open chat showing so far. */
  const [shown, setShown] = useState(0);

  const enter = (chat: Chat) => {
    setOpen(chat);
    setShown(reduced ? chat.lines.length : 1);
    if (seen.includes(chat.id)) return;
    const next = [...seen, chat.id];
    setSeen(next);
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — it is only the «nuova» tag that comes back */
    }
  };

  useEffect(() => {
    if (!open || shown >= open.lines.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), LINE_MS);
    return () => clearTimeout(t);
  }, [open, shown]);

  if (!open)
    return (
      <div className="chats">
        <ul className="chats__list">
          {unlockedChats(solved).map((c) => (
            <li key={c.id}>
              <button className="chats__row" onClick={() => enter(c)}>
                <FolkHead script={c.who[0]} />
                <FolkHead script={c.who[1]} />
                {!seen.includes(c.id) && <span className="chats__new">nuova</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="chats">
      <div className="chats__bar">
        <button onClick={() => setOpen(null)} aria-label="Torna alla lista">
          ←
        </button>
        <button onClick={() => setShown(reduced ? open.lines.length : 1)} aria-label="Ricomincia la conversazione">
          ↻
        </button>
      </div>
      <Folk who={open.who} scene={open.scene} reduced={reduced} />
      <ol className="chats__lines">
        {open.lines.slice(0, shown).map((l, i) => (
          <li key={i} className={`chats__line chats__line--${l.by ? "b" : "a"}`}>
            <Glyphs script={open.who[l.by]} text={l.text} size={20} />
          </li>
        ))}
      </ol>
    </div>
  );
}
