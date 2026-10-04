import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  CELLS,
  DOOR_W,
  DOOR_Z,
  HALF,
  PALETTE,
  SPOTS,
  STAR,
  STAR_POINT,
  middleOf,
  solvedPlan,
  type Mark,
} from "../data/room";
import { PLAN_KEY } from "../data/puzzle";
import { usePrefersReducedMotion } from "../hooks";

const VIEW = 300;
/** Room outside the plan for the four letters, once they turn up. */
const PAD = 24;
const BOX = VIEW + PAD * 2;
/** Drawing units per cell, and per scene unit. */
const STEP = VIEW / CELLS;
const UNIT = VIEW / (HALF * 2);
/** How big an outline is drawn on the plan, in svg units. */
const GLYPH = 26;
/** How long each half of the ending lasts: the lines, then the flight. */
const BEAT = 1100;

const toX = (x: number) => PAD + (x + HALF) * UNIT;
const toZ = (z: number) => PAD + (z + HALF) * UNIT;
const ease = (p: number) => p * p * (3 - 2 * p);

/**
 * What was laid out last time, believed only after it has been checked.
 *
 * Nothing here decides whether a mark is right — only whether it is a mark:
 * a cell that exists, a colour that is really on the palette.
 */
function loadMarks(): Record<string, Mark> {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (!saved || typeof saved !== "object") return {};
    const from = saved as Record<string, unknown>;
    const out: Record<string, Mark> = {};
    for (const spot of SPOTS) {
      const mark = from[spot.id];
      if (!mark || typeof mark !== "object") continue;
      const { col, row, color } = mark as Record<string, unknown>;
      const inside = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < CELLS;
      if (inside(col) && inside(row) && (color === null || (typeof color === "string" && PALETTE.includes(color)))) {
        out[spot.id] = { col: col as number, row: row as number, color: color as string | null };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * The room next door, from above, empty.
 *
 * Eight outlines and twelve colours, and no word about which outline goes in
 * which square or which colour is its own. Nothing is confirmed on the way:
 * put seven of the eight exactly right and the screen looks precisely as it
 * does with none of them right. The only thing it ever says is that the plan
 * is the room, and by then it is already over.
 */
export default function Plan({ onSolved }: { onSolved?: () => void }) {
  const [marks, setMarks] = useState<Record<string, Mark>>(loadMarks);
  const [sel, setSel] = useState<string>(SPOTS[0].id);
  const svg = useRef<SVGSVGElement>(null);
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(marks));
    } catch {
      /* storage unavailable — the plan still holds for this visit */
    }
  }, [marks]);

  const done = solvedPlan(marks);
  const placed = SPOTS.filter((spot) => marks[spot.id]).length;
  const painted = SPOTS.filter((spot) => marks[spot.id]?.color).length;
  const reduced = usePrefersReducedMotion();

  /**
   * The ending, in two beats: 0 to 1 draws the lines from one thing to the
   * next, 1 to 2 pulls all eight off their squares and out onto the ring.
   * Whoever asked not to be moved about gets the last frame and nothing else.
   */
  const [beat, setBeat] = useState(0);
  /**
   * Whether it was already solved when this window opened. Coming back to a
   * finished plan replays the drawing, which is worth seeing again — but the
   * keeper has already had its say and should not say it twice.
   */
  const replay = useRef(done);
  const spoke = useRef(false);

  useEffect(() => {
    if (!done) {
      setBeat(0);
      return;
    }
    const over = () => {
      if (replay.current || spoke.current) return;
      spoke.current = true;
      onSolved?.();
    };
    if (reduced) {
      setBeat(2);
      over();
      return;
    }
    let raf = 0;
    const from = performance.now();
    const tick = (now: number) => {
      const p = Math.min(2, (now - from) / BEAT);
      setBeat(p);
      if (p < 2) raf = requestAnimationFrame(tick);
      else over();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done, reduced, onSolved]);

  /** Where a thing is being drawn right now, on its way to the ring. */
  const flown = ease(Math.min(1, Math.max(0, beat - 1)));
  const at = (id: string) => {
    const mark = marks[id];
    if (!mark) return null;
    const from = { x: middleOf(mark.col), z: middleOf(mark.row) };
    const goal = STAR_POINT[id];
    return {
      x: toX(from.x + (goal.x - from.x) * flown),
      z: toZ(from.z + (goal.z - from.z) * flown),
    };
  };

  /**
   * Puts one in a square. Whatever was already in it goes where this one
   * came from, or back to the tray if it came from there — two outlines in
   * one square would only hide each other.
   */
  const place = (id: string, col: number, row: number) =>
    setMarks((all) => {
      const was = all[id];
      if (was && was.col === col && was.row === row) return all;
      const next = { ...all, [id]: { col, row, color: was?.color ?? null } };
      for (const [other, mark] of Object.entries(all)) {
        if (other === id || mark.col !== col || mark.row !== row) continue;
        if (was) next[other] = { ...mark, col: was.col, row: was.row };
        else delete next[other];
      }
      return next;
    });

  const cellAt = (clientX: number, clientY: number) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return null;
    const x = ((clientX - box.left) / box.width) * BOX - PAD;
    const y = ((clientY - box.top) / box.height) * BOX - PAD;
    const col = Math.floor(x / STEP);
    const row = Math.floor(y / STEP);
    if (col < 0 || row < 0 || col >= CELLS || row >= CELLS) return null;
    return { col, row };
  };

  const put = (id: string, clientX: number, clientY: number) => {
    const cell = cellAt(clientX, clientY);
    if (cell) place(id, cell.col, cell.row);
  };

  /** Tapping a square drops whatever is in hand into it. */
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (done) return;
    dragId.current = sel;
    e.currentTarget.setPointerCapture(e.pointerId);
    put(sel, e.clientX, e.clientY);
  };

  /** Tapping something already down picks it up instead, without moving it. */
  const grab = (id: string) => (e: PointerEvent<SVGGElement>) => {
    if (done) return;
    e.stopPropagation();
    setSel(id);
    dragId.current = id;
    svg.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (dragId.current) put(dragId.current, e.clientX, e.clientY);
  };

  const drop = () => {
    dragId.current = null;
  };

  /** The same thing, one square at a time, for anyone not using a finger. */
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (done) return;
    const step: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const by = step[e.key];
    if (!by) return;
    e.preventDefault();
    const here = marks[sel] ?? { col: CELLS / 2, row: CELLS / 2 };
    place(
      sel,
      Math.min(CELLS - 1, Math.max(0, here.col + by[0])),
      Math.min(CELLS - 1, Math.max(0, here.row + by[1])),
    );
  };

  const gap: [number, number] = [DOOR_Z - DOOR_W / 2, DOOR_Z + DOOR_W / 2];

  return (
    <div className={`plan${done ? " is-done" : ""}`}>
      <svg
        ref={svg}
        className="plan__grid"
        viewBox={`0 0 ${BOX} ${BOX}`}
        tabIndex={0}
        role="img"
        aria-label="Pianta vuota: metti ogni sagoma nella casella dove si trova nella stanza e dalle il suo colore"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={drop}
        onPointerCancel={drop}
        onKeyDown={onKey}
      >
        <rect x="0" y="0" width={BOX} height={BOX} className="plan__bg" />

        {Array.from({ length: CELLS + 1 }, (_, i) => (
          <g key={i} className="plan__rule">
            <line x1={PAD + i * STEP} y1={PAD} x2={PAD + i * STEP} y2={PAD + VIEW} />
            <line x1={PAD} y1={PAD + i * STEP} x2={PAD + VIEW} y2={PAD + i * STEP} />
          </g>
        ))}

        {/* the two walls, with the doorway left open — the only way to tell
            which corner of the plan is which corner of the room */}
        <g className="plan__wall">
          <line x1={PAD} y1={PAD} x2={PAD + VIEW} y2={PAD} />
          <line x1={PAD} y1={PAD} x2={PAD} y2={toZ(gap[0])} />
          <line x1={PAD} y1={toZ(gap[1])} x2={PAD} y2={PAD + VIEW} />
        </g>
        <g className="plan__open">
          <line x1={PAD + VIEW} y1={PAD} x2={PAD + VIEW} y2={PAD + VIEW} />
          <line x1={PAD} y1={PAD + VIEW} x2={PAD + VIEW} y2={PAD + VIEW} />
        </g>

        {/* what the eight of them were all along, and where the next one
            starts: the shape stays on screen once it has drawn itself */}
        {done && (
          <g className={`plan__star${beat >= 2 ? " is-formed" : ""}`}>
            {STAR.map((id, i) => {
              const from = at(id);
              const to = at(STAR[(i + 1) % STAR.length]);
              const grown = Math.min(1, Math.max(0, beat * STAR.length - i));
              if (!from || !to || grown <= 0) return null;
              return (
                <line
                  key={id}
                  className="plan__join"
                  stroke={marks[id]?.color ?? undefined}
                  x1={from.x}
                  y1={from.z}
                  x2={from.x + (to.x - from.x) * grown}
                  y2={from.z + (to.z - from.z) * grown}
                />
              );
            })}
          </g>
        )}

        {SPOTS.map((spot) => {
          const mark = marks[spot.id];
          const here = at(spot.id);
          if (!mark || !here) return null;
          const { x, z } = here;
          return (
            <g
              key={spot.id}
              className={`plan__mark${sel === spot.id ? " is-held" : ""}`}
              onPointerDown={grab(spot.id)}
            >
              {sel === spot.id && !done && (
                <rect
                  className="plan__ring"
                  x={PAD + mark.col * STEP}
                  y={PAD + mark.row * STEP}
                  width={STEP}
                  height={STEP}
                  rx="3"
                />
              )}
              <g transform={`translate(${x - GLYPH / 2} ${z - GLYPH / 2}) scale(${GLYPH / 24})`}>
                <path d={spot.glyph} fill={mark.color ?? "none"} fillRule="evenodd" />
              </g>
            </g>
          );
        })}
        {/* the four letters, which turn up with the lines and stay */}
        {done && (
          <g className="plan__compass" style={{ opacity: ease(Math.min(1, beat)) }}>
            <text x={PAD + VIEW / 2} y={PAD / 2}>
              N
            </text>
            <text x={PAD + VIEW / 2} y={PAD + VIEW + PAD / 2}>
              S
            </text>
            <text x={PAD / 2} y={PAD + VIEW / 2}>
              O
            </text>
            <text x={PAD + VIEW + PAD / 2} y={PAD + VIEW / 2}>
              E
            </text>
          </g>
        )}
      </svg>

      <div className="plan__tray" role="group" aria-label="Sagome">
        {SPOTS.map((spot) => (
          <button
            key={spot.id}
            type="button"
            className={`plan__piece${sel === spot.id ? " is-held" : ""}${marks[spot.id] ? " is-down" : ""}`}
            aria-label={spot.label}
            aria-pressed={sel === spot.id}
            title={spot.label}
            onClick={() => setSel(spot.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={spot.glyph} fill={marks[spot.id]?.color ?? "none"} fillRule="evenodd" />
            </svg>
          </button>
        ))}
      </div>

      <div className="plan__palette" role="group" aria-label="Colori">
        {PALETTE.map((color, i) => (
          <button
            key={color}
            type="button"
            className={`plan__swatch${marks[sel]?.color === color ? " is-held" : ""}`}
            style={{ background: color }}
            aria-label={`Colore ${i + 1}`}
            disabled={done}
            onClick={() =>
              setMarks((all) => (all[sel] ? { ...all, [sel]: { ...all[sel], color } } : all))
            }
          />
        ))}
      </div>

      {/* how far along, never how well: both numbers say only that there is
          still something untouched, which is visible on the board anyway */}
      <p className="plan__status">
        {done ? (
          <span className="plan__won">la pianta combacia</span>
        ) : (
          <>
            {placed}/{SPOTS.length} posate · {painted}/{SPOTS.length} colorate
          </>
        )}
      </p>
    </div>
  );
}
