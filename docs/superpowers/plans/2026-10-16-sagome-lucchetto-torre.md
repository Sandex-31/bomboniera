# Sagome, lucchetto e torre — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere al puzzle la finestra delle sagome (password EYE, carosello di 11 silhouette, prompt TOMBINO su The Lost), il lucchetto 47157 accanto a Rotom e la rivelazione della Torre di Babele capovolta sotto l'isola.

**Architecture:** La logica pura (parole accettate, giudizio del prompt, rotelle del lucchetto) sta in `src/lib/sagome.ts` ed è coperta da `scripts/check.mjs`. Le silhouette sono PNG neri preparati da uno script senza dipendenze (`scripts/sagome.mjs` + `scripts/png.mjs`), partendo da sorgenti a colori tenute fuori da git. La UI segue gli schemi esistenti di `Puzzle.tsx`: una finestra in `SCREENS` sulla scrivania dello schermo 4, battute di Rotom con `Keeper`, un pannello 3D per il lucchetto, una `View` nuova per la rivelazione.

**Tech Stack:** React 19, @react-three/fiber 9, drei 10, three 0.180, Vite 7, TypeScript. Nessuna dipendenza nuova.

**Spec:** `docs/superpowers/specs/2026-10-16-sagome-lucchetto-torre-design.md`

## Global Constraints

