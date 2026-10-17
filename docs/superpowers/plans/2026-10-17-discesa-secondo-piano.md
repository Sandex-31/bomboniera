# Discesa al secondo piano — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rotom (ora il modello Cobblemon) scende nel tombino dopo la torre e porta al secondo piano, una sala di Babele con Rotom Lavaggio; lo schermo si svuota e la camera si blocca su Rotom in ogni scena; si sale e si scende liberamente.

**Architecture:** Un lettore dei modelli Bedrock (`src/lib/bedrock.ts`) sostituisce gli STL. `Desk` tiene il piano corrente (salvato in una chiave) e la classe `is-scene` sullo `.stage`, che nasconde le finestre e spegne i puntatori sul canvas; `Island` e la nuova `Babel` gli segnalano quando sono in scena. Il passaggio tra piani è un velo nero (`.shaft`) che copre lo scambio di canvas.

**Tech Stack:** React 19, @react-three/fiber 9, drei 10, three 0.180, Vite; test in `scripts/check.mjs` (node:assert + `vite.ssrLoadModule`), `npm test`, `npm run typecheck`.

**Spec:** `docs/superpowers/specs/2026-10-17-discesa-secondo-piano-design.md`

## Global Constraints

- Battuta nuova, testo esatto: `Rotom: Eccoci qua, adesso sai quanto é complicato entrare nel sistema`
- Modelli e texture da `gitlab.com/cable-mc/cobblemon`, ramo `main`, licenza MPL-2.0; credito nel README.
- Ogni animazione rispetta `reduced`: con movimento ridotto si salta allo stato finale.
- Le finestre in scena vengono nascoste, mai chiuse né smontate.
- Ogni chiave `*_KEY` di `src/data/puzzle.ts` deve stare in `STAGES` (il test esistente lo verifica).
- Testi visibili in italiano; commenti nel codice in inglese, nello stile del file che si tocca.
- Telefono e desktop: niente tocchi o trascinamenti che passano al canvas durante una scena.

## Review Focus

