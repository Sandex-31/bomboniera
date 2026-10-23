# L'aula Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The fifth and last floor: a university lecture hall, reached by diving into the well that opens under the altar on floor 4. Ten puzzles, one per exam, are chained along exam prerequisites and pass their results to one another. Every exam passed goes into the libretto. With the libretto full, the steampunk laptop on the lecturer's desk, which is the 3D model of the real bomboniera, takes a code. Rotom enters it and Salvo's video plays.

**Architecture:**
- **Pure rules.** Each exam's rules are a pure module in `src/lib/aula/`, tested in `scripts/check.mjs` without a renderer, like `src/lib/well/*.ts`.
- **The chain.** `src/lib/aula/chain.ts` owns:
  - the exam ids and the prerequisites;
  - the single saved state: passed exams, failures for the appello, Analisi's first try, the SO mood grade, the laptop;
  - `results()`, which computes every result in chain order from the constants. Nothing about a result is stored, only *that* the exam was passed.
- **The hall.** `src/scenes/Aula.tsx` is the hall. It mirrors `src/scenes/Well.tsx`: camera, focus views, the hole up, the arrival and Rotom.
- **The puzzles.** Each puzzle is a component in `src/scenes/aula/`, drawn as DOM on a 3D surface with drei `<Html transform>`, the way `src/scenes/Puzzle.tsx:726` puts the desktop windows on floor 1. A shared `<Station>` wraps every puzzle: it handles the prerequisite lock and the appello countdown, and shows the result once the puzzle is passed.
- **The laptop.** `src/scenes/aula/Laptop.tsx` loads `public/models/portatile.glb`: one copy of the bomboniera, decimated and split into parts.

**Tech Stack:** React 19, @react-three/fiber 9, drei 10 (`Html`, `useGLTF`), three 0.180, Web Audio, Vite. Tests are node:assert via `npm test` (`scripts/check.mjs`), plus `npm run typecheck` and `npm run build`. Blender, through the MCP, is used only to make the GLB.

**Spec:** `docs/superpowers/specs/2026-10-23-aula-quinto-piano-design.md`

## Global Constraints

- **The hardest floor.** A good visitor takes well over an hour, two and more. Every puzzle asks for real work, with pen and paper if need be. Nothing can be solved by trying at random.
- **Prerequisites, exactly:**
  - roots: `arch`, `analisi`, `logica`, `bd`;
  - `fisica` ← `analisi`;
  - `asd` ← `arch`;
  - `lft` ← `logica`;
  - `ium` ← `lft`, `bd`;
  - `so` ← `asd`, `fisica`;
  - `si` ← all nine others.
- **What flows:**

  | From | Result | Into |
  | --- | --- | --- |
  | arch | byte 0–255 | asd edge weights |
  | analisi | integer area | fisica battery volts |
  | fisica | integer mA | so time quantum |
  | logica | 8-bit truth table | lft missing arrows |
  | lft | shortest accepted word | ium commit message |
  | asd | bench order | so arrival order |
  | bd | matricola | ium file value |
  | ium | short commit hash | si |
  | so | finish order | si |
  | all nine | their results | si |
  | si | code, digits only | the laptop |

- **One answer.** Given its inputs, every puzzle has exactly one solution. A brute-force test proves it wherever the space allows.
- **Bocciato, prossimo appello.** A wrong answer locks that puzzle for `APPELLO_MS = 30_000`, never more than 60 s.
  - The lock is saved, so a reload does not skip it.
  - Above the puzzle: a date «prossimo appello: …» and a countdown.
- **Analisi al secondo colpo.**
  - The first *correct* answer is rejected and stamped on the register: the right number circled in red, with an absurd reason. The appello starts.
  - The same answer, given again after the appello, passes.
  - A wrong answer fails as usual.
- **Fisica overcurrent.** Too much current smokes the wire and counts as a failure, with its appello.
- **The laptop has no appello.** A wrong code only jams the gears, with a sound.
- **Results stay visible.** Every result that flows on is written or drawn next to the puzzle that gave it, once that puzzle is passed. The visitor never has to remember a result.
- **Earlier floors.** Their answers are *not* copied here; the visitor climbs back up to look. The ones used:
  - arch takes a digit of `NUMBER` from `src/lib/well/pillars.ts` (9017432). Which digit is told by a drawing, a handset and a position, never by a numeral.
  - asd's graph is laid on cells of the floor-1 maze (`src/lib/maze.ts`).
  - bd's register names are the floor-1 silhouettes (`CHARACTERS` in `src/lib/sagome.ts`), plus Rotom and the keeper.
