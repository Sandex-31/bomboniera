import { useEffect, useRef, useSyncExternalStore } from "react";
import { PIECES, boxPath, cellSize, holdPiece, isDone, isHome, subscribe } from "../lib/lost";

/**
 * One fragment of the figure, in a window of its own.
 *
 * The window is glass: the fragment has to be laid over the maze and read
 * together with what is drawn there, so anything opaque would hide the half
 * of the picture it is meant to complete.
 */
export default function Piece({ index }: { index: number }) {
  const piece = PIECES[index];
  const [vx, vy, vw, vh] = piece.view;
  const svg = useRef<SVGSVGElement>(null);

  // the fragment is drawn at the maze's scale, whatever the maze is showing at
  const cell = useSyncExternalStore(subscribe, cellSize);
  const home = useSyncExternalStore(subscribe, () => isHome(index));
  const done = useSyncExternalStore(subscribe, isDone);

  useEffect(() => {
    holdPiece(index, svg.current);
    return () => holdPiece(index, null);
  }, [index]);

  return (
    <svg
      ref={svg}
      className={`piece${home ? " is-home" : ""}${done ? " is-done" : ""}`}
      width={vw * cell}
      height={vh * cell}
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      role="img"
      aria-label={piece.title}
    >
      {piece.paths?.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {piece.boxes?.map((box, i) => (
        <path key={i} className="piece__ink" d={boxPath(box)} />
      ))}
    </svg>
  );
}