1. Ricaricare a metà discesa (prima dell'arrivo) → si torna sull'isola, tombino aperto; toccarlo ridice la battuta e scende. Il piano si salva solo all'arrivo. (Test: Task 4 `floorFrom`, verifica browser Task 5.)
2. Toccare o trascinare durante una battuta o un volo, su telefono → non succede niente sotto (né ritmo, né schermi, né rotazione). (Verifica browser Task 3.)
3. Finestre aperte sull'isola → scendere → risalire → le finestre sono dove erano. (Verifica browser Task 5.)
4. «ricomincia il puzzle» dal secondo piano → isola intatta, nessun piano salvato. (Test: Task 4.)
5. Movimento ridotto durante la discesa → si arriva subito, il velo nero non resta appeso. (Verifica browser Task 5.)

---

### Task 1: Lettore dei modelli Bedrock e file Cobblemon

**Files:**
- Create: `src/lib/bedrock.ts`
- Create: `src/assets/rotom/cobblemon/` con `rotom.geo.json`, `rotom_wash.geo.json`, `rotom.png`, `rotom_emissive.png`, `rotom_wash.png`, `rotom_wash_emissive.png`, `SOURCE.txt` (URL del repo, commit, licenza MPL-2.0)
- Test: `scripts/check.mjs` (blocco nuovo in fondo, prima della chiusura del `try`)

**Interfaces:**
- Produces:
  - `type Geo` (il JSON `minecraft:geometry[0]`)
  - `boxUV(uv: [number, number], size: [number, number, number], mirror: boolean): Record<"east"|"west"|"up"|"down"|"south"|"north", [number, number, number, number]>` — rettangoli `[u, v, w, h]` in pixel di texture.
  - `buildGeo(geo: Geo, material: Material): Group` — un `Mesh` per cubo, ossa come `Group` annidati, unità = 1/16 (un pixel Bedrock), origine ai piedi.

Sorgenti (scaricare con curl):
`https://gitlab.com/cable-mc/cobblemon/-/raw/main/common/src/main/resources/assets/cobblemon/bedrock/pokemon/models/0479_rotom/{rotom,rotom_wash}.geo.json`
`https://gitlab.com/cable-mc/cobblemon/-/raw/main/common/src/main/resources/assets/cobblemon/textures/pokemon/0479_rotom/{rotom.png,rotom_emissive.png,wash/rotom_wash.png,wash/rotom_wash_emissive.png}`

- [ ] **Step 1: Scaricare i file** nelle posizioni sopra e scrivere `SOURCE.txt` con l'hash di `git ls-remote https://gitlab.com/cable-mc/cobblemon.git main`.

- [ ] **Step 2: Test che fallisce**

```js
/* the Bedrock reader: box UVs laid out the way Blockbench lays them, and a
   whole model that comes out symmetric, standing on y = 0, one mesh per cube */
const { boxUV, buildGeo } = await vite.ssrLoadModule("/src/lib/bedrock.ts");
const { Box3, MeshBasicMaterial } = await import("three");
assert.deepEqual(boxUV([0, 0], [2, 3, 4], false), {
  east: [0, 4, 4, 3], north: [4, 4, 2, 3], west: [6, 4, 4, 3], south: [10, 4, 2, 3],
  up: [4, 0, 2, 4], down: [6, 4, 2, -4],
});
const geoJson = JSON.parse(readFileSync(new URL("../src/assets/rotom/cobblemon/rotom_wash.geo.json", import.meta.url), "utf8"));
const washGeo = geoJson["minecraft:geometry"][0];
const wash = buildGeo(washGeo, new MeshBasicMaterial());
let cubes = 0; wash.traverse((o) => { if (o.isMesh) cubes++; });
assert.equal(cubes, washGeo.bones.reduce((n, b) => n + (b.cubes?.length ?? 0), 0));
const box = new Box3().setFromObject(wash);
assert.ok(Math.abs(box.min.x + box.max.x) < 0.05, "the washing machine comes out lopsided");
assert.ok(box.min.y > -0.1 && box.max.y > 1, "the model is not standing on the floor");
```

(`readFileSync` va importato in cima al file insieme a `existsSync`.)

- [ ] **Step 3: `npm test`** → FAIL, modulo `/src/lib/bedrock.ts` mancante.

- [ ] **Step 4: Implementare `src/lib/bedrock.ts`.** Convenzioni Bedrock come le converte Blockbench:
  - x speculare: un cubo con `origin` `o` e `size` `s` va da `[-o.x - s.x, o.y, o.z]` a `[-o.x, o.y + s.y, o.z + s.z]`; anche `pivot.x` cambia segno.
  - rotazioni (ossa e cubi) in gradi, `[-r.x, -r.y, r.z]`, ordine Euler `"ZYX"`, attorno al pivot.
  - `inflate` allarga il cubo di quel valore su ogni lato; le UV restano quelle di `size`.
  - box UV (`uv: [u, v]`, dimensioni `[x, y, z]` = `size`): east `[u, v+z, z, y]`, north `[u+z, v+z, x, y]`, west `[u+z+x, v+z, z, y]`, south `[u+2z+x, v+z, x, y]`, up `[u+z, v, x, z]`, down `[u+z+x, v+z, x, -z]`. `mirror` scambia east e west e ribalta ogni faccia in orizzontale.
  - cubi con una dimensione 0 (piani) restano piani a due facce visibili: il materiale va con `side: DoubleSide` (lo decide chi chiama, Task 2).
  - UV normalizzate su `texture_width`/`texture_height`, v dall'alto (texture con `flipY = false`).
  - Scala 1/16 su tutto.

- [ ] **Step 5: `npm test`** → PASS. Poi `npm run typecheck` → nessun errore.

- [ ] **Step 6: Commit** `git add src/lib/bedrock.ts src/assets/rotom/cobblemon scripts/check.mjs` — «Rotom: lettore dei modelli Bedrock e file di Cobblemon».

---

### Task 2: Rotom diventa quello di Cobblemon

**Files:**
- Modify: `src/scenes/Rotom.tsx` (riscritto)
- Delete: `src/assets/rotom/rotom-body.stl`, `rotom-electric.stl`, `rotom-halo.stl`, `LICENSE.txt`, `SOURCE.txt`
- Modify: `README.md:294-300` (credito), `scripts/check.mjs:840-850` (controllo del credito)

**Interfaces:**
- Consumes: `buildGeo`, `Geo` (Task 1).
- Produces: `type RotomForm = "base" | "wash"`; `export default function Rotom(props: { reduced: boolean; zapAt: number; awake: boolean; form: RotomForm; move?: Move })`. `move` è definito nel Task 5; in questo task la prop non esiste ancora.

- [ ] **Step 1: Cambiare il test del credito** perché chieda `readme.includes("Cobblemon") && /MPL-2\.0/.test(readme)` quando esiste `src/assets/rotom/cobblemon/`, con messaggio «the Rotom model is in the project but its attribution is not in the README». `npm test` → FAIL.

- [ ] **Step 2: Riscrivere `Rotom.tsx`.** Carica geo JSON (import JSON di Vite) e texture (`?url` + `useLoader(TextureLoader, …)`), con `magFilter = minFilter = NearestFilter`, `flipY = false`, `colorSpace = SRGBColorSpace`. Materiale: `MeshStandardMaterial({ map, emissiveMap, emissive: "#ffffff", transparent: true, alphaTest: 0.5, side: DoubleSide })`. Scala derivata dal box come oggi (`TARGET_W = 1.45`, centrato). Restano: guarda la camera solo in y (riverificare `FACING` a occhio), galleggia a y 1.12, sobbalzo su `zapAt`, `emissiveIntensity` più alta e ronzio quando `awake`, `pointLight` arancio per `base` e azzurra (`#8AD8FF`) per `wash`. Via il codice della faccia e gli STL.

- [ ] **Step 3: Aggiornare il README.** Il paragrafo nuovo cita Cobblemon, il link al repo, la licenza MPL-2.0 e la cartella `src/assets/rotom/cobblemon/`.

- [ ] **Step 4: `npm test` e `npm run typecheck`** → PASS.

- [ ] **Step 5: Verifica a occhio.** Avviare `npm run dev`, «salta a… lucchetto», guardare l'isola da quattro lati: il Rotom non è smontato, guarda il visitatore e risponde ai tocchi. Su un telefono simulato (390×844) resta della stessa dimensione di prima. Montare per prova `form="wash"` e controllare che anche la lavatrice sia intera, poi togliere la prova.

- [ ] **Step 6: Commit** «Rotom: il modello di Cobblemon al posto della stampa di Thingiverse».

---

### Task 3: Schermo libero e camera su Rotom durante le scene

**Files:**
- Modify: `src/scenes/Puzzle.tsx` (`Island`, `Desk`)
- Modify: `src/styles/global.css` (regole `.stage.is-scene`; togliere `.keeper-float`)

**Interfaces:**
- Produces:
  - prop di `Island`: `onScene: (on: boolean) => void` (stabile, `useCallback` in `Desk`) e `bravoAt: number`.
  - prop di `Island`: `onBravoDone: () => void`.
  - classe `is-scene` su `<div className="stage">`, che `Babel` (Task 4) riusa con lo stesso `onScene`.

- [ ] **Step 1: In `Island`, calcolare `scene`.** È vero quando c'è una battuta in corso (`saying !== null || aboutStar || aboutTape || aboutWires || aboutTombino || aboutBravo`) o quando la rivelazione è in volo (da `openAt` finché `atTower` non è atterrato). Va riportato con `useEffect(() => onScene(scene), [scene, onScene])`.

- [ ] **Step 2: Spostare `bravoLine` dentro `Island`.** Quando `bravoAt` cambia (> 0), salvare `picked` in un ref, `setPicked(null)` e, dopo l'atterraggio (900 ms, 0 con `reduced`), mostrare il `Keeper` con `bravoLine`. Su «Ho capito»: `setPicked(salvato)`, e poi `onBravoDone()` (che in `Desk` fa `setBravoAt(0)`). In `Desk` si toglie il `.keeper-float`.
  Nota: con i cavi stesi (`linked`), `show(null)` non chiude le finestre, e la sagome.exe arriva solo dopo i cavi. Quindi le finestre restano nello `stack` e ricompaiono intatte.

- [ ] **Step 3: In `Desk`**, `const [scene, setScene] = useState(false)` e `<div className={"stage" + (scene ? " is-scene" : "")}>`.

- [ ] **Step 4: CSS.**

```css
/* a scene is playing: nothing in front of it, and nothing under the finger */
.stage .win, .stage .void-exit, .stage .void-reset { transition: opacity 260ms, visibility 0s; }
.stage.is-scene .win, .stage.is-scene .void-exit, .stage.is-scene .void-reset {
  opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 260ms, visibility 0s 260ms;
}
.stage.is-scene canvas { pointer-events: none; }
```

Il fumetto di `Keeper` sta nel div di drei accanto al canvas, quindi resta cliccabile. `OrbitControls` e i tocchi R3F ascoltano il canvas, quindi si spengono. In più, `Escape` non fa niente quando `scene` è vero.

- [ ] **Step 5: `npm run typecheck` e `npm test`** → PASS.

- [ ] **Step 6: Verifica nel browser.** Desktop e telefono simulato.
  - «salta a… avvio»: aprire sagome.exe, spostarla, dare un nome giusto su un personaggio. La camera vola su Rotom e le finestre e i pulsanti spariscono. Durante la battuta un trascinamento non gira la camera e un tocco su Rotom non fa anelli. Dopo «Ho capito» la camera torna allo schermo 4 e sagome.exe è nella stessa posizione, sullo stesso personaggio.
  - «salta a… figura»: risolvere TOMBINO. Durante la battuta lo schermo è libero.
  - «salta a… tombino»: aprire il lucchetto. Durante tombino e volo alla torre lo schermo è libero, poi i pulsanti tornano.

- [ ] **Step 7: Commit** «Scene: lo schermo si svuota e la camera resta su Rotom».

---

### Task 4: Il secondo piano e il piano salvato

**Files:**
- Create: `src/scenes/Babel.tsx`
- Modify: `src/data/puzzle.ts` (chiave, `floorFrom`, battuta), `src/lib/stages.ts`, `src/scenes/Puzzle.tsx` (`Desk`)
- Test: `scripts/check.mjs`

**Interfaces:**
- Produces:
  - `export const FLOOR_KEY = 'bomboniera.puzzle.piano'`. Il valore è l'indice del piano in cui si trova il visitatore (0 isola, 1 secondo piano). Se manca, il visitatore non è mai sceso.
  - `export const FLOORS = 2`
  - `export function floorFrom(stored: string | null): number`: intero tra 0 e `FLOORS - 1`, 0 per qualunque cosa illeggibile.
  - `export const systemLine = 'Rotom: Eccoci qua, adesso sai quanto é complicato entrare nel sistema'`
  - `STAGES` prende `{ label: "secondo piano", key: FLOOR_KEY, solved: () => "1" }` dopo «lucchetto».
  - `Babel(props: { reduced: boolean; onScene: (on: boolean) => void; onUp: () => void; arrivedAt: number; first: boolean })`. `arrivedAt` e `first` servono all'arrivo del Task 5. In questo task `arrivedAt` vale `-Infinity`.
  - In `Desk`: `const [floor, setFloor] = useState(() => floorFrom(localStorage.getItem(FLOOR_KEY)))` (dentro un `try`, come gli altri accessi) e `goTo(n: number)` che salva e cambia piano.

- [ ] **Step 1: Test che fallisce**

```js
/* the floor the visitor is on: whatever is stored, it lands on a real floor */
const { floorFrom, FLOORS } = await vite.ssrLoadModule("/src/data/puzzle.ts");
assert.equal(floorFrom(null), 0);
assert.equal(floorFrom("1"), 1);
for (const bad of ["", "x", "-1", "1.5", String(FLOORS), "99"]) assert.equal(floorFrom(bad), 0, `"${bad}" must fall back to the island`);
```

e, accanto al test di `jumpTo` (riga ~962), che `jumpTo(0)` tolga `FLOOR_KEY` e `jumpTo(STAGES.length)` lo metta a `"1"`.

- [ ] **Step 2: `npm test`** → FAIL.

- [ ] **Step 3: Implementare chiave, `floorFrom`, battuta e tappa.**

- [ ] **Step 4: `Babel.tsx`, la sala.** È un canvas proprio, con la stessa impostazione dell'isola (ortografica, `CameraRig`, `OrbitControls` con `spread` a giro completo e `fit` sulla larghezza della sala).
  - Una sala circolare (raggio circa 2.4, come l'isola), con muro e pavimento in pietra dei colori della torre (`#C49A64`, `#B48A57`, `#DDB884`) e archi scuri come quelli della torre.
  - Le iscrizioni sono una `CanvasTexture` disegnata una volta con `fillText`, a fasce di scritture diverse: greco, ebraico, arabo, cirillico, devanagari, giapponese, rune (ᚠᚢᚦ) e geroglifici se il font c'è.
  - Nel soffitto c'è un buco nero con l'anello del tombino, toccabile (`useTap(onUp)`).
  - In basso, nel muro, c'è un portale ad arco chiuso da una lastra.
  - La luce viene da 4 bracieri con `pointLight` arancio tremolante (fermo con `reduced`).
  - Al centro c'è `<Rotom form="wash" awake … />`.
  - La camera guarda dall'alto quanto basta per vedere dentro: il muro dalla parte della camera va tagliato o reso trasparente (scelta del builder) perché la sala si legga.

- [ ] **Step 5: In `Desk`**, `floor === 0` monta `Island` e `floor === 1` monta `Babel`. Le finestre restano montate. Sono nascoste sul secondo piano con una classe `is-below` sullo `.stage`, che ha le stesse regole di `.is-scene` per `.win` ma non tocca i pulsanti.

- [ ] **Step 6: `npm test` e `npm run typecheck`** → PASS.

- [ ] **Step 7: Verifica nel browser.**
  - «salta a… secondo piano»: si vede la sala con Rotom Lavaggio.
  - Ricaricando si resta lì.
  - «ricomincia il puzzle» riporta all'isola intatta.
  - Su telefono la sala sta nell'inquadratura.

- [ ] **Step 8: Commit** «Secondo piano: la sala delle lingue di Babele con Rotom Lavaggio».

---

### Task 5: La discesa, la battuta e il passaggio tra i piani

**Files:**
- Create: `src/lib/descent.ts`
- Modify: `src/scenes/Rotom.tsx` (prop `move`), `src/scenes/Puzzle.tsx` (`Island`, `Desk`), `src/scenes/Babel.tsx`, `src/styles/global.css` (`.shaft`)
- Test: `scripts/check.mjs`

**Interfaces:**
- Consumes: `systemLine`, `FLOOR_KEY`, `goTo`, `Babel` props (Task 4); `onScene` (Task 3); `RotomForm` (Task 2).
- Produces:
  - `export type Move = { at: number; kind: "out" | "in"; dir: "down" | "up"; fast: boolean }`
  - `export const moveMs = (fast: boolean) => fast ? 900 : 2400`
  - `export function travel(p: number, kind: "out" | "in", dir: "down" | "up"): { dy: number; scale: number; spin: number; flash: number }`. Con `p` in [0,1] (fuori si blocca), `dy` è lo spostamento verticale rispetto alla quota di riposo (in unità di mondo), `spin` la rotazione aggiunta in radianti e `flash` va da 0 a 1 (il lampo della trasformazione, solo per `in`).
  - `Island`: prop `onDescend: (first: boolean) => void`, `descended: boolean` (`FLOOR_KEY` presente) e `arrivedAt: number` (risalita).
  - `Desk`: velo `<div className="shaft" data-on={…} />`.

- [ ] **Step 1: Test che fallisce**

```js
/* the dive and the climb: they start where Rotom floats, end out of sight,
   and only an arrival flashes */
const { travel } = await vite.ssrLoadModule("/src/lib/descent.ts");
const rest = travel(0, "out", "down");
assert.deepEqual([rest.dy, rest.scale, rest.flash], [0, 1, 0]);
const gone = travel(1, "out", "down");
assert.ok(gone.dy <= -1.12 && gone.scale < 0.1, "Rotom has not gone into the shaft");
assert.ok(travel(1, "out", "up").dy > 0, "going up leaves upwards");
const landed = travel(1, "in", "down");
assert.deepEqual([landed.dy, landed.scale], [0, 1]);
assert.ok(travel(0.5, "in", "down").flash > 0, "an arrival flashes");
assert.equal(travel(0.5, "out", "down").flash, 0);
assert.deepEqual(travel(2, "out", "down"), travel(1, "out", "down"), "p is clamped");
```

- [ ] **Step 2: `npm test`** → FAIL.

- [ ] **Step 3: Implementare `travel`.** Uscita in giù: arriva sopra il tombino, poi spirale che stringe (`spin` fino a circa 4π) mentre `scale` va a 0 e `dy` a −1.3. Uscita in su: lo stesso movimento verso +1.3. Entrata: il contrario dell'uscita nella direzione data, con `flash` a campana tra p 0.35 e 0.7.

- [ ] **Step 4: `Rotom` usa `move`.** Durante `move` applica `travel((now - at) / moveMs(fast), kind, dir)` sopra al galleggiamento e mostra il lampo: uno sprite additivo bianco-azzurro scalato da `flash`, più la `pointLight` portata in alto. Durante una mossa il tocco non conta.

- [ ] **Step 5: Isola, la prima volta.**
  - Dopo la rivelazione la camera resta sulla torre 2500 ms, poi torna su `ISLAND_VIEW` e Rotom dice `systemLine` (in scena).
  - Su «Ho capito»: `move = { kind: "out", dir: "down", fast: false }`, e la camera vola su una vista nuova `DIVE_VIEW` (`target [0, 0, 0]`, `polar 0.35`, `zoom 2.4`).
  - A 80% della mossa `Desk` alza il velo nero (opacità 1 in 300 ms) e alla fine chiama `onDescend(true)`.
  - `Desk.goTo(1)` salva `FLOOR_KEY = "1"` *solo qui*, monta `Babel` con `arrivedAt = now`, `first = true`, poi abbassa il velo.
  - Toccare il tombino aperto: senza `FLOOR_KEY` riparte da `systemLine`, con `FLOOR_KEY` fa la discesa breve (`fast: true`, niente battuta).
  - `toTower` e il volo alla torre col tocco vengono tolti.

- [ ] **Step 6: Babel, l'arrivo.**
  - La camera parte da una vista dal buco del soffitto e vola alla vista della sala.
  - Rotom fa `move = { kind: "in", dir: "down", fast: !first }`, partendo dal buco con la forma `base`. Al picco del `flash` passa a `wash`, così si legge come un solo Rotom che si trasforma.
  - Per tutta la durata la scena è attiva (`onScene`).
  - Toccare il buco: uscita in su breve, velo, poi `Desk.goTo(0)` e `Island` con `arrivedAt` fa l'entrata in su breve, da `wash` a `base` al lampo.

- [ ] **Step 7: Velo** `.shaft { position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none; transition: opacity 300ms; z-index: 50 } .shaft[data-on="true"] { opacity: 1; pointer-events: auto }`. Con `reduced` le mosse durano 0, il velo non si alza e il piano cambia subito.

- [ ] **Step 8: `npm test` e `npm run typecheck`** → PASS.

- [ ] **Step 9: Verifica nel browser.** Desktop e telefono simulato, ognuna con uno screenshot.
  - «salta a… tombino», aprire il lucchetto: tombino, poi torre, poi ritorno su Rotom, battuta, discesa a spirale, buio, arrivo dal soffitto e lampo con Rotom Lavaggio. Lo schermo resta libero per tutto il tempo.
  - Ricaricare: secondo piano, senza discesa.
  - Toccare il soffitto: si torna sull'isola, Rotom normale esce dal tombino.
  - Toccare il tombino: discesa breve.
  - Con finestre aperte sull'isola (sagome.exe), scendere e risalire: sono dove erano.
  - Ricaricare a metà della prima discesa: si è sull'isola, il tombino ridice la battuta.
  - Attivare il movimento ridotto (DevTools → Rendering → prefers-reduced-motion): si passa subito e il velo non resta nero.

- [ ] **Step 10: Commit** «Torre: Rotom scende nel tombino e si sale e scende tra i piani».