- **No hints spelled out, but words and numbers are allowed.** Boards, registers and notebooks carry writing; the visitor has to work out how to use it.
- **The libretto.**
  - It can always be opened, from the desk and from the HUD.
  - Every passed exam reads «superato».
  - The one exception is Sistemi Operativi: a mood grade from 18 to 30, drawn once when the exam is passed, and saved.
- **Rotom.**
  - He lands as Frost and flashes into **Rotom Vortice** (`from="frost"`, `form="fan"`), a form not used on any other floor, then sits in a bench.
  - Going back up, he turns to Frost again.
  - New placeholder lines in `src/data/puzzle.ts`, in the `starLine` style `'Rotom: TODO — …'`:
    - `aulaLine`, on arrival;
    - `laptopShutLine`, when the laptop is tapped before the libretto is full;
    - `laptopLine`, when he enters the laptop.
  - The one fixed line is LFT's prof: exactly `«top ok»`.
- **The finale.**
  - No QR anywhere.
  - The video is `public/media/finale.mp4`, started by a tap only: `playsInline`, no autoplay.
  - Until the file exists, the screen shows exactly `il video di Salvo arriverà qui`.
  - On a later visit, reopening the laptop goes straight to the video.
- **The model.** One copy out of the five, decimated. `public/models/portatile.glb` is **≤ 3 MB**. Its parts are `base`, `lid` (hinged), `gears` (one or more meshes named `gear*`) and `keys`.
- **Floor rules from the earlier chapters:**
  - **Scenes:** while one plays, `onScene(true)` and the controls are disabled.
  - **`reduced`:** handled as on the other floors.
  - **Phones:** at 390 px wide, every focused puzzle fills the screen, and every tappable thing is at least 44 CSS px.
  - **Lights:** the number of lights stays constant (see `Lamp` in `src/scenes/machines/hall.tsx`).
- **Language.**
  - Copy is in Italian.
  - Code comments are in English, in the repo's prose style.
  - Commit messages are in Italian and start with `L'aula:`.

## Review Focus

- **A tampered or stale save.**
  - A malformed `AULA_KEY` falls back to the untouched floor.
  - An exam marked passed whose prerequisites are not passed counts as not passed, and so does everything downstream of it.
  - Test (Task 2): `loadAula` of garbage is `INITIAL`.
  - Test (Task 2): a state with `so` passed but `asd` not has `passed(s, "so") === false`.
- **The appello across a reload and a clock change.**
  - A failure saved at `failedAt` still locks after a reload.
  - A `failedAt` in the future (the clock moved back) locks for at most `APPELLO_MS` from now, never forever.
  - Test (Task 2): `lockedFor(now + 10 * 60_000, now) <= APPELLO_MS`.
- **Taps inside `<Html transform>`.** They must not turn the camera, and a camera drag must not press a button. Use the semantics of `useTap` (`src/scenes/Hotspot.tsx:60`), or stop propagation on pointerdown inside the sheet.
- **The video on iOS.**
  - It starts only from the tap, with `playsInline`.
  - A missing file shows the placeholder, not a broken player.
  - Test (Task 9): with no `public/media/finale.mp4`, the placeholder text is what renders. Check by eye at 390 px.
- **Debug jumps.** Landing on any aula stop leaves a state where every screen re-checks as solved and the next one is open.
  - Test (Task 2): for every `i`, `aulaUpTo(i)` has exactly the first `i` exams of `ORDER` passed, and the next one is open.

---

### Task 1: The floor itself, the way down and back

**Files:**
- Modify: `src/data/puzzle.ts`.
  - Set `FLOORS = 5`.
  - Add `AULA_KEY = 'bomboniera.puzzle.aula'`.
  - Add the lines `aulaLine`, `laptopShutLine`, `laptopLine`.
- Modify: `src/scenes/Well.tsx`.
  - Once the mural is done, the well becomes tappable: the pit in `src/scenes/well/Altar.tsx`, `PIT_R`.
  - Rotom dives as he does now, then `onDown(first)` is called.
  - Mirror the press hole and `onDown` in `src/scenes/Engine.tsx:296-481`.
  - New prop `onDown: (first: boolean) => void`.
  - Coming back up from below needs `fromBelow`, as `Engine` has it.
