# Le lingue di Babele Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The second floor's puzzle: six invented alphabets learned from wordless chats, six wall phrases to translate, then a sarcophagus that wants the six titles.

**Architecture:** Pure logic in two modules: `src/lib/scripts.ts` (alphabets, encoding, answer matching) and `src/data/babel.ts` (phrases, chats in Italian, unlock rules, titles). These are checked by `scripts/check.mjs`. UI goes in new components:
- `Glyphs`: text drawn in an alphabet, with the hieroglyphs as SVG paths shared with the canvas;
- `Folk`: the SVG figures and their CSS scenes;
- `Chats`: the terminal;
- `Plaque`: the translation window;
- `Sarcophagus`: the six slots.

They are wired into `src/scenes/Babel.tsx`, which now renders its own windows next to its canvas.

**Tech Stack:** React 19, @react-three/fiber 9, drei 10, three 0.180, Vite, node:assert tests via `npm test`.

**Spec:** `docs/superpowers/specs/2026-10-17-lingue-di-babele-design.md`

## Global Constraints

- Alphabet order: `a b c d e f g h i l m n o p q r s t u v z` (21 letters).
- The six symbol strings, verbatim from the spec. In Blocchi the `r` is `▤`, never `-`.
- Accents fold to the base letter. Kept as-is when encoding: spaces, `, . … ? !` and `'`/`’`.
- j k w x y never appear in phrases or chats.
- Answer matching uses letters only: `bare(s) = fold accents → lowercase → strip everything not in a–z`.
- Phrase to alphabet to title mapping: the spec's table, verbatim.
- Visible copy is in Italian. Code comments follow the repo's English prose style.
- Scene rule: during a scene, windows hide (CSS `.stage.is-scene .win`) and OrbitControls stay `enabled={!flying && !scene}`.
- Storage keys:
  - `bomboniera.puzzle.lingue`: JSON array of solved phrase indexes;
  - `bomboniera.puzzle.sarcofago`: JSON array of 6 strings;
  - `bomboniera.puzzle.chat`: JSON array of opened chat ids.
- Rotom's sarcophagus line: `'Rotom: TODO — la battuta del sarcofago.'`.

## Review Focus

1. A phrase solved out of order (a lucky guess at phrase 3 first) must not unlock phases it shouldn't. A phase unlocks only when its own phrase is solved.
2. The same title typed into two slots counts once. Six slots holding five distinct titles must not open the lid.
3. Corrupt or missing storage under any of the three new keys falls back to "nothing solved", never a crash. Same pattern as `floorFrom`.
4. Windows on floor 2 must show while `is-below` is set, and must still hide during a scene.
5. A reload after the lid is open finds the sarcophagus up and open, with no replayed scene or line.

---

### Task 1: Alphabets and encoding

**Files:**
- Create: `src/lib/scripts.ts`
- Test: `scripts/check.mjs` (new block «the alphabets»)

**Interfaces:**
- Produces:
  - `type Script = "egizi" | "stelle" | "blocchi" | "tubi" | "onde" | "esagrammi"`
  - `LETTERS: string` = `"abcdefghilmnopqrstuvz"`
  - `ALPHABETS: Record<Exclude<Script,"egizi">, string[]>`: 21 symbols each
  - `type Token = { letter: number } | { text: string }`: letter index 0–20, or punctuation/space passed through
  - `fold(s: string): string`: lowercase, accents stripped
  - `tokens(s: string): Token[]`: throws on j/k/w/x/y or any other character not allowed
  - `bare(s: string): string`
  - `glyph(script: Exclude<Script,"egizi">, letter: number): string`

- [ ] **Step 1: Write the failing test.** Assert all of the following:
  - every alphabet has 21 distinct symbols;
  - no symbol is shared between alphabets;
  - no symbol is in `" ,.…?!'’-"`;
  - `ALPHABETS.blocchi[14] === "▤"`;
  - `tokens("Così!")` deep-equals `[{letter:2},{letter:12},{letter:16},{letter:8},{text:"!"}]`;
  - `tokens("k")` throws;
  - `bare("L'umanità è")` equals `"lumanitae"`;
  - `glyph("stelle", 0)` equals `"✳"`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement. Use `normalize("NFD").replace(/\p{M}/gu, "")` for `fold`. Use `[...string]` to split the symbol strings: the hexagrams are BMP, but this keeps it safe.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS, with `ok — the alphabets` printed.
