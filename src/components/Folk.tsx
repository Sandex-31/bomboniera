import { actAt, type Act, type Beat, type Face, type Held, type Pose, type Prop } from "../data/acting";
import type { Script } from "../lib/scripts";

/*
 * The two people of a chat, acting out each message as it turns up. Every
 * people shares one skeleton — hips at the origin, feet on y = 26 — and wears
 * its own script's look on it.
 *
 * Every joint is a group hung where it bends, drawn hanging straight down, so
 * a rotation swings it about the shoulder, elbow, hip or knee; negative angles
 * swing it forward, toward the other one. A pose is a set of those angles and
 * CSS eases from one to the next, so a beat reads as a movement and not a cut.
 * Loops (`.folk__fig--l-<loop>` in global.css) play on separate wrapper
 * groups, on top of whatever the pose is.
 */

const LOOK: Record<Script, { ink: string; width: number; cap: "round" | "square" }> = {
  stelle: { ink: "#FFE9A8", width: 3, cap: "round" },
  blocchi: { ink: "#B4ADA3", width: 5, cap: "square" },
  tubi: { ink: "#6CFF9A", width: 2, cap: "square" },
  onde: { ink: "#8AD8FF", width: 3, cap: "round" },
  egizi: { ink: "#D9954F", width: 3.5, cap: "round" },
  esagrammi: { ink: "#D2453B", width: 3, cap: "round" },
};

const UPPER_ARM = 12;
const FOREARM = 11;
const THIGH = 13;
const SHIN = 13;

type Pair = [number, number];
type Joints = { aF: Pair; aB: Pair; lF?: Pair; lB?: Pair; lean?: number; tilt?: number; y?: number; dx?: number };

const LEGS: Pair = [-4, 3];
const LEGS_BACK: Pair = [4, 3];
const DOWN_F: Pair = [-8, -10];
const DOWN_B: Pair = [8, -6];