- Modify: `src/scenes/Puzzle.tsx`.
  - Add `toAula = goTo(4, first)` and `upToWell = goTo(3, false)`.
  - Render `floor === 4` as `<Aula …/>`.
- Create: `src/scenes/Aula.tsx`, the hall.
  - Tiered benches facing the lecturer's desk, a big blackboard behind the desk, a side board, a projector screen, a lab bench, windows. The style matches the other 3D floors.
  - A hole in the ceiling over the entrance, lit from above like the well's. Tapping it goes up.
  - `type Spot = ExamId | "desk"`, with `SPOTS: Record<Spot, { position: [number,number,number]; view: View }>`. Every spot has its own close-up camera view; reuse `View` and the focus pattern of `Well.tsx`.
  - In this task the ten spots are empty placeholders, one labelled box each.
- Modify: `src/lib/stages.ts`.
  - Add `{ label: "quinto piano", key: FLOOR_KEY, solved: () => "4" }` after «murale».
  - Put `AULA_KEY` in `WIPED` until Task 2 moves it.
- Test: `scripts/check.mjs`.
  - `floorFrom("4") === 4` and `floorFrom("5") === 0`.
  - «quinto piano» comes right after «murale».
  - The existing key-coverage check passes.

**Interfaces:**
- Produces the `Aula` props `{ reduced, onScene, onUp, arrivedAt, first }`, the same as `Well`.
- Produces `SPOTS` and `Spot`, exported from `src/scenes/aula/spots.ts`. That way each puzzle task places itself with a single line in `Aula.tsx`.

- [ ] **Step 1:** Write the failing tests above.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL on the new asserts.
- [ ] **Step 3:** Implement the keys, the stop, the routing and `Well`'s `onDown`.
- [ ] **Step 4:** Implement `Aula.tsx` and `spots.ts`.
  - On arrival, Rotom drops through the hole as Frost and flashes to base.
  - The `aulaLine` scene plays: the long version the first time, a quick one afterwards.
  - Going up runs the same in reverse.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it.** From the «murale» stop: tap the well, land in the hall, focus each spot, go back up. Check at 1280×800 and at 390×800.
- [ ] **Step 7:** Commit: `L'aula: il quinto piano, la discesa dal pozzo e il ritorno`.

### Task 2: The chain, the appello, the libretto, the station

**Files:**
- Create: `src/lib/aula/chain.ts`
- Create: `src/scenes/aula/Station.tsx`
- Create: `src/scenes/aula/Libretto.tsx`
- Modify: `src/scenes/Aula.tsx`. It owns the state, saves it and passes it down.
- Modify: `src/lib/stages.ts`.
  - Move `AULA_KEY` out of `WIPED`.
  - Add one stop per exam, in `ORDER`, labelled `aula: <name>`, each with `solved: () => aulaUpTo(i + 1)`.
- Test: `scripts/check.mjs`, block «aula: catena».

**Interfaces:**
- Produces in `chain.ts`:
  - `type ExamId = "arch" | "analisi" | "fisica" | "logica" | "lft" | "asd" | "bd" | "ium" | "so" | "si"`.
  - `ORDER: readonly ExamId[] = ["arch","analisi","logica","bd","fisica","asd","lft","ium","so","si"]`, a topological order, used by the stages and the libretto.
  - `PREREQ: Record<ExamId, readonly ExamId[]>`, exactly as in Global Constraints.
  - `EXAM_OF: Record<ExamId, string>`, mapping each id to the `id` in `src/data/exams.ts`; the libretto reads the names from there:

    | ExamId | `exams.ts` id |
    | --- | --- |
    | `arch` | `architettura-elaboratori` |
    | `analisi` | `analisi-matematica` |
    | `fisica` | `fisica` |
    | `logica` | `logica` |
    | `lft` | `lft` |
    | `asd` | `algoritmi` |
    | `bd` | `basi-di-dati` |
    | `ium` | `IUM-TWEB` |
    | `so` | `sistemi-operativi` |
    | `si` | `intelligenza-artificiale` |

  - `type AulaState = { passed: ExamId[]; failedAt: Partial<Record<ExamId, number>>; analisiStamped: boolean; soGrade: number | null; laptop: "closed" | "on" }`.
  - `INITIAL: AulaState`.
  - `loadAula(raw: string | null): AulaState`. Never throws.
  - `passed(s, id): boolean`. True only when `id` is in `s.passed` and every prerequisite is `passed`, recursively.
  - `open(s, id): boolean`. True when every prerequisite is `passed`.
  - `APPELLO_MS = 30_000`.
  - `lockedFor(failedAt: number | undefined, now: number): number`. The ms left, clamped to `[0, APPELLO_MS]`.
  - `fail(s, id, now): AulaState`.
  - `pass(s, id, rng = Math.random): AulaState`. When `id === "so"`, it draws `soGrade`, an integer in 18–30.
  - `libretto(s): { id: ExamId; name: string; grade: string | null }[]`, in `ORDER`. `grade` is `"superato"` for a passed exam, `String(soGrade)` for `so`, and `null` when not passed.
  - `aulaUpTo(n: number): AulaState`, with the first `n` of `ORDER` passed.
  - `results(): Results`, with `Results = { arch: number; analisi: number; fisica: number; logica: number; lft: string; asd: number[]; bd: number; ium: string; so: number[]; si: string }`. Each puzzle task fills in its own field.
