# Sala macchine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A third floor of the tower, the machine room. You get there through the open sarcophagus of Babel. Rotom arrives as Wash Rotom and turns into Heat Rotom by catching fire and vanishing in smoke. The room is only scenery for now.

**Architecture:**
- Floors stay numbered in `FLOOR_KEY`. The machine room is floor `2`.
- A new stored "deepest floor reached" decides when a trip is the long first one. It replaces today's `descended` boolean.
- `src/scenes/Engine.tsx` is the new hall, built on the pattern of `Babel.tsx`.
- The fire-and-smoke timeline is a pure function `burn(ms)` in `src/lib/descent.ts`, next to `travel`, so it is tested without a renderer.
- `Rotom.tsx` draws the flames and smoke from it.

**Tech Stack:** React 19, @react-three/fiber 9, drei 10, three 0.180, Vite, node:assert tests via `npm test` (`scripts/check.mjs`), plus `npm run typecheck` and `npm run build`.

**Spec:** `docs/superpowers/specs/2026-10-18-sala-macchine-design.md`

## Global Constraints

- **Heat Rotom files.** Get them from Cobblemon commit `6e57d77d105dd042def0a1ca302d94a746e2ec32` and copy them unmodified:
  - `…/bedrock/pokemon/models/0479_rotom/rotom_heat.geo.json`
  - `…/textures/pokemon/0479_rotom/heat/rotom_heat.png`
  - `…/textures/pokemon/0479_rotom/heat/rotom_heat_emissive.png`

  The textures sit in a `heat/` subfolder upstream.
