import type { Pick } from "./Room";
import {
  IconBooks,
  IconCan,
  IconDoor,
  IconMonitor,
  IconPerson,
  IconScroll,
  IconTerminal,
} from "../components/Icons";

const AREAS = [
  { pick: { kind: "section", id: "projects" }, name: "Progetti", meta: "la scrivania", Icon: IconMonitor },
  { pick: { kind: "section", id: "exams" }, name: "Esami", meta: "la libreria", Icon: IconBooks },
  { pick: { kind: "section", id: "thesis" }, name: "Tesi", meta: "il piedistallo", Icon: IconScroll },
  { pick: { kind: "section", id: "credits" }, name: "Grazie", meta: "la porta", Icon: IconDoor },
  { pick: { kind: "egg", id: "terminal" }, name: "Terminale", meta: "sotto la scrivania", Icon: IconTerminal },
  { pick: { kind: "egg", id: "monster" }, name: "Monster", meta: "oggetto nascosto", Icon: IconCan },
  { pick: { kind: "egg", id: "laura" }, name: "Laura", meta: "oggetto nascosto", Icon: IconPerson },
] as const;

/**
 * Shown when WebGL is unavailable or the 3D chunk fails to load.
 * Same six destinations, no canvas — nobody ends up on a blank screen.
 */
export default function RoomFallback({ onPick }: { onPick: (pick: Pick) => void }) {
  return (
    <div className="fallback">
      <div className="fallback__inner">
        <p className="fallback__note">
          Questo dispositivo non supporta la stanza in 3D.
          <br />
          La mostra resta completamente esplorabile qui sotto.
        </p>
        <div className="fallback__grid">
          {AREAS.map(({ pick, name, meta, Icon }) => (
            <button key={name} className="tile" onClick={() => onPick(pick as Pick)}>
              <Icon size={22} />
              <b>{name}</b>
              <span>{meta}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
