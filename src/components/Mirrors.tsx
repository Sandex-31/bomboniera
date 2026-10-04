import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { FLOORS, SIZE, charge, complete, type Cell, type Mirror } from "../lib/beam";
import { BEAM_KEY } from "../data/puzzle";

const CELL = 26;
const PAD = 8;
const W = SIZE * CELL + PAD * 2;

/** One colour per floor, so the figure they draw together has depth. */
const INK = ["#8AD8FF", "#6FE0A8", "#E3B04B"];

type Placed = Record<string, Mirror>;

const key = ([r, c]: Cell) => `${r},${c}`;
const at = (n: number) => PAD + (n + 0.5) * CELL;

/** Mirrors as they come back from storage, believed only once checked. */
function loadPlaced(): Placed[] {
  const empty = FLOORS.map(() => ({}) as Placed);
  try {
    const raw = localStorage.getItem(BEAM_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(saved) || saved.length !== FLOORS.length) return empty;

    return FLOORS.map((floor, i) => {
      const from: unknown = saved[i];
      if (!from || typeof from !== "object") return {};
      const out: Placed = {};
      for (const [cell, kind] of Object.entries(from as Record<string, unknown>)) {
        const [r, c] = cell.split(",").map(Number);
        const legal =
          Number.isInteger(r) &&
          Number.isInteger(c) &&
          r >= 0 &&
          c >= 0 &&
          r < SIZE &&
          c < SIZE &&
          (kind === "/" || kind === "\\");
        if (legal && Object.keys(out).length < floor.budget) out[cell] = kind;
      }
      return out;
    });
  } catch {
    return empty;
  }
}

/**
 * The mirrors, three floors of them.
 *
 * The beam is drawn live from the source onward, so every placement answers
 * immediately — the puzzle is hard because the route is long and the mirrors
 * are counted, not because it keeps its reasoning to itself.
 *
 * Finished floors stay on screen underneath the one being worked on. That is
 * the whole trick of it: each floor is a meaningless staircase on its own, and
 * what they add up to only shows itself at the end.
 */