/** [upper, lower] for each limb: the lower one turned relative to the upper. */
const POSES: Record<Pose, Joints> = {
  stand: { aF: DOWN_F, aB: DOWN_B },
  talk: { aF: [-45, -55], aB: DOWN_B },
  listen: { aF: [-140, -114], aB: DOWN_B },
  head: { aF: [-150, -60], aB: DOWN_B },
  point: { aF: [-88, -4], aB: DOWN_B },
  pointBack: { aF: DOWN_F, aB: [95, 0] },
  pointUp: { aF: [-165, -5], aB: DOWN_B, lean: 6 },
  lookUp: { aF: [-15, -20], aB: [12, -10], lean: 10 },
  wave: { aF: [-140, -30], aB: DOWN_B },
  cheer: { aF: [-165, -15], aB: [165, 15] },
  shrug: { aF: [-25, -100], aB: [25, 100] },
  chest: { aF: [-30, -115], aB: DOWN_B },
  offer: { aF: [-55, -35], aB: DOWN_B },
  raise: { aF: [-170, 20], aB: [20, -20], lF: [-15, 5], lB: [15, 5] },
  strike: { aF: [-80, -10], aB: [30, -30], lF: [-25, 10], lB: [20, 5], lean: -8 },
  guard: { aF: [-70, -70], aB: [20, -40], lF: [-20, 5], lB: [20, 5] },
  belly: { aF: [-40, 65], aB: [10, -6], lean: -6 },
  eat: { aF: [-100, -100], aB: DOWN_B },
  cradle: { aF: [-50, -70], aB: [-40, -80] },
  lift: { aF: [-160, 10], aB: [-155, 5] },
  drum: { aF: [-30, -50], aB: [-20, -60] },
  row: { aF: [-60, -30], aB: [-50, -40], lF: [-85, 0], lB: [-80, 0] },
  fear: { aF: [-120, -60], aB: [-110, -70], lean: 6 },
  wrist: { aF: [-60, -60], aB: [-70, -40] },
  proud: { aF: [-30, 60], aB: [30, -60], lean: 4 },
  ape: { aF: [-30, -20], aB: [-20, -20], lF: [-40, 50], lB: [10, 45], lean: -25 },
  kneel: { aF: DOWN_F, aB: DOWN_B, lF: [-90, 90], lB: [10, 80], lean: -15 },
  sit: { aF: [-20, -20], aB: [-10, -20], lF: [-85, 0], lB: [-80, 0] },
  lie: { aF: DOWN_F, aB: DOWN_B, tilt: -90, y: 24, dx: -6 },
  chase: { aF: [-60, -40], aB: [40, -50], lF: [-35, 20], lB: [30, 30], lean: -15 },
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const footY = ([t, s]: Pair) => THIGH * Math.cos(rad(t)) + SHIN * Math.cos(rad(t + s));

/** How far a pose drops the hips so the lower foot is still on the ground. */
function drop(j: Joints) {
  if (j.y !== undefined) return j.y;
  return 26 - Math.max(footY(j.lF ?? LEGS), footY(j.lB ?? LEGS_BACK));
}

const rot = (deg: number) => ({ transform: `rotate(${deg}deg)` });

/** One segment: straight for most, notched for the pipes, curved for the waves. */
function segment(script: Script, length: number) {
  if (script === "tubi") return `M0 0 V${length * 0.45} H2 V${length * 0.55} H0 V${length}`;
  if (script === "onde") return `M0 0 Q2.5 ${length / 2} 0 ${length}`;
  return `M0 0 V${length}`;
}

function HeldThing({ what }: { what: Held }) {
  switch (what) {
    case "sword":
      return (
        <g>
          <line x1={0} y1={10} x2={0} y2={32} stroke="#E6E6E6" strokeWidth={2.5} />
          <line x1={-3.5} y1={11} x2={3.5} y2={11} stroke="#C9A14A" strokeWidth={2} />
        </g>
      );
    case "bread":
      return <ellipse cx={0} cy={13} rx={5} ry={3} fill="#D9A35A" />;
    case "baby":
      return (
        <g>
          <ellipse cx={2} cy={13} rx={6.5} ry={4} fill="#F4EEDC" />
          <circle cx={7.5} cy={10} r={3} fill="#E8C9A0" />
        </g>
      );
    case "oar":
      // held across the body, the blade down in the water
      return (
        <g transform="rotate(60 0 11)">
          <line x1={0} y1={-8} x2={0} y2={28} stroke="#8A5A2E" strokeWidth={2} />
          <ellipse cx={0} cy={29} rx={2.5} ry={5} fill="#8A5A2E" />
        </g>
      );
  }
}

/**
 * A limb: the upper segment hung at `at`, the lower at the end of it, a loop
 * wrapper around each so a loop can swing either on top of the pose.
 */
function Limb({
  script,
  kind,
  at,
  angles,
  lengths,
  held,
}: {
  script: Script;
  kind: "arm--front" | "arm--back" | "leg--front" | "leg--back";
  at: Pair;
  angles: Pair;
  lengths: Pair;
  held?: Held | null;
}) {
  const { ink, width, cap } = LOOK[script];
  const stroke = { stroke: ink, strokeWidth: width, strokeLinecap: cap, strokeLinejoin: "round" as const, fill: "none" };
  const isArm = kind.startsWith("arm");
  return (
    <g transform={`translate(${at[0]} ${at[1]})`}>
      <g className={`folk__${isArm ? "arm" : "leg"} folk__${kind}`} style={rot(angles[0])}>
        <g className="folk__loop">
          <path d={segment(script, lengths[0])} {...stroke} />
          <g transform={`translate(0 ${lengths[0]})`}>
            <g className="folk__fore" style={rot(angles[1])}>
              <g className="folk__loop">
                <path d={segment(script, lengths[1])} {...stroke} />
                {isArm ? (
                  <>
                    {held && <HeldThing what={held} />}
                    <circle cy={lengths[1]} r={width / 2 + 0.8} fill={ink} />
                  </>
                ) : (
                  <path d={`M0 ${lengths[1]} H4`} {...stroke} />
                )}
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

/** Where the eye and the mouth sit on each people's head, facing forward. */
const FACE_AT: Record<Script, { eye: Pair; mouth: Pair; ink: string }> = {
  stelle: { eye: [2.2, -42], mouth: [2.6, -37.6], ink: "#3A2A08" },
  blocchi: { eye: [3, -45.5], mouth: [3, -40], ink: "#1A1A1A" },
  tubi: { eye: [2.4, -44.5], mouth: [2.4, -39.5], ink: "#6CFF9A" },
  onde: { eye: [2.6, -43.5], mouth: [3, -39], ink: "#0B2A3A" },
  egizi: { eye: [2.4, -44], mouth: [4.2, -39.5], ink: "#2A1408" },
  esagrammi: { eye: [2.6, -43.5], mouth: [3, -39], ink: "#D2453B" },
};

function FaceMarks({ script, face }: { script: Script; face: Face }) {
  const {
    eye: [ex, ey],
    mouth: [mx, my],
    ink,
  } = FACE_AT[script];
  const line = { stroke: ink, strokeWidth: 1, strokeLinecap: "round" as const, fill: "none" };
  const eye =
    face === "sleep" ? (
      <path d={`M${ex - 1.5} ${ey} Q${ex} ${ey + 1} ${ex + 1.5} ${ey}`} {...line} />
    ) : face === "happy" ? (
      <path d={`M${ex - 1.4} ${ey + 0.5} Q${ex} ${ey - 1.5} ${ex + 1.4} ${ey + 0.5}`} {...line} />
    ) : (
      <circle cx={ex} cy={ey} r={face === "surprised" ? 1.5 : 1.05} fill={ink} />
    );
  const brow =
    face === "angry" ? (
      <path d={`M${ex - 2} ${ey - 3.2} L${ex + 2} ${ey - 1.6}`} {...line} />
    ) : face === "sad" ? (
      <path d={`M${ex - 2} ${ey - 1.6} L${ex + 2} ${ey - 3.2}`} {...line} />
    ) : face === "surprised" ? (
      <path d={`M${ex - 1.8} ${ey - 3.2} Q${ex} ${ey - 4.2} ${ex + 1.8} ${ey - 3.2}`} {...line} />
    ) : null;
  const mouth =
    face === "happy" ? (
      <path d={`M${mx - 2} ${my - 0.6} Q${mx} ${my + 2} ${mx + 2} ${my - 0.6}`} {...line} />
    ) : face === "sad" ? (
      <path d={`M${mx - 2} ${my + 0.8} Q${mx} ${my - 1.2} ${mx + 2} ${my + 0.8}`} {...line} />
    ) : face === "surprised" ? (
      <circle cx={mx} cy={my} r={1.3} {...line} />
    ) : (
      <path d={`M${mx - 1.6} ${my} H${mx + 1.6}`} {...line} strokeWidth={face === "angry" ? 1.4 : 1} />
    );
  return (
    <g>
      {eye}
      {brow}
      <g className="folk__mouth">{mouth}</g>
      {/* the mouth working, while this one's message is new */}
      <ellipse className="folk__talk" cx={mx} cy={my} rx={1.6} ry={1.4} fill={ink} />
    </g>
  );
}

function Head({ script }: { script: Script }) {
  const { ink } = LOOK[script];
  switch (script) {
    case "stelle":
      return <path d="M0 -50 L3 -43 L10 -42 L5 -37 L6 -30 L0 -34 L-6 -30 L-5 -37 L-10 -42 L-3 -43 Z" fill={ink} />;
    case "blocchi":
      return <rect x={-7} y={-50} width={14} height={14} fill={ink} />;
    case "tubi":
      return <rect x={-6} y={-48} width={12} height={12} fill="#04140D" stroke={ink} strokeWidth={2} />;
    case "onde":
      // round, with a wave breaking over the back of it
      return (
        <g fill={ink}>
          <circle cy={-42} r={6.5} />
          <path d="M-6 -46 Q-12 -52 -6 -54 Q-3 -55 -2 -51 Q-5 -52 -5 -49 Z" />
        </g>
      );
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

function Figure({ script, side, act, talking }: { script: Script; side: "a" | "b"; act: Required<Act>; talking: boolean }) {
  const j = POSES[act.p];
  const body = { transform: `translate(${act.x + (j.dx ?? 0)}px, ${drop(j)}px) rotate(${j.tilt ?? 0}deg)` };
  const classes = [
    "folk__fig",
    `folk__fig--${side}`,
    `folk__fig--${script}`,
    act.l && `folk__fig--l-${act.l}`,
    talking && "is-talking",
  ];
  return (
    // the right-hand one is mirrored, so both face the middle
    <g transform={side === "a" ? "translate(72 88)" : "translate(168 88) scale(-1 1)"}>
      <g className={classes.filter(Boolean).join(" ")}>
        <g className="folk__body" style={body}>
          <g className="folk__move">
            <Limb script={script} kind="leg--back" at={[-3, 0]} angles={j.lB ?? LEGS_BACK} lengths={[THIGH, SHIN]} />
            <Limb script={script} kind="leg--front" at={[3, 0]} angles={j.lF ?? LEGS} lengths={[THIGH, SHIN]} />
            <g className="folk__upper" style={rot(j.lean ?? 0)}>
              <g className="folk__look">
                <Limb script={script} kind="arm--back" at={[0, -30]} angles={j.aB} lengths={[UPPER_ARM, FOREARM]} />
                <Torso script={script} />
                <Head script={script} />
                <FaceMarks script={script} face={act.f} />
                <Limb
                  script={script}
                  kind="arm--front"
                  at={[0, -30]}
                  angles={j.aF}
                  lengths={[UPPER_ARM, FOREARM]}
                  held={act.h}
                />
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

const STARS: Pair[] = [[18, 14], [44, 30], [70, 8], [100, 20], [146, 12], [176, 28], [204, 10], [228, 24]];

function Heart({ x, y, late }: { x: number; y: number; late?: boolean }) {
  return (
    <path
      className={`folk__pulse${late ? " folk__pulse--late" : ""}`}
      d={`M${x} ${y} c0 -6 -8 -6 -8 0 c0 6 8 10 8 12 c0 -2 8 -6 8 -12 c0 -6 -8 -6 -8 0 Z`}
      fill="#E0445A"
    />
  );
}

/** Where the little thief stands, by how far along the theft is. */
const PIGMEO_X: Partial<Record<Prop, number>> = { "pigmeo-hide": 236, "pigmeo-sneak": 216, "pigmeo-steal": 206, "pigmeo-flee": 206 };

/** The things on stage behind the two of them. */
function Backdrop({ show }: { show: Set<Prop> }) {
  const ink = "rgba(255,255,255,0.75)";
  const pigmeo = (Object.keys(PIGMEO_X) as Prop[]).find((p) => show.has(p));
  return (
    <g>
      {(show.has("stars") || show.has("stars-out")) &&
        STARS.map(([x, y], i) => (
          <circle
            key={i}
            className={show.has("stars-out") ? "folk__prop folk__star-out" : "folk__prop folk__blink"}
            style={{ animationDelay: `${i * 0.25}s` }}
            cx={x}
            cy={y}
            r={1.6}
            fill="#FFF"
          />
        ))}
      {show.has("stars-out") && <line className="folk__shoot" x1={150} y1={6} x2={170} y2={0} stroke="#FFF" strokeWidth={1.5} />}
      {show.has("sun-low") && (
        <g className="folk__prop">
          <circle cx={218} cy={112} r={11} fill="#FF9F43" />
          <path d="M200 100 L205 104 M218 92 V97 M236 100 L231 104" stroke="#FF9F43" strokeWidth={2} />
        </g>
      )}
      {show.has("sun-high") && (
        <g className="folk__prop">
          <circle cx={34} cy={22} r={9} fill="#FFD24A" />
          <path d="M34 6 V10 M34 34 V38 M18 22 H22 M46 22 H50 M23 11 L26 14 M45 11 L42 14" stroke="#FFD24A" strokeWidth={2} />
        </g>
      )}
      {show.has("sun") && <circle className="folk__sun" cx={20} cy={40} r={8} fill="#FFC94A" />}
      {show.has("earth") && (
        <g className="folk__prop">
          <circle cx={120} cy={28} r={10} fill="#3A7BD5" />
          <path d="M114 23 Q120 27 124 22 Q127 30 119 34 Q113 31 114 23 Z" fill="#4CAF50" />
        </g>
      )}
      {show.has("army") && (
        // far off on a ridge, so small
        <g className="folk__prop folk__army" stroke="#E07A5F" strokeWidth={1.4} fill="#E07A5F">
          <path d="M84 84 Q120 70 156 84" stroke="rgba(255,255,255,0.15)" fill="none" />
          {[98, 108, 118, 128, 138].map((x) => (
            <g key={x} transform={`translate(${x * 0.7 + 36} 20) scale(0.6) translate(${-x} 0)`}>
              <circle cx={x} cy={88} r={2} stroke="none" />
              <line x1={x} y1={90} x2={x} y2={98} />
              <line x1={x} y1={98} x2={x - 2} y2={104} />
              <line x1={x} y1={98} x2={x + 2} y2={104} />
              <line x1={x + 3} y1={80} x2={x + 3} y2={102} stroke="#C9C2B6" />
            </g>
          ))}
        </g>
      )}
      {show.has("tree") && (
        <g className="folk__prop">
          <rect x={117} y={40} width={6} height={75} fill="#6B4A2A" />
          <path d="M120 60 L134 52" stroke="#6B4A2A" strokeWidth={3} />
          <circle cx={120} cy={30} r={15} fill="#2F6B3A" />
          <circle cx={107} cy={38} r={10} fill="#2F6B3A" />
          <circle cx={133} cy={38} r={10} fill="#2F6B3A" />
        </g>
      )}
      {show.has("monkey") && (
        <g className="folk__prop folk__monkey" fill="#8A5A2E">
          <circle cx={132} cy={47} r={5} />
          <circle cx={132} cy={39} r={4} />
          <circle cx={128.5} cy={37} r={1.6} />
          <circle cx={135.5} cy={37} r={1.6} />
          <path d="M128 51 Q120 60 126 66" stroke="#8A5A2E" strokeWidth={2} fill="none" />
          <path d="M136 45 L141 41" stroke="#8A5A2E" strokeWidth={2} />
          {show.has("banana") && <path d="M139 36 Q146 39 143 46" stroke="#FFE14A" strokeWidth={3} fill="none" strokeLinecap="round" />}
        </g>
      )}
      {show.has("monster") && (
        <g className="folk__prop">
          <path d="M100 114 L102 70 Q100 40 120 38 Q140 40 138 70 L140 114 L128 114 L124 92 L116 92 L112 114 Z" fill="#4B3A6B" />
          <path d="M101 62 Q90 80 94 96 M139 62 Q150 80 146 96" stroke="#4B3A6B" strokeWidth={6} strokeLinecap="round" fill="none" />
          <circle cx={113} cy={50} r={2.4} fill="#FF4D4D" />
          <circle cx={127} cy={50} r={2.4} fill="#FF4D4D" />
          <path d="M112 58 L116 60 L120 57 L124 60 L128 58" stroke="#FFF" strokeWidth={1.2} fill="none" />
        </g>
      )}
      {show.has("monster-noheart") && (
        <g className="folk__prop">
          <path d="M120 70 c0 -5 -7 -5 -7 0 c0 5 7 9 7 10 c0 -1 7 -5 7 -10 c0 -5 -7 -5 -7 0 Z" fill="none" stroke="#FFF" strokeDasharray="2 2" />
          <path d="M113 68 L127 82 M127 68 L113 82" stroke="#FF4D4D" strokeWidth={1.6} />
        </g>
      )}
      {show.has("monster-brain") && (
        <g className="folk__prop folk__pulse">
          <ellipse cx={120} cy={30} rx={15} ry={9} fill="#F3A6C0" />
          <path d="M108 30 Q112 24 116 30 T124 30 T132 30 M120 21 V39" stroke="#C26A8A" strokeWidth={1.2} fill="none" />
        </g>
      )}
      {show.has("ship") && (
        <g className="folk__prop">
          <path d="M120 74 Q127 84 126 104 H114 Q113 84 120 74 Z" fill="#E6E6E6" />
          <path d="M120 74 Q124 78 125 82 H115 Q116 78 120 74 Z" fill="#E0445A" />
          <circle cx={120} cy={90} r={3} fill="#3A7BD5" />
          <path d="M114 96 L108 108 L114 104 Z M126 96 L132 108 L126 104 Z" fill="#E0445A" />
          <path className="folk__flame" d="M116 104 Q120 116 124 104 Z" fill="#FFB347" />
        </g>
      )}
      {show.has("hourglass") && (
        <g className="folk__prop folk__hourglass" fill="none" stroke="#E2C48A" strokeWidth={1.6}>
          <path d="M112 52 H128 M112 76 H128 M114 52 Q114 62 120 64 Q126 62 126 52 M114 76 Q114 66 120 64 Q126 66 126 76" />
          <path d="M116 74 Q120 68 124 74 Z" fill="#E2C48A" stroke="none" />
        </g>
      )}
      {show.has("crowd") &&
        [0, 1, 2].map((i) => (
          <g key={i} className="folk__prop folk__walker" style={{ animationDelay: `${i * -2.7}s` }} stroke={ink} strokeWidth={1.2}>
            <circle cx={0} cy={92} r={1.8} fill={ink} stroke="none" />
            <line x1={0} y1={94} x2={0} y2={100} />
            <line x1={0} y1={100} x2={-2} y2={105} />
            <line x1={0} y1={100} x2={2} y2={105} />
          </g>
        ))}
      {show.has("table") && (
        <g className="folk__prop" fill="#8A5A2E">
          <rect x={102} y={95} width={36} height={4} />
          <rect x={106} y={99} width={3} height={15} />
          <rect x={131} y={99} width={3} height={15} />
        </g>
      )}
      {show.has("bread") && <ellipse className="folk__prop" cx={114} cy={92} rx={6} ry={3} fill="#D9A35A" />}
      {show.has("honey") && (
        <g className="folk__prop">
          <rect x={124} y={86} width={9} height={9} rx={2} fill="#E8A317" />
          <rect x={123} y={84} width={11} height={3} fill="#8A5A2E" />
        </g>
      )}
      {show.has("drum") && (
        <g className="folk__prop">
          <path d="M143 74 H159 L156 114 H146 Z" fill="#8A5A2E" />
          <ellipse cx={151} cy={74} rx={8} ry={2.5} fill="#F4EEDC" />
          <path d="M144 80 L158 92 M158 80 L144 92 M145 96 L157 108 M157 96 L145 108" stroke="#C9A14A" strokeWidth={1} />
        </g>
      )}
      {show.has("gold") && (
        <g className="folk__prop" fill="#FFD24A" stroke="#B8860B" strokeWidth={0.8}>
          <ellipse cx={198} cy={111} rx={5} ry={2.5} />
          <ellipse cx={206} cy={111} rx={5} ry={2.5} />
          <ellipse cx={202} cy={107} rx={5} ry={2.5} />
        </g>
      )}
      {pigmeo && (
        <g className="folk__pigmeo" style={{ transform: `translate(${PIGMEO_X[pigmeo]}px, 114px)` }}>
          <g className={pigmeo === "pigmeo-flee" ? "folk__flee" : pigmeo === "pigmeo-sneak" ? "folk__sneak" : undefined}>
            <path d="M-6 0 L-4 -10 Q-6 -18 0 -19 Q6 -18 5 -10 L6 0 Z" fill="#5A5048" />
            <path d="M-5 -16 L-11 -20 L-4 -13 Z M5 -16 L10 -21 L4 -13 Z" fill="#5A5048" />
            <circle cx={-2.5} cy={-14} r={1.1} fill="#FFE14A" />
            {(pigmeo === "pigmeo-steal" || pigmeo === "pigmeo-flee") && (
              <ellipse cx={-7} cy={-7} rx={4} ry={2} fill="#FFD24A" stroke="#B8860B" strokeWidth={0.8} />
            )}
          </g>
        </g>
      )}
      {show.has("skull") && (
        <g className="folk__prop" fill="#EDE6D6">
          <circle cx={120} cy={104} r={6} />
          <rect x={116} y={107} width={8} height={5} rx={1} />
          <circle cx={117.6} cy={104} r={1.6} fill="#1A1A1A" />
          <circle cx={122.4} cy={104} r={1.6} fill="#1A1A1A" />
        </g>
      )}
      {show.has("notes") && (
        <g>
          <text className="folk__float" x={112} y={40} fill={ink} fontSize={16}>♪</text>
          <text className="folk__float folk__float--late" x={128} y={50} fill={ink} fontSize={14}>♫</text>
        </g>
      )}
      {show.has("zzz") && <text className="folk__float" x={28} y={96} fill={ink} fontSize={12}>z z</text>}
      {show.has("question") && <text className="folk__blink" x={170} y={30} fill={ink} fontSize={20}>?</text>}
      {show.has("heart-a") && <Heart x={72} y={18} />}
      {show.has("heart-b") && <Heart x={168} y={18} late />}
    </g>
  );
}

/** The things on stage in front of them: the water at their feet, the boat, what fell. */
function Foreground({ show }: { show: Set<Prop> }) {
  return (
    <g>
      {show.has("road") && (
        <line className="folk__road" x1={0} y1={116} x2={240} y2={116} stroke="rgba(255,255,255,0.75)" strokeWidth={2} strokeDasharray="10 8" />
      )}
      {show.has("boat") && <path className="folk__prop" d="M138 106 H198 L190 117 H146 Z" fill="#8A5A2E" />}
      {show.has("river") && (
        <path
          className="folk__river"
          d="M-40 112 Q-30 106 -20 112 T0 112 T20 112 T40 112 T60 112 T80 112 T100 112 T120 112 T140 112 T160 112 T180 112 T200 112 T220 112 T240 112 T260 112"
          stroke="#5AA9E6"
          strokeWidth={3}
          fill="none"
        />
      )}
      {show.has("sword-down") && (
        <g className="folk__prop">
          <line x1={84} y1={112} x2={106} y2={111} stroke="#E6E6E6" strokeWidth={2.5} />
          <line x1={86} y1={108} x2={86} y2={115} stroke="#C9A14A" strokeWidth={2} />
        </g>
      )}
    </g>
  );
}

/** Just the head, for the list of chats: who is talking, at a glance. */
export function FolkHead({ script }: { script: Script }) {
  return (
    <svg className="folk-head" viewBox="-12 -56 24 24" width={24} height={24} aria-hidden="true">
      <Head script={script} />
    </svg>
  );
}

export default function Folk({
  who,
  beats,
  step,
  talking,
  reduced,
}: {
  who: [Script, Script];
  beats: Beat[];
  /** The beat of the newest message on screen; -1 before the first. */
  step: number;
  /** Who said the newest message, while it is new. */
  talking: 0 | 1 | null;
  reduced: boolean;
}) {
  const { a, b, show } = actAt(beats, step);
  const props = new Set(show);
  return (
    <svg className={`folk${reduced ? " folk--still" : ""}`} viewBox="0 0 240 120" role="img" aria-label="due figure che si parlano">
      <line x1={0} y1={114.5} x2={240} y2={114.5} stroke="rgba(255,255,255,0.15)" />
      <Backdrop show={props} />
      <Figure script={who[0]} side="a" act={a} talking={talking === 0} />
      <Figure script={who[1]} side="b" act={b} talking={talking === 1} />
      <Foreground show={props} />
    </svg>
  );
}
