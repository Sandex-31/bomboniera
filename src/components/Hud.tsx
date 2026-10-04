import { graduationConfig } from "../config";
import { TOTAL_EGGS } from "../data/easterEggs";
import type { FocusId } from "../scenes/focus";
import type { SectionId } from "../types";
import { IconBooks, IconDoor, IconMap, IconMonitor, IconScroll, IconTerminal } from "./Icons";

const DOCK: { id: SectionId; label: string; Icon: typeof IconBooks }[] = [
  { id: "exams", label: "Esami", Icon: IconBooks },
  { id: "projects", label: "Progetti", Icon: IconMonitor },
  { id: "thesis", label: "Tesi", Icon: IconScroll },
  { id: "terminal", label: "Terminale", Icon: IconTerminal },
  { id: "credits", label: "Grazie", Icon: IconDoor },
];

type Props = {
  active: SectionId | null;
  /** Set when the camera is inside a close-up rather than on the wide shot. */
  focus: FocusId | null;
  foundCount: number;
  guestLabel?: string;
  onOpen: (id: SectionId) => void;
  onExitFocus: () => void;
  onOpenList: () => void;
  onResetView: () => void;
};

/**
 * Persistent overlay. It is also the keyboard path into every area, since
 * meshes inside the canvas cannot receive focus.
 */
export default function Hud({
  active,
  focus,
  foundCount,
  guestLabel,
  onOpen,
  onExitFocus,
  onOpenList,
  onResetView,
}: Props) {
  return (
    <div className="hud">
      <div className="hud__top">
        <div className="hud__id">
          <h1>{graduationConfig.handle}</h1>
          <p>
            {guestLabel ? `per ${guestLabel} · ` : ""}
            {graduationConfig.degree} · {graduationConfig.year}
          </p>
        </div>
        <div className="hud__tools">
          <button
            className="icon-btn"
            onClick={() => onOpen("terminal")}
            aria-label={`Easter egg trovati: ${foundCount} su ${TOTAL_EGGS}`}
          >
            <IconTerminal />
            {foundCount > 0 && (
              <span className="icon-btn__count" aria-hidden="true">
                {foundCount}
              </span>
            )}
          </button>
          <button className="icon-btn" onClick={onResetView} aria-label="Ricentra la stanza">
            <IconMap />
          </button>
        </div>
      </div>

      <div className="hud__bottom">
        {focus ? (
          <div className="hud__focus">
            <button className="ghost-btn" onClick={onExitFocus}>
              ← Stanza
            </button>
            <button className="ghost-btn" onClick={onOpenList}>
              Elenco completo
            </button>
          </div>
        ) : (
          <p className="hud__hint">
            {active ? "← torna alla stanza" : "tocca gli oggetti per esplorare"}
          </p>
        )}
        <nav className="dock" id="dock" aria-label="Aree della stanza">
          {DOCK.map(({ id, label, Icon }) => (
            <button
              key={id}
              className="dock__btn"
              aria-current={active === id}
              onClick={() => onOpen(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