- Produces `<Station id state now onTry>`:
  - It renders its `children`, the puzzle, on an `<Html transform>` sheet at `SPOTS[id]`.
  - It shows a lock while the puzzle is not `open`.
  - While `lockedFor > 0`, it shows the appello date and countdown, and the children are disabled.
  - `children` receive `passed: boolean`. Once passed, each puzzle draws its own result.
  - `onTry(ok: boolean)` lets the hall call `pass` or `fail`.
- Produces `<Libretto state>`: a small booklet on the desk and a button in the HUD.

- [ ] **Step 1: Failing tests.**
  - `PREREQ` is acyclic, and `ORDER` respects it.
  - `loadAula("{")` and `loadAula(null)` equal `INITIAL`. `loadAula('{"passed":["zzz"]}')` equals `INITIAL`, unknown ids dropped.
  - `passed` is false for `so` when `asd` is missing.
  - `lockedFor(t, t) === APPELLO_MS`.
  - `lockedFor(t, t + APPELLO_MS) === 0`.
  - `lockedFor(now + 600_000, now) <= APPELLO_MS`.
  - `pass(s, "so", () => 0).soGrade === 18`, and with `() => 0.9999` it is `30`.
  - `aulaUpTo(i)` has exactly the first `i` of `ORDER` passed, and the next one open.
  - In `libretto(aulaUpTo(10))`, every entry is `"superato"` except `so`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `chain.ts`.
- [ ] **Step 4:** Implement `Station`, `Libretto` and the state in `Aula.tsx`.
  - The state is saved to `AULA_KEY` on every change.
  - A pointerdown inside a sheet stops propagation, so a tap on a puzzle never turns the camera.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it** with stub puzzles, a right and a wrong button each. Check:
  - the lock;
  - the countdown, across a reload;
  - the libretto filling in.
- [ ] **Step 7:** Commit: `L'aula: la catena degli esami, l'appello e il libretto`.

### Task 3: Architettura and ASD

**Files:**
- Create: `src/lib/aula/arch.ts`, `src/lib/aula/asd.ts`.
- Create: `src/scenes/aula/Arch.tsx`: the corner of the blackboard with the program, and 8 lever switches.
- Create: `src/scenes/aula/Asd.tsx`: the benches as nodes on the floor, tapped in order.
- Modify: `results()` in `chain.ts`, adding `arch` and `asd`.
- Test: block «aula: architettura, asd» in `scripts/check.mjs`.

**Interfaces:**
- `arch.ts`:
  - `PHONE_DIGIT_INDEX`: the index into `NUMBER` (from `src/lib/well/pillars.ts`) whose digit is the starting value of register `r0`.
  - `PROGRAM: readonly Instr[]`, where `type Instr = { op: "MOV"|"ADD"|"SUB"|"SHL"|"SHR"|"AND"|"OR"|"XOR"|"JNZ"|"DEC"; a: string; b?: string | number }`.
  - `run(program, r0: number): number`. The result is 8-bit (`& 0xff`).
  - `ARCH_ANSWER = run(PROGRAM, NUMBER[PHONE_DIGIT_INDEX])`.
  - `checkArch(levers: boolean[]): boolean`. The levers are read MSB first.