- **Floors.** `0` is the island, `1` is Babel, `2` is the machine room. `FLOORS = 3`.
- **Transformation timing.** The full show lasts about 4–5 s (`BURN_MS = 4500`), and the form changes while the smoke hides Rotom.
- **Quick trip.** Every trip after the first just flashes, with a puff of smoke.
- **Back up to Babel.** Heat turns back into Wash with the ordinary flash.
- **Reduced motion** (`reduced`): jump straight to the end state, with no fire, smoke or flight.
- **Scene rule.** While a scene plays, `onScene(true)` empties the desktop and OrbitControls stay `enabled={!flying && !scene}`.
- **Language.** Visible copy is Italian. Code comments follow the repo's English prose style.
- **Babel windows.** They are not remembered when the visitor leaves the floor (today's behaviour, unchanged).
- **Never rendered:** Rotom rolling or turning its back, and smoke covering the whole screen.

## Review Focus

- **Reload on Babel after the sarcophagus line but before going down.** Tapping the open sarcophagus must start the long descent once. Task 4 pins it with `first = depth < 2`.
- **Jumping to the debug stop «terzo piano»** must land in the machine room. A trip up and back down afterwards must be the quick one, not the long show. Task 2 pins it: depth starts at `max(stored depth, current floor)`.
- **Taps during the descent or the burn** (on Rotom, the coffin, the ceiling) must not start a second trip. Tasks 3 and 4 ignore taps while `scene` is true.
- **Reduced motion through the whole chain** (sarcophagus → machine room → back up) must leave Rotom in the right form, with no smoke left hanging. This is checked by hand in Task 5.
- **Phone width (390 px):** the arrival, the burn and the room must fit, with no frame drops from the fire. This is checked by hand in Task 5.

---

### Task 1: Heat Rotom form

**Files:**
- Create: `src/assets/rotom/cobblemon/rotom_heat.geo.json`, `rotom_heat.png`, `rotom_heat_emissive.png` (downloaded with curl, unmodified)
- Modify: `src/assets/rotom/cobblemon/SOURCE.txt` (say Heat Rotom too, and add the `heat/` texture path)
- Modify: `src/scenes/Rotom.tsx`. Change `RotomForm` to `"base" | "wash" | "heat"`, add a `FORMS.heat` entry with light `#FF7A2A`, and change `ORDER` to `["base", "wash", "heat"]`.
- Test: `scripts/check.mjs`, bedrock block (around line 1142)

**Interfaces:**
- Produces: `RotomForm` includes `"heat"`.

- [ ] **Step 1: Extend the test.** In the bedrock block, change the loop to `for (const name of ["rotom", "rotom_wash", "rotom_heat"])`. Change the closing log to `"…, all three Rotoms whole and upright"`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL with ENOENT on `rotom_heat.geo.json`.
- [ ] **Step 3:** Download the three files to the paths above, then make the `Rotom.tsx` changes.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS. If the "body comes out lopsided" assertion fails because of the oven's door, say why in the test and loosen it only for that name.
- [ ] **Step 5: Look at it.**
  - Make a temporary preview page in `$TEMP` that renders `<Rotom form="heat" …/>`.
  - The oven must come out whole and face the camera, the same size as Wash.
  - Delete the preview page.
- [ ] **Step 6:** Commit: `Rotom: la forma Calore di Cobblemon`.

### Task 2: Third floor in storage, stops and floor switching

**Files:**
- Modify: `src/data/puzzle.ts`:
  - set `FLOORS = 3`;
  - update the `FLOOR_KEY` doc;
  - add `export const DEPTH_KEY = 'bomboniera.puzzle.profondita'` ("the deepest floor ever reached");
  - add `export function depthFrom(stored: string | null): number`, with the same rules as `floorFrom`.
- Modify: `src/lib/stages.ts`:
  - append `{ label: "terzo piano", key: FLOOR_KEY, solved: () => "2" }` after «sarcofago»;
  - add `DEPTH_KEY` to `WIPED`.
- Modify: `src/scenes/Puzzle.tsx` (around lines 1500–1548 and 1661–1688). Details are in Step 3.
- Test: `scripts/check.mjs`, stops block (around lines 1003–1011)

**Interfaces:**
- Produces:
  - `DEPTH_KEY` and `depthFrom` from `src/data/puzzle.ts`;
  - `arrival: { at: number; first: boolean; from: number }` in `Puzzle`;
  - Babel props `fromBelow: boolean`, `deep: boolean` and `onDown: (first: boolean) => void`. Task 4 uses them.
  - Engine's props: `{ reduced; onScene: (on: boolean) => void; onUp: () => void; arrivedAt: number; first: boolean }`.

- [ ] **Step 1: Update the tests.**

```js
assert.equal(puzzle.floorFrom(store.get(puzzle.FLOOR_KEY)), 2, "the last stop leaves the visitor in the machine room");
assert.equal(puzzle.floorFrom("2"), 2);
assert.equal(puzzle.depthFrom(null), 0);
assert.equal(puzzle.depthFrom("2"), 2);
for (const bad of ["", "x", "-1", "1.5", "3", "99"]) assert.equal(puzzle.depthFrom(bad), 0);
```

The key-coverage assertion already demands `DEPTH_KEY` on the stops or in `WIPED`. The `bad` list for `floorFrom` keeps using `String(puzzle.FLOORS)`.

- [ ] **Step 2:** Run `npm test`. Expected: FAIL on `floorFrom(...) 2` / `depthFrom is not a function`.
- [ ] **Step 3: Implement.**
  - **Data and stops.** Add the `puzzle.ts` and `stages.ts` pieces listed above.
  - **Depth in `Puzzle.tsx`.** Replace `descended` with `depth`. It starts at `max(depthFrom(DEPTH_KEY), FLOOR_KEY === null ? 0 : max(1, floor))`, where `floor` is the current floor read from `FLOOR_KEY`. Pass `descended={depth >= 1}` to `Island` unchanged.
  - **`goTo` on landing.** Store `DEPTH_KEY = max(depth, n)` and set `arrival = { at, first, from: floor }`.
  - **New handlers.** `toEngine = (first) => goTo(2, first)`. The handler going up from Engine is `goTo(1, false)`.
  - **Render by floor:**
    - `0`: Island;
    - `1`: Babel, with `fromBelow={arrival.from === 2}`, `deep={depth >= 2}` and `onDown={toEngine}`;
    - `2`: Engine.

    Engine is a stub until Task 3: just the canvas with background `#0B0705`, plus the ceiling tap that goes back up.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit: `Torre: il terzo piano nella memoria, nel debug e tra i piani`.

### Task 3: The machine room hall

**Files:**
- Modify: `src/scenes/Engine.tsx`, the stub from Task 2, made into the full hall.

**Interfaces:**
- Consumes: the Engine props from Task 2; `Rotom` with `form="heat"`, `from="wash"` and `move` (Task 5 adds `burn`); `CameraRig`, `useTap`, `moveMs`, `FLIGHT`, `View`. Use them as `Babel.tsx` does.

- [ ] **Step 1: Build the hall** on Babel's pattern.
  - **Same pattern as Babel:**
    - an orthographic `Canvas` with `fit={[7, 7]}`;
    - `HALL_R = 2.4` and `WALL_H = 1.9`;
    - the wall is a `BackSide` cylinder with a generated dark brick canvas texture.
  - **Furniture (spec section «La sala macchine»):**
    - 3 boilers against the wall. Each has a glowing firebox door (emissive `#FF6A1A`) and a flickering `pointLight` `#FF8A3A`, like `Brazier`.
    - Copper pipes (`#B8733A`, metalness 0.7) running along the wall and overhead. Use straight cylinders and torus elbows.
    - 2 large gears turning slowly. Each is a cylinder plus box teeth in a group, about 0.3 rad/s, with neighbours turning opposite ways.
    - Wall-mounted levers.
    - 3 gauges, each with a needle that jitters.
    - Steam puffs. Each is a few grey translucent spheres that rise, grow and fade, every 3–6 s, from 2 pipe ends.
  - **Ceiling.** The hole is at `HOLE_Y = 2.55`, with a rim and the pale shaft of light, as in Babel. It shows the dark of the coffin above.
  - **Open floor.** Keep the middle floor (r < 1.6) clear for the future puzzle.
  - **Static when `reduced`.** No gear turning, needle jitter or steam.
- [ ] **Step 2: Arrival and leaving.** Copy Babel's flow for `CEILING_VIEW → HALL_VIEW` and `scene`.
  - **Arrival.** Use `move = { at: arrivedAt, kind: "in", dir: "down", fast: !first }`.
  - **Long arrival.** When `first`, `scene` lasts `moveMs(false) + BURN_MS + FLIGHT*1000`. The camera stays on `CEILING_VIEW` through the burn and flies to `HALL_VIEW` only after it. Until Task 5 adds `BURN_MS`, use a local `4500`.
  - **Leaving.** A ceiling tap does `setScene(true)`, then `move = { kind: "out", dir: "up", fast: true }`, then `onUp` after `moveMs(true)*0.8`.
  - **Taps during a scene.** Ignore them on the ceiling and on Rotom.
- [ ] **Step 3: Look at it in the browser.**
  - Use the debug stop «terzo piano» at 1280×800 and at 390×800.
  - **Check the room:** it reads as a machine room, the middle is clear, the walls are not too dark, and turning and zooming work.
  - **Check the console:** no errors.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit: `Sala macchine: la sala del terzo piano`.

### Task 4: Babel ⇄ machine room through the sarcophagus

**Files:**
- Modify: `src/scenes/Babel.tsx`:
  - the `said` and `tapCoffin` handlers (around lines 451–460);
  - the arrival `move` and the view (around lines 359–375);
  - the `<Rotom>` element (around line 584);
  - the props.

**Interfaces:**
- Consumes: the Babel props `fromBelow`, `deep` and `onDown` from Task 2.

- [ ] **Step 1: The descent `dive(first: boolean)`.**
  - It does `setStack([])` and `setScene(true)`, sets Aside `x` to `0` so Rotom eases over the coffin, and sets the view to `SARC_VIEW`.
  - After about 900 ms it sets `move = { at: now, kind: "out", dir: "down", fast: !first }`. With `reduced`, skip the wait.
  - After `moveMs(!first)*0.8` more, it calls `onDown(first)`.
  - Keep the timers in `timers.current`.
- [ ] **Step 2: Wire the descent.**
  - `said()`: hide the bubble, then `dive(!deep)`. The line therefore flows straight into the descent.
  - `tapCoffin()`: when `openedAt === null`, it opens the slots as today. Otherwise `dive(!deep)`, but only when `!scene`. This covers a reload between the line and the descent.
- [ ] **Step 3: Arriving from below.**
  - The move is `dir: fromBelow ? "up" : "down"`, and the `<Rotom from=…>` is `fromBelow ? "heat" : "base"`.
  - When coming from below, start on `SARC_VIEW` instead of `CEILING_VIEW`.
  - The ordinary flash turns Heat back into Wash.
- [ ] **Step 4: Check in the browser.**
  - Use the debug stop «sarcofago», then put in the six titles.
  - The line flows into the descent and lands in the machine room.
  - Then tap the ceiling: back in Babel, Rotom rises by the coffin and flashes back into Wash.
  - Tap the coffin again: a quick trip down.
  - Reload on each floor: you land on the same floor with no animation.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6:** Commit: `Babele: si scende dal sarcofago alla sala macchine`.

### Task 5: Catching fire — the transformation

**Files:**
- Modify: `src/lib/descent.ts`. Add `BURN_MS` and `burn`.
- Modify: `src/scenes/Rotom.tsx`:
  - a new optional prop `burn?: boolean`;
  - flame and smoke meshes.
- Modify: `src/scenes/Engine.tsx`:
  - pass `burn={first}`;
  - replace the local `4500` with `BURN_MS`.
- Test: `scripts/check.mjs`, the dive block (around line 1175)

**Interfaces:**
- Produces:
  - `export const BURN_MS = 4500`;
  - `export function burn(ms: number): { heat: number; shake: number; flames: number; smoke: number; swapped: boolean }`. Here `ms` is the time since Rotom came to rest. Every number is 0..1 and `ms` is clamped to `[0, BURN_MS]`.

**Timeline:** this is the spec's story turned into numbers.

| Time (ms) | What happens |
|---|---|
| 0–1200 | `heat` and `shake` ramp up |
| 800–2400 | `flames` grow to 1 |
| 2200–2800 | `smoke` bursts to 1 |
| 2600 | `swapped` becomes true |
| 2800–4500 | `smoke` thins to 0 as it rises |

From 2600 on:
- `heat` falls;
- `flames` drop to a 0.25 residue, which fades to 0 by 4500;
- `shake` is 0.

- [ ] **Step 1: Write the failing test.**

```js
const { burn, BURN_MS } = await vite8.ssrLoadModule("/src/lib/descent.ts");
assert.deepEqual(burn(0), { heat: 0, shake: 0, flames: 0, smoke: 0, swapped: false }, "it starts as itself");
const end = burn(BURN_MS);
assert.deepEqual({ ...end, swapped: undefined }, { heat: 0, shake: 0, flames: 0, smoke: 0, swapped: undefined }, "nothing left burning");
assert.ok(end.swapped, "and it has changed");
const swap = [...Array(BURN_MS)].findIndex((_, ms) => burn(ms).swapped);
assert.ok(burn(swap).smoke >= 0.9, "the form changes only behind the smoke");
assert.ok(burn(1800).flames > 0.5 && burn(1800).heat > 0.5, "it is burning before the smoke");
assert.ok(BURN_MS >= 4000 && BURN_MS <= 5000, "the spec's four to five seconds");
assert.deepEqual(burn(-5), burn(0)); assert.deepEqual(burn(BURN_MS + 999), end);
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL, `burn is not a function`.
- [ ] **Step 3:** Implement `burn` from the timeline above, using piecewise smooth ramps.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Render the fire in `Rotom.tsx`.** It applies when `burn && move?.kind === "in" && !reduced`.
  - **Timing.** Suppress the travel flash. Run `burn(now - move.at - moveMs(move.fast))`. Show `from` until `swapped` becomes true, then `form`.
  - **Glow.** Tint the material's emissive towards `#FF3A10` by `heat`.
  - **Shake.** Jitter x by `shake * 0.03`.
  - **Flames.** Use about 6 additive cones in `#FF8A2A` / `#FFD25A` around the body, scaled by `flames` and flickering.
  - **Smoke.** Use about 8 grey (`#4A4A4A`) translucent spheres (`depthWrite false`). They swell around Rotom with `smoke` and drift up as it thins. Keep the cloud within about 1.5 world units of Rotom.
  - **Quick arrival into heat** (`!burn` with form `heat`): a smoke puff at `travel().flash * 0.6`.
  - No per-frame allocations, and no extra lights beyond one flickering orange `pointLight` while `flames > 0`.
- [ ] **Step 6: Check in the browser.** Record it with gif_creator or a screencast.
  - **First descent:** Wash lands, heats red and shakes, the flames grow, the smoke hides it, the smoke lifts, and Heat appears with a few small flames left. It reads as funny, not destructive.
  - **Quick trip:** a flash and a puff.
  - **Reduced motion** (emulate `prefers-reduced-motion`): it lands directly as Heat, with no smoke.
  - **Phone:** at 390 px the cloud stays inside the view.
- [ ] **Step 7:** Run `npm test && npm run typecheck && npm run build`. Expected: PASS. Delete any preview files.
- [ ] **Step 8:** Commit: `Sala macchine: Rotom prende fuoco e diventa Rotom Calore`.
