# Il pozzo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The fourth floor, themed on Animal Well. It is reached through the hole the press opens. It is a wider round hall whose four walls are 2D game screens. Each wall chains Animal Well puzzles with puzzles from the floors above, and each chain ends in a flame. The four flames light the altar. The community mural on the altar is assembled from the solutions of every earlier floor, and it opens a well towards a fifth floor that does not exist yet.

**Architecture:**
- **Pure rules.** Every wall's rules are a pure module in `src/lib/well/`, tested in `scripts/check.mjs` without a renderer, like `src/lib/pipes.ts`. The flute is `src/lib/flute.ts`.
- **The hall.** `src/scenes/Well.tsx` is the hall: the camera, the four walls, the altar, the 3D Rotom, the way up and the way down. It mirrors `src/scenes/Engine.tsx`. Each wall is a component in `src/scenes/well/`.
- **How a wall is drawn.**
  - Each wall paints a low-resolution 2D canvas (320×180 logical pixels, drawn with nearest-neighbour scaling) into a `CanvasTexture` on a wall panel.
  - A tap on the panel is turned into a pixel coordinate through the hit's `uv`. Each wall handles its own taps in pixel space.
  - Pixel Rotom is drawn on the canvas and only chases the last tap.
- **Shared state.** `Well.tsx` owns the five saved states (four walls and the altar), loads them from storage and passes them down. The UV lantern lives in wall 4's state and is read by the others.

**Tech Stack:** React 19, @react-three/fiber 9, drei 10, three 0.180, Canvas 2D, Web Audio, Vite. Tests are node:assert via `npm test` (`scripts/check.mjs`), plus `npm run typecheck` and `npm run build`.

**Spec:** `docs/superpowers/specs/2026-10-21-pozzo-animal-well-design.md`

## Global Constraints

- **Touch only.** There is no character to steer and no hidden player position. A part of a wall becomes tappable once it has been opened. The only things that walk are the puzzles' animals: the chinchilla, the porcupine and the turtles.
- **Rotom is cosmetic.**
  - Inside a wall he runs to every tap, like a point-and-click game.
  - A tap acts at once and never waits for Rotom to arrive.
  - His first line, entering the wall, is exactly: `«Rotom: così ti controllo meglio»`. It goes in `src/data/puzzle.ts` as `wallLine`.
  - Every other Rotom line is a placeholder in the `starLine` style, `'Rotom: TODO — …'`:
    - `wellLine`, on arrival;
    - `flameLine`, on the first flame;
    - `muralLine`, when the mural is complete.
- **Rotom's forms.** He is **Rotom Gelo** on this floor. In 3D he uses the Cobblemon `frost` model; inside the walls he is a pixel-art sprite in Animal Well's style.
  - He turns from Calore to Gelo coming down.
  - He turns back from Gelo to Calore going up.
- **No words and no numbers on the walls.** The single exception is the digits the visitor draws by joining the dots. The altar panel is not a wall: its pieces look as they did on their own floor.
- **The flute.** 8 notes, one per direction, in this order everywhere: `["u","ur","r","dr","d","dl","l","ul"]`.
  - It is played from a rose of eight arrows that is on screen while a wall is in front of the camera. The rose does not cover the playable part of the wall.
  - A note is long when held for at least `LONG_MS = 450` ms, the organ's threshold, imported from `src/lib/card.ts`.
- **The UV lantern** toggles on and off. While it is on, a violet circle about 28 logical px in radius around the finger reveals hidden marks. The dark room uses the same mask.
- **Original Animal Well material.** Sprites, tiles, music and effects, credited in the README like Isaac's track. Files go in `src/assets/animalwell/`. Until Salvo supplies them, every sprite falls back to a placeholder of the same size, and every sound falls back to a Web Audio blip. Nothing breaks without the files.
- **Floor rules from the earlier chapters.**
  - **Scene rule:** while a scene plays, `onScene(true)` and the controls are disabled.
  - **`reduced`:** Rotom jumps instead of running, and animations shorten.
  - **Phones:** at 390 px wide, every tappable thing is at least 44 CSS px when its wall is in front of the camera.
  - **Lights:** the number of lights stays constant: a light is turned down, never added or removed (see `Lamp` in `src/scenes/machines/hall.tsx`).