- `asd.ts`:
  - `NODES: { id: number; cell: [number, number] }[]`. Each node sits on an open cell of `buildMaze()`.
  - `EDGES: { a: number; b: number; bit: number }[]`.
  - `weights(byte): number[]`. Bit `k` of the byte sets edge `k`'s weight to `SLOW` or `FAST`.
  - `shortest(byte): number[]`: Dijkstra from `DOOR` to `DESK`.
  - `ASD_ANSWER = shortest(ARCH_ANSWER)`.
  - `checkAsd(path: number[]): boolean`.

- [ ] **Step 1: Failing tests.**
  - `run` executes correctly a tiny known program that loops with `JNZ`/`DEC`.
  - `ARCH_ANSWER` is in 1–254, so its bits are neither all 0 nor all 1.
  - Every `NODES` cell is passable in `buildMaze()`.
  - `shortest(ARCH_ANSWER)` is **unique**: no other simple path from `DOOR` to `DESK` has the same total weight. Prove it by enumeration.
  - `shortest(ARCH_ANSWER)` differs both from the shortest path by hop count and from `shortest(0)`. Ignoring the byte must give a wrong answer.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement both modules. Pick a `PROGRAM` whose loop runs at least 4 times, so that working it out by hand takes a while.
- [ ] **Step 4:** Implement both components.
  - Arch: the handset drawing that tells the digit, and the tall pile of the «1700 pagine».
  - ASD: one Brazilian detail somewhere, an «obrigado» or a small flag.
  - Once arch is passed, the byte is drawn in binary next to the switches, and each corridor shows whether it is slow or fast.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it** on desktop and at 390 px.
- [ ] **Step 7:** Commit: `L'aula: Architettura e ASD`.

### Task 4: Analisi and Fisica

**Files:**
- Create: `src/lib/aula/analisi.ts`, `src/lib/aula/fisica.ts`.
- Create: `src/scenes/aula/Analisi.tsx`: the big blackboard with a curve on a grid.
- Create: `src/scenes/aula/Fisica.tsx`: the lab bench, with battery, resistors with colour bands, terminals, ammeter, electromagnet and an iron weight.
- Modify: `chain.ts`.
  - Add `analisi` and `fisica` to `results()`.
  - `pass`/`fail` handle Analisi's second shot through `analisiStamped`.
- Test: block «aula: analisi, fisica».

**Interfaces:**
- `analisi.ts`:
  - `f(x: number): number`, `A`, `B`.
  - `ANALISI_ANSWER`: the integral of `f` from `A` to `B`, an integer.
  - `judgeAnalisi(s: AulaState, n: number): "pass" | "stamp" | "fail"`:
    - `"stamp"` for the first correct answer;
    - `"pass"` for a correct answer once `analisiStamped`;
    - `"fail"` otherwise.
  - `REASONS: string[]`: the absurd reasons on the register. Mark them `TODO` in a comment, for Salvo to edit.
- `fisica.ts`:
  - `RESISTORS: { id: string; ohms: number; bands: Colour[] }[]`. The bands follow the real 4-band colour code.
  - `type Circuit = { slots: (string | null)[] }`: a fixed topology with slots in series and in parallel.
  - `current(c: Circuit, volts: number): number`, in mA.
  - `LIFT: [min: number, max: number]` and `SMOKE: number`, both in mA.
  - `judgeFisica(c, volts): "lift" | "weak" | "smoke"`.
  - `FISICA_ANSWER`: the integer mA of the only filling that lifts at `ANALISI_ANSWER` volts.
  - `jitter(mA, t)`: display only, ±15% on the needle, so the needle alone cannot tell `lift` from its neighbours.
- In the hall:
  - `"smoke"` is a `fail`.
  - `"weak"` is not a fail: the weight just stays down.

- [ ] **Step 1: Failing tests.**
  - The bands of every resistor decode to its `ohms` under the standard code.
  - `ANALISI_ANSWER` is an integer, and agrees with a numerical integration of `f` within 1e-6.
  - `judgeAnalisi` gives `"stamp"` first, then `"pass"` once stamped. A wrong `n` is `"fail"` in both cases.
  - Over every filling of the circuit's slots, **exactly one** gives `"lift"` at `ANALISI_ANSWER` volts.
  - At least one filling gives `"smoke"`.
  - The two nearest currents that do not lift fall inside the jitter band of the one that does.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement both modules.