- [ ] **Step 5:** Commit with message `Babele: i sei alfabeti`.

### Task 2: Phrases, chats, unlocking, titles

**Files:**
- Create: `src/data/babel.ts`
- Modify: `src/data/puzzle.ts`. Add `LANG_KEY`, `TITLES_KEY`, `CHAT_KEY` and `sarcLine`. Add `langFrom(stored: string | null): number[]`, in the same style as `floorFrom`: valid, distinct indexes 0–5, otherwise `[]`.
- Test: `scripts/check.mjs` (block «the languages»)

**Interfaces:**
- Consumes: Task 1 `Script`, `tokens`, `bare`, `fold`.
- Produces:
  - `PHRASES: { script: Script; text: string; titles: string[] }[]`: 6 entries in the spec's order. `titles` holds the accepted variants listed in the spec.
  - `type SceneKind`: union of the scene names used by the chats. Names are the writer's choice, from the spec's list.
  - `CHATS: { id: string; phase: number; who: [Script, Script]; scene: SceneKind; lines: { by: 0 | 1; text: string }[] }[]`
  - `unlockedChats(solved: number[]): typeof CHATS`: phase 0, plus phase k for each solved phrase index k−1. So phase k is gated on phrase k−1 (zero-based).
  - `acceptsPhrase(i: number, typed: string): boolean`
  - `titleOf(typed: string): number | null`: which phrase's title this is, by `bare` against every variant
  - `titlesDone(slots: string[]): boolean`: six distinct phrase indexes
  - `langFrom` (in puzzle.ts)

- [ ] **Step 1: Write the failing tests.**
  - `PHRASES` has 6 entries with scripts in order egizi, stelle, blocchi, tubi, onde, esagrammi, and its texts are the spec's verbatim. `tokens()` succeeds on each.
  - `acceptsPhrase(0, "perche sente sempre la MUSICA")` and `acceptsPhrase(4, "l umanita e nata sulla terra non e mai stato destinato a morire qui")` are true. `acceptsPhrase(0, "perche sente")` is false.
  - `titleOf("L'attacco dei giganti") === 2`, `titleOf("ocarina of time") === 5`, `titleOf("baby driver") === 0`, `titleOf("halo") === null`.
  - `titlesDone` is false for five distinct titles plus one duplicate, and true for six distinct ones in shuffled order.
  - `unlockedChats([])` has phase 0 only. `unlockedChats([2])` adds phase 3 only.
  - `langFrom` gives `[]` for `null`, `"x"`, `"[7]"` and `"[1,1]"`, and `[0,2]` for `"[0,2]"`.
  - **Coverage:** for each phrase i, take the chats with `phase <= i`. For each letter of `PHRASES[i].text`, there are ≥2 distinct words containing it, said by a speaker whose script is `PHRASES[i].script`. Assert with a message naming the phrase and the letter.
  - **Rosetta:** every chat with `who[0] !== who[1]` has a word (after `bare`) said by both speakers.
  - Every chat line passes `tokens()`.
  - No chat contains `bare(PHRASES[i].text)` as a substring of the `bare` of its joined text.
  - Chat ids are unique.
  - The phases match the spec table: phase 0 is 3 egizi–egizi chats; each phase k≥1 has ≥2 same-script chats in `PHRASES[k].script`, plus mixed chats pairing that script with an earlier one.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the logic. Then write the chats in Italian, around 23 of them with 4–8 short lines each, on the spec's topics. Iterate against the coverage test until it passes. Keep the lines simple and repetitive: each chat is about its scene, and keywords repeat.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit with message `Babele: frasi, chat e titoli`.