- **Language.** Copy is Italian. Code comments are English, in the repo's prose style. Commit messages are Italian.
- **The well at the end** stays open and does nothing when tapped. The fifth floor is out of scope.

## Review Focus

- **Undoing must be undone downstream.** A reload recomputes everything from saved state. A malformed key falls back to the untouched wall, and the flames and the altar follow.
  - Test: `loadX` of garbage returns the initial state, for every wall.
  - Test: an altar with a flame whose wall is not solved is not lit.
- **The rose must never steal a tap from the wall**, and a hold on the rose must never turn the camera. A note held past the end of the tap still ends on `pointerup` anywhere, as in `Organ.tsx`.
- **The UV circle follows the finger, and a tap is a tap.**
  - With the lantern on, the first touch both reveals and acts.
  - A pillar under the finger is stamped on that same tap, without a second one.
- **Audio unlock on iOS.** The first flute note creates or resumes the `AudioContext` inside the gesture.
- **Coming back up and down.** Floor state and Rotom's form survive the trip.
  - The press hole on floor 3 leads down only once the press is broken.
  - The floor-4 hole leads back up.

---

### Task 1: The floor itself, the way down and back, Rotom Gelo

**Files:**
- Modify: `src/data/puzzle.ts`.
  - Set `FLOORS = 4`.
  - Add the keys:
    - `WELL_TV_KEY = 'bomboniera.puzzle.pozzo.tv'`
    - `WELL_CROWS_KEY = '…pozzo.corvi'`
    - `WELL_BUDS_KEY = '…pozzo.boccioli'`
    - `WELL_PILLARS_KEY = '…pozzo.pilastri'`
    - `WELL_MURAL_KEY = '…pozzo.murale'`
  - Add the lines `wallLine`, `wellLine`, `flameLine`, `muralLine`.
- Modify: `src/lib/stages.ts`.
  - Add the stop `{ label: "quarto piano", key: FLOOR_KEY, solved: () => "3" }` after «pressa».
  - Put the five new keys in `WIPED` until their tasks move them onto a stop.
- Modify: `src/scenes/Puzzle.tsx`.
  - Add `toWell = goTo(3, first)` and `upToEngine = goTo(2, false)`.
  - Render `floor === 3` as `<Well … />`.
- Modify: `src/scenes/Engine.tsx`. Once `broken`, the press hole is tappable and runs a descent: Rotom drops into it, then `onDown(first)`. New prop `onDown: (first: boolean) => void`.
- Modify: `src/scenes/Rotom.tsx`. Add the `"frost"` form.
- Create: `src/assets/rotom/cobblemon/rotom_frost.geo.json`, `rotom_frost.png`, `rotom_frost_emissive.png`. Take them from the same Cobblemon repository and licence as the others (MPL-2.0, credit already in the README).
- Create: `src/scenes/Well.tsx`, the hall.
  - `HALL_R = 3.4`, wider than the machine room's 2.4. Wall height as in the machine room.
  - Dark floor, cold white light coming down from the hole above, the altar in the middle.
  - Four wall angles `WALL_ANGLES: Record<WallId, number>`.
  - A `focus: WallId | "altar" | null` with `facing(...)`-style views. Reuse `facing` and `onWall` from `src/scenes/machines/hall.tsx`, parameterised by radius. Change their signature to take `r = HALL_R`.
- Test: `scripts/check.mjs`. The stops block demands every `*_KEY` on a stop or in `WIPED`. It also checks `floorFrom("3") === 3` and `floorFrom("4") === 0`.

**Interfaces:**
- Produces `type WallId = "tv" | "corvi" | "boccioli" | "pilastri"`, exported from `src/scenes/well/wall.ts`, together with `WALL_ANGLES`.
- Produces `Well` props: `{ reduced, onScene, onUp, arrivedAt, first }`, the same as `Engine`.
- Produces `RotomForm = "base" | "wash" | "heat" | "frost"`.

- [ ] **Step 1: Failing tests.**
  - `floorFrom`, as above.
  - Every key covered by a stop or `WIPED`.
  - `STAGES` has «quarto piano» right after «pressa».
