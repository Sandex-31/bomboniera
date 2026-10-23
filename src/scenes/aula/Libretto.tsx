import { useTap } from "../Hotspot";
import { libretto, type AulaState } from "../../lib/aula/chain";
import { DESK_TOP, PLATFORM, SPOT_MARK } from "./spots";

/*
 * The libretto: the exams passed so far, each «superato» but Sistemi
 * Operativi, which has the grade the prof's mood gave it. It lies on the desk
 * beside the laptop, and the HUD has a button for it, so it opens from
 * anywhere in the hall.
 */

/** Where the booklet lies: on the desk, just right of the laptop, inside the desk's own spot. */
const AT: [number, number, number] = [0.42, DESK_TOP + 0.025, PLATFORM.z + 0.12];

/** The booklet on the desk. Walked up to the desk, a tap on it opens the libretto. */
export function Booklet({ onOpen }: { onOpen: () => void }) {
  const tap = useTap(onOpen);
  return (
    <group position={AT} rotation-y={-0.25} {...SPOT_MARK} {...tap}>
      <mesh>
        <boxGeometry args={[0.2, 0.03, 0.28]} />
        <meshStandardMaterial color="#7A1F2B" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.016, 0]}>
        <boxGeometry args={[0.17, 0.002, 0.25]} />
        <meshStandardMaterial color="#C9A64A" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

/** The button in the HUD, and the libretto open over the hall. */
export default function Libretto({
  state,
  open,
  hidden,
  onToggle,
}: {
  state: AulaState;
  open: boolean;
  /** A scene is playing: the button steps out of the way. */
  hidden: boolean;
  onToggle: (open: boolean) => void;
}) {
  const book = libretto(state);
  return (
    <>
      {!hidden && (
        <button type="button" className="libretto-btn" aria-expanded={open} onClick={() => onToggle(!open)}>
          libretto · {book.filter((e) => e.grade).length}/{book.length}
        </button>
      )}
      {open && (
        <div className="libretto" role="dialog" aria-label="Libretto universitario">
          <header>
            <h2>Libretto universitario</h2>
            <button type="button" className="libretto__close" aria-label="Chiudi il libretto" onClick={() => onToggle(false)}>
              ×
            </button>
          </header>
          <ol>
            {book.map((e) => (
              <li key={e.id} data-passed={e.grade !== null}>
                <span>{e.name}</span>
                <b>{e.grade ?? "—"}</b>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