- [ ] **Step 4:** Implement both components.
  - The stamped register: the correct number circled in red, and the reason.
  - Fisica: the weight rises on `"lift"`, and the wire smokes on `"smoke"`.
  - A small «grazie Archeus» on a first-try lift, that is, with no Fisica failure on record.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it.**
- [ ] **Step 7:** Commit: `L'aula: Analisi al secondo colpo e Fisica`.

### Task 5: Logica and LFT

**Files:**
- Create: `src/lib/aula/logica.ts`, `src/lib/aula/lft.ts`.
- Create: `src/scenes/aula/Logica.tsx`: the abandoned notebook with the formula, and a row of desks with three switches and a bulb.
- Create: `src/scenes/aula/Lft.tsx`: the side board with the half-drawn automaton, and the letter tiles.
- Modify: `chain.ts`, adding `logica` and `lft`.
- Test: block «aula: logica, lft».

**Interfaces:**
- `logica.ts`:
  - `FORMULA: string`, using ∧ ∨ ¬ → over three variables `p q r`.
  - `evaluate(p, q, r): boolean`.
  - `LOGICA_ANSWER`: the 8 bits of the table, rows in the order `pqr = 000…111`.
  - `checkLogica(table: boolean[]): boolean`.
- `lft.ts`:
  - `STATES`, `ALPHABET` (3–4 letters), `START`, `ACCEPT`.
  - `FIXED: Transition[]`.
  - `OPTIONAL: Transition[8]`. Each one is present when its table bit is 1.
  - `automaton(bits: number)`.
  - `shortestAccepted(bits): string`, found by BFS.
  - `LFT_ANSWER = shortestAccepted(LOGICA_ANSWER)`.
  - `checkLft(word: string): boolean`.
- On pass, the prof appears for 2 s and says exactly `«top ok»`.

- [ ] **Step 1: Failing tests.**
  - The formula contains a `→` and a `¬`.
  - Its table is not constant, and not equal to any single variable.
  - `shortestAccepted(LOGICA_ANSWER)` is **unique** among the words of its length.
  - Its length is at least 5.
  - With all 8 optional arrows present, or with none, the answer changes, so the table matters.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement both modules.
- [ ] **Step 4:** Implement both components. Once logica is passed:
  - its table is written next to the switches;
  - the optional arrows appear faintly on the automaton, numbered by table row.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it.**
- [ ] **Step 7:** Commit: `L'aula: Logica e l'automa di LFT`.

### Task 6: Basi di Dati and IUM-TWEB

**Files:**
- Create: `src/lib/aula/bd.ts`, `src/lib/aula/ium.ts`.
- Create: `src/scenes/aula/Bd.tsx`: the two registers on the desk, the query cards, the useless tutor.
- Create: `src/scenes/aula/Ium.tsx`: the projector with a file full of conflicts, the phone-call scene, the commit box.
- Modify: `chain.ts`, adding `bd` and `ium`.
- Test: block «aula: basi di dati, ium».

**Interfaces:**
- `bd.ts`:
  - `STUDENTS: { name: string; matricola: number }[]`. The names are the ids of `CHARACTERS`, plus `rotom` and the keeper. Each matricola has 6 digits.
  - `ESITI: { matricola: number; esame: string; esito: "superato" | "bocciato" }[]`.
  - `type Query = { select: string; join: boolean; on: [string, string] | null; where: [field: string, op: "=" | "!=", value: string][] }`.
  - `runQuery(q): string[][]`: a tiny evaluator over the two tables.
  - `BD_TARGET`: the condition the board asks for, written as a sentence in the register (for example «chi è stato bocciato in un solo esame»).
  - `BD_ANSWER: number`: the matricola.
  - `checkBd(rows: string[][]): boolean`. True when the result is exactly one row, holding `BD_ANSWER`.
  - `TUTOR: string[]`: the useless advice.
- `ium.ts`:
  - `HUNKS: { ours: string[]; theirs: string[]; right: "ours" | "theirs" }[]`. Picking the wrong side breaks something visibly: a rendered preview next to the file shows the bug.
  - The resolved file contains the matricola `BD_ANSWER`.
  - `hash(text: string): string`: FNV-1a 32-bit, first 4 hex digits.
  - `IUM_ANSWER = hash(resolved + "\n" + LFT_ANSWER)`.
  - `checkIum(choices: ("ours"|"theirs")[], message: string): boolean`.