- [ ] **Step 2:** Run `npm test`. Expected: FAIL on the new asserts.
- [ ] **Step 3: Implement the keys, the stop and the routing.**
- [ ] **Step 4: The frost form, and the change on arrival.** On arrival from above, Rotom drops through the hole as Calore, flashes as he does on the other floors (`from="heat"`, `form="frost"`), and the `wellLine` scene plays. The first time is the long way; afterwards it is quick, as on the other floors. Going up runs the reverse: `from="frost"`, back into Calore on the floor above. `Engine` then needs `fromBelow`, the way `Babel` has it.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it.** From the «pressa» stop, tap the hole, land, then go back up. Check at 1280×800 and at 390×800.
- [ ] **Step 7:** Commit: `Il pozzo: il quarto piano, la discesa e Rotom Gelo`.

### Task 2: A wall that is a screen, pixel Rotom, darkness and UV

**Files:**
- Create: `src/scenes/well/Screen.tsx`. A wall panel showing a 320×180 canvas.
- Create: `src/lib/well/pixels.ts`. Pure helpers.
- Create: `src/lib/well/sprites.ts`. The atlas.
- Create: `src/assets/animalwell/README.md`, the list of files Salvo has to supply (below).
- Test: `scripts/check.mjs`, «pozzo: schermo» block.

**Interfaces:**
- Produces in `pixels.ts`:
  - `W = 320`, `H = 180`;
  - `toPixel(uv: {x:number;y:number}): [number, number]`, which flips y: canvas y grows downwards, uv y upwards;
  - `chase(at: [number,number], to: [number,number], dt: number, speed = 140): [number,number]`, which moves at most `speed*dt` and never overshoots;
  - `inCircle(p, centre, r): boolean`;
  - `type Rect = { x:number; y:number; w:number; h:number }` and `hit(p, rect): boolean`.
- Produces in `sprites.ts`:
  - `type SpriteId` with at least `rotomFrost`, `chinchilla`, `chest`, `porcupine`, `crow`, `turtle`, `bud`, `ghost`, `candle`, `phone`, `tv`, `face`, `flame`, `blockPink`, `blockBlue`, `switchYellow`, `switchGreen`, `switchPink`, `tile`;
  - `SPRITES: Record<SpriteId, { file: string; w: number; h: number; frames: number }>`;
  - `drawSprite(ctx, id, x, y, frame = 0, flip = false)`. It draws the image once it is loaded, and before that a placeholder rectangle of the sprite's size in its key colour.
- Produces `<Screen>` props:
  - `{ a: number; paint: (ctx: CanvasRenderingContext2D, t: number) => void; onTap: (p: [number,number]) => void; active: boolean; dark?: boolean; uv?: boolean }`.
  - The screen also exports `finger: { current: [number,number] | null }`, which the darkness/UV mask is cut around.
- Pixel Rotom: `<Screen>` keeps `rotom: [number,number]` and runs it with `chase` to every tap. Under `reduced` it jumps straight there. It draws `rotomFrost` last, under the mask.

- [ ] **Step 1: Failing tests.**
  - `toPixel({x:0,y:1})` is `[0,0]`, and `toPixel({x:1,y:0})` is `[319,179]`.
  - `chase` reaches the target in finite steps and never overshoots.
  - `inCircle` and `hit` on their edges.
  - Every `SPRITES` entry has positive sizes, and its file sits under `src/assets/animalwell/`. The file need not exist yet.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `pixels.ts` and `sprites.ts`.**
- [ ] **Step 4: Implement `<Screen>`.**
  - A plane on the wall at angle `a`, slightly curved or flat as long as it reads.
  - `CanvasTexture` with `NearestFilter`, repainted in `useFrame`.
  - `onPointerDown` → `toPixel(e.uv)` → `onTap`, through `useTap`, so a drag of the camera is not a tap.
  - `dark`: everything outside a soft circle around `finger` is black.
  - `uv`: inside the circle, a violet tint, and `paint` gets a flag to draw the hidden marks there. Pass `uvAt: (p) => boolean` to the wall painters, so each wall draws its hidden marks only where `uvAt` is true.
- [ ] **Step 5: Enter the wall.** The first time the camera reaches a wall, 3D Rotom flies into it, the `wallLine` scene plays, and from then on he is pixel Rotom on whichever wall is in front of the camera. In front of the altar he is 3D again.
- [ ] **Step 6: The asset list.** Write `src/assets/animalwell/README.md`, the files Salvo needs:
  - each sprite sheet by `SpriteId`;
  - the tile sheet;
  - background music: one track;
  - sounds: flute notes ×8, switch, chest, firecracker, crow, phone busy and ringing, flame, mural piece.
