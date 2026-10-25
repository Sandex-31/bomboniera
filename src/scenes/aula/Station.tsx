import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useTap } from "../Hotspot";
import { lockedFor, open, passed, type AulaState, type ExamId, type Verdict } from "../../lib/aula/chain";
import { FIT_W, SPOTS, SPOT_MARK, TAP_W } from "./spots";

/*
 * Where an exam is sat. From the hall it is a box with its name, a lock on it
 * while what it needs is not passed; walked up to, its puzzle is a sheet laid
 * square to the camera, filling most of a phone. A failure shuts the sheet
 * until the next appello, whose date and countdown stand over it.
 */

/** How wide the sheet is drawn, in CSS px, before it is scaled into the hall. */
const SHEET_PX = 320;
/** How much of the screen's width a sheet takes from its spot's view. */
const SHEET_FILL = 0.86;
/** drei draws a transformed `<Html>` at 40 px a world unit. */
const PX_PER_UNIT = 40;

/** Taps on the sheet are the puzzle's: they turn no camera and walk away from no spot. */
const stop = (e: SyntheticEvent) => e.stopPropagation();

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function Station({
  id,
  state,
  now,
  onTry,
  focused,
  onPick,
  children,
}: {
  id: ExamId;
  state: AulaState;
  now: number;
  /** An answer was given: the hall passes or fails the exam. */
  onTry: (v: Verdict) => void;
  focused: boolean;
  onPick: () => void;
  /** The puzzle, told whether it is passed so it can draw its result, and how to answer. */
  children: (p: { passed: boolean; onTry: (v: Verdict) => void }) => ReactNode;
}) {
  const tap = useTap(onPick);
  const { position, view } = SPOTS[id];
  const shut = !open(state, id);
  const done = passed(state, id);
  const left = lockedFor(state.failedAt[id], now);
  const mark = done ? " ✓" : shut ? " 🔒" : left > 0 ? " ⏳" : "";
  // the camera fits FIT_W in the screen's shorter side: the sheet takes most of its width, and no more of its height
  const size = useThree((s) => s.size);
  const [sheet, setSheet] = useState<HTMLDivElement | null>(null);
  const [tall, setTall] = useState(0);
  useEffect(() => {
    if (!sheet) return;
    const ro = new ResizeObserver(() => setTall(sheet.offsetHeight));
    ro.observe(sheet);
    return () => ro.disconnect();
  }, [sheet]);
  const worldH = (FIT_W * size.height) / Math.min(size.width, size.height) / view.zoom;
  const scale = Math.min(
    ((SHEET_FILL * FIT_W) / view.zoom) * (PX_PER_UNIT / SHEET_PX),
    tall ? (SHEET_FILL * worldH * PX_PER_UNIT) / tall : Infinity,
  );

  return (
    <>
      <group position={position} {...SPOT_MARK}>
        {!focused && (
          <mesh {...tap}>
            <boxGeometry args={[TAP_W, TAP_W, TAP_W]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
        <mesh>
          <boxGeometry args={[0.32, 0.32, 0.32]} />
          <meshStandardMaterial color="#E8D9A8" emissive="#E8D9A8" emissiveIntensity={0.25} roughness={0.6} />
        </mesh>
        {!focused && (
          <Html position={[0, 0.3, 0]} center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
            <span className="aula-tag">
              {id}
              {mark}
            </span>
          </Html>
        )}
      </group>
      {focused && (
        // square onto the camera of the spot's view, wherever that looks from
        <group position={view.target} rotation={[view.polar - Math.PI / 2, view.azimuth, 0, "YXZ"]}>
          <Html transform scale={scale} zIndexRange={[20, 10]}>
            <div ref={setSheet} className="aula-sheet" style={{ width: SHEET_PX }} onPointerDown={stop} onPointerUp={stop} onClick={stop}>
              {shut ? (
                <p className="aula-sheet__lock">
                  <span aria-hidden="true">🔒</span> propedeuticità mancanti
                </p>
              ) : (
                <>
                  {left > 0 && (
                    <p className="aula-sheet__appello" role="status">
                      bocciato · prossimo appello:{" "}
                      {new Date(now + left).toLocaleString("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      <b>{clock(left)}</b>
                    </p>
                  )}
                  {/* a fieldset disabled disables every control of the puzzle in it at once */}
                  <fieldset disabled={left > 0} className="aula-sheet__body">
                    {children({ passed: done, onTry: (v) => left === 0 && !done && onTry(v) })}
                  </fieldset>
                </>
              )}
            </div>
          </Html>
        </group>
      )}
    </>
  );
}
