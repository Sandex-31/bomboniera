import { useMemo, useState } from "react";
import { buildMaze, COLS, ROWS } from "../../lib/maze";
import { ASD_ANSWER, CELL_PX, DESK, DOOR, EDGES, FAST, NODES, SLOW, checkAsd, edgeOf, weights } from "../../lib/aula/asd";

/*
 * The floor of the hall from above, over the faint walls of the first
 * floor's maze: the benches, the aisles between them, each slow or fast by
 * Architettura's byte, and the way from the door to the desk tapped bench by
 * bench. Tapping the last bench again takes it back.
 */

/** Room round the maze for the benches on its edge. */
const PAD = 8;
const SIZE = COLS * CELL_PX;
/** What a bench is called on the plan: the door and the desk by their initial, the rest by number. */
const name = (id: number) => (id === DOOR ? "P" : id === DESK ? "C" : String(id));
const at = ([r, c]: [number, number]) => ({ x: (c + 0.5) * CELL_PX, y: (r + 0.5) * CELL_PX });

/** The maze's walls, as one path. */
function mazeWalls(): string {
  const m = buildMaze();
  let d = `M0 0H${SIZE}V${ROWS * CELL_PX}H0Z`;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (c < COLS - 1 && m.right[r][c]) d += `M${(c + 1) * CELL_PX} ${r * CELL_PX}v${CELL_PX}`;
      if (r < ROWS - 1 && m.down[r][c]) d += `M${c * CELL_PX} ${(r + 1) * CELL_PX}h${CELL_PX}`;
    }
  return d;
}

/** A small flag of Brazil, pinned in a corner of the plan. */
function Brasil({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <rect width="24" height="16" fill="#009C3B" />
      <path d="M12 2 L22 8 L12 14 L2 8 Z" fill="#FFDF00" />
      <circle cx="12" cy="8" r="3.6" fill="#002776" />
    </g>
  );
}

export default function Asd({ passed, onTry, byte }: { passed: boolean; onTry: (ok: boolean) => void; byte: number }) {
  const walls = useMemo(mazeWalls, []);
  const w = weights(byte);
  const [way, setWay] = useState<number[]>([DOOR]);
  const shown = passed ? ASD_ANSWER : way;
  const last = way[way.length - 1];

  const tap = (n: number) => {
    if (passed) return;
    if (n === last && way.length > 1) return setWay(way.slice(0, -1));
    if (way.includes(n) || edgeOf(last, n) < 0) return;
    const next = [...way, n];
    if (n !== DESK) return setWay(next);
    setWay([DOOR]);
    onTry(checkAsd(next));
  };
  const walked = (k: number) => shown.some((n, i) => i > 0 && edgeOf(shown[i - 1], n) === k);

  return (
    <div className="aula-asd">
      <svg viewBox={`${-PAD} ${-PAD} ${SIZE + 2 * PAD} ${ROWS * CELL_PX + 2 * PAD}`} aria-label="Pianta dell'aula: banchi e corridoi">
        <path d={walls} fill="none" stroke="#1A1410" strokeOpacity="0.14" strokeWidth="1" />
        {EDGES.map((e, k) => {
          const p = at(NODES[e.a].cell);
          const q = at(NODES[e.b].cell);
          const fast = w[k] === FAST;
          return (
            <g key={k}>
              <line
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke={walked(k) ? "#C9A64A" : fast ? "#2F7A4A" : "#9B1C1C"}
                strokeWidth={walked(k) ? 6 : fast ? 3 : 2}
                strokeDasharray={fast ? undefined : "5 4"}
              />
              <circle cx={(p.x + q.x) / 2} cy={(p.y + q.y) / 2} r="7" fill="#F4EFE2" stroke={fast ? "#2F7A4A" : "#9B1C1C"} />
              <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill={fast ? "#2F7A4A" : "#9B1C1C"}>
                {w[k]}
              </text>
            </g>
          );
        })}
        {NODES.map(({ id, cell }) => {
          const { x, y } = at(cell);
          const on = shown.includes(id);
          return (
            <g key={id} className="aula-asd__bench" onClick={() => tap(id)} role="button" aria-label={id === DOOR ? "porta" : id === DESK ? "cattedra" : `banco ${id}`}>
              {/* the whole finger's width takes the tap, the bench drawn in it is smaller */}
              <circle cx={x} cy={y} r="22" fill="transparent" />
              <rect x={x - 15} y={y - 9} width="30" height="18" rx="3" fill={on ? "#C9A64A" : "#6B4A33"} stroke="#1A1410" />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#F4EFE2">
                {name(id)}
              </text>
            </g>
          );
        })}
        <Brasil x={2} y={2} />
      </svg>
      <p className="aula-asd__key">
        P porta · C cattedra · corridoio libero {FAST} min, affollato {SLOW} min
      </p>
      {passed && <p className="aula-asd__done">{ASD_ANSWER.map(name).join(" → ")} · obrigado!</p>}
    </div>
  );
}
