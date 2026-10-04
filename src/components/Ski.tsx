import { useEffect, useRef, useState } from "react";
import {
  CODE,
  PISTES,
  RUNS,
  STATIONS,
  lengthOf,
  loadSki,
  solvedSki,
  stationOf,
} from "../lib/ski";
import { SKI_KEY } from "../data/puzzle";

/** A pattern per kind of run, so the four are not told apart by colour alone. */
const DASH = ["none", "4 2.2", "1.3 1.7", "5 1.4 1 1.4"];

/** What has been worked out so far: station id to whatever was typed in. */
type Filled = Record<string, string>;

/**
 * The map of the ski area.
 *
 * Every run carries its length and its colour, and one station carries its
 * altitude. How steep a colour is appears nowhere on this panel, and that is
 * deliberate: those four numbers are what the lamps spell out, and without
 * them the map is a pretty drawing with no way in.
 *
 * With them it unrolls one station at a time — length by gradient is the
 * drop, the drop off a known height is the next height, and that height
 * opens two more runs. Nothing is confirmed on the way, but nothing needs to
 * be: most stations can be reached by two different runs, so the mountain
 * checks the arithmetic itself for anyone who bothers to go round twice.
 */
export default function Ski({ onSolved }: { onSolved?: () => void }) {
  const [filled, setFilled] = useState<Filled>(loadSki);

  useEffect(() => {
    try {
      localStorage.setItem(SKI_KEY, JSON.stringify(filled));
    } catch {
      /* storage unavailable — the sums still stand for this visit */
    }
  }, [filled]);

  const done = solvedSki(filled);

  /**
   * It reports the moment the last altitude lands, and only that moment:
   * coming back to a finished map should not send the island off again.
   */
  const already = useRef(done);
  useEffect(() => {
    if (done && !already.current) onSolved?.();
    already.current = done;
  }, [done, onSolved]);

  const type = (id: string, value: string) =>
    setFilled((all) => ({ ...all, [id]: value.replace(/\D/g, "").slice(0, 4) }));

  return (
    <div className={`ski${done ? " is-done" : ""}`}>
      <div className="ski__map">
        <svg viewBox="0 0 100 100" role="img" aria-label="Mappa del comprensorio">
          <rect x="0" y="0" width="100" height="100" className="ski__bg" />

          {RUNS.map((run) => {
            const a = stationOf(run.from);
            const b = stationOf(run.to);
            const piste = PISTES[run.piste];
            return (
              <g key={`${run.from}${run.to}`}>
                {/* a pale casing under every run, or the black one disappears */}
                <line className="ski__casing" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                <line
                  className="ski__run"
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={piste.ink}
                  strokeDasharray={DASH[run.piste]}
                />
                <text className="ski__len" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 1.2}>
                  {lengthOf(run)}
                </text>
              </g>
            );
          })}

          {STATIONS.map((station) => (
            <g key={station.id}>
              <circle className="ski__dot" cx={station.x} cy={station.y} r="2" />
              <text className="ski__name" x={station.x} y={station.y - 3.4}>
                {station.name}
              </text>
              {station.given && (
                <text className="ski__given" x={station.x} y={station.y + 6}>
                  {station.alt} m
                </text>
              )}
            </g>
          ))}
        </svg>

        {STATIONS.filter((station) => !station.given).map((station) => (
          <input
            key={station.id}
            className="ski__alt"
            style={{ left: `${station.x}%`, top: `${station.y + 4.5}%` }}
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={filled[station.id] ?? ""}
            placeholder="····"
            aria-label={`Quota di ${station.name}, in metri`}
            disabled={done}
            onChange={(e) => type(station.id, e.target.value)}
          />
        ))}
      </div>

      <div className="ski__legend" aria-hidden="true">
        {PISTES.map((piste, i) => (
          <span key={piste.key} className="ski__key">
            <svg viewBox="0 0 24 6">
              <line
                x1="1"
                y1="3"
                x2="23"
                y2="3"
                stroke={piste.ink}
                strokeDasharray={DASH[i]}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            {piste.key}
          </span>
        ))}
      </div>

      {/* the five figures, handed over only once the whole mountain is right */}
      <div className="ski__code" role="group" aria-label="Codice">
        {CODE.map((digit, i) => (
          <span key={i} className="ski__digit">
            {done ? digit : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
