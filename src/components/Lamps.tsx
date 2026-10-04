import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { COLS, ROWS, START, dark, press, type Board } from "../lib/lamps";
import { INK } from "../lib/ski";
import { LAMPS_KEY } from "../data/puzzle";

const CELL = 42;
const PAD = 10;
const W = COLS * CELL + PAD * 2;
const H = ROWS * CELL + PAD * 2;

type Saved = { lit: Board; pressed: Board };

const fresh = (): Saved => ({
  lit: [...START],
  pressed: START.map(() => false),
});

/**
 * What was left here last time, believed only once it has been re-derived.
 *
 * A board and a record of presses are two halves of one thing, and a saved
 * file could have them disagree. Rather than trust it, the presses are
 * replayed onto the opening board: if the result is not the saved lamps, the
 * file is a fiction and the panel starts again.
 */
function load(): Saved {
  try {
    const raw = localStorage.getItem(LAMPS_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (!saved || typeof saved !== "object") return fresh();
    const { lit, pressed } = saved as Record<string, unknown>;
    const legal = (b: unknown): b is Board =>
      Array.isArray(b) && b.length === START.length && b.every((v) => typeof v === "boolean");
    if (!legal(lit) || !legal(pressed)) return fresh();

    const replayed = pressed.reduce(
      (board, on, i) => (on ? press(board, Math.floor(i / COLS), i % COLS) : board),
      [...START],
    );
    if (replayed.some((on, i) => on !== lit[i])) return fresh();
    return { lit, pressed };
  } catch {
    return fresh();
  }
}

/**
 * The lamps.
 *
 * Nothing is announced and nothing is graded: the lamps are lit, pressing one
 * turns over its little cross of neighbours, and the only thing the panel
 * ever says is how many are still burning — which anyone can see anyway.
 *
 * Every lamp carries the mark of whether it has been pressed an odd number of
 * times. While the board is lit those marks are barely there and mean
 * nothing. When the last lamp goes out they are all that is left on the
 * screen, four rows of them, and they are the answer.
 */
export default function Lamps() {
  const [state, setState] = useState<Saved>(load);
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    try {
      localStorage.setItem(LAMPS_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — the board still holds for this visit */
    }
  }, [state]);

  const out = useMemo(() => dark(state.lit), [state.lit]);
  const burning = state.lit.filter(Boolean).length;

  const hit = (row: number, col: number) =>
    setState(({ lit, pressed }) => {
      const i = row * COLS + col;
      const next = [...pressed];
      next[i] = !next[i];
      return { lit: press(lit, row, col), pressed: next };
    });

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "Escape") {
      setState(fresh());
      return;
    }
    const step: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      hit(cursor[0], cursor[1]);
      return;
    }
    const by = step[e.key];
    if (!by) return;
    e.preventDefault();
    setCursor(([r, c]) => [
      Math.min(ROWS - 1, Math.max(0, r + by[0])),
      Math.min(COLS - 1, Math.max(0, c + by[1])),
    ]);
  };

  return (
    <div className={`lamps${out ? " is-out" : ""}`}>
      <svg
        className="lamps__grid"
        viewBox={`0 0 ${W} ${H}`}
        tabIndex={0}
        role="img"
        aria-label={`Lampade: ${burning} ancora accese`}
        onKeyDown={onKey}
      >
        <rect x="0" y="0" width={W} height={H} className="lamps__bg" />

        {state.lit.map((on, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const x = PAD + col * CELL;
          const y = PAD + row * CELL;
          return (
            <g key={i} className={`lamps__cell${on ? " is-on" : ""}`} onClick={() => hit(row, col)}>
              {/* once it is out, each row takes the colour of the piste whose
                  steepness it turned out to be spelling */}
              <rect
                x={x + 3}
                y={y + 3}
                width={CELL - 6}
                height={CELL - 6}
                rx="8"
                style={out ? { fill: INK[row], stroke: INK[row] } : undefined}
              />
              <text x={x + CELL / 2} y={y + CELL / 2} className="lamps__bit">
                {state.pressed[i] ? "1" : "0"}
              </text>
            </g>
          );
        })}

        <rect
          className="lamps__cursor"
          x={PAD + cursor[1] * CELL + 2}
          y={PAD + cursor[0] * CELL + 2}
          width={CELL - 4}
          height={CELL - 4}
          rx="9"
        />
      </svg>

      <p className="lamps__status">
        {out ? (
          <span className="lamps__won">tutte spente</span>
        ) : (
          <>
            {burning} ancora {burning === 1 ? "accesa" : "accese"}
          </>
        )}
      </p>
    </div>
  );
}
