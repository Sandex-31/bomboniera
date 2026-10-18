# Macchinari Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The puzzle of the third floor. The machine room starts dark and cold. Five hand-worked machines feed each other: boilers, steam pipes, gears, a hoist and a steam organ. When all of them run, a big lever drops a press that breaks through the floor towards the fourth floor.

**Architecture:**
- **Pure rules.** Every machine's rules are a pure module in `src/lib/`, tested in `scripts/check.mjs` without a renderer, like `tape.ts` and `lamps.ts`:
  - `boilers.ts`
  - `pipes.ts`
  - `gears.ts`
  - `hoist.ts`
  - `card.ts`
- **Sound.** The organ's sound is `src/lib/organ.ts`, made with Web Audio only.
- **Machines in the scene.** Each machine is a component in `src/scenes/machines/`. It does two things:
  - shows its state in 3D: fire, steam, turning gears, the cage, the fog;
  - when the camera is in front of it, shows a manipulable face as a drei `<Html transform>` panel of SVG on the machine. This is the `Lock.tsx` pattern: it swallows pointer events, so dragging never turns the camera.
- **Shared state.** `Engine.tsx` owns the six machine states. It loads them from storage, derives the shared resources from them (steam per line, shafts turning, latches), and passes them down. A machine only knows its own state and the resources it receives.

**Tech Stack:** React 19, @react-three/fiber 9, drei 10, three 0.180, Web Audio, Vite, node:assert tests via `npm test` (`scripts/check.mjs`), plus `npm run typecheck` and `npm run build`.

**Spec:** `docs/superpowers/specs/2026-10-18-macchinari-design.md`

## Global Constraints

- **No numbers and no words** anywhere on the machines, their panels or their hints. Information travels through shapes, colours, positions, motion and sound. Task 9 adds a test that guards it.
- **The three line shapes:**
  - tondo (round) is the gear motor;
  - triangolo (triangle) is the organ;
  - quadrato (square) is the press.

  The decoy outlet of the pipes has no shape.
- **The organ.** Six whistles, ordered by height, each with a handle shape:

  | Note | C5 | D5 | E♭5 | F5 | G5 | A♭5 |
  |---|---|---|---|---|---|---|
  | Handle | tondo | triangolo | quadrato | stella | mezzaluna | goccia |

  The melody is fixed by the spec:
  `A♭5 F5 C5— A♭5 F5 C5— A♭5 F5 C5 D5 E♭5 G5—`, where `—` marks a long note.
- **Feedback is immediate.** There is never a «verifica» button. Nothing breaks for good: every move can be undone.
- **Dragging a piece never turns the camera** or drags anything behind it, on phones too. A machine's face only answers once the camera is in front of it. Until then, a tap only asks to come closer, as with the lock.
- **Scene rule.** While a scene plays, `onScene(true)` empties the desktop and OrbitControls stay `enabled={!flying && !scene}`. The scenes are:
  - the first-boiler line;
  - the card line;
  - the organ playing itself;
  - the whole press finale.
- **Rotom lines.** Rotom speaks only three times. Each line is a placeholder for Salvo, in the `starLine` style:
  - `boilerLine`: «Rotom: TODO — la battuta della prima caldaia.»
  - `cardLine`: «Rotom: TODO — la battuta della scheda ricomposta.»
  - `pressLine`: «Rotom: TODO — la battuta della pressa.»
- **Reduced motion** (`reduced`): the machines work the same way, with no jitter, puffs or shakes. The finale jumps to the open hole.
- **Phones (390 px):** every draggable part is at least 44 CSS px on screen when the camera is in front of it.
- **Language.** Visible copy is Italian, and there is almost none of it. Code comments follow the repo's English prose style. Commit messages are in Italian, like the others.
- **Never in the repository:** the original audio of «Genesis Retake Light». The organ is synthesised.

## Review Focus

