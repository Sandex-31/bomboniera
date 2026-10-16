import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { COLS, ROWS, buildMaze, passable, validTrail, type Cell, type Maze as Grid } from "../lib/maze";
import { MAZE_KEY } from "../data/puzzle";
import {
  CELL,
  PAD,
  PIECES,
  boxPath,
  holdMaze,
  isDone,
  isHome,
  revision,
  subscribe,
} from "../lib/lost";

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

/**
 * The line drawn so far, kept between visits — closing the window, leaving
 * the screen or shutting the page should not throw away the work. What comes
 * back is checked against the walls before it is believed.
 */
function loadTrail(maze: Grid): Cell[] {
  try {
    const raw = localStorage.getItem(MAZE_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (validTrail(maze, saved)) return saved;
  } catch {
    /* unreadable or unparsable — start again from the entrance */
  }
  return [maze.entrance];
}

/**
 * The maze, drawn as the walls that are still standing, and traced with a
 * finger.
 *
 * The way in and the way out are the two gaps in the outer border, and they
 * are the only hint given: what the route spells is the answer, so it is not
 * drawn, not highlighted and not described to a screen reader either.
 */
export default function Maze() {
  const maze = useMemo(() => buildMaze(), []);
  const [trail, setTrail] = useState<Cell[]>(() => loadTrail(maze));
  const svg = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(MAZE_KEY, JSON.stringify(trail));
    } catch {
      /* storage unavailable — the line still lives for this visit */
    }
  }, [trail]);

  const w = COLS * CELL + PAD * 2;
  const h = ROWS * CELL + PAD * 2;

  const walls: [number, number, number, number][] = [];
  const line = (r0: number, c0: number, r1: number, c1: number) =>
    walls.push([PAD + c0 * CELL, PAD + r0 * CELL, PAD + c1 * CELL, PAD + r1 * CELL]);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (maze.right[r][c] && c < COLS - 1) line(r, c + 1, r + 1, c + 1);
      if (maze.down[r][c] && r < ROWS - 1) line(r + 1, c, r + 1, c + 1);
    }
  }
  // the border, minus the two cells the corridor passes through
  for (let c = 0; c < COLS; c++) {
    line(0, c, 0, c + 1);
    line(ROWS, c, ROWS, c + 1);
  }
  for (let r = 0; r < ROWS; r++) {
    if (r !== maze.exit[0]) line(r, 0, r + 1, 0);
    if (r !== maze.entrance[0]) line(r, COLS, r + 1, COLS);
  }


  /**
   * Walks the trail toward a cell, one step at a time.
   *
   * It has to walk rather than jump: a finger moving fast reports a point
   * several cells away, and the line between them may well go through a wall.
   * Stepping back onto the cell it came from rubs the trail out instead of
   * adding to it, which is how anyone actually solves a maze.
   */
  const walk = (from: Cell[], to: Cell) => {
    const path = [...from];
    for (let guard = 0; guard < 64; guard++) {
      const head = path[path.length - 1];
      if (same(head, to)) break;
      const back = path[path.length - 2];
      const dr = Math.sign(to[0] - head[0]);
      const dc = Math.sign(to[1] - head[1]);
      // try the axis with the longer way still to go
      const steps: Cell[] = (
        Math.abs(to[0] - head[0]) >= Math.abs(to[1] - head[1])
          ? [[dr, 0], [0, dc]]
          : [[0, dc], [dr, 0]]
      ) as Cell[];

      let moved = false;
      for (const [sr, sc] of steps) {
        if (!sr && !sc) continue;
        const next: Cell = [head[0] + sr, head[1] + sc];
        if (!passable(maze, head, next)) continue;
        if (back && same(back, next)) path.pop();
        else if (path.some((cell) => same(cell, next))) return path;
        else path.push(next);
        moved = true;
        break;
      }
      if (!moved) break;
    }
    return path;
  };

  const cellUnder = (clientX: number, clientY: number): Cell | null => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return null;
    const x = ((clientX - box.left) / box.width) * w;
    const y = ((clientY - box.top) / box.height) * h;
    const r = Math.floor((y - PAD) / CELL);
    const c = Math.floor((x - PAD) / CELL);
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return null;
    return [r, c];
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    // the figure is a handle on the window, not a place to draw
    if ((e.target as Element).closest("[data-grab]")) return;
    const cell = cellUnder(e.clientX, e.clientY);
    if (!cell) return;
    // picking up the trail anywhere along it rubs out everything after it
    const at = trail.findIndex((step) => same(step, cell));
    if (at < 0) return;
    setTrail(trail.slice(0, at + 1));
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;
    const cell = cellUnder(e.clientX, e.clientY);
    if (cell) setTrail((from) => walk(from, cell));
  };

  const stop = () => {
    drawing.current = false;
  };

  /** The same walk, for anyone who is not using a finger. */
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step: Record<string, Cell> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (e.key === "Escape") {
      setTrail([maze.entrance]);
      return;
    }
    const move = step[e.key];
    if (!move) return;
    e.preventDefault();
    setTrail((from) => {
      const head = from[from.length - 1];
      return walk(from, [head[0] + move[0], head[1] + move[1]]);
    });
  };

  const solved = same(trail[trail.length - 1], maze.exit);

  /* the fragments laid in the right place: they are part of this drawing
     from then on, so they move, shrink and close with it */
  useSyncExternalStore(subscribe, revision);
  const home = PIECES.flatMap((piece, i) => (isHome(i) ? [piece] : []));
  const done = isDone();

  /* the fragments on the other screens line themselves up against this
     drawing, so it has to say where it is and whether it has been traced */
  useEffect(() => {
    const el = svg.current;
    holdMaze(el, solved);
    if (!el) return;
    const watch = new ResizeObserver(() => holdMaze(el, solved));
    watch.observe(el);
    return () => {
      watch.disconnect();
      holdMaze(null, false);
    };
  }, [solved]);

  const points = trail
    .map(([r, c]) => `${PAD + (c + 0.5) * CELL},${PAD + (r + 0.5) * CELL}`)
    .join(" ");

  return (
    <svg
      ref={svg}
      className={`maze${solved ? " is-solved" : ""}`}
      viewBox={`0 0 ${w} ${h}`}
      tabIndex={0}
      role="img"
      aria-label="Labirinto: trascina dal punto d'ingresso per tracciare il percorso"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={onKey}
    >
      <rect x="0" y="0" width={w} height={h} className="maze__bg" />

      {trail.length > 1 && <polyline className="maze__trail" points={points} />}

      {walls.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="maze__wall" />
      ))}

      <circle
        cx={PAD + (maze.entrance[1] + 0.5) * CELL}
        cy={PAD + (maze.entrance[0] + 0.5) * CELL}
        r={CELL * 0.22}
        className="maze__in"
      />
      <circle
        cx={PAD + (maze.exit[1] + 0.5) * CELL}
        cy={PAD + (maze.exit[0] + 0.5) * CELL}
        r={CELL * 0.22}
        className="maze__out"
      />

      {home.length > 0 && (
        /* in the fragments' own units, one per cell, so they are drawn from
           the very same paths as their windows were */
        <svg
          x={PAD}
          y={PAD}
          width={COLS * CELL}
          height={ROWS * CELL}
          viewBox={`0 0 ${COLS} ${ROWS}`}
          overflow="visible"
          className={`piece is-home${done ? " is-done" : ""}`}
          data-grab
        >
          {home.map((piece) => (
            <g key={piece.title + piece.view.join()}>
              {piece.paths?.map((d, i) => <path key={i} d={d} />)}
              {piece.boxes?.map((box, i) => (
                <path key={i} className="piece__ink" d={boxPath(box)} />
              ))}
              {/* a wider line nobody sees, so a finger can actually hit it */}
              {piece.paths?.map((d, i) => <path key={`hit${i}`} className="piece__hit" d={d} />)}
            </g>
          ))}
        </svg>
      )}

      {/* the head of the trail, so a finger knows where it left off */}
      <circle
        cx={PAD + (trail[trail.length - 1][1] + 0.5) * CELL}
        cy={PAD + (trail[trail.length - 1][0] + 0.5) * CELL}
        r={CELL * 0.3}
        className="maze__head"
      />
    </svg>
  );
}