- The phone call: a short scene, «Senia: è esploso tutto il git», played once when IUM is first opened. The text is a placeholder, marked `TODO` for Salvo.

- [ ] **Step 1: Failing tests.**
  - `BD_TARGET` cannot be answered from `STUDENTS` or `ESITI` alone: no single-table query yields exactly one row holding `BD_ANSWER`.
  - The intended join query yields exactly that row.
  - Every `CHARACTERS` id appears in `STUDENTS`.
  - IUM: exactly one choice vector is accepted.
  - IUM: the right choices with the wrong message are rejected.
  - `IUM_ANSWER` is 4 lowercase hex characters.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement both modules.
- [ ] **Step 4:** Implement both components.
  - Once bd is passed, its result row stays highlighted.
  - Once ium is passed, its hash is shown as in `git log --oneline`.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it** at 390 px. The card picker and the hunks must stay usable, scrolling inside the sheet if they have to.
- [ ] **Step 7:** Commit: `L'aula: il JOIN dei registri e il git esploso`.

### Task 7: Sistemi Operativi

**Files:**
- Create: `src/lib/aula/so.ts`.
- Create: `src/scenes/aula/So.tsx`: five students at a row of desks, shared pens, calculators and sheets, and the prof's face, whose mood changes.
- Modify: `chain.ts`, adding `so`.
- Test: block «aula: sistemi operativi».

**Interfaces:**
- `so.ts`:
  - `PROCS: { id: number; burst: number; needs: [ResId, ResId] }[]`, five of them.
  - `arrival(asdPath: number[]): number[]`: the arrival order, taken from the bench order.
  - `deadlocks(order: ResId[]): boolean`, where `order` is a global acquisition order.
  - `roundRobin(arrival: number[], quantum: number): number[]`: the finish order.
  - `quantumFrom(mA: number): number`. It maps `FISICA_ANSWER` to a quantum of 1–5 time units, and the rule is written on the board.
  - `SO_ANSWER = roundRobin(arrival(ASD_ANSWER), quantumFrom(FISICA_ANSWER))`.
  - `checkSo(order: ResId[], finish: number[]): boolean`.
- The mood: the prof's face cycles among a few expressions. The grade drawn by `pass` is shown together with the face of that moment.

- [ ] **Step 1: Failing tests.**
  - The default acquisition order deadlocks, and at least one order does not.
  - `SO_ANSWER` differs from the finish order in each of these cases, so every input matters:
    - quantum 1;
    - infinite quantum (FCFS);
    - arrival by bench id.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `so.ts`.
- [ ] **Step 4:** Implement `So.tsx`. Once passed, the finish order stays drawn as a Gantt strip.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it.**
- [ ] **Step 7:** Commit: `L'aula: Sistemi Operativi e l'umore del prof`.

### Task 8: Sistemi Intelligenti, the CSP

**Files:**
- Create: `src/lib/aula/si.ts`.
- Create: `src/scenes/aula/Si.tsx`: the open libretto next to the laptop, with nine boxes and the constraints.
- Modify: `chain.ts`, adding `si`.
- Test: block «aula: sistemi intelligenti».

**Interfaces:**
- `si.ts`:
  - `type Constraint = { text: string; holds: (a: number[]) => boolean }`.
  - `constraints(r: Omit<Results, "si">): Constraint[]`. Each constraint names and uses the result of at least one other exam, and **each of the nine results is used by at least one constraint**.
  - `solveAll(cs): number[][]`: a backtracking solver over 9 digits, 0–9.
  - `SI_ANSWER`: the single solution, joined into a string. It is the laptop code.
  - `checkSi(a: number[]): boolean`.

- [ ] **Step 1: Failing tests.**
  - `solveAll(constraints(results()))` has **exactly one** solution.
  - Dropping any single constraint gives more than one solution, so none is redundant.
  - Every key of `Results` except `si` is used.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `si.ts`.
- [ ] **Step 4:** Implement `Si.tsx`. Each constraint shows the result it uses as a small chip, such as «byte di Architettura», so the visitor knows where to look.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it.**
- [ ] **Step 7:** Commit: `L'aula: Sistemi Intelligenti, l'ultimo esame`.