- **Uniqueness tests are the heart of the difficulty.** Each one must enumerate or solve exhaustively. Sampling is not enough.
- **Derived resources must be recomputed from saved state on load.** A machine that was solved and then undone must lose its downstream effects. For example, re-breaking the pipes stops the gears and closes the latches again. Each loader rejects malformed storage and falls back to the untouched machine.
- **Pointer handling on phones:** a drag on a panel must not reach `OrbitControls` or the `useTap` handlers behind it.
- **Audio unlock on iOS:** the first chain pull creates or resumes the `AudioContext` inside the gesture.
- **Performance:** steam, fire and fog stay a handful of meshes each. No per-frame allocations, and at most one extra light per lit boiler.

---

### Task 1: Storage, stops, a dark hall and flying to the machines

**Files:**
- Modify: `src/data/puzzle.ts`. Add the keys and loaders:
  - `BOILERS_KEY = 'bomboniera.puzzle.caldaie'`
  - `PIPES_KEY = 'bomboniera.puzzle.tubi'`
  - `GEARS_KEY = 'bomboniera.puzzle.ingranaggi'`
  - `HOIST_KEY = 'bomboniera.puzzle.montacarichi'`
  - `ORGAN_KEY = 'bomboniera.puzzle.organo'`
  - `PRESS_KEY = 'bomboniera.puzzle.pressa'`

  Also add the three line placeholders (`boilerLine`, `cardLine`, `pressLine`).
- Modify: `src/lib/stages.ts`. Add six stops after «terzo piano», in this order:
  - caldaie
  - tubi
  - ingranaggi
  - montacarichi
  - organo
  - pressa

  Their `solved()` values come from the lib modules, so add each stop together with its module (Tasks 2–8). In this task add only the keys to `WIPED`, so the reset clears them. Each later task moves its key from `WIPED` to its stop.
- Modify: `src/scenes/Engine.tsx`:
  - the hall starts dark;
  - the machine positions;
  - `focus` state and per-machine `View`s;
  - a «back» tap in the void.
- Create: `src/scenes/machines/` (empty for now, one file per machine later).

**Interfaces:**
- Produces: `type MachineId = "boilers" | "pipes" | "gears" | "hoist" | "organ" | "press"`, and in Engine a `focus: MachineId | null` with `VIEWS: Record<MachineId, View>`.
- **Layout around the wall**, keeping the press and Rotom in the middle. The builder can move these as long as all machines are reachable by turning the camera:

  | Machine | Angle on the wall |
  |---|---|
  | boilers (where they are today) | `FAR` |
  | pipes | `FAR + 1.9` |
  | gears | `FAR - 1.9` |
  | hoist (with the shaft and the little scale on a bench beside it) | `FAR + π` side, left |
  | organ | `FAR + π` side, right |

- [ ] **Step 1: The dark hall.**
  - Boilers start out. Remove the always-on fire and lights, and make them depend on a `lit: boolean[]` prop (Task 2).
  - The gears are still, the needles rest and there is no steam. The `Steam` puffs depend on a prop.
  - Rotom's glow and a few embers (dim emissive) are the only light.
  - Lower `ambientLight` and `hemisphereLight` to about 0.15–0.2. Each lit boiler restores roughly a third of today's light, so three lit boilers look like the room from the last chapter.
- [ ] **Step 2: Flying to a machine.** Tapping a machine (with `useTap`) sets `focus` and `view = VIEWS[id]`. Tapping the void, or a small «indietro» chevron (an icon, not a word) at the screen's edge, returns to `HALL_VIEW`. Ignore taps while `scene`.
- [ ] **Step 3: Stops.**
  - Add the keys to `WIPED`.
  - Extend the key-coverage test in the stops block of `scripts/check.mjs` so it still passes. It demands that every `*_KEY` sits on a stop or in `WIPED`.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Look at it.** Use the debug stop «terzo piano» at 1280×800 and at 390×800.
  - The hall is dark but readable.
  - Each machine spot flies in and back.
- [ ] **Step 6:** Commit: `Sala macchine: la sala spenta e le macchine da avvicinare`.

