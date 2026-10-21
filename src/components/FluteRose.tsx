import { useEffect, useRef, useState } from "react";
import { DIRS, played, type Note, type Played } from "../lib/flute";
import { fluteVoice, type Voice } from "../lib/fluteVoice";

/*
 * The flute: eight arrows round a centre, one note each. A note sounds while
 * its arrow is held and stops when the finger lets go, wherever it is by then.
 * Arrows only, no words. It sits in the bottom-right corner, and on a phone
 * along the bottom, where it covers the least of the screen on the wall.
 */

/** Arrow size, and how far from the centre each sits: arrows are at least 44 CSS px. */
const BTN = 52;
const RING = 70;
const SIZE = 2 * RING + BTN;
/** The arrow glyph points up; each direction turns it by its angle. */
const NAMES = ["in alto", "in alto a destra", "a destra", "in basso a destra", "in basso", "in basso a sinistra", "a sinistra", "in alto a sinistra"];
const DEG = [0, 45, 90, 135, 180, 225, 270, 315];

const CSS = `
.flute-rose{position:fixed;right:12px;bottom:12px;width:${SIZE}px;height:${SIZE}px;z-index:20;touch-action:none;user-select:none;-webkit-user-select:none}
@media (max-width:640px){.flute-rose{right:auto;left:50%;margin-left:${-SIZE / 2}px;bottom:8px}}
.flute-rose button{position:absolute;width:${BTN}px;height:${BTN}px;border-radius:50%;border:2px solid #9DB4D8;background:rgba(10,14,22,.72);color:#DCEBFF;padding:0;touch-action:none;-webkit-tap-highlight-color:transparent}
.flute-rose button.on{background:#9DB4D8;color:#05070B}
`;

export default function FluteRose({ onNote, disabled }: { onNote: (p: Played) => void; disabled?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<number | null>(null);
  const hold = useRef<{ note: Note; at: number; voice: Voice; pointer: number } | null>(null);
  // the latest props, read by listeners that are made once
  const props = useRef({ onNote, disabled });
  props.current = { onNote, disabled };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const end = (e: PointerEvent) => {
      const h = hold.current;
      // another finger lifting is not the one holding
      if (!h || e.pointerId !== h.pointer) return;
      hold.current = null;
      setHeld(null);
      h.voice.stop();
      // a cancelled press stops the sound and plays no note
      // timed by the pointer's own clock, not by when this code got to hear of it
      if (e.type === "pointerup") props.current.onNote(played(h.note, e.timeStamp - h.at));
    };
    const down = (e: PointerEvent) => {
      // native listeners: the canvas listens on a parent, and React's would be too late to keep it off
      e.stopPropagation();
      const b = (e.target as Element).closest<HTMLElement>("[data-note]");
      if (!b || hold.current || props.current.disabled) return;
      e.preventDefault();
      const note = Number(b.dataset.note) as Note;
      b.setPointerCapture(e.pointerId);
      hold.current = { note, at: e.timeStamp, voice: fluteVoice().start(note), pointer: e.pointerId };
      setHeld(note);
    };
    const quiet = (e: Event) => e.stopPropagation();
    const own = ["pointermove", "pointerup", "pointercancel", "click"];
    el.addEventListener("pointerdown", down);
    own.forEach((t) => el.addEventListener(t, quiet));
    // and the end of the hold wherever it happens, before anything can stop it
    window.addEventListener("pointerup", end, true);
    window.addEventListener("pointercancel", end, true);
    return () => {
      el.removeEventListener("pointerdown", down);
      own.forEach((t) => el.removeEventListener(t, quiet));
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", end, true);
      hold.current?.voice.stop();
      hold.current = null;
    };
  }, []);

  // switched off mid-hold: the sound stops with no note played
  useEffect(() => {
    if (!disabled || !hold.current) return;
    hold.current.voice.stop();
    hold.current = null;
    setHeld(null);
  }, [disabled]);

  return (
    <div ref={root} className="flute-rose" role="group" aria-label="Flauto">
      <style>{CSS}</style>
      {DIRS.map((d, k) => {
        const a = (DEG[k] * Math.PI) / 180;
        return (
          <button
            key={d}
            type="button"
            data-note={k}
            className={held === k ? "on" : undefined}
            aria-label={`Nota ${NAMES[k]}`}
            style={{ left: RING + Math.sin(a) * RING, top: RING - Math.cos(a) * RING }}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" style={{ transform: `rotate(${DEG[k]}deg)`, pointerEvents: "none" }} aria-hidden="true">
              <path d="M12 3 L20 15 H14 V21 H10 V15 H4 Z" fill="currentColor" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