### Task 9: The laptop: the model, the code, Rotom, the video

**Files:**
- Create: `public/models/portatile.glb`, made from `C:\Users\salva\Downloads\FinaleQReasy.3mf`.
  - Take **one** of the five copies: `object id="1"` in `3D/3dmodel.model`.
  - Decimate it and split it into `base`, `lid` (with its origin on the hinge axis), `gear*` and `keys`.
  - Export it as GLB, **≤ 3 MB**.
  - Work in Blender through the MCP. If Blender cannot import 3MF, extract the mesh of object 1 from the XML into an OBJ with a one-off script kept in the scratchpad, not in the repo.
  - Choose the colours: the teal of the preview is not binding.
- Create: `src/lib/aula/laptop.ts`, `src/scenes/aula/Laptop.tsx`.
- Modify: `src/scenes/Aula.tsx`: the laptop on the desk, `laptopShutLine`, `laptopLine`.
- Modify: `README.md`:
  - the model and how it was made;
  - the video spec: `public/media/finale.mp4`, H.264 + AAC, 720p, about 15 MB at most.
- Test: block «aula: portatile».

**Interfaces:**
- `laptop.ts`:
  - `canOpen(s): boolean`. True when every exam is passed.
  - `typed(buffer: string, key: string): { buffer: string; result: "more" | "ok" | "jam" }`. Only digits are accepted. The code is judged once `buffer.length === SI_ANSWER.length`. A jam clears the buffer.
- `<Laptop state onOpen onOn>`:
  - loads the model with `useGLTF("models/portatile.glb")`;
  - the lid rotates on its hinge;
  - the `gear*` meshes spin once the laptop is on;
  - an invisible ten-key hit grid lies over `keys`, every key at least 44 px at 390 px when focused;
  - the heart glows once the laptop is on.

- [ ] **Step 1: Failing tests.**
  - `typed` runs `SI_ANSWER` through to `"ok"`.
  - A wrong code gives `"jam"` and an empty buffer.
  - Non-digits are ignored.
  - `public/models/portatile.glb` exists and is at most 3 MB.
  - The GLB's JSON chunk has nodes named `base`, `lid`, `keys` and at least one `gear*`. Read the 12-byte header and the first chunk with `node:fs`; no new dependency.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Make the GLB. Check it with Blender's `look` before exporting.
- [ ] **Step 4:** Implement `laptop.ts` and `Laptop.tsx`, then the finale in `Aula.tsx`:
  1. tapped too early, the laptop answers with `laptopShutLine`;
  2. with the libretto full, the lid lifts, with the laptop off;
  3. the code is typed: on `"jam"` a jammed-gear sound plays; on `"ok"` the gears spin and the heart lights up;
  4. Rotom flies into the screen with `laptopLine`, and the screen lights up;
  5. on the screen, an `<Html transform>` holds `<video src="media/finale.mp4" playsInline controls preload="none">` behind a play button. Its `onError` swaps in the placeholder `il video di Salvo arriverà qui`;
  6. `laptop: "on"` is saved, so a later visit opens straight onto the video.
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run build`. Expected: PASS. Note the GLB's size in the build output.
- [ ] **Step 6: Look at it.** From the «aula: Sistemi Intelligenti» stop, play the whole finale with and without `reduced`, at 1280×800 and at 390×800. Check the placeholder with no video file.
- [ ] **Step 7:** Commit: `L'aula: il portatile steampunk e il video di Salvo`.

### Task 10: The whole floor, end to end

**Files:**
- Modify: whatever the walk-through turns up.

- [ ] **Step 1:** From the «murale» stop, play the floor from the dive to the video at 390×800, without debug jumps.
  - Time it and note the time.
  - The target, well over an hour for someone who does not know the answers, cannot be measured by a walk-through with the answers. Check instead that every puzzle needs its inputs: no answer can be guessed from its own sheet.
- [ ] **Step 2:** Go through the Review Focus list by hand:
  - a tampered save;
  - an appello across a reload;
  - no camera turning from a tap on a sheet;
  - the video placeholder on iOS Safari, if a device is at hand.
- [ ] **Step 3:** Run `npm test && npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 4:** Commit: `L'aula: il piano intero, da capo a fondo`.