### Task 2: The boilers

**Files:**
- Create: `src/lib/boilers.ts`
- Create: `src/scenes/machines/Boilers.tsx` (the three boilers with door latch, damper lever, bellows pedal, gauge, ash drawer)
- Modify: `src/scenes/Engine.tsx`, `src/scenes/Rotom.tsx` (Rotom dragged into a door, spat out sooty)
- Test: `scripts/check.mjs`, new «caldaie» block

**Interfaces:**
- Produces from `boilers.ts`:
  - `type Damper = 0 | 1 | 2` (up, half, down);
  - `type BoilerState = { lit: boolean[]; dampers: Damper[]; latches: boolean[]; drawer: boolean }`;
  - `RIGHT_DAMPERS: Damper[]`: one per boiler, all different, so each boiler must be read on its own;
  - `rise(damper, right, ms): number`: the needle 0..1 while pumping. With the right damper it crosses the green band slowly (about 900 ms inside it). With a wrong one it either never reaches the band, or jumps over it in under 120 ms;
  - `GREEN: [number, number]`, `RED: number`;
  - `release(needle): "out" | "lit" | "spat"`;
  - `smoke(damper, right): "nero" | "grigio" | "chiaro"`: thick black means too little air, gone at once means too much;
  - `loadBoilers(stored)` / `solvedBoilers()`.
- Produces: `steamOf(state): { tondo: boolean; triangolo: boolean; quadrato: boolean }`. Each line is under pressure when its boiler is lit. The door shapes map boiler to line.

- [ ] **Step 1: Failing tests.**
  - For each boiler, only `RIGHT_DAMPERS[i]` lets some release time land in `GREEN`.
  - `smoke` tells the three dampers apart.
  - `release` covers all three outcomes.
  - `loadBoilers` rejects malformed storage.
  - The `solvedBoilers()` stop lights all three.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement the module.**
- [ ] **Step 4: Implement the machine.**
  - **The latch** is turned by a circular drag.
  - **Rotom.** Drag him from the middle of the hall onto an open door. A drag of Rotom projects the pointer on a vertical plane; dropped within reach of an open door, he flies in. While he is inside, Rotom is not in the middle.
  - **The pedal** is press-and-hold. The fire and the needle grow with `rise`, and smoke of the right kind comes out of the chimney.
  - **Releasing the pedal:**
    - `"lit"`: the boiler stays on, its light comes up and Rotom flies back to the middle;
    - `"out"`: the fire fades;
    - `"spat"`: the safety whistle blows and Rotom shoots out sooty. Darken his material for about 2 s; it is a funny puff, never a blast.
  - **The ash drawer** of the square boiler slides out with a drag, even when the boiler is cold. Inside is card piece A. Tapping it takes it, and it shows in a small strip of found pieces at the screen's edge (icons only).
  - **First boiler lit:** the `boilerLine` scene, with `Keeper` in an `Html` above Rotom, as in Babel.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it** on desktop and at 390 px: light all three, get spat out once, open the drawer.
- [ ] **Step 7:** Commit: `Sala macchine: le caldaie e il fuoco di Rotom`.

### Task 3: The steam pipes

**Files:**
- Create: `src/lib/pipes.ts`
- Create: `src/scenes/machines/Pipes.tsx`
- Modify: `src/scenes/Engine.tsx`. The outlets drive the motor, the organ and the press latch.
- Test: `scripts/check.mjs`, «tubi» block

**Interfaces:**
- **The grid** (`pipes.ts`), about 7 columns × 6 rows. Each cell is `{ kind: "straight" | "elbow" | "tee" | "cross" | "switch" | "valve" | "fixed" | "empty"; ... }`.
  - Rotatable pieces have `turn: 0..3`.
  - A `switch` has two exits chosen by its lever (`up: boolean`).
  - A `valve` is a straight piece that is open or shut.
  - `fixed` pieces are bolted down.
  - There are three inlets on the left (tondo, triangolo, quadrato) and four outlets on the right (the three shapes plus the shapeless decoy).