export default function Mirrors() {
  const [placed, setPlaced] = useState<Placed[]>(loadPlaced);
  const [cursor, setCursor] = useState<Cell>([7, 7]);

  useEffect(() => {
    try {
      localStorage.setItem(BEAM_KEY, JSON.stringify(placed));
    } catch {
      /* storage unavailable — the mirrors still stand for this visit */
    }
  }, [placed]);

  /** Every floor that is finished, and therefore the one being worked on. */
  const done = useMemo(
    () => FLOORS.map((floor, i) => complete(floor, new Map(Object.entries(placed[i])))),
    [placed],
  );
  const finished = done.every(Boolean);
  const current = finished ? FLOORS.length - 1 : done.findIndex((ok) => !ok);
  const floor = FLOORS[current];
  const mirrors = placed[current];

  const lit = useMemo(
    () =>
      FLOORS.map((f, i) =>
        done[i] ? charge(f, new Map(Object.entries(placed[i]))).cells : [],
      ),
    [done, placed],
  );

  const beam = charge(floor, new Map(Object.entries(mirrors)));
  const used = Object.keys(mirrors).length;

  /** Empty, then one way, then the other, then empty again. */
  const cycle = (cell: Cell) => {
    if (finished) return;
    const id = key(cell);
    if (id === key(floor.source.cell) || id === key(floor.riser)) return;
    setPlaced((all) => {
      const next = { ...all[current] };
      if (next[id] === "/") next[id] = "\\";
      else if (next[id] === "\\") delete next[id];
      else if (Object.keys(next).length < floor.budget) next[id] = "/";
      else return all;
      return all.map((one, i) => (i === current ? next : one));
    });
  };

  /** A moving cursor, because 225 tab stops would be worse than none. */
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step: Record<string, Cell> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      cycle(cursor);
      return;
    }
    const move = step[e.key];
    if (!move) return;
    e.preventDefault();
    setCursor(([r, c]) => [
      Math.min(SIZE - 1, Math.max(0, r + move[0])),
      Math.min(SIZE - 1, Math.max(0, c + move[1])),
    ]);
  };

  const polyline = (cells: Cell[]) => cells.map(([r, c]) => `${at(c)},${at(r)}`).join(" ");

  /**
   * The way the light has to go through a power cell, as an arrow across it.
   *
   * A notch on the rim was the honest drawing — this is the readable one. At
   * the size a phone gives each cell, which side a mouth is on is a guess,
   * and an arrow through the middle is not.
   */
  const arrow = (r: number, c: number) => {
    const x = at(c);
    const y = at(r);
    const h = CELL * 0.3;
    const w = CELL * 0.26;
    return `M ${x - h} ${y - w} L ${x + h} ${y} L ${x - h} ${y + w} Z`;
  };

  return (
    <div className="beam">
      <svg
        className={`beam__grid${finished ? " is-done" : ""}`}
        viewBox={`0 0 ${W} ${W}`}
        tabIndex={0}
        role="img"
        aria-label={`Specchi, piano ${current + 1} di ${FLOORS.length}`}
        onKeyDown={onKey}
      >
        <rect x="0" y="0" width={W} height={W} className="beam__bg" />

        {/* the grain of the grid */}
        {Array.from({ length: SIZE + 1 }, (_, i) => (
          <g key={i} className="beam__rule">
            <line x1={PAD + i * CELL} y1={PAD} x2={PAD + i * CELL} y2={W - PAD} />
            <line x1={PAD} y1={PAD + i * CELL} x2={W - PAD} y2={PAD + i * CELL} />
          </g>
        ))}

        {/* floors already lit, left underneath */}
        {lit.map((cells, i) =>
          cells.length ? (
            <polyline
              key={i}
              className="beam__old"
              style={{ stroke: INK[i] }}
              points={polyline(cells)}
            />
          ) : null,
        )}

        {/* what the beam has to be fed by on the way, each with the one side
            it takes light from */}
        {floor.nodes.map(({ cell: [r, c], dir }) => (
          <g key={`n${r},${c}`} className={`beam__node${beam.fed.has(`${r},${c}`) ? " is-fed" : ""}`}>
            <rect
              className="beam__cellbox"
              x={PAD + c * CELL + 2}
              y={PAD + r * CELL + 2}
              width={CELL - 4}
              height={CELL - 4}
              rx="5"
            />
            <path
              className="beam__arrow"
              d={arrow(r, c)}
              transform={`rotate(${dir * 90} ${at(c)} ${at(r)})`}
            />
          </g>
        ))}

        {!finished && (
          <polyline
            className={`beam__live${beam.power === floor.nodes.length ? " is-charged" : ""}`}
            style={{ stroke: INK[current] }}
            points={polyline(beam.cells)}
          />
        )}

        {!finished && !beam.arrived && beam.cells.length > 1 && (
          <circle
            className="beam__spent"
            cx={at(beam.cells[beam.cells.length - 1][1])}
            cy={at(beam.cells[beam.cells.length - 1][0])}
            r={CELL * 0.2}
          />
        )}

        {/* where it comes in, and where it goes up */}
        <circle
          cx={at(floor.source.cell[1])}
          cy={at(floor.source.cell[0])}
          r="6"
          className="beam__source"
        />
        <circle cx={at(floor.riser[1])} cy={at(floor.riser[0])} r="8" className="beam__riser" />

        {/* the mirrors, as the slants they are */}
        {Object.entries(mirrors).map(([id, kind]) => {
          const [r, c] = id.split(",").map(Number);
          const x = PAD + c * CELL;
          const y = PAD + r * CELL;
          return (
            <line
              key={id}
              className="beam__mirror"
              x1={kind === "/" ? x + CELL - 5 : x + 5}
              y1={y + 5}
              x2={kind === "/" ? x + 5 : x + CELL - 5}
              y2={y + CELL - 5}
            />
          );
        })}

        {/* the tap targets, one per cell, invisible */}
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          return (
            <rect
              key={`t${i}`}
              className="beam__tap"
              x={PAD + c * CELL}
              y={PAD + r * CELL}
              width={CELL}
              height={CELL}
              onClick={() => cycle([r, c])}
            />
          );
        })}

        <rect
          className="beam__cursor"
          x={PAD + cursor[1] * CELL}
          y={PAD + cursor[0] * CELL}
          width={CELL}
          height={CELL}
          rx="3"
        />
      </svg>

      <p className="beam__status">
        {finished ? (
          <span className="beam__won">tre piani accesi</span>
        ) : (
          <>
            piano {current + 1}/{FLOORS.length}
            <span className="beam__count">
              {beam.power}/{floor.nodes.length} celle · {used}/{floor.budget} specchi ·
              portata {floor.fuel}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