- [ ] **Step 7:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 8: Look at it.** A test wall with placeholder sprites. Rotom chases the taps, and darkness and UV follow the finger. Check on desktop and at 390 px.
- [ ] **Step 9:** Commit: `Il pozzo: le pareti-schermo, Rotom in pixel art, buio e luce UV`.

### Task 3: The flute

**Files:**
- Create: `src/lib/flute.ts`. Notes and matching.
- Create: `src/lib/fluteVoice.ts`. The sound: the original samples when present, a Web Audio voice otherwise. Model it on `organOn` in `src/lib/organ.ts`.
- Create: `src/components/FluteRose.tsx`. Eight arrows round a centre, press-and-hold.
- Test: `scripts/check.mjs`, «flauto» block.

**Interfaces:**
- Produces in `flute.ts`:
  - `DIRS = ["u","ur","r","dr","d","dl","l","ul"] as const`;
  - `type Note = 0|1|2|3|4|5|6|7`;
  - `type Played = { note: Note; long: boolean }`;
  - `played(note: Note, heldMs: number): Played`, which uses `LONG_MS`;
  - `follow(tune: readonly Played[], done: number, p: Played, strict = true): number`. It returns the new count of notes matched in a row. A wrong note returns 1 if `p` is the tune's first note, otherwise 0. With `strict = false`, length is ignored.
- Produces `fluteVoice()`, like `organ()`: `{ start(note): Voice; puff(): void }`.
- Produces `<FluteRose onNote={(p: Played) => void} disabled />`. It sits at the screen edge opposite the playable area. It uses pointer capture and ends on `pointerup` anywhere.

- [ ] **Step 1: Failing tests.**
  - `played(n, 449).long === false` and `played(n, 450).long === true`.
  - Following a whole tune reaches `tune.length`.
  - A wrong note in the middle resets to 0, or to 1 when it is the tune's first note.
  - `strict = false` accepts a long note where a short one was asked.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `flute.ts`, `fluteVoice.ts` and `FluteRose`.** Each Well wall passes its notes to its own rules.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Play it** on a phone-sized viewport. Holding an arrow sounds until release, even when the finger slides off.
- [ ] **Step 6:** Commit: `Il pozzo: il flauto a otto note`.

### Task 4: Wall 4 — the dark room, the UV lantern, the pillars, the dots and the phone

The UV lantern unlocks the other walls, so this wall comes first.

**Files:**
- Create: `src/lib/well/pillars.ts`
- Create: `src/scenes/well/WallPillars.tsx`
- Modify: `src/scenes/Well.tsx`. The other three walls draw their pillar too, through `PILLARS[k].wall`.
- Modify: `src/lib/stages.ts`. Add the stops «luce uv» and «pilastri».
- Test: `scripts/check.mjs`, «pozzo: pilastri» block.

**Interfaces:**
- Produces:
  - `type PillarsState = { switches: [boolean,boolean,boolean]; uv: boolean; stamped: boolean[]; joined: boolean[]; dialled: number[]; flame: boolean }`. Each of `stamped` and `joined` has 7 entries.
  - `NUMBER = [9,0,1,7,4,3,2] as const`.
  - `PILLARS: { wall: WallId; x: number; y: number }[]`, seven of them, listed **clockwise from the arrival point**. Test it: their wall angles, followed clockwise, are non-decreasing in that order.
  - `DIGIT_DOTS: Record<number, [number,number][]>`. For each digit, its dots in stroke order, on a 3×5 grid.
  - `joins(digit: number, path: number[]): boolean`. The path is dot indices visited in one drag. It is true when the path is the stroke order, forwards or backwards.
  - `dial(state, d): { state; busy: boolean }`. A wrong digit empties `dialled` and returns `busy`. The seventh right digit sets `flame`.
  - `ghostsScared(at: number, now: number): boolean`. A firecracker clears the ghosts for 4000 ms.
  - `loadPillars`, `solvedUv()` (switches and UV only), `solvedPillars()`.
- **The dark room:**
  - Three yellow switches, two ghosts that block taps on the switch they hover over, three candles lit by tapping them.
  - A pile of firecrackers: a tap throws one and scares the ghosts.
  - All three switches pressed open the chest with the UV lantern, which sets `uv`.
  - The darkness comes from `<Screen dark>`.