- **State:** `PipesState = { turns: number[]; switches: boolean[]; valves: boolean[] }`. There are exactly three switches and some valves (about 4).
- **`flow(grid, state, steam)`** returns:
  - `{ outlets: Record<"tondo"|"triangolo"|"quadrato"|"esca", "ok" | "mixed" | "none"> }`;
  - `leaks: Cell[]`: open pipe ends reached by steam;
  - `reach: Map<cell, line[]>`: what each cell carries, used to draw the shimmer.

  An outlet is `"ok"` only when exactly its own line reaches it and that line leaks nowhere. Two lines meeting in a piece make both `"mixed"`.
- `SOLUTION: PipesState`, `loadPipes`, `solvedPipes()`.

- [ ] **Step 1: Failing tests.**
  - `SOLUTION` makes all three shaped outlets `"ok"`, with `leaks` empty.
  - **Uniqueness by exhaustive search.** Write a backtracking solver in the test that walks rotatable cells, switches and valves, pruning on a piece whose open side faces a wall or a fixed piece that does not take it. It must find exactly one full solution. A valve whose state does not matter counts as two solutions, so design so that every valve matters.
  - Every switch and every valve changes the outcome somewhere: toggling it alone from `SOLUTION` breaks it.
  - A crafted state with two lines meeting gives `"mixed"`, and one with an open end gives a leak.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Design the grid and implement `flow`** until the tests pass. Design by hand, then let the solver prove uniqueness. If the solver finds more than one, add a fixed piece or a valve and repeat.
- [ ] **Step 4: Implement the panel.**
  - copper SVG pieces;
  - tap to turn a piece a quarter;
  - drag the switch levers up and down;
  - turn the valves with a circular drag;
  - flanges stamped with their shape.

  In 3D, steam shimmer runs along the pipes the panel shows. Leaks puff with `Steam`, and mixed outlets make their gauge needles shake wildly. An outlet that is `"ok"` lights its flange.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it.** Solve from the stop «caldaie», at 390 px too: each piece can be hit with a finger.
- [ ] **Step 7:** Commit: `Sala macchine: i tubi del vapore`.

### Task 4: The gears

**Files:**
- Create: `src/lib/gears.ts`
- Create: `src/scenes/machines/Gears.tsx`
- Modify: `src/scenes/Engine.tsx`. The shafts drive the hoist winch, the organ fan and the press flywheel.
- Test: `scripts/check.mjs`, «ingranaggi» block

**Interfaces:**
- **Sizes.** `SIZES = { piccolo: 1, medio: 2, grande: 3 }`, as pitch radii in grid units.
- **The board.**
  - `PEGS: [x, y][]` on a lattice.
  - Two gears on pegs `p`, `q` mesh when `dist(p, q) === r_p + r_q`.
  - They clash (refused on drop) when `dist < r_p + r_q`, or when any gear overlaps the motor or a shaft.
- **The fixed pieces.** The motor `MOTOR` (peg and size, turning clockwise when the tondo line is `"ok"`) and three shafts `SHAFTS: { id: "argano" | "ventola" | "volano"; peg; size; dir: 1 | -1; pace: "lumaca" | "lepre" }[]`.
  - `pace` is relative to the motor: a lumaca turns slower than the motor and a lepre faster. A shaft with the motor's speed exactly fails both.
- **The rack.** `RACK`: a few gears per size, for example 2 small, 3 medium and 2 large. Behind one of them is card piece B.
- **`spin(state)`.** It propagates through the mesh graph and returns, per shaft, `{ dir, pace } | "jam" | "still"`. A cycle with conflicting directions is a jam, and a jam stops everything it touches.
- `loadGears`, `solvedGears()`. The state is `{ placed: Record<pegIndex, size> }`, bounded by the rack.

