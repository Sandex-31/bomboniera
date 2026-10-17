import type { SceneKind } from "../data/babel";
import type { Script } from "../lib/scripts";

/*
 * The two people of a chat, acting out what they are talking about, so the
 * subject can be told without a word. Every people shares one skeleton —
 * hips at the origin, feet on y = 26 — and wears its own script's look on
 * it. The movement is all CSS (`.folk--<scene>` in global.css); here there
 * are only the bodies and the props each scene needs.
 *
 * A limb is a group hung at its joint, drawn hanging straight down, so a
 * rotation in CSS swings it about the shoulder or the hip. Negative angles
 * swing it forward: both figures face the middle.
 */

const LOOK: Record<Script, { ink: string; width: number; cap: "round" | "butt" | "square" }> = {
  stelle: { ink: "#FFE9A8", width: 3, cap: "round" },
  blocchi: { ink: "#B4ADA3", width: 6, cap: "butt" },
  tubi: { ink: "#6CFF9A", width: 2, cap: "square" },
  onde: { ink: "#8AD8FF", width: 3, cap: "round" },
  egizi: { ink: "#D9954F", width: 3.5, cap: "round" },
  esagrammi: { ink: "#D2453B", width: 3, cap: "round" },
};

/** A limb: straight for most, bent at a right angle for the pipes, curved for the waves. */
function limb(script: Script, length: number) {
  if (script === "tubi") return `M0 0 V${length * 0.55} H${length * 0.25} V${length}`;
  if (script === "onde") return `M0 0 Q${length * 0.3} ${length * 0.5} 0 ${length}`;
  return `M0 0 V${length}`;
}

function Head({ script }: { script: Script }) {
  const { ink } = LOOK[script];
  switch (script) {
    case "stelle":
      return <path d="M0 -50 L3 -43 L10 -42 L5 -37 L6 -30 L0 -34 L-6 -30 L-5 -37 L-10 -42 L-3 -43 Z" fill={ink} />;
    case "blocchi":
      return <rect x={-7} y={-50} width={14} height={14} fill={ink} />;
    case "tubi":
      return <rect x={-6} y={-48} width={12} height={12} fill="none" stroke={ink} strokeWidth={2} />;
    case "onde":
      return <path d="M-6 -48 A8 8 0 1 0 6 -36 A6 6 0 1 1 -6 -48 Z" fill={ink} />;
    case "egizi":
      // in profile: the nose points the way they face
      return <path d="M-6 -42 A7 7 0 1 1 6 -40 L9 -42 L6 -38 A7 7 0 0 1 -6 -42 Z" fill={ink} />;
    case "esagrammi":
      return <circle cy={-42} r={7} fill="#1A1210" stroke={ink} strokeWidth={2} />;
  }
}

/** The torso, from the neck (y = -34) to the hips. */
function Torso({ script }: { script: Script }) {
  const { ink, width, cap } = LOOK[script];
  if (script === "blocchi") return <rect x={-7} y={-34} width={14} height={34} fill={ink} />;
  if (script === "esagrammi")
    // a tunic in the hexagrams' own bars, whole and broken
    return (
      <g>
        <path d="M-9 -34 H9 L12 4 H-12 Z" fill="#1A1210" stroke={ink} strokeWidth={1.5} />
        {[-26, -18, -10, -2].map((y, i) =>
          i % 2 ? (
            <g key={y} stroke={ink} strokeWidth={3}>
              <line x1={-8} x2={-2} y1={y} y2={y} />
              <line x1={2} x2={8} y1={y} y2={y} />
            </g>
          ) : (
            <line key={y} x1={-8} x2={8} y1={y} y2={y} stroke={ink} strokeWidth={3} />
          ),
        )}
      </g>
    );
  return (
    <g>
      <line y1={-34} y2={0} stroke={ink} strokeWidth={width} strokeLinecap={cap} />
      {script === "egizi" && <path d="M-7 -4 H8 L5 10 H-6 Z" fill="#F4EEDC" />}
    </g>
  );
}