### Task 3: Glyphs (with the hieroglyphs)

**Files:**
- Create: `src/lib/hieroglyphs.ts`: 21 entries of SVG path data on a 24×32 viewBox, in the spec's order (a alzare … z zappare; h is the reed shelter, q is the slope). Every one is a human figure in profile except h and q.
- Create: `src/components/Glyphs.tsx`
- Test: `scripts/check.mjs`

**Interfaces:**
- Consumes: Task 1 `tokens`, `glyph`, `Script`.
- Produces:
  - `HIEROGLYPHS: string[]` (21 path strings)
  - `<Glyphs script text size? />`: inline, wraps on spaces only. Egizi glyphs are drawn as `<svg><path d=…/></svg>`, the rest as text.
  - `drawGlyphs(ctx: CanvasRenderingContext2D, script, text, x, y, size, maxWidth): void`: draws on a canvas and wraps lines. Egizi glyphs use `new Path2D(d)`, scaled.

- [ ] **Step 1: Write the failing test.** `HIEROGLYPHS.length === 21`, every entry is a non-empty string matching `/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/`, and all entries are distinct.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Draw the hieroglyphs as filled silhouettes that stay readable at 20px.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS. Then run `npm run dev`, render a test string in each script, and look at it in the browser.
- [ ] **Step 5:** Commit with message `Babele: i geroglifici e la scrittura`.

### Task 4: The folk and their scenes

**Files:**
- Create: `src/components/Folk.tsx`
- Modify: `src/styles/global.css` (keyframes, under a `/* babel folk */` heading)

**Interfaces:**
- Consumes: Task 2 `SceneKind`, Task 1 `Script`.
- Produces: `<Folk who={[Script, Script]} scene={SceneKind} reduced />`. A 240×120 SVG with two figures facing each other on a shared skeleton (head, torso, two arms, two legs as `<g>` with transform-origin at the joints). The scene props are drawn per scene. With `reduced`, the figures show the scene's key pose, still.

The look of each people is in the spec. Each `SceneKind` is a CSS class on the root that animates the limb groups. Every `SceneKind` in the union needs a rule.