- **The pillars:**
  - The marks show only inside the UV circle.
  - Tapping a pillar with UV on sets `stamped[k]` and puts its dot group on the map, at its own place on the floor plan.
- **The map:** a drawing of the hall from above, with the four walls and the arrival point. The visitor drags through the dots of each group, and when `joins` is true the digit's strokes stay drawn.
- **The phone:** a rotary dial. Each digit is dialled by dragging from its hole to the stop. Wrong digits give the busy tone.

- [ ] **Step 1: Failing tests.**
  - The digits of `NUMBER`, read off `PILLARS` in clockwise order, are 9017432.
  - Every digit 0–9 has dots, and no two digits share the same set of dots.
  - `joins` accepts forwards and backwards, and rejects a skipped dot.
  - `dial` of `NUMBER` sets `flame`, and one wrong digit resets it.
  - `loadPillars("x")` is the initial state.
  - The `solvedPillars()` stop has the flame.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `pillars.ts`.**
- [ ] **Step 4: Implement `WallPillars`.**
- [ ] **Step 5: The flame.** The flame flies to the altar's candle for this wall. The first flame of the floor plays the `flameLine` scene.
- [ ] **Step 6:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 7: Look at it.** Play it through from «quarto piano». The digits must read clearly at 390 px.
- [ ] **Step 8:** Commit: `Il pozzo: la stanza buia, la luce UV, i pilastri e il telefono`.

### Task 5: Wall 1 — the chinchilla, the remote, the blocks and the TV

**Files:**
- Create: `src/lib/well/tv.ts`
- Create: `src/scenes/well/WallTv.tsx`
- Modify: `src/lib/stages.ts`. Add the stop «tv».
- Test: `scripts/check.mjs`, «pozzo: tv» block.

**Interfaces:**
- Produces:
  - `type TvState = { chest: boolean; remote: boolean; sofa: boolean; tv: boolean; flame: boolean }`.
  - `type Walker = { x: number; y: number; falling: boolean }`.
  - **The chest room.** `CHEST_X`, a green switch, a green ledge. `dropChest(chinX)` is true when the chinchilla stands under the chest within ±6 px.
  - **The block room:**
    - `BLOCKS: { x: number; y: number; w: number; pink: boolean }[]`;
    - `solid(block, swapped: boolean): boolean`;
    - `walk(w: Walker, target: number, swapped: boolean, dt: number): Walker`. The chinchilla walks towards `target` at 40 px/s, falls where no solid block is under it, and is back at the room's start after a fall.
    - `SOFA_X`.
  - `TV_TUNE: readonly Played[]`, 8 notes. The ghost faces' gazes on the TV are its directions, and a long note is a face with open mouth. The gazes show only under UV.
  - `loadTv`, `solvedTv()`.

- [ ] **Step 1: Failing tests.**
  - Simulating `walk` at 60 fps towards `SOFA_X` with `swapped` never changing falls, for both values of `swapped`.
  - A swap schedule exists that reaches the sofa. Find it by brute force over swap times on a 100 ms grid, and assert that at least one schedule works.
  - `follow(TV_TUNE, …)` over the whole tune is 8.
  - `loadTv` of garbage is the initial state.
  - The `solvedTv()` stop has the flame.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `tv.ts`.**
- [ ] **Step 4: Implement `WallTv`.**
  - The chinchilla walks towards the last tap.
  - The green switch drops the chest when `dropChest` holds, and the chest opens to the remote.
  - A remote button on the wall swaps the blocks.
  - Sofa reached: the TV is tappable.
  - The remote turns the TV on, and the faces show under UV.
  - Playing `TV_TUNE` on the rose gives the flame.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it** on desktop and at 390 px.
- [ ] **Step 7:** Commit: `Il pozzo: il cincillà, il telecomando e la televisione`.

### Task 6: Wall 2 — the porcupine and the eight crows

**Files:**
- Create: `src/lib/well/crows.ts`
- Create: `src/scenes/well/WallCrows.tsx`
- Modify: `src/lib/stages.ts`. Add the stop «corvi».
- Test: `scripts/check.mjs`, «pozzo: corvi» block.

