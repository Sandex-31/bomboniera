import { useEffect, useRef, useState } from "react";
import {
  BANDS,
  DIRS,
  EYES,
  FORK,
  H,
  ORIGIN,
  PIXELS,
  SC,
  SLOTS,
  START,
  W,
  follow,
} from "../lib/tape";
import { MACHINE_KEY } from "../data/puzzle";

/** One lever per fork in the tape. */
const LEVERS = SLOTS.length;

const BRASS = "#C9A227";
const COPPER = "#B87333";
const IRON = "#2A2622";

/* the tape, wrapped so fifty bands still read on a phone */
const BAND = 13;
const TAPE_H = 30;
const PER_ROW = 28;
const TAPE_ROWS = Math.ceil(BANDS.length / PER_ROW);
const ROW_H = TAPE_H + 16;
const TAPE_W = PER_ROW * BAND;

/* the grid the needle draws on */
const CELL = 15;
const PAD = 8;
const GRID_W = W * CELL + PAD * 2;
const GRID_H = H * CELL + PAD * 2;
const mid = (n: number) => PAD + (n + 0.5) * CELL;

/* the bank */
const BANK_W = 360;
const BANK_H = 116;
const SLOT_TOP = 16;
const SLOT_BOTTOM = 88;
const FIRST = 20;
const GAP = (BANK_W - FIRST * 2) / (LEVERS - 1);

type Bank = boolean[];

const fresh = (): Bank => Array.from({ length: LEVERS }, () => false);

/** How the levers were left, believed only once it is the right shape. */
function load(): Bank {
  try {
    const raw = localStorage.getItem(MACHINE_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(saved) || saved.length !== LEVERS) return fresh();
    if (!saved.every((v) => typeof v === "boolean")) return fresh();
    return saved as Bank;
  } catch {
    return fresh();
  }
}

/** The arrow on a lever head, pointing the way that position reads. */
function arrow(dir: string) {
  const step = DIRS.find((d) => d.key === dir)!.step;
  const turn = (Math.atan2(step[1], step[0]) * 180) / Math.PI;
  return (
    <path d="M -1 -2.6 L -1 1 L -4 1 L 0 5.4 L 4 1 L 1 1 L 1 -2.6 Z" transform={`rotate(${turn - 90})`} fill={IRON} />
  );
}

/**
 * The machine, reading the tape.
 *
 * A band of colour is a direction — that much the star next door already
 * said, without saying it. The machine simply does as it is told, one band
 * at a time, and draws where the needle goes.
 *
 * Except at the brown bands, where the tape is genuinely ambiguous, and
 * there the machine has no opinion at all: it does whatever the lever under
 * that band says. Thirteen levers, eight thousand readings, and exactly one
 * that never runs off the plate, never hits a stud, never crosses its own
 * line and arrives back where it set off. Nothing is graded on the way. The needle
 * just stops where it stops, and stopping early is the only thing the
 * machine will ever tell anybody.
 */