- [ ] **Step 1: Failing tests.**
  - `solvedGears()` makes all three shafts match their plate.
  - **Exhaustive search** over the placements the rack allows (pegs × sizes, rack-bounded) finds at least one solution and at most a few, all using most of the rack. Fail if fewer than 4 gears are needed, so it is not trivial. Also fail if any single shaft can be satisfied alone with no more than 2 gears while the others are ignored and the rack still covers the rest, which would make the three-at-once tension vanish.
  - A conflicting cycle jams.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Design the board** until the tests pass, then implement `spin`.
- [ ] **Step 4: Implement the panel.**
  - a wooden board with pegs;
  - gears dragged from the rack and dropped on the nearest peg (snapped), or dragged off back to the rack;
  - plates on the shafts: a curved arrow and a lumaca or lepre silhouette;
  - meshing gears turn in SVG with their real ratio;
  - jams shudder.

  **In 3D, wrong outcomes are visible and funny:**
  - the fan turning the wrong way pushes the organ fog thicker;
  - the winch turning the wrong way pays out rope;
  - a wrong pace rattles and stops.

  Taking the gear that hides card piece B reveals the piece.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it.** From the stop «tubi», at 390 px too: the gears are big enough to drag.
- [ ] **Step 7:** Commit: `Sala macchine: gli ingranaggi`.

### Task 5: The hoist and the little scale

**Files:**
- Create: `src/lib/hoist.ts`
- Create: `src/scenes/machines/Hoist.tsx`
- Modify: `src/scenes/Engine.tsx`
- Test: `scripts/check.mjs`, «montacarichi» block

**Interfaces:**
- **The objects.** `OBJECTS`: five objects, `palla | incudine | campana | secchio | ruota` (the broken gear), each with a hidden integer `w`.
- **The arm.** `NOTCHES = 5` equal steps from the pivot, one object per notch at most. The cage's moment is `CAGE`.
- **`tilt(hung)`** returns `-1 | 0 | 1` (cage side down, level, weights side down).
- **`weigh(left, right)`** returns `-1 | 0 | 1`, for the bench scale with one or two objects per pan.
- `loadHoist`, `solvedHoist()`.
- **Candidate numbers found while planning:** `w = [2, 4, 6, 8, 9]` and `CAGE = 23`. The unique answer is 6 at notch 3, 4 at notch 2 and 9 at notch 1, and the other two objects are left off. The builder may pick others that pass the tests.

- [ ] **Step 1: Failing tests.**
  - Exactly one assignment of objects to notches levels the arm.
  - It uses at least 3 objects, and it is not the trivial "heaviest farthest" fill.
  - **What the scale shows decides it.** Take every weight vector (distinct integers 1–12) that gives the same `weigh` answers as `OBJECTS` on every one-or-two versus one-or-two comparison. Each must give the same unique levelling assignment.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement the module.**
- [ ] **Step 4: Implement the machine.**
  - **The objects** sit around the hall. Drag one onto the bench scale's pans, or onto a notch hook of the arm.
  - **The bench scale** tips with an eased swing.
  - **The arm** tips by `tilt`, showing only which side, never how much. The winch turns only when the «argano» shaft is right.
  - **The cage** rises only when the arm is level and the winch turns. Up top, the crate opens on a drag of its lid; inside is card piece C.
  - **Dragging Rotom onto the arm:** he darts away. This is the spec's silent joke.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it** on desktop and at 390 px.
- [ ] **Step 7:** Commit: `Sala macchine: il montacarichi e la bilancina`.

### Task 6: The organ's sound

**Files:**
- Create: `src/lib/organ.ts`
- Create: `scripts/organ-preview.mjs` (optional; a page under `$TEMP` to listen to it, deleted after)

**Interfaces:**
- **`organ()`**, a lazily created singleton. It returns `{ start(note): Voice; stop(voice); play(sequence, onNote?): Promise<void>; puff(): void }`.
  - It creates or resumes the `AudioContext` on first use, which must happen inside a gesture.
  - It degrades to silence when Web Audio is missing.
