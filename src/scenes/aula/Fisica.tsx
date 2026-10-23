import { useEffect, useState } from "react";
import type { Verdict } from "../../lib/aula/chain";
import { COIL_OHMS, EMPTY, FISICA_ANSWER, FISICA_FILLING, LIFT, RESISTORS, SMOKE, current, jitter, judgeFisica, type Circuit, type Colour } from "../../lib/aula/fisica";

/*
 * The lab bench as a drawing: the battery, the slot in series, then the
 * coil's branch (a slot, the electromagnet over its iron weight, the
 * ammeter) beside a branch with one slot of its own. Under it the box of
 * resistors: tap one, then tap a slot to put it there; tap a filled slot to
 * take it out. Closing the switch sends the current: the weight comes up,
 * stays down, or the wire smokes; only the first passes.
 */

const HEX: Record<Colour, string> = {
  black: "#111",
  brown: "#7A4A1E",
  red: "#C8261E",
  orange: "#EE7A1A",
  yellow: "#F2D21B",
  green: "#2F8A3A",
  blue: "#2357C4",
  violet: "#7B3FB0",
  grey: "#8A8A8A",
  white: "#F4F4F4",
  gold: "#C9A64A",
};

/** The three slots on the drawing: series, coil's branch, the branch beside it. */
const SLOT_AT: [number, number][] = [
  [56, 36],
  [140, 36],
  [188, 136],
];
const TOP = 36;
const MID = 136;
const BOT = 190;

/** A resistor body with its four bands, centred on (x, y). */
function Body({ x, y, bands }: { x: number; y: number; bands: Colour[] }) {
  return (
    <g transform={`translate(${x - 26} ${y - 9})`}>
      <rect width="52" height="18" rx="8" fill="#E2CFA2" stroke="#1A1410" />
      {bands.map((b, i) => (
        <rect key={i} x={i === 3 ? 40 : 9 + i * 8} y="0.5" width="5" height="17" fill={HEX[b]} />
      ))}
    </g>
  );
}

const bandsOf = (id: string) => RESISTORS.find((r) => r.id === id)!.bands;

