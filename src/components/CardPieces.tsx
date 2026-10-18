/**
 * The pieces of the punched card found so far, kept at the edge of the
 * screen like things in a pocket. Only their shape shows here: the holes are
 * read on the organ's lectern, once the pieces are put back together.
 */
export type PieceId = "A" | "B" | "C";

/** Each piece torn off along its own jagged line, so the three never look alike. */
const TEARS: Record<PieceId, string> = {
  A: "M2 2 H30 L27 8 L31 14 L26 21 L30 28 L27 34 L31 40 H2 Z",
  B: "M5 2 L2 9 L6 15 L1 22 L5 29 L2 35 L6 40 H28 L31 33 L26 26 L30 19 L27 12 L31 5 L28 2 Z",
  C: "M4 2 H30 V40 H4 L1 33 L5 27 L1 20 L6 13 L2 7 Z",
};

export default function CardPieces({ found }: { found: PieceId[] }) {
  if (found.length === 0) return null;
  return (
    <div className="card-pieces" aria-label="pezzi di scheda">
      {found.map((id) => (
        <svg key={id} viewBox="0 0 33 42" width="33" height="42" aria-hidden="true">
          <path d={TEARS[id]} fill="#E8DCC0" stroke="#8A7650" strokeWidth="1" />
          {[10, 20, 30].map((y) => (
            <circle key={y} cx={id === "B" ? 16 : 14} cy={y} r="2.2" fill="#3A2E22" />
          ))}
        </svg>
      ))}
    </div>
  );
}