- **`NOTES = ["C5", "D5", "Eb5", "F5", "G5", "Ab5"]`** with their frequencies.
- **The pipe voice**, the recipe Salvo approved by ear in the preview:
  - ranks at 0.5, 1, 2, 3 and 4 × the pitch, with gains 0.35, 1, 0.55, 0.25 and 0.22;
  - each rank is one `PeriodicWave` with harmonic amplitudes 1, 0.5, 0.3, 0.18, 0.1 and 0.06;
  - a second copy detuned by +4 cents at 0.6 gain;
  - a 5.2 Hz tremulant of ±6 % on the gain;
  - a short band-passed noise «chiff» (about 30 ms) at the attack;
  - a 60 ms attack and a 120 ms release;
  - a `ConvolverNode` with a generated 3.2 s decaying noise impulse (low-passed at 6 kHz), with a wet/dry mix of about 0.6/0.55.
- **`puff()`** is the out-of-tune hiss for a wrong note: noise only, with no pitch.

- [ ] **Step 1:** Implement the module.
- [ ] **Step 2: Listen.** Use a throwaway page, or the browser console on the dev server, to play the melody with `play`. It must sound like the approved preview (`anteprima-organo-2-organo.mp3`, kept outside the repo). Do not commit any audio.
- [ ] **Step 3:** Run `npm run typecheck`. Expected: PASS.
- [ ] **Step 4:** Commit: `Organo: le canne fatte con Web Audio`.

### Task 7: The punched card and the organ

**Files:**
- Create: `src/lib/card.ts`
- Create: `src/scenes/machines/Organ.tsx`
- Modify: `src/scenes/Engine.tsx`
- Test: `scripts/check.mjs`, «organo» block

**Interfaces:**
- **The melody.** `MELODY: { note: 0..5; long: boolean }[]`, the 12 notes of the spec.
- **The card.** `CARD`: 6 rows × 12 columns. A cell is `null`, `"foro"` or `"fessura"`, built from `MELODY`. Row `k` is whistle `k`, and the shapes are printed only on the left margin of the first column.
- **The pieces.** `PIECES`: the card torn into three strips of 4 columns, with ragged edges. Each edge is a list of jag heights, and the edges match only their true neighbour. One hole straddles each tear: a `fessura` drawn half on each side.
- **The lectern.** `Placement = { piece: 0|1|2; flipH: boolean; flipV: boolean }[]`, for three lectern slots.
- **`assembled(placement)`** is true only for the true order with no flips.
- **`reading(placement)`** returns the sequence read off the lectern as placed, or `null` if the edges do not meet.
- **`step(progress, note, heldMs)`** returns `{ progress } | "wrong"`:
  - a pull shorter than `LONG_MS` (about 450 ms) is short, a longer one is long;
  - the rhythm between notes does not count;
  - a wrong pull starts over.
- `loadOrgan`, `solvedOrgan()`. The state is `{ found: ("A"|"B"|"C")[]; lectern: Placement; played: boolean }`.

- [ ] **Step 1: Failing tests.**
  - `CARD` read in order gives `MELODY`, and it has exactly 6 distinct rows used.
  - **Exhaustive search over all placements** (3! orders × 4 flip combinations per piece): exactly one has every edge meeting, and that one is the true order with no flips.
  - `step` accepts the melody with long pulls on notes 3, 6 and 12, and rejects a short pull where a long one belongs.
  - The loaders reject malformed storage.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement the module.**
- [ ] **Step 4: Implement the machine.**
  - **The whistles.** Six brass whistles of different heights, each with a chain and a handle of its shape.
  - **The fog** hides the handle shapes until the «ventola» shaft is right; when the fan turns the wrong way the fog thickens.
  - **Pulling a chain.** Drag the handle down and hold it. The chain stretches, the whistle sounds through `organ().start/stop`, and a steam wisp rises.
  - **Without the triangle line**, a pull gives only `puff()`.
  - **The lectern.** Found pieces are dragged from the found-pieces strip onto three slots. A tap on a placed piece flips it horizontally, and a two-finger twist (or a long press on desktop) flips it vertically. Edges that meet close up with a little click.
  - **Assembled:** the `cardLine` scene.
  - **Played right:** a scene in which the organ plays the whole melody by itself with `organ().play`, the whistles puffing in turn. Then a latch under the keyboard springs.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Listen and look** on a desktop and on a real phone (iOS if possible): the first pull must sound.