export default function Fisica({
  passed,
  onTry,
  volts,
  firstTry,
}: {
  passed: boolean;
  onTry: (v: Verdict) => void;
  volts: number;
  firstTry: boolean;
}) {
  const [circuit, setCircuit] = useState<Circuit>(EMPTY);
  const [held, setHeld] = useState<string | null>(null);
  /** The switch closed, and what came of it; any change to the slots opens it again. */
  const [shot, setShot] = useState<ReturnType<typeof judgeFisica> | null>(null);
  const shown: Circuit = passed ? FISICA_FILLING : circuit;
  const on = passed || shot !== null;
  const mA = on ? current(shown, volts) : 0;

  // the needle trembles while current flows
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setT(performance.now() / 1000), 90);
    return () => clearInterval(id);
  }, [on]);
  const read = mA ? jitter(mA, t) : 0;
  const angle = Math.max(-70, Math.min(70, (read / SMOKE) * 140 - 70));

  const set = (k: number, id: string | null) => {
    setShot(null);
    setCircuit((c) => ({ slots: c.slots.map((s, j) => (j === k ? id : s === id ? null : s)) }));
  };
  const tapSlot = (k: number) => {
    if (passed) return;
    if (held) {
      set(k, held);
      setHeld(null);
    } else if (circuit.slots[k]) set(k, null);
  };
  const close = () => {
    const v = judgeFisica(circuit, volts);
    setShot(v);
    // the weight left on the bench is failed as surely as the smoke: no filling can be tried for free
    onTry(v === "lift");
  };
  const lifted = passed || shot === "lift";

  return (
    <div className="aula-fisica">
      <svg viewBox="0 0 288 214" aria-label="Il circuito sul banco">
        <g fill="none" stroke="#1A1410" strokeWidth="2">
          <path d={`M12 ${TOP}H276V${BOT}H12Z`} />
          <path d={`M100 ${TOP}V${MID}H276`} />
        </g>
        {/* the battery on the return wire, its volts the area on the blackboard */}
        <rect x="124" y={BOT - 14} width="32" height="28" fill="#F4EFE2" />
        <line x1="134" y1={BOT - 14} x2="134" y2={BOT + 14} stroke="#1A1410" strokeWidth="3" />
        <line x1="146" y1={BOT - 8} x2="146" y2={BOT + 8} stroke="#1A1410" strokeWidth="5" />
        <text x="140" y={BOT - 20} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1A1410">
          ∫ V
        </text>
        {/* the electromagnet, and the weight under it on the bench */}
        <rect x="184" y={TOP - 12} width="26" height="24" rx="3" fill="#B87333" stroke="#1A1410" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={187 + i * 6} y1={TOP - 12} x2={187 + i * 6} y2={TOP + 12} stroke="#6B3E18" />
        ))}
        <line x1="176" y1="104" x2="218" y2="104" stroke="#6B4A33" strokeWidth="3" />
        <g className="aula-fisica__weight" style={{ transform: `translateY(${lifted ? -34 : 0}px)` }}>
          <rect x="186" y="82" width="22" height="20" rx="2" fill="#5A5F66" stroke="#1A1410" />
          <text x="197" y="96" textAnchor="middle" fontSize="9" fill="#F4EFE2">
            Fe
          </text>
        </g>
        {/* the ammeter */}
        <circle cx="248" cy={TOP} r="20" fill="#F4EFE2" stroke="#1A1410" strokeWidth="2" />
        <text x="248" y={TOP + 15} textAnchor="middle" fontSize="8" fontWeight="700">
          mA
        </text>
        <line x1="248" y1={TOP + 6} x2="248" y2={TOP - 13} stroke="#9B1C1C" strokeWidth="1.5" transform={`rotate(${angle} 248 ${TOP + 6})`} />
        {/* the slots */}
        {SLOT_AT.map(([x, y], k) => {
          const id = shown.slots[k];
          return (
            <g key={k} className="aula-fisica__slot" role="button" aria-label={`attacco ${k + 1}`} onClick={() => tapSlot(k)}>
              <rect x={x - 30} y={y - 22} width="60" height="44" fill="#F4EFE2" fillOpacity={held ? 0.9 : 1} />
              {id ? (
                <Body x={x} y={y} bands={bandsOf(id)} />
              ) : (
                <rect x={x - 26} y={y - 9} width="52" height="18" rx="4" fill="none" stroke={held ? "#C9A64A" : "#1A1410"} strokeDasharray="4 3" strokeWidth={held ? 2 : 1} />
              )}
            </g>
          );
        })}
        {shot === "smoke" && (
          <g className="aula-fisica__smoke" aria-label="il filo fuma">
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={16 + i * 9} cy={TOP - 8 - i * 6} r={6 + i * 2} fill="#7C7C7C" style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </g>
        )}
      </svg>
      <p className="aula-fisica__key">
        bobina {COIL_OHMS} Ω · solleva a {(LIFT[0] + LIFT[1]) / 2} ± {((LIFT[1] - LIFT[0]) / 2).toLocaleString("it-IT")} mA · filo max {SMOKE} mA
      </p>
      {passed ? (
        <p className="aula-arch__byte">
          {FISICA_ANSWER} mA · superato{firstTry && <span className="aula-fisica__thanks"> · grazie Archeus</span>}
        </p>
      ) : (
        <>
          <div className="aula-fisica__box" role="group" aria-label="La scatola delle resistenze">
            {RESISTORS.map((r) => {
              const used = circuit.slots.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  className="aula-fisica__res"
                  aria-pressed={held === r.id}
                  aria-label={`resistenza ${r.id}${used ? ", montata" : ""}`}
                  onClick={() => setHeld(held === r.id ? null : r.id)}
                  style={{ opacity: used && held !== r.id ? 0.4 : 1 }}
                >
                  <svg viewBox="0 0 60 22" aria-hidden="true">
                    <line x1="0" y1="11" x2="60" y2="11" stroke="#8A8A8A" strokeWidth="2" />
                    <Body x={30} y={11} bands={r.bands} />
                  </svg>
                </button>
              );
            })}
          </div>
          <button type="button" className="aula-stub" onClick={close}>
            chiudi il circuito
          </button>
          {shot === "weak" && <p className="aula-fisica__note">il peso non si stacca</p>}
        </>
      )}
    </div>
  );
}
