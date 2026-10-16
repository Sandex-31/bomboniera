import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type SyntheticEvent } from "react";
import { LOCK_KEY } from "../data/puzzle";
import { loadLock, turn, unlocked } from "../lib/sagome";

/** How far a finger travels for one notch of a wheel, in px. */
const NOTCH = 28;

/**
 * It lives in the 3D scene, and anything that reaches the scene behind it is
 * a tap in the void — which flies the camera away. So nothing gets past it.
 */
const stop = (e: SyntheticEvent) => e.stopPropagation();

/**
 * A combination lock: five wheels, rolled up and down with a finger.
 *
 * Nothing says whether a wheel is right. It opens the moment all five are,
 * the way a real one does, and from then on it stays open and the wheels stay
 * where they are. Until the camera is in front of it, a touch only asks to
 * come closer — a wheel turned from across the island is a wheel turned by
 * accident.
 */
export default function Lock({
  active,
  onFocus,
  onOpen,
}: {
  /** The camera is in front of it, so the wheels answer. */
  active: boolean;
  onFocus: () => void;
  onOpen: () => void;
}) {
  const [digits, setDigits] = useState(loadLock);
  const open = unlocked(digits);
  /** Open already when it was found: it says nothing about that. */
  const wasOpen = useRef(open);
  const drag = useRef<{ wheel: number; y: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LOCK_KEY, JSON.stringify(digits));
    } catch {
      /* storage unavailable — the wheels still hold for this visit */
    }
  }, [digits]);

  useEffect(() => {
    if (!open || wasOpen.current) return;
    wasOpen.current = true;
    onOpen();
  }, [open, onOpen]);

  const roll = (wheel: number, by: number) => {
    if (!open) setDigits((d) => turn(d, wheel, by));
  };

  const down = (wheel: number) => (e: PointerEvent<HTMLDivElement>) => {
    stop(e);
    if (!active) {
      onFocus();
      return;
    }
    drag.current = { wheel, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    stop(e);
    const d = drag.current;
    if (!d) return;
    // up rolls the wheel forward, a notch at a time
    const notches = Math.trunc((d.y - e.clientY) / NOTCH);
    if (!notches) return;
    d.y -= notches * NOTCH;
    roll(d.wheel, notches);
  };

  const up = (e: PointerEvent<HTMLDivElement>) => {
    stop(e);
    drag.current = null;
  };

  const key = (wheel: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") roll(wheel, 1);
    else if (e.key === "ArrowDown") roll(wheel, -1);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={`lock${open ? " is-open" : ""}${active ? " is-active" : ""}`}
      onPointerDown={stop}
      onPointerUp={stop}
      onClick={stop}
      onWheel={stop}
    >
      <div className="lock__shackle" aria-hidden="true" />
      <div className="lock__body" role="group" aria-label={open ? "Lucchetto aperto" : "Lucchetto a combinazione"}>
        {digits.map((d, i) => (
          <div
            key={i}
            className="lock__wheel"
            tabIndex={active && !open ? 0 : -1}
            role="spinbutton"
            aria-valuemin={0}
            aria-valuemax={9}
            aria-valuenow={d}
            aria-label={`Rotella ${i + 1}`}
            onPointerDown={down(i)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={key(i)}
          >
            <span className="lock__digit is-near">{(d + 1) % 10}</span>
            <span className="lock__digit">{d}</span>
            <span className="lock__digit is-near">{(d + 9) % 10}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
