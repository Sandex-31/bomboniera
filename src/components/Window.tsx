import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

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

/** Grid the free spot is searched on, and the margin kept off the edges. */
const STEP = 24;
const EDGE = 8;

/**
 * Where a window of this size covers the least of the windows already open.
 *
 * Every spot on a coarse grid is scored by how much of the others it would
 * hide; the emptiest wins, and among equals the one nearest `start`, so on a
 * clear desktop it still opens where it always did. On a phone there is no
 * room for two side by side and something gets covered — but never the whole
 * of it when a corner could be left showing.
 */
function freeSpot(self: HTMLElement, start: { x: number; y: number }) {
  const w = self.offsetWidth;
  const h = self.offsetHeight;
  const others = [...document.querySelectorAll<HTMLElement>(".win")]
    .filter((el) => el !== self)
    .map((el) => el.getBoundingClientRect());
  if (!others.length) return start;

  const hidden = (x: number, y: number) =>
    others.reduce(
      (sum, r) =>
        sum +
        Math.max(0, Math.min(x + w, r.right) - Math.max(x, r.left)) *
          Math.max(0, Math.min(y + h, r.bottom) - Math.max(y, r.top)),
      0,
    );

  let best = start;
  let score = hidden(start.x, start.y);
  const maxX = Math.max(EDGE, window.innerWidth - w - EDGE);
  const maxY = Math.max(start.y, window.innerHeight - h - EDGE);
  for (let y = start.y; y <= maxY; y += STEP) {
    for (let x = EDGE; x <= maxX; x += STEP) {
      const s = hidden(x, y);
      const nearer = Math.hypot(x - start.x, y - start.y) < Math.hypot(best.x - start.x, best.y - start.y);
      if (s < score || (s === score && nearer)) {
        best = { x, y };
        score = s;
      }
    }
  }
  return best;
}

/** How small and how big two fingers may make a window. */
const MIN_SCALE = 0.35;
const MAX_SCALE = 1.6;

type Point = { x: number; y: number };