**Interfaces:**
- Produces:
  - **The porcupine box:**
    - `BOX`, a small grid of floor cells and walls;
    - `type Porc = { x: number; y: number; dir: 1 | -1 }`;
    - `stepPorc(p, barrierUp: boolean): Porc`. It moves one cell, turns on a wall or a raised barrier, and drops through gaps;
    - `YELLOW: [number,number][]`, three cells;
    - `boxDone(visited: Set<string>): boolean`.
  - **The crows:** `CROWS: Note[]`. The eight crows on the square, each is the direction of its place from the centre.
  - `CROW_TUNE: readonly Played[]`, length 8. The crows caw it in this order, each caw short or long, the long ones a drawn-out caw.
  - `type CrowsState = { box: boolean; heard: boolean; flame: boolean }`.
  - `loadCrows`, `solvedCrows()`.

- [ ] **Step 1: Failing tests.**
  - With the barrier never toggled, the porcupine never visits all three yellow cells within 500 steps.
  - A toggle schedule reaching all three exists. Use a BFS over (porcupine, barrier) states.
  - `CROW_TUNE` uses at least 6 different crows and at least 2 long notes.
  - `follow` with strict length: the right order with one wrong length fails.
  - `loadCrows` of garbage is the initial state.
  - The `solvedCrows()` stop has the flame.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `crows.ts`.**
- [ ] **Step 4: Implement `WallCrows`.**
  - The porcupine steps every 300 ms, and a pink switch toggles the barrier. Box done: the door to the crows opens.
  - Tapping the perch replays the crows. Each crow bobs as it caws.
  - On the rose, a wrong note makes the crows scatter, settle and caw from the start.
  - Right: the secret room opens with the flame.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it** on desktop and at 390 px.
- [ ] **Step 7:** Commit: `Il pozzo: il porcospino e gli otto corvi`.

### Task 7: Wall 3 — the turtles and the bud mural

**Files:**
- Create: `src/lib/well/buds.ts`
- Create: `src/scenes/well/WallBuds.tsx`
- Modify: `src/lib/stages.ts`. Add the stop «boccioli».
- Test: `scripts/check.mjs`, «pozzo: boccioli» block.

**Interfaces:**
- Consumes `bounce(dir, mirror)` and `Dir`, `Mirror` from `src/lib/beam.ts`.
- Consumes `organ().start(note)` from `src/lib/organ.ts`. The four buds sound four of the organ's six whistles.
- Produces:
  - `TURTLE_TUNE: readonly Played[]`, 4 notes, painted by the water and visible under UV. Played on the rose, it raises the turtles.
  - **The mural:**
    - a small grid `MURAL: { size: [number,number]; source: { cell: [number,number]; dir: Dir }; mirrors: { cell: [number,number]; m: Mirror; hidden: boolean }[]; buds: { cell: [number,number]; whistle: number }[] }`;
    - `traceMural(): [number,number][]`, the cells the beam crosses;
    - `budOrder(): number[]`, the indices of `buds` in the order the beam reaches them;
    - `BUD_TUNE`, derived: `budOrder()` mapped to the buds.
  - `type BudsState = { turtles: boolean; played: number; flame: boolean }`.
  - `loadBuds`, `solvedBuds()`.

- [ ] **Step 1: Failing tests.**
  - `budOrder()` is a permutation of `[0,1,2,3]` and not `[0,1,2,3]`, so reading left to right is wrong.
  - At least two mirrors are `hidden`, and every hidden mirror lies on the traced path, so UV is needed.
  - The beam leaves the grid after the last bud.
  - `follow(TURTLE_TUNE, …)` over the whole tune is 4.
  - `loadBuds` of garbage is the initial state.
  - The `solvedBuds()` stop has the flame.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `buds.ts`.**
- [ ] **Step 4: Implement `WallBuds`.**
  - The water room. Playing `TURTLE_TUNE` raises the turtles, and the far side becomes tappable.
  - The mural shows the beam and the visible mirrors; the hidden mirrors show only under UV.
  - Tapping a bud sounds its whistle. Four in `budOrder()` open the mural on the flame; a wrong one gives `organ().puff()` and starts over.
- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Look at it** on desktop and at 390 px.
- [ ] **Step 7:** Commit: `Il pozzo: le tartarughe e il murale dei boccioli`.

### Task 8: The altar, the community mural and the well

