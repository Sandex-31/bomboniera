import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

/**
 * How much of a glass pane has to stay on screen.
 *
 * A pane is held anywhere on it rather than by its bar, so it is allowed to
 * hang off any edge — including the top, which it has to: the figure it
 * belongs to stands above the maze window, so a fragment that could never be
 * put above the top of the screen could never be put where it belongs. It
 * could be dropped there and then not dragged back, which is the whole bug.
 */
const KEEP = 56;

/**
 * A window you can pick up and move, the way a window is supposed to work.
 *
 * Position is kept in pixels in state rather than in CSS, because the drag has
 * to survive a re-render and a pointer that leaves the bar: the pointer is
 * captured on the title bar, so the move keeps arriving even when the finger
 * outruns the window.
 */
export default function Window({
  title,
  start,
  width = 360,
  glass = false,
  z,
  onFocus,
  onClose,
  onDrop,
  offset,
  onMove: report,
  settle,
  children,
}: {
  title: string;
  /** Where it opens. Later windows open a little further down the stack. */
  start: { x: number; y: number };
  /** How wide it wants to be, in px. A grid needs more room than a note. */
  width?: number;
  /** See-through, with no chrome to speak of: something to lay over another. */
  glass?: boolean;
  z: number;
  onFocus: () => void;
  onClose: () => void;
  /**
   * Last word on where the window lands, for anything that snaps. It is
   * handed the window itself too: the position it is being given may not have
   * reached the DOM yet, and what is inside the window is measured against it.
   */
  onDrop?: (at: { x: number; y: number }, win: HTMLElement | null) => { x: number; y: number };
  /** Added to where it sits, for a window that rides with another one. */
  offset?: { x: number; y: number };
  /** Where it has got to, while it is being dragged. */
  onMove?: (at: { x: number; y: number }) => void;
  /** One chance, once it is on screen, to put itself somewhere else. */
  settle?: (at: { x: number; y: number }, win: HTMLElement | null) => { x: number; y: number } | null | undefined;
  children: ReactNode;
}) {
  const [at, setAt] = useState(start);
  const box = useRef<HTMLElement>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  const drop = () => {
    if (!grab.current) return;
    grab.current = null;
    const landed = onDrop?.(at, box.current);
    if (landed && (landed.x !== at.x || landed.y !== at.y)) setAt(landed);
  };

  /* once, on the way in: `start` is still where it is, since nothing has
     moved it yet, and by now the window is on screen and can be measured */
  useEffect(() => {
    const landed = settle?.(start, box.current);
    if (landed) setAt(landed);
    // deliberately once: this is the window arriving, not following anything
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* what it is asked to add to where it sits: the grab is measured against
     where the window actually is, or it jumps by that much on the first move */
  const ox = offset?.x ?? 0;
  const oy = offset?.y ?? 0;

  const onDown = (e: PointerEvent<HTMLElement>) => {
    onFocus();
    grab.current = { dx: e.clientX - at.x - ox, dy: e.clientY - at.y - oy };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const g = grab.current;
    if (!g) return;
    const width = box.current?.offsetWidth ?? 320;
    const height = box.current?.offsetHeight ?? 200;
    /* a pane may go above the top of the screen, a window may not: a window
       is held by its bar, and a bar up there can never be reached again */
    const top = glass ? KEEP - height : 0;
    const x = Math.min(Math.max(KEEP - width, e.clientX - g.dx), window.innerWidth - KEEP);
    const y = Math.min(Math.max(top, e.clientY - g.dy), window.innerHeight - KEEP);
    const next = { x: x - ox, y: y - oy };
    setAt(next);
    report?.(next);
  };

  /* a pane is a drawing to be laid over another: it is dragged from anywhere
     on it, which is also how it is fetched back once its bar is off screen */
  const drag = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: drop, onPointerCancel: drop };



  return (
    <section
      ref={box}
      className={`win${glass ? " win--glass" : ""}`}
      style={{
        left: at.x + (offset?.x ?? 0),
        top: at.y + (offset?.y ?? 0),
        zIndex: 30 + z,
        // glass panes are exactly as wide as what is drawn on them
        width: glass ? "auto" : `min(96vw, ${width}px)`,
      }}
      aria-label={title}
      {...(glass ? drag : { onPointerDown: onFocus })}
    >
      <div className="win__bar" {...(glass ? {} : drag)}>
        <span className="win__title">{glass ? "⠿" : title}</span>
        <button
          className="win__close"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Chiudi ${title}`}
        >
          ×
        </button>
      </div>
      <div className="win__body">{children}</div>
    </section>
  );
}