/**
 * A window you can pick up and move, the way a window is supposed to work,
 * and pinch smaller or bigger with two fingers, the way a phone expects.
 *
 * Position is kept in pixels in state rather than in CSS, because the drag has
 * to survive a re-render and a pointer that leaves the bar: the pointer is
 * captured on the window, so the move keeps arriving even when the finger
 * outruns it. It is held by its bar, by anything inside marked `data-grab`,
 * or — for glass — anywhere at all.
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
  onScale,
  children,
}: {
  title: string;
  /** Where it opens. Later windows open a little further down the stack. */
  start: Point;
  /** How wide it wants to be, in px. A grid needs more room than a note. */
  width?: number;
  /**
   * See-through, with no chrome to speak of: something to lay over another.
   * Glass is drawn at the scale of what it is laid over, so it is not pinched.
   */
  glass?: boolean;
  z: number;
  onFocus: () => void;
  onClose: () => void;
  /**
   * Last word on where the window lands, for anything that snaps. It is
   * handed the window itself too: the position it is being given may not have
   * reached the DOM yet, and what is inside the window is measured against it.
   */
  onDrop?: (at: Point, win: HTMLElement | null) => Point;
  /** It has just been pinched to a new size. */
  onScale?: () => void;
  children: ReactNode;
}) {
  const [at, setAt] = useState(start);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLElement>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  /** Every finger (or the mouse) down on the window, by pointer id. */
  const fingers = useRef(new Map<number, Point>());
  /** Where a pinch began: the spread, the scale, and the window and the
      fingers' midpoint at that moment. */
  const pinch = useRef<{ d0: number; s0: number; at0: Point; mid0: Point } | null>(null);

  /* on the way in, before it is painted: move off whatever is already open.
     The position goes straight onto the element too, because windows arriving
     together all land in this same pass and each one has to see where the
     ones before it went, not where React has yet to put them. */
  const placed = useRef(false);
  useLayoutEffect(() => {
    const el = box.current;
    /* once per window: React is free to run an effect again without
       remounting — in development it does when a window is raised — and
       arriving twice would put it on a new spot React knows nothing about */
    if (!el || placed.current) return;
    placed.current = true;
    const from = freeSpot(el, start);
    el.style.left = `${from.x}px`;
    el.style.top = `${from.y}px`;
    setAt(from);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spread = () => {
    const [a, b] = [...fingers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const midpoint = (): Point => {
    const [a, b] = [...fingers.current.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  const onDown = (e: PointerEvent<HTMLElement>) => {
    onFocus();
    if ((e.target as Element).closest(".win__close")) return;
    /* a mouse released outside the window never reports it here, and there
       is only ever one of it — so a press starts the count afresh. Fingers
       need no such care: a touch always reports its end to where it began */
    if (e.pointerType === "mouse") fingers.current.clear();
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // a second finger turns whatever the first was doing into a pinch
    if (fingers.current.size === 2 && !glass) {
      grab.current = null;
      pinch.current = { d0: spread(), s0: scale, at0: at, mid0: midpoint() };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (fingers.current.size !== 1) return;
    const handle = glass || (e.target as Element).closest(".win__bar, [data-grab]");
    if (!handle) return;
    grab.current = { dx: e.clientX - at.x, dy: e.clientY - at.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (fingers.current.has(e.pointerId)) {
      fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    const p = pinch.current;
    if (p && fingers.current.size >= 2) {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (p.s0 * spread()) / p.d0));
      /* what was under the fingers stays under them, and follows them if
         they slide: the corner keeps its distance from the midpoint, scaled */
      const k = next / p.s0;
      const mid = midpoint();
      setAt({ x: mid.x - (p.mid0.x - p.at0.x) * k, y: mid.y - (p.mid0.y - p.at0.y) * k });
      setScale(next);
      onScale?.();
      return;
    }
    const g = grab.current;
    if (!g) return;
    const width = (box.current?.offsetWidth ?? 320) * scale;
    const height = (box.current?.offsetHeight ?? 200) * scale;
    /* a pane may go above the top of the screen, a window may not: a window
       is held by its bar, and a bar up there can never be reached again */
    const top = glass ? KEEP - height : 0;
    const x = Math.min(Math.max(KEEP - width, e.clientX - g.dx), window.innerWidth - KEEP);
    const y = Math.min(Math.max(top, e.clientY - g.dy), window.innerHeight - KEEP);
    setAt({ x, y });
  };

  const onUp = (e: PointerEvent<HTMLElement>) => {
    fingers.current.delete(e.pointerId);
    if (pinch.current) {
      // the pinch is over once fewer than two are down; it never turns into a drag
      if (fingers.current.size < 2) pinch.current = null;
      return;
    }
    if (!grab.current) return;
    grab.current = null;
    const landed = onDrop?.(at, box.current);
    if (landed && (landed.x !== at.x || landed.y !== at.y)) setAt(landed);
  };

  return (
    <section
      ref={box}
      className={`win${glass ? " win--glass" : ""}`}
      style={{
        left: at.x,
        top: at.y,
        zIndex: 30 + z,
        transform: scale === 1 ? undefined : `scale(${scale})`,
        /* from the corner the position is kept at, so what is drawn is what
           the edges of the screen are measured against: from the default
           middle, a shrunk window sat inside the footprint of its full size
           and stopped short of every edge by half the difference */
        transformOrigin: "0 0",
        // glass panes are exactly as wide as what is drawn on them
        width: glass ? "auto" : `min(96vw, ${width}px)`,
      }}
      aria-label={title}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="win__bar">
        <span className="win__title">{glass ? "⠿" : title}</span>
        <button className="win__close" onClick={onClose} aria-label={`Chiudi ${title}`}>
          ×
        </button>
      </div>
      <div className="win__body">{children}</div>
    </section>
  );
}