**Files:**
- Create: `src/lib/well/mural.ts`
- Create: `src/scenes/well/Altar.tsx`, the 3D altar with four candles and the panel as a drei `<Html transform>`.
- Create: `src/components/Mural.tsx`, the panel, with drag-and-drop of pieces into slots. It swallows pointer events like `Lock.tsx`.
- Modify: `src/scenes/Well.tsx`. Add the finale.
- Modify: `src/lib/stages.ts`. Add the stop «murale».
- Test: `scripts/check.mjs`, «pozzo: murale» block.

**Interfaces:**
- Produces:
  - `type PieceId = "lost" | "occhio" | "stella" | "codice" | "nastro" | "babele" | "scheda" | decoys`. The decoys are at least four, for example the silhouettes of Samus, Cuphead and Hollow Knight from the Sagome carousel, and the wrong code 47175.
  - `SLOTS: PieceId[]`. The solution, top to bottom, in the order the puzzles come in `STAGES`:
    `["lost", "occhio", "stella", "codice", "nastro", "babele", "scheda"]`.
  - `type MuralState = { placed: (PieceId | null)[]; done: boolean }`.
  - `place(state, slot, piece): MuralState`. A piece already elsewhere moves; `done` when `placed` equals `SLOTS`.
  - `lit(flames: { tv; corvi; boccioli; pilastri }): boolean`, true only when all four flames are set.
  - `loadMural`, `solvedMural()`.
- **The art of each piece.** Each piece is drawn from its own floor's data, not from a picture of it:
  - the eye from `FLOORS` in `src/lib/beam.ts`;
  - The Lost from the maze's letter;
  - 47157 on lock wheels;
  - the tape's line from `src/lib/tape.ts`;
  - a Babel phrase in its own script, from `PHRASES` in `src/data/babel.ts`;
  - the punched card from `src/lib/card.ts`;
  - the star of the eight study objects from `SPOTS` in `src/data/room.ts`.
- **The panel's slots** stack top to bottom like the floors of the tower.

- [ ] **Step 1: Failing tests.**
  - `SLOTS` follows the `STAGES` order, so a test indexes each piece's source stop and checks the indices rise.
  - `place` moves rather than duplicates.
  - `done` only on the exact order.
  - `lit` false with any flame missing.
  - `loadMural` of garbage is the initial state.
  - The `solvedMural()` stop has `done`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `mural.ts`.**
- [ ] **Step 4: Implement `Altar` and `Mural`.** Each wall's flame lights its candle. The panel opens only when `lit`.
- [ ] **Step 5: The finale.**
  - With `done`, the `muralLine` scene plays.
  - The floor under the altar opens into the well, with a light from below, a constant light turned up.
  - Rotom leaves the wall in 3D and drops in up to the rim. He comes back up, since the floor below does not exist.
  - The well stays open, and tapping it does nothing.
  - Under `reduced`, the well is simply open.
- [ ] **Step 6:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 7: Look at it.** From the «boccioli» stop with every flame set, assemble the mural on desktop and at 390 px.
- [ ] **Step 8:** Commit: `Il pozzo: l'altare, il murale della community e il pozzo`.

### Task 9: The original material, credits, the no-text guard

**Files:**
- Modify: `README.md`. Add an «Animal Well» section to the music and asset credits: Billy Basso, Shared Memory, Bigmode, *Animal Well* (2024); what is used and where it lives.
- Modify: `scripts/check.mjs`. Two checks:
  - the README credit is present while `src/assets/animalwell/` has any file other than its `README.md`, as the Cobblemon check does;
  - **the no-text guard.** The wall painters in `src/scenes/well/Wall*.tsx` contain no `fillText` or `strokeText`, and no JSX text, the way the machines' guard works.
- Modify: `src/scenes/well/*` and `src/lib/fluteVoice.ts`. Load whichever original files are present.
- Modify: `src/scenes/Well.tsx`. Background music starts on the first tap on the floor, and fades out going up.

- [ ] **Step 1: Failing tests.** The credit check and the no-text guard, as above.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL until the README section exists.
- [ ] **Step 3: Wire the originals Salvo supplied.** Sprites by `SpriteId`, sounds, music. The placeholders stay for anything missing.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build`. Expected: PASS. Note the size of `dist/assets` for the report.
- [ ] **Step 5: Last look.** Play the whole floor from «quarto piano» to the well on desktop and at 390 px, with `prefers-reduced-motion` on and off. Check that the console is clean and that nothing stutters when turning to a new wall.
- [ ] **Step 6:** Commit: `Il pozzo: il materiale di Animal Well e i crediti`.