export default function Machine({ onSolved }: { onSolved?: () => void }) {
  const [bank, setBank] = useState<Bank>(load);

  useEffect(() => {
    try {
      localStorage.setItem(MACHINE_KEY, JSON.stringify(bank));
    } catch {
      /* storage unavailable — the levers still hold for this visit */
    }
  }, [bank]);

  const walk = follow(bank);
  const done = walk.closed;
  /** How much of the tape the needle managed to read. */
  const read = walk.cells.length - 1;

  /** It reports the moment the line closes, and only that moment. */
  const already = useRef(done);
  useEffect(() => {
    if (done && !already.current) onSolved?.();
    already.current = done;
  }, [done, onSolved]);

  const pull = (i: number) => setBank((all) => all.map((up, n) => (n === i ? !up : up)));

  /** The needle leans on how far it got. Flavour, and a little honesty. */
  const swing = -48 + (read / BANDS.length) * 96;

  return (
    <div className={`machine${done ? " is-closed" : ""}`}>
      {/* the tape, with a number over every band a lever answers for */}
      <svg
        className="machine__tape"
        viewBox={`0 0 ${TAPE_W} ${ROW_H * TAPE_ROWS}`}
        role="img"
        aria-label={`Nastro di ${BANDS.length} bande`}
      >
        {BANDS.map((colour, i) => {
          const x = (i % PER_ROW) * BAND;
          const y = Math.floor(i / PER_ROW) * ROW_H;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y + 10}
                width={BAND}
                height={TAPE_H}
                fill={colour}
                className={`machine__band${i < read ? " is-read" : ""}`}
              />
              {/* the sprocket holes, so it reads as tape and not a bar chart */}
              <circle cx={x + BAND / 2} cy={y + TAPE_H + 14} r="1.5" fill={COPPER} />
              {SLOTS.includes(i) && (
                <text className="machine__over" x={x + BAND / 2} y={y + 7}>
                  {SLOTS.indexOf(i) + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* where the needle has got to */}
      <svg
        className="machine__plate"
        viewBox={`0 0 ${GRID_W} ${GRID_H}`}
        role="img"
        aria-label={`Il percorso ha letto ${read} bande su ${BANDS.length}`}
      >
        <rect x="0" y="0" width={GRID_W} height={GRID_H} className="machine__field" />
        {Array.from({ length: W + 1 }, (_, i) => (
          <line
            key={`v${i}`}
            className="machine__rule"
            x1={PAD + i * CELL}
            y1={PAD}
            x2={PAD + i * CELL}
            y2={PAD + H * CELL}
          />
        ))}
        {Array.from({ length: H + 1 }, (_, i) => (
          <line
            key={`h${i}`}
            className="machine__rule"
            x1={PAD}
            y1={PAD + i * CELL}
            x2={PAD + W * CELL}
            y2={PAD + i * CELL}
          />
        ))}

        <polyline
          className="machine__track"
          points={walk.cells.map(([x, y]) => `${mid(x)},${mid(y)}`).join(" ")}
        />

        {/* while it is working, two blocks to get round and nothing more.
            Once the line closes, the plate fills in with who it was */}
        {done
          ? PIXELS.map(({ x, y, ink }) => (
              <rect
                key={`p${x},${y}`}
                x={PAD + (ORIGIN[0] + x * SC) * CELL}
                y={PAD + (ORIGIN[1] + y * SC) * CELL}
                width={CELL * SC}
                height={CELL * SC}
                fill={ink}
              />
            ))
          : EYES.map(([x, y]) => (
              <rect
                key={`e${x},${y}`}
                className="machine__eye"
                x={PAD + x * CELL + 1}
                y={PAD + y * CELL + 1}
                width={CELL * SC - 2}
                height={CELL * SC * 2 - 2}
                rx="3"
              />
            ))}

        <circle className="machine__home" cx={mid(START[0])} cy={mid(START[1])} r={CELL * 0.3} />
        {!done && read > 0 && (
          <circle
            className="machine__stall"
            cx={mid(walk.cells[walk.cells.length - 1][0])}
            cy={mid(walk.cells[walk.cells.length - 1][1])}
            r={CELL * 0.26}
          />
        )}
      </svg>

      {/* the bank of levers */}
      <svg className="machine__bank" viewBox={`0 0 ${BANK_W} ${BANK_H}`} role="group" aria-label="Leve">
        <defs>
          <linearGradient id="mach-plate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6B5A3E" />
            <stop offset="0.45" stopColor="#4A3D2A" />
            <stop offset="1" stopColor="#332B1E" />
          </linearGradient>
          <linearGradient id="mach-rod" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8A6F2E" />
            <stop offset="0.4" stopColor={BRASS} />
            <stop offset="1" stopColor="#7A6228" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={BANK_W} height={BANK_H} rx="9" fill="url(#mach-plate)" />
        <rect
          x="4"
          y="4"
          width={BANK_W - 8}
          height={BANK_H - 8}
          rx="6"
          fill="none"
          stroke={BRASS}
          strokeOpacity="0.5"
          strokeWidth="1.6"
        />
        {Array.from({ length: 12 }, (_, i) => (
          <circle
            key={i}
            cx={10 + (i / 11) * (BANK_W - 20)}
            cy={BANK_H - 7}
            r="1.8"
            fill={COPPER}
            fillOpacity="0.8"
          />
        ))}
        {/* the gauge, off to one side, leaning on how far the needle got */}
        <circle cx={BANK_W - 16} cy="16" r="10" fill="#1A1714" stroke={BRASS} strokeWidth="1.2" />
        <line
          className="machine__needle"
          x1={BANK_W - 16}
          y1="16"
          x2={BANK_W - 16 + Math.sin((swing * Math.PI) / 180) * 7}
          y2={16 - Math.cos((swing * Math.PI) / 180) * 7}
          stroke="#E8C86A"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {bank.map((up, i) => {
          const x = FIRST + i * GAP;
          const y = up ? SLOT_TOP + 9 : SLOT_BOTTOM - 9;
          return (
            <g
              key={i}
              className={`machine__lever${up ? " is-up" : ""}`}
              onClick={() => pull(i)}
              role="button"
              tabIndex={0}
              aria-label={`Leva ${i + 1}: ${up ? FORK[0] : FORK[1]}`}
              aria-pressed={up}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  pull(i);
                }
              }}
            >
              <rect
                x={x - 5}
                y={SLOT_TOP}
                width="10"
                height={SLOT_BOTTOM - SLOT_TOP}
                rx="5"
                fill="#15110C"
                stroke={COPPER}
                strokeWidth="0.9"
                strokeOpacity="0.7"
              />
              <line
                className="machine__rod"
                x1={x}
                y1={SLOT_BOTTOM - 3}
                x2={x}
                y2={y}
                stroke="url(#mach-rod)"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <g className="machine__head" transform={`translate(${x} ${y})`}>
                <circle r="8.5" fill={BRASS} stroke="#6B5A1E" strokeWidth="1.1" />
                {arrow(up ? FORK[0] : FORK[1])}
              </g>
              <text className="machine__mark" x={x} y={BANK_H - 14}>
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="machine__status">
        {done ? (
          <span className="machine__won">il nastro si chiude</span>
        ) : (
          <>
            {read}/{BANDS.length} bande lette
          </>
        )}
      </p>
    </div>
  );
}