- Nessuna dipendenza npm nuova (`package.json` resta com'è).
- Password d'avvio: `EYE`. Parola su The Lost: `TOMBINO`. Indizio nel prompt: `Giapponese`. Combinazione: `4 7 1 5 7`, presa da `CODE` di `src/lib/ski.ts` e non riscritta.
- Battute, testo esatto: `Rotom: Bravo! giusto ma non ti servirá a un bel niente hahahahah` e `Rotom: Complimenti, hai trovato anche questo.`
- Confronto delle parole come in `Hack.tsx`: contano solo le lettere, minuscole (`s.toLowerCase().replace(/[^a-z]/g, "")`).
- Il nome giusto di qualunque personaggio, The Lost compreso, dà il «Bravo!»; solo TOMBINO su The Lost va avanti.
- Mai immagini a colori in `public/` o in git; i nomi dei file delle silhouette non rivelano il personaggio.
- Chiavi di storage nuove in `src/data/puzzle.ts`, tutte presenti in `STAGES` (`src/lib/stages.ts`), che il test già controlla.
- Commenti nel codice in inglese, testi a schermo in italiano, come il resto del progetto.

## Review Focus

1. Un tocco su carosello, prompt o lucchetto non deve far uscire dallo schermo (`onPointerMissed` del Canvas) né ruotare la camera, né trascinare la finestra. Verificato nel browser nei Task 3 e 4.
2. Ricaricando a metà catena: finestra già avviata, lucchetto presente senza ripetere la battuta, torre presente senza ripetere la rivelazione. Test di `STAGES` nel Task 1, browser nel Task 5.
3. Parola sbagliata, sia la password sia il prompt: il campo vibra e si svuota, e nulla cambia; il nome di The Lost dà «Bravo!» e non fa avanzare. Test unitari nel Task 1.
4. Il menu «salta a…» su ogni tappa nuova porta a uno stato coerente, cioè ciò che scrive è ciò che le schermate accettano come risolto. Test di `STAGES` nel Task 1.
5. Telefono: lo swipe nel carosello e il trascinamento delle rotelle non spostano la finestra o la camera; il prompt resta usabile con la tastiera aperta. Verificato nel browser con emulazione mobile nei Task 3 e 4.

---

### Task 1: Logica, chiavi e tappe di debug

**Files:**
- Create: `src/lib/sagome.ts`
- Modify: `src/data/puzzle.ts` (chiavi e battute nuove)
- Modify: `src/lib/stages.ts` (tre tappe nuove)
- Test: `scripts/check.mjs` (blocco nuovo in fondo; estendere il blocco «The debug jump»)

**Interfaces:**
- Produces, in `src/data/puzzle.ts`:
  - `SAGOME_KEY = 'bomboniera.puzzle.sagome'`: flag `"1"`, finestra avviata.
  - `TOMBINO_KEY = 'bomboniera.puzzle.tombino'`: flag `"1"`, TOMBINO trovato.
  - `LOCK_KEY = 'bomboniera.puzzle.lucchetto'`: JSON `number[5]`, le rotelle.
  - `bravoLine: string` e `tombinoLine: string`, con il testo esatto dei Global Constraints.
- Produces, in `src/lib/sagome.ts`:
  - `type Character = { id: string; file: string; names: string[] }`
  - `CHARACTERS: Character[]`: 11 voci. `file` è `media/sagome/NN.png` (NN da 01 a 11), in un ordine che non segue l'elenco. `names` contiene già le forme normalizzate.
  - `LOST_ID = "lost"`
  - `bootAccepts(word: string): boolean`
  - `judge(id: string, word: string): "tombino" | "bravo" | "wrong"`
  - `LOCK_CODE: readonly number[]`, uguale a `CODE` di `src/lib/ski.ts`
  - `turn(digits: number[], i: number, by: number): number[]`: nuova copia, ruota da 0 a 9 ricominciando
  - `unlocked(digits: number[]): boolean`
  - `loadLock(): number[]`: legge `LOCK_KEY`. Accetta solo 5 interi da 0 a 9; altrimenti restituisce `[0,0,0,0,0]`.
- Nomi accettati, già normalizzati (scelta del piano):
  - samus `samus`, `samusaran`
  - jak `jak`, `daxter`, `jakanddaxter`, `jakedaxter`, `jakdaxter`
  - steve `steve`
  - link `link`
  - batman `batman`, `legobatman`
  - knight `hollowknight`, `knight`, `theknight`
  - lost `thelost`, `lost`
  - yi `yi`
  - penitent `penitente`, `ilpenitente`, `thepenitentone`, `penitentone`, `penitent`
  - cuphead `cuphead`
  - crow `crow`, `corvo`, `ilcorvo`, `thecrow`

- [ ] **Step 1: Scrivi il test che fallisce.** Aggiungi in `scripts/check.mjs` un blocco nuovo, «The silhouettes, the word and the lock», con il proprio `createServer` come i blocchi esistenti, e queste asserzioni:

```js
const s = await vite6.ssrLoadModule("/src/lib/sagome.ts");
for (const w of ["EYE", "eye", " e y e "]) assert.ok(s.bootAccepts(w), `boot refuses ${w}`);
for (const w of ["", "eyes", "occhio", "ey"]) assert.ok(!s.bootAccepts(w), `boot opens on ${w}`);

assert.equal(s.CHARACTERS.length, 11);
assert.equal(new Set(s.CHARACTERS.map((c) => c.id)).size, 11, "duplicate ids");
assert.equal(new Set(s.CHARACTERS.map((c) => c.file)).size, 11, "duplicate files");
for (const c of s.CHARACTERS) {
  assert.match(c.file, /^media\/sagome\/\d\d\.png$/, `${c.id} file name gives it away`);
  for (const n of c.names) assert.equal(s.judge(c.id, n), "bravo", `${c.id} refuses its name ${n}`);
}
assert.equal(s.judge("lost", "The Lost"), "bravo");
assert.equal(s.judge("lost", "TOMBINO"), "tombino");
assert.equal(s.judge("lost", " tombino "), "tombino");
assert.equal(s.judge("samus", "tombino"), "wrong");
assert.equal(s.judge("samus", "link"), "wrong");
assert.equal(s.judge("lost", ""), "wrong");

assert.deepEqual([...s.LOCK_CODE], [4, 7, 1, 5, 7]);
assert.deepEqual(s.turn([9, 0, 0, 0, 0], 0, 1), [0, 0, 0, 0, 0]);
assert.deepEqual(s.turn([0, 0, 0, 0, 0], 4, -1), [0, 0, 0, 0, 9]);
assert.ok(s.unlocked([4, 7, 1, 5, 7]) && !s.unlocked([4, 7, 1, 5, 6]));
```

Nel blocco «The debug jump» aggiungi, dopo le asserzioni sull'ultima tappa: `const { unlocked } = await vite5.ssrLoadModule("/src/lib/sagome.ts"); assert.ok(unlocked(read(puzzle.LOCK_KEY)), "the jump leaves the lock shut");`. Il controllo già esistente su chiavi e `STAGES` copre il resto.

- [ ] **Step 2: Esegui e verifica che fallisca.** Run: `node scripts/check.mjs`. Expected: FAIL nel caricamento di `/src/lib/sagome.ts`.

- [ ] **Step 3: Implementa.** In `src/data/puzzle.ts` aggiungi chiavi e battute. In `src/lib/sagome.ts` aggiungi la logica dell'Interfaces; `loadLock` legge `localStorage` dentro try/catch come `loadSki`. In `src/lib/stages.ts`, dopo «figura», aggiungi tre voci: `{ label: "avvio", key: SAGOME_KEY, solved: () => "1" }`, `{ label: "tombino", key: TOMBINO_KEY, solved: () => "1" }` e `{ label: "lucchetto", key: LOCK_KEY, solved: () => [...LOCK_CODE] }`.

- [ ] **Step 4: Esegui e verifica che passi.** Run: `node scripts/check.mjs`. Expected: tutti `ok`, compreso `ok — 13 jump stops, each solving exactly the puzzles above it`, e una riga `ok` per il blocco nuovo.

- [ ] **Step 5: Commit.** `git add src/lib/sagome.ts src/data/puzzle.ts src/lib/stages.ts scripts/check.mjs` e poi `git commit -m "Sagome: parole, giudizio e lucchetto, con le tappe di debug"`

---

### Task 2: Le silhouette

**Files:**
- Create: `scripts/png.mjs` (decodifica e codifica PNG, solo `node:zlib`)
- Create: `scripts/sagome.mjs` (sorgenti → silhouette)
- Create: `public/media/sagome/01.png` … `11.png`
- Modify: `.gitignore` (aggiungi `scripts/sagome-src/`)
- Test: `scripts/check.mjs` (estendi il blocco del Task 1)

**Interfaces:**
- Consumes: `CHARACTERS` del Task 1, caricato con `vite.ssrLoadModule` come fa `scripts/lost-preview.mjs`.
- Produces, in `scripts/png.mjs`:
  - `decode(buf: Buffer): { width: number; height: number; data: Uint8Array }`: RGBA a 8 bit. Supporta tipi colore 6 (RGBA), 2 (RGB) e 3 (palette, con `tRNS`), profondità 8, non interlacciato, tutti e cinque i filtri di riga. Su qualunque altro formato lancia un errore che ne nomina il motivo.
  - `encode(img: { width; height; data }): Buffer`: RGBA a 8 bit, filtro 0.

- [ ] **Step 1: Scrivi il test che fallisce.** Nel blocco del Task 1 aggiungi le asserzioni seguenti. Per ogni personaggio deve esistere `public/${c.file}`, e la sua decodifica deve avere: `width` e `height` > 0 e `height` ≤ 480; ogni pixel con alpha > 0 con RGB uguale a `0,0,0`; almeno il 5% dei pixel con alpha > 0, e almeno il 5% con alpha 0. Aggiungi poi un giro di andata e ritorno: `decode(encode(img))` deve restituire gli stessi `width`, `height` e `data` di un'immagine 3×2 scritta a mano.

- [ ] **Step 2: Esegui e verifica che fallisca.** Run: `node scripts/check.mjs`. Expected: FAIL, `public/media/sagome/01.png` non esiste.

- [ ] **Step 3: Implementa `scripts/png.mjs`** con le firme dell'Interfaces, usando `zlib.inflateSync` e `zlib.deflateSync` e il CRC32 per i chunk.

- [ ] **Step 4: Procura le sorgenti.** Per ogni personaggio cerca un render ufficiale a figura intera con sfondo trasparente, preferendo la wiki del gioco (versione originale del file, non l'anteprima WebP), e salvalo come `scripts/sagome-src/<id>.png`. Se non c'è una versione trasparente (probabile per `yi` e `crow`), scontorna un'immagine ufficiale nel browser con un canvas e salva il PNG risultante. Annota in cima a `scripts/sagome.mjs` la pagina di provenienza di ogni sorgente.

- [ ] **Step 5: Implementa `scripts/sagome.mjs`.** Per ogni personaggio: decodifica la sorgente, ritaglia al riquadro dei pixel con alpha > 0, riduci l'altezza a ≤ 480 con media dei riquadri (box filter) se serve, azzera RGB tenendo l'alpha, e scrivi `public/${c.file}`. Si lancia con `node scripts/sagome.mjs`.

- [ ] **Step 6: Esegui lo script e i test.** Run: `node scripts/sagome.mjs && node scripts/check.mjs`. Expected: 11 file scritti e tutti `ok`. Apri `public/media/sagome/` e guarda ogni silhouette: deve essere riconoscibile come il personaggio.

- [ ] **Step 7: Commit.** `git add scripts/png.mjs scripts/sagome.mjs public/media/sagome .gitignore scripts/check.mjs` e poi `git commit -m "Sagome: undici silhouette nere da render ufficiali"`. Controlla prima con `git status` che `scripts/sagome-src/` non compaia.

---

### Task 3: La finestra delle sagome e le battute di Rotom

**Files:**
- Create: `src/components/Sagome.tsx`
- Modify: `src/scenes/Puzzle.tsx` (`SCREENS`, `show()`, `Desk`, `Island`)
- Modify: `src/styles/global.css` (stile `.sagome`, sul modello di `.hack`)

**Interfaces:**
- Consumes: `CHARACTERS`, `bootAccepts`, `judge`, `LOST_ID` (Task 1); `SAGOME_KEY`, `TOMBINO_KEY`, `bravoLine`, `tombinoLine` (Task 1); le immagini in `media/sagome/` (Task 2).
- Produces:
  - `Sagome({ onBravo, onTombino }: { onBravo: () => void; onTombino: () => void })`.
  - In `Puzzle.tsx`: `const SAGOME = 7` e `const SAGOME_DESK = 4`; `SCREENS[SAGOME] = { title: "sagome.exe", width: 420, body: … }`.
  - Il componente `Island` riceve due prop nuove: `bravoAt: number` (timestamp, 0 = mai) e `tombino: boolean`.
  - Task 4 usa `lockShown: boolean`, interno a `Island`: vero quando TOMBINO è trovato e la sua battuta è stata chiusa, oppure quando era già trovato al caricamento.

- [ ] **Step 1: `Sagome.tsx`.** Ha tre fasi.
  - **Avvio**, saltata se `SAGOME_KEY` è `"1"`: un campo password come quello di `Hack.tsx`. Se `bootAccepts` è vero salva il flag; se è falso, stato `wrong`, vibrazione e svuotamento dopo 1000 ms.
  - **Carosello**: una silhouette alla volta (`<img src={c.file} alt="sagoma">`, senza nome), frecce ‹ › e swipe orizzontale sull'immagine, puntini di posizione, pulsante «accetta».
  - **Prompt**, sopra il carosello: etichetta «chi è?», testo «indizio: Giapponese», un campo e «annulla». Su `judge(...)`: con `"bravo"` chiude il prompt e chiama `onBravo()`; con `"tombino"` chiude il prompt e chiama `onTombino()`; con `"wrong"` vibra e svuota come nell'avvio.
  - I gestori pointer di carosello e prompt chiamano `e.stopPropagation()`. La finestra si trascina solo dalla barra, quindi uno swipe nel contenuto non la sposta.

- [ ] **Step 2: Collega la finestra.** In `show()` aggiungi `...(index === SAGOME_DESK ? [SAGOME] : [])`. In `Desk`:
  - `const [tombino, setTombino] = usePersistentFlag(TOMBINO_KEY)`
  - `const [bravoAt, setBravoAt] = useState(0)`
  - Il body di `SAGOME` riceve `onBravo={() => setBravoAt(performance.now())}` e `onTombino={() => setTombino(true)}`, attraverso `solvedRef` come gli altri, perché `bodies` è memorizzato.
  - `setTombino(true)` è idempotente: se era già vero, non cambia nulla.

- [ ] **Step 3: Battute in `Island`.**
  - **`bravoAt` cambia**: mostra `Keeper` con `bravoLine` sopra le finestre (`zIndexRange={[80, 60]}`, come `wiredLine`), senza spostare la camera.
  - **`tombino` passa da falso a vero durante la visita**: `setPicked(null)`, poi dopo 900 ms (0 con `reduced`) `Keeper` con `tombinoLine`. Alla chiusura `lockShown` diventa vero.
  - **`tombino` già vero al montaggio**: `lockShown` è vero subito e la battuta non si ripete.

- [ ] **Step 4: Typecheck e test.** Run: `npx tsc -b --noEmit && node scripts/check.mjs`. Expected: nessun errore, tutti `ok`.

- [ ] **Step 5: Verifica nel browser.** Monta `Puzzle` in StrictMode come nelle sessioni precedenti (harness con `jumpTo`), su desktop 1440×900 e poi con emulazione `390x844x3,mobile,touch`. Expected:
  - Con «salta a… → figura», lo schermo 4 apre `sagome.exe`. `eye` avvia la finestra; `eyx` vibra e svuota.
  - Sei swipe e le frecce scorrono le 11 silhouette, senza spostare la finestra né la camera, e senza uscire dallo schermo.
  - Su Link, «link» fa apparire la battuta «Bravo!» sopra le finestre.
  - Su The Lost, «the lost» dà il «Bravo!»; «tombino» riporta la camera sull'isola e fa dire a Rotom «Complimenti…».
  - Ricaricando con «salta a… → tombino», la battuta non ricompare.

- [ ] **Step 6: Commit.** `git add src/components/Sagome.tsx src/scenes/Puzzle.tsx src/styles/global.css` e poi `git commit -m "Sagome: la finestra con password, carosello e prompt, e le battute di Rotom"`

---

### Task 4: Il lucchetto accanto a Rotom

**Files:**
- Create: `src/components/Lock.tsx`
- Modify: `src/scenes/Puzzle.tsx` (pannello 3D e vista del lucchetto in `Island`)
- Modify: `src/styles/global.css` (stile `.lock`)

**Interfaces:**
- Consumes: `turn`, `unlocked`, `loadLock`, `LOCK_CODE` (Task 1); `LOCK_KEY` (Task 1); `lockShown` (Task 3).
- Produces:
  - `Lock({ onOpen }: { onOpen: () => void })`.
  - In `Puzzle.tsx`: `const LOCK = 8`, `LOCK_POS: [number, number, number] = [0.8, 1.25, 0.8]`, e `lockView: View` (target `LOCK_POS`, azimut `Math.PI / 4`, polare 1.35, zoom 3.2, spread `{ azimuth: 0.2, polar: 0.12 }`).
  - `Island` riceve la prop nuova `opened: boolean` (lucchetto aperto) e la callback `onUnlock: () => void`, che `Desk` usa per lo stato del Task 5.

- [ ] **Step 1: `Lock.tsx`.** Cinque rotelle, ciascuna con la cifra corrente grande e quelle accanto attenuate.
  - Trascinare in verticale fa `turn(digits, i, ±1)` ogni 28 px. I tasti freccia su una rotella con focus fanno lo stesso. Ogni gestore pointer chiama `e.stopPropagation()`, e la rotella ha `touch-action: none`.
  - Salva su `LOCK_KEY` a ogni cambio.
  - Quando `unlocked` passa da falso a vero chiama `onOpen()` una volta sola. Da quel momento le rotelle sono ferme e il lucchetto mostra lo stato aperto. Se era già aperto al caricamento, non chiama `onOpen`.

- [ ] **Step 2: Pannello 3D.** In `Island`, se `lockShown`: un pannello con lo stesso stile degli schermi (`Panel`: vetro e angoli), largo 0,7 e alto 0,5, in `LOCK_POS`, girato verso la camera dell'isola. Contiene `Lock` in un `<Html transform>` sulla faccia del pannello.
  - Il tocco sul bordo del pannello fa `setPicked(LOCK)` e la vista usa `lockView`. Va aggiunto a `view = useMemo(...)`: `picked === LOCK ? lockView : …`.
  - `show(LOCK)` non apre finestre: `LOCK` non è in `SCREENS`.

- [ ] **Step 3: Typecheck e test.** Run: `npx tsc -b --noEmit && node scripts/check.mjs`. Expected: nessun errore, tutti `ok`.

- [ ] **Step 4: Verifica nel browser.** Stesso harness, desktop e mobile. Expected:
  - Con «salta a… → tombino» il pannello è accanto a Rotom, e un tocco ci porta davanti la camera.
  - Trascinare una rotella in su o in giù cambia la cifra, senza ruotare la camera e senza uscire.
  - `4 7 1 5 6` resta chiuso, `4 7 1 5 7` si apre.
  - Ricaricando con «salta a… → lucchetto» il lucchetto è aperto.

- [ ] **Step 5: Commit.** `git add src/components/Lock.tsx src/scenes/Puzzle.tsx src/styles/global.css` e poi `git commit -m "Lucchetto: cinque rotelle accanto a Rotom, combinazione del comprensorio"`

---

### Task 5: Il tombino e la torre

**Files:**
- Create: `src/scenes/Tower.tsx`
- Modify: `src/scenes/Puzzle.tsx` (stato di apertura, vista della torre)

**Interfaces:**
- Consumes: `opened`/`onUnlock` (Task 4); `CameraRig` e `View` esistenti.
- Produces:
  - In `Tower.tsx`: `Manhole({ openAt, reduced }: { openAt: number; reduced: boolean })` e `Tower()`. Per `openAt`, `-Infinity` significa già aperto: nessuna animazione.
  - In `Puzzle.tsx`: `TOWER_VIEW: View`, con target `[0, -7, 0]`, azimut `Math.PI / 4`, polare 1.2, zoom 0.22 e spread `{ azimuth: Math.PI, polar: 0.3 }`. Il valore di zoom va tarato a occhio in modo che si veda tutta la torre.

- [ ] **Step 1: `Tower.tsx`.**
  - `Manhole`: un disco di ghisa di raggio 0.32 sul pavimento dell'isola, sotto Rotom (`y = 0.006`), con anello e motivo inciso. Da `openAt` il coperchio scivola di lato in 1,2 s e lascia un pozzo scuro.
  - `Tower`: la Torre di Babele capovolta, la cui cima piana coincide con l'isola (raggio 2.4, `y = 0`). Ha almeno 7 gradoni che si restringono scendendo verso il vuoto, con una rampa che gira intorno a ciascuno. Pietra calda, illuminata da sotto in modo che si legga contro lo sfondo `#05060A`.
  - La geometria si costruisce una volta (`useMemo`) e viene liberata allo smontaggio.

- [ ] **Step 2: Collega.**
  - In `Desk`, lo stato `opened` si deriva da `unlocked(loadLock())` al montaggio, e `onUnlock` lo porta a vero, segnando `openAt = performance.now()`.
  - In `Island`, se `opened`, monta `Manhole` e `Tower`. Al caricamento con il lucchetto già aperto, `openAt` vale `-Infinity`.
  - Alla prima apertura: `setPicked(null)`, poi dopo 300 ms il tombino si apre, e dopo 1,4 s la vista diventa `TOWER_VIEW` con un volo normale di `CameraRig`. La vista della torre resta finché l'utente non tocca uno schermo o preme Esc, che riportano alla vista dell'isola.
  - Il piano lontano della camera (`far: 90`) deve contenere tutta la torre in `TOWER_VIEW`; se non basta, alzalo.

- [ ] **Step 3: Typecheck e test.** Run: `npx tsc -b --noEmit && npm test`. Expected: nessun errore, tutti `ok`.

- [ ] **Step 4: Verifica nel browser.** Stesso harness, desktop e mobile. Expected:
  - Con «salta a… → tombino», aprendo il lucchetto la camera torna su Rotom, il tombino scivola via, poi la camera si allontana in modo fluido (nessuno scatto, misurato come nella sessione sulla camera) fino a mostrare l'isola in cima alla torre capovolta.
  - Esc riporta sull'isola.
  - Ricaricando con «salta a… → lucchetto», tombino aperto e torre ci sono già, senza animazione.
  - Lo screenshot della rivelazione va mostrato a Salvo.

- [ ] **Step 5: Commit.** `git add src/scenes/Tower.tsx src/scenes/Puzzle.tsx` e poi `git commit -m "Torre: il tombino si apre e l'isola si scopre in cima a Babele capovolta"`