- [ ] **Step 1: Write the failing test.** A source check: every member of the `SceneKind` union in `src/data/babel.ts` has a `.folk--<name>` rule in `global.css`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`. Then check in the browser that every scene reads without text.
- [ ] **Step 5:** Commit with message `Babele: i sei popoli e le loro scene`.

### Task 5: The chat terminal

**Files:**
- Create: `src/components/Chats.tsx`

**Interfaces:**
- Consumes: `unlockedChats`, `CHATS`, `Folk`, `Glyphs`, `CHAT_KEY`.
- Produces: `<Chats solved={number[]} reduced />`.
  - **List view:** a row per unlocked chat with two small figure heads, and «nuova» if the id is not in `CHAT_KEY`.
  - **Chat view:** `Folk` on top. Lines appear one at a time (`reduced` shows them all at once), left or right by `by`, written in the speaker's script. There is a «↻» button to replay and «←» to go back.
  - Opening a chat adds its id to `CHAT_KEY`, inside try/catch.
  - The look follows `Hack.tsx`'s terminal (dark, monospace chrome).

- [ ] **Step 1:** Implement. This is UI only: the gating logic was tested in Task 2.
- [ ] **Step 2:** Run `npm run typecheck`, then check in the browser.
- [ ] **Step 3:** Commit with message `Babele: il terminale delle chat`.

### Task 6: The hall: plaques, column, translation

**Files:**
- Create: `src/scenes/Keeper.tsx`. Move `Keeper` and `CHAR_MS` out of `Puzzle.tsx` unchanged, and import them back in Puzzle.
- Create: `src/components/Plaque.tsx`: the translation window body. It shows the phrase large in `Glyphs` and an input with «Traduci».
  - A wrong answer adds a shake class and clears the field.
  - A right answer calls `onSolved`.
  - Once solved, it shows the Italian text and no input.
- Modify: `src/components/Window.tsx`. Add an optional `className` prop on the root.
- Modify: `src/styles/global.css`. Change `.stage.is-below .win` to `.stage.is-below .win:not(.win--floor)`. Add the plaque shake.
- Modify: `src/scenes/Babel.tsx`:
  - Drop `SCRIPTS`. `inscriptions()` keeps only the stone courses.
  - Drop the sealed arch. In its place (`door`), add a column (cylinder, radius ≈0.45, full wall height) set into the wall, with a dark emissive screen plane facing the centre. Tapping it opens the chats window.
  - Add six plaques evenly round the wall, skipping the column's sector. Each is a plane with a `CanvasTexture` from `drawGlyphs` in dark carving on stone. When solved, the texture is redrawn with soft white glyphs and a faint white emissive.
  - Tapping a plaque flies the camera to a view facing it (derived from its angle) and opens the plaque window.
  - Babel returns `<>` canvas plus its windows `</>`. Windows carry `className="win--floor"` and stack like the island's: raise on focus, close on ×.
  - New prop: none. Babel reads and writes `LANG_KEY` itself.
- Test: `scripts/check.mjs`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces: `Babel` keeps its current props.

- [ ] **Step 1: Write the failing test.** A source check: `global.css` contains `.stage.is-below .win:not(.win--floor)` and every `<Window` in `Babel.tsx` passes `className="win--floor"`. The existing OrbitControls scene-lock check must stay green.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. In the browser, check that:
  - plaques are legible on a 390px-wide viewport;
  - a right answer lights its plaque and adds chats with «nuova»;
  - the island's windows stay hidden downstairs.
- [ ] **Step 5:** Commit with message `Babele: le lastre, la colonna e la traduzione`.

### Task 7: The sarcophagus

**Files:**
- Create: `src/components/Sarcophagus.tsx`: six inputs.
  - A slot gets class `is-right` when `titleOf(value)` is not null and no earlier slot has the same index.
  - Values are saved to `TITLES_KEY` on every change.
  - `onDone` is called once, when `titlesDone(slots)` becomes true.
- Modify: `src/scenes/Babel.tsx`:
  - When the sixth phrase is solved in this visit, play a scene: the camera flies to `SARC_VIEW`, the sarcophagus rises from y=−0.9 to 0 over 2.4s (instant when `reduced`), and Rotom's wrapper group eases to x≈0.9.
  - On reload with all six solved, it is simply up.
  - Tapping the sarcophagus opens the slots window.
  - When the titles are done in this visit, play a scene: the lid slides off, then a `Keeper` shows `sarcLine` over Rotom, and the scene ends on its button.
  - On reload with the titles done, the lid is simply off and the inside is dark.
  - Tapping the open sarcophagus does nothing (floor 3 doesn't exist yet).
- Test: `scripts/check.mjs`

- [ ] **Step 1: Write the failing test.** `sarcLine` is exported and starts with `"Rotom:"`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. In the browser, run both scenes and reload after each.
- [ ] **Step 5:** Commit with message `Babele: il sarcofago dei titoli`.

### Task 8: Debug stops, reset, approval

**Files:**
- Modify: `src/lib/stages.ts`:
  - Append `{ label: "lingue: 3 frasi", key: LANG_KEY, solved: () => [0,1,2] }` and `{ label: "sarcofago", key: LANG_KEY, solved: () => [0,1,2,3,4,5] }`.
  - `jumpTo` also removes `TITLES_KEY` and `CHAT_KEY`.
- Test: `scripts/check.mjs`. Update the existing stage-count or index assertions to the new length (15), and assert that `jumpTo`'s source mentions `TITLES_KEY` and `CHAT_KEY`.

- [ ] **Step 1:** Write the failing test.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`, `npm run typecheck` and `npm run build`. Expected: all pass.
- [ ] **Step 5:** Commit with message `Babele: fermate di debug e reset`.
- [ ] **Step 6: Approval stop.** Write every chat (phase, who, scene, Italian lines) into a readable list for Salvo. Do not merge to main or publish until he approves the texts. Apply his edits through Task 2's tests.
