import { useMemo, useRef, useState, type PointerEvent, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { PIECES, SLOTS, type MuralState, type PieceId } from "../lib/well/mural";
import { FLOORS, SIZE } from "../lib/beam";
import { COLS as MAZE_COLS, ROWS as MAZE_ROWS, letterPath } from "../lib/maze";
import { LOCK_CODE, CHARACTERS } from "../lib/sagome";
import { H as TAPE_H, W as TAPE_W, follow } from "../lib/tape";
import { PHRASES } from "../data/babel";
import { CARD, COLS as CARD_COLS, ROWS as CARD_ROWS } from "../lib/card";
import { STAR, STAR_POINT, STAR_R } from "../data/room";
import { levers } from "../lib/stages";
import Glyphs from "./Glyphs";

/** How far a finger goes before a press is a drag and not a tap, in px. */
const DRAG = 8;

/** Like the lock: it lives in the 3D scene, so nothing gets past it to turn the camera. */
const stop = (e: SyntheticEvent) => e.stopPropagation();

/** The wrong code: the last two wheels of the right one swapped. */
const WRONG_CODE = [...LOCK_CODE.slice(0, 3), LOCK_CODE[4], LOCK_CODE[3]];

const NAMES: Record<PieceId, string> = {
  lost: "Il labirinto",
  occhio: "Gli specchi",
  stella: "La stella",
  codice: `Rotelle ${LOCK_CODE.join("")}`,
  nastro: "Il nastro",
  babele: "La frase",
  scheda: "La scheda",
  samus: "Una sagoma",
  cuphead: "Un'altra sagoma",
  knight: "Una terza sagoma",
  falso: `Rotelle ${WRONG_CODE.join("")}`,
};

const SILHOUETTE: Partial<Record<PieceId, string>> = {
  samus: CHARACTERS.find((c) => c.id === "samus")?.file,
  cuphead: CHARACTERS.find((c) => c.id === "cuphead")?.file,
  knight: CHARACTERS.find((c) => c.id === "knight")?.file,
};

const Cells = ({ cells, w, h, color }: { cells: [number, number][]; w: number; h: number; color: string }) => (
  <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
    {cells.map(([r, c], i) => (
      <rect key={i} x={c} y={r} width={1} height={1} fill={color} />
    ))}
  </svg>
);

const Wheels = ({ code }: { code: readonly number[] }) => (
  <svg viewBox="0 0 64 24" aria-hidden="true">
    <rect width={64} height={24} rx={5} fill="#C79A32" />
    {code.map((d, i) => (
      <g key={i}>
        <rect x={3 + i * 12} y={3} width={10} height={18} rx={2} fill="#2A2F38" />
        <text x={8 + i * 12} y={16.5} textAnchor="middle" fontSize={11} fontWeight={700} fill="#F4E6C2" fontFamily="monospace">
          {d}
        </text>
      </g>
    ))}
  </svg>
);

/** Each piece as it looked on its own floor, drawn from that floor's data. */
function Art({ id }: { id: PieceId }) {
  const tape = useMemo(() => (id === "nastro" ? follow(levers()).cells : []), [id]);
  switch (id) {
    case "occhio":
      return <Cells cells={FLOORS.flatMap((f) => f.figure)} w={SIZE} h={SIZE} color="#FFE7A0" />;
    case "lost":
      return <Cells cells={letterPath()} w={MAZE_COLS} h={MAZE_ROWS} color="#9DFFC6" />;
    case "codice":
      return <Wheels code={LOCK_CODE} />;
    case "falso":
      return <Wheels code={WRONG_CODE} />;
    case "nastro":
      return (
        <svg viewBox={`0 0 ${TAPE_W} ${TAPE_H}`} aria-hidden="true">
          <polyline points={tape.map(([x, y]) => `${x + 0.5},${y + 0.5}`).join(" ")} fill="none" stroke="#E8C569" strokeWidth={0.8} strokeLinejoin="round" />
        </svg>
      );
    case "babele":
      return <Glyphs script={PHRASES[0].script} text={PHRASES[0].text} size={10} />;
    case "scheda":
      return (
        <svg viewBox={`-0.5 -0.5 ${CARD_COLS + 1} ${CARD_ROWS + 1}`} aria-hidden="true">
          <rect x={-0.5} y={-0.5} width={CARD_COLS + 1} height={CARD_ROWS + 1} rx={0.3} fill="#E9DDBF" />
          {CARD.flatMap((row, r) =>
            row.map((hole, c) =>
              hole === "foro" ? (
                <circle key={`${r}-${c}`} cx={c + 0.5} cy={r + 0.5} r={0.32} fill="#2A2420" />
              ) : hole === "fessura" ? (
                <rect key={`${r}-${c}`} x={c + 0.1} y={r + 0.2} width={1.6} height={0.6} rx={0.3} fill="#2A2420" />
              ) : null,
            ),
          )}
        </svg>
      );
    case "stella":
      return (
        <svg viewBox={`${-STAR_R - 0.2} ${-STAR_R - 0.2} ${2 * STAR_R + 0.4} ${2 * STAR_R + 0.4}`} aria-hidden="true">
          <polygon points={STAR.map((s) => `${STAR_POINT[s].x},${STAR_POINT[s].z}`).join(" ")} fill="none" stroke="#B9D4FF" strokeWidth={0.12} strokeLinejoin="round" />
        </svg>
      );
    default:
      return <img src={SILHOUETTE[id]} alt="" draggable={false} />;
  }
}

/** A piece where the finger is, while it is dragged: outside the scene, so it follows the screen and not the panel. */
type Drag = { piece: PieceId; id: number; x: number; y: number; moved: boolean };

/**
 * The community mural: seven slots stacked like the floors of the tower, and
 * the pieces lying beside them, true and false. A piece is dragged into a
 * slot, or tapped and then a slot tapped, which is the way on a phone. Dropped
 * or tapped back on the pieces, a placed one comes out. Once all seven are
 * right it says nothing more and takes no more.
 */
export default function Mural({ state, onPlace }: { state: MuralState; onPlace: (slot: number, piece: PieceId | null) => void }) {
  /** The piece picked with a tap, waiting for a slot. */
  const [held, setHeld] = useState<PieceId | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  /** The click that ends a drag is not a tap. */
  const dragged = useRef(false);

  const out = (piece: PieceId) => {
    const at = state.placed.indexOf(piece);
    if (at >= 0) onPlace(at, null);
  };

  const tapSlot = (slot: number) => {
    if (dragged.current || state.done) return;
    if (held) {
      onPlace(slot, held);
      setHeld(null);
    } else setHeld(state.placed[slot]);
  };
  const tapTray = (piece: PieceId | null) => {
    if (dragged.current || state.done) return;
    if (piece && piece !== held) setHeld(piece);
    else {
      if (held && piece === null) out(held);
      setHeld(null);
    }
  };

  const down = (piece: PieceId | null) => (e: PointerEvent<HTMLElement>) => {
    dragged.current = false;
    if (!piece || state.done) return;
    setDrag({ piece, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    stop(e);
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > DRAG;
    if (moved && !drag.moved) e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };
  /** A cancelled press drops nothing: it only lets go. */
  const cancel = (e: PointerEvent<HTMLDivElement>) => {
    stop(e);
    if (drag && e.pointerId === drag.id) {
      setDrag(null);
      setHeld(null);
    }
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    stop(e);
    if (!drag || e.pointerId !== drag.id) return;
    setDrag(null);
    if (!drag.moved) return;
    dragged.current = true;
    setHeld(null);
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const slot = under?.closest<HTMLElement>("[data-slot]")?.dataset.slot;
    if (slot !== undefined) onPlace(Number(slot), drag.piece);
    else if (under?.closest("[data-tray]")) out(drag.piece);
  };

  const piece = (id: PieceId): ReactNode => (
    <span className={`mural__piece mural__piece--${id}`}>
      <Art id={id} />
    </span>
  );

  return (
    <div
      className={`mural${state.done ? " is-done" : ""}`}
      onPointerDown={stop}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onClick={stop}
      onWheel={stop}
    >
      <ol className="mural__slots" aria-label="Il murale">
        {SLOTS.map((_, i) => {
          const p = state.placed[i];
          return (
            <li key={i}>
              <button
                type="button"
                data-slot={i}
                className={`mural__slot${p && p === held ? " is-held" : ""}`}
                aria-label={p ? `Posto ${i + 1}: ${NAMES[p]}` : `Posto ${i + 1}, vuoto`}
                onPointerDown={down(p)}
                onClick={() => tapSlot(i)}
              >
                {p && piece(p)}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mural__tray" data-tray onClick={() => tapTray(null)}>
        {PIECES.map((id) =>
          state.placed.includes(id) ? (
            <span key={id} className="mural__gap" />
          ) : (
            <button
              key={id}
              type="button"
              className={`mural__loose${id === held ? " is-held" : ""}`}
              aria-label={NAMES[id]}
              aria-pressed={id === held}
              onPointerDown={down(id)}
              onClick={(e) => {
                e.stopPropagation();
                tapTray(id);
              }}
            >
              {piece(id)}
            </button>
          ),
        )}
      </div>
      {drag?.moved &&
        createPortal(
          <div className="mural__ghost" style={{ left: drag.x, top: drag.y }}>
            {piece(drag.piece)}
          </div>,
          document.body,
        )}
    </div>
  );
}