function Figure({ script, side }: { script: Script; side: "a" | "b" }) {
  const { ink, width, cap } = LOOK[script];
  const stroke = { stroke: ink, strokeWidth: width, strokeLinecap: cap, strokeLinejoin: "round" as const, fill: "none" };
  return (
    // the right-hand one is mirrored, so both face the middle
    <g transform={side === "a" ? "translate(72 88)" : "translate(168 88) scale(-1 1)"}>
      <g className={`folk__fig folk__fig--${side} folk__fig--${script}`}>
        <g className="folk__move">
          <g className="folk__pose">
            <g transform="translate(-3 0)">
              <g className="folk__leg folk__leg--back">
                <path d={limb(script, 26)} {...stroke} />
              </g>
            </g>
            <g transform="translate(3 0)">
              <g className="folk__leg folk__leg--front">
                <path d={limb(script, 26)} {...stroke} />
              </g>
            </g>
            <Torso script={script} />
            <Head script={script} />
            <g transform="translate(0 -30)">
              <g className="folk__arm folk__arm--back">
                <path d={limb(script, 22)} {...stroke} />
              </g>
            </g>
            <g transform="translate(0 -30)">
              <g className="folk__arm folk__arm--front">
                <path d={limb(script, 22)} {...stroke} />
                {/* what the hand holds, shown only by the scenes that need it */}
                <line className="folk__sword" x1={0} y1={22} x2={0} y2={46} stroke="#E6E6E6" strokeWidth={2.5} />
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

/** What stands between them or floats above them, by scene. */
function Props({ scene }: { scene: SceneKind }) {
  const ink = "rgba(255,255,255,0.75)";
  switch (scene) {
    case "musica":
      return (
        <g>
          <rect x={88} y={88} width={18} height={20} rx={3} fill="#8A5A2E" />
          <text className="folk__float" x={120} y={40} fill={ink} fontSize={16}>♪</text>
          <text className="folk__float folk__float--late" x={134} y={50} fill={ink} fontSize={14}>♫</text>
        </g>
      );
    case "sonno":
      return <text className="folk__float" x={176} y={70} fill={ink} fontSize={14}>z z</text>;
    case "cibo":
      return (
        <g>
          <rect x={104} y={92} width={32} height={4} fill="#8A5A2E" />
          <ellipse cx={120} cy={88} rx={9} ry={5} fill="#E2B36A" />
        </g>
      );
    case "furto":
      return <circle className="folk__loot" cx={146} cy={108} r={5} fill="#FFD24A" />;
    case "oblio":
      return <text className="folk__blink" x={162} y={30} fill={ink} fontSize={20}>?</text>;
    case "guerra":
      return null;
    case "scimmia":
      return (
        <g>
          <line x1={120} y1={114} x2={120} y2={40} stroke="#6B4A2A" strokeWidth={5} />
          <circle cx={120} cy={34} r={16} fill="#2F6B3A" />
          <g className="folk__monkey">
            <circle cx={128} cy={52} r={5} fill="#8A5A2E" />
            <circle cx={128} cy={45} r={3.5} fill="#8A5A2E" />
            <path d="M124 54 Q116 62 122 68" stroke="#8A5A2E" strokeWidth={2} fill="none" />
          </g>
        </g>
      );
    case "cuore":
      return (
        <g>
          <path className="folk__pulse" d="M72 20 C72 14 64 14 64 20 C64 26 72 30 72 32 C72 30 80 26 80 20 C80 14 72 14 72 20 Z" fill="#E0445A" />
          <path className="folk__pulse folk__pulse--late" d="M160 26 C156 16 176 14 176 24 C180 30 170 34 168 30 C164 34 156 32 160 26 Z" fill="#E8A2B4" />
        </g>
      );
    case "cielo":
      return (
        <g>
          {[[30, 18], [60, 10], [110, 22], [150, 8], [200, 16], [224, 30]].map(([x, y], i) => (
            <circle key={i} className="folk__blink" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy={y} r={1.6} fill="#FFF" />
          ))}
          <circle cx={120} cy={30} r={9} fill="#3A7BD5" />
          <path d="M115 26 Q120 30 124 25 Q126 32 119 35" fill="#4CAF50" />
        </g>
      );
    case "nascita":
      return <ellipse className="folk__baby" cx={98} cy={66} rx={8} ry={5} fill="#F4EEDC" />;
    case "viaggio":
      return <line className="folk__road" x1={0} y1={116} x2={240} y2={116} stroke={ink} strokeWidth={2} strokeDasharray="10 8" />;
    case "fiume":
      return (
        <path
          className="folk__river"
          d="M-40 110 Q-30 104 -20 110 T0 110 T20 110 T40 110 T60 110 T80 110 T100 110 T120 110 T140 110 T160 110 T180 110 T200 110 T220 110 T240 110 T260 110"
          stroke="#5AA9E6"
          strokeWidth={3}
          fill="none"
        />
      );
    case "tempo":
      return <circle className="folk__sun" cx={20} cy={40} r={8} fill="#FFC94A" />;
  }
}

export default function Folk({ who, scene, reduced }: { who: [Script, Script]; scene: SceneKind; reduced: boolean }) {
  return (
    <svg
      className={`folk folk--${scene}${reduced ? " folk--still" : ""}`}
      viewBox="0 0 240 120"
      role="img"
      aria-label="due figure che si parlano"
    >
      <line x1={0} y1={114.5} x2={240} y2={114.5} stroke="rgba(255,255,255,0.15)" />
      <Props scene={scene} />
      <Figure script={who[0]} side="a" />
      <Figure script={who[1]} side="b" />
    </svg>
  );
}