- [ ] **Step 7:** Commit: `Sala macchine: l'organo a vapore e la scheda perforata`.

### Task 8: The big lever and the press

**Files:**
- Create: `src/scenes/machines/Press.tsx`
- Modify: `src/scenes/Engine.tsx`. Move Rotom aside when the puzzle starts, and add the finale, `pressLine` and the floor hole.
- Modify: `src/data/puzzle.ts`. Add `PRESS_KEY` with a loader for `{ pulled: boolean }`.
- Modify: `src/lib/stages.ts`. Add the last stop, «pressa».
- Test: `scripts/check.mjs`. The stops block must still leave the last stop on floor 2.

**Interfaces:**
- **`latches = { quadrato: pipes.outlets.quadrato === "ok", volano: spin.volano matches, organo: organ.played }`**, derived and never stored.
- **The lever** pulls only when all three latches are open. Each latch glows as it opens.

- [ ] **Step 1: The press and the lever.**
  - **The press** is a huge hammer hanging over the middle, with a flywheel and a piston. It is still until the end, and the flywheel turns with the «volano» shaft.
  - **Rotom** eases aside, as he did for the sarcophagus, as soon as the hall is first entered after this chapter.
  - **The lever** is dragged down all the way. Released early, it springs back.
- [ ] **Step 2: The finale scene**, saved as `{ pulled: true }` once it starts:
  1. Everything runs at once: fires roar, every pipe shrieks, the gears spin, and the organ plays the last note.
  2. The hammer falls three times. Each blow shakes the camera (a small `CameraRig` offset) and widens a crack in the floor plates.
  3. On the third blow the plates fall away. A hole opens in the middle, with a cold white light below.
  4. The `pressLine` scene.

  **On reload** the hole is open and nothing replays. Tapping the hole does nothing yet (the fourth floor is a later chapter). With `reduced`, jump straight to the open hole.
- [ ] **Step 3:** Run `npm test && npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 4: Check in the browser.** From the stop «organo», pull the lever. Record the finale with gif_creator or a screencast.
- [ ] **Step 5:** Commit: `Sala macchine: la leva grande e la pressa`.

### Task 9: The whole floor, end to end

**Files:**
- Test: `scripts/check.mjs`, a «niente scritte» block. Read `src/scenes/machines/*.tsx` as text and fail on:
  - any JSX text node holding letters or digits;
  - any `<Text` element or `aria-label` that names an answer.

  Aria labels may name the object («leva», «catena»), never a shape, note or weight.
- Modify: whatever the pass turns up.

- [ ] **Step 1:** Write the test, then run `npm test`. Fix any hit.
- [ ] **Step 2: Play the whole floor** from «terzo piano» to the hole without the debug menu, on desktop and at 390 px. Note anything that is unclear without words, and fix it with shape, colour or motion, never with text.
- [ ] **Step 3: Undo checks.**
  - Break a pipe after the gears run: the gears stop, the fog returns and latches close.
  - Fix the pipe: everything resumes.
  - Reload in between: the same state comes back.
- [ ] **Step 4: Reduced motion through the whole floor:** nothing jitters, and the finale lands on the open hole.
- [ ] **Step 5: Every stop:** each of «caldaie» … «pressa» lands with exactly the machines above it solved.
- [ ] **Step 6:** Run `npm test && npm run typecheck && npm run build`. Expected: PASS. Delete any preview files.
- [ ] **Step 7:** Commit: `Sala macchine: il piano intero, da capo a fondo`.
