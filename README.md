# Bomboniera digitale di laurea

Una piccola stanza isometrica interattiva che racconta tre anni di Informatica.
Si apre scansionando il QR stampato sulla bomboniera fisica: niente app da
installare, nessun backend, tutto statico.

**Stack:** React 19 · TypeScript · Vite 7 · Three.js / React Three Fiber / drei · CSS puro

---

## 1. Avvio rapido

```bash
npm install
npm run dev        # http://localhost:5173
```

| Comando             | Cosa fa                                                   |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | server di sviluppo con hot reload                          |
| `npm run build`     | type-check + build di produzione in `dist/`                |
| `npm run preview`   | serve `dist/` in locale, come lo vedrà chi scansiona il QR |
| `npm test`          | self-check dei comandi del terminale e degli easter egg    |
| `npm run typecheck` | solo TypeScript                                            |

---

## 2. Struttura

```text
src/
  config.ts              ← nome, università, anno, URL del QR, ospiti
  types.ts               ← forma dei dati (Exam, Project, Thesis, CreditBlock)
  data/
    exams.ts             ← esami            (TODO: da sostituire)
    projects.ts          ← progetti         (TODO: da sostituire)
    thesis.ts            ← tesi             (TODO: da sostituire)
    credits.ts           ← ringraziamenti   (TODO: da sostituire)
    easterEggs.ts        ← oggetti nascosti + comandi del terminale
  scenes/
    Room.tsx             ← la stanza 3D (geometria, luci, camera)
    focus.ts             ← dove si ferma la camera in ogni primo piano
    Hotspot.tsx          ← rende un oggetto interattivo (hover, tap, etichetta)
    RoomFallback.tsx     ← versione 2D quando WebGL non è disponibile
  sections/
    Exams.tsx  Projects.tsx  Thesis.tsx  Credits.tsx  EasterEggs.tsx
  components/
    Boot.tsx             ← sequenza di avvio
    Hud.tsx              ← barra superiore + dock (anche navigazione da tastiera)
    Panel.tsx            ← bottom sheet su telefono / drawer su desktop
    FocusCard.tsx        ← la scheda dell'oggetto scelto dentro un primo piano
    Media.tsx  Toast.tsx  Icons.tsx  QrPage.tsx
  hooks/index.ts         ← reduced-motion, WebGL, ospite, localStorage
  styles/global.css      ← token di design + tutti gli stili
  labs/                  ← pagina /#/progetti: demo vive, codice, documenti
public/media/            ← screenshot e video dei progetti
public/labs/             ← artefatti dei laboratori (generati, committati)
scripts/check.mjs        ← self-check eseguito da `npm test`
scripts/check-labs.mjs   ← self-check dei laboratori, parte di `npm test`
scripts/labs/            ← `npm run labs`: costruisce public/labs (serve Docker)
```

Il flusso: `main.tsx` → `App.tsx` tiene lo stato (sezione aperta, easter egg
trovati, boot già visto), monta `Room` (lazy) oppure `RoomFallback`, e apre le
sezioni dentro `Panel`. Le sezioni leggono **solo** da `src/data/` — non c'è
contenuto personale dentro i componenti.

---

## 3. Sostituire i contenuti accademici

Tutti i segnaposto sono marcati con `TODO:` e, finché
`graduationConfig.isPlaceholder` è `true`, la stanza mostra in basso la
targhetta _"contenuti dimostrativi — da sostituire"_.

**Passo 1 — dati personali:** `src/config.ts`

```ts
export const graduationConfig = {
  name: 'Salvatore Pierri',
  degree: 'Computer Science',
  year: 2026,
  university: 'Università degli Studi di Torino',
  qrBaseUrl: 'https://...',   // ← vedi §5
  isPlaceholder: true,        // ← metti false quando hai finito
};
```

**Passo 2 — esami:** `src/data/exams.ts`. Un oggetto per esame:

```ts
{
  id: 'algoritmi',            // univoco, serve come chiave React
  name: 'Algoritmi e Strutture Dati',
  year: 2,                    // 1 | 2 | 3 → genera i filtri per anno
  cfu: 9,
  description: 'Una riga o due, anche per chi non studia informatica.',
  topics: ['Grafi', 'Complessità'],
  personalNote: 'La frase che ricorderai tra dieci anni.',
  grade: 30,                  // opzionale; 31 viene mostrato come "30L"
}
```

Aggiungi o togli esami liberamente: statistiche, filtri per anno **e i libri
sulla libreria 3D** si ricalcolano da soli (un libro per esame, dorato se il
voto è ≥ 30). I libri occupano i due ripiani bassi, ordinati per anno, e la
riga stringe il passo per stare nella larghezza invece di sbordare; i due
ripiani alti sono della collezione. Se un giorno non ci stanno più, `npm test`
lo dice invece di lasciarli compenetrare — allora alza `CASE_W` o aggiungi una
voce a `SHELF_GAPS` in `src/scenes/Room.tsx`.

**Passo 3 — progetti:** `src/data/projects.ts`. `media` punta a file dentro
`public/media/` (`{ src: 'media/foo.png', alt: '...' }`). `github` e `demo`
sono opzionali: se mancano, i pulsanti non compaiono. Se un'immagine manca, al
suo posto appare un segnaposto con l'alt text — niente si rompe.

**Passo 3-bis — laboratori:** ogni progetto con il campo `lab` ha la sua pagina
in `/#/progetti/<id>`: si prova (il C di ASD compilato in WebAssembly, i database
interrogabili con SQL, il frontend originale di Film Data), si sfoglia il codice e
si leggono i documenti. `npm run labs` (con Docker Desktop acceso) ricostruisce
`public/labs/`: compila il C con emscripten, esegue i test JUnit di Catering con
Maven, genera il database del delivery e prende i film da Wikidata (in cache in
`scripts/labs/cache/`). Il risultato si committa: il deploy non ha bisogno di Docker.
I percorsi dei progetti sul disco stanno in `scripts/labs/sources.mjs`; per
aggiungerne uno, una voce lì e una in `projects.ts` con il campo `lab`. L'esportazione
del codice si ferma se trova qualcosa che sembra una password o una chiave.

**Passo 4 — tesi:** `src/data/thesis.ts`. I cinque `steps`
(Problema → Ricerca → Sviluppo → Testing → Risultato) diventano la timeline
verticale; puoi cambiarne numero e nomi.

**Passo 5 — ringraziamenti:** `src/data/credits.ts`. `emphasis: true` rende il
blocco grande e in corsivo (usalo per apertura e chiusura). Nello stesso file
`creditRoll` sono i nomi che scorrono sullo schermo oltre la porta: cliccando
la porta la stanza chiede conferma e poi ti porta fuori, davanti allo schermo.
Gli stessi nomi compaiono in fondo al pannello "Grazie", così restano
leggibili senza WebGL e da screen reader.

**Passo 6 — easter egg:** `src/data/easterEggs.ts`. Contiene gli oggetti
nascosti nella stanza e la tabella dei comandi del terminale. Aggiungere un
comando è una riga: compare da solo in `help` ed è coperto da `npm test`.

Quando hai finito: `isPlaceholder: false`, poi `npm test && npm run build`.

---

## 4. Deploy (sito statico, nessun backend)

**Vercel / Cloudflare Pages** — build `npm run build`, output `dist`, nessun'altra
configurazione.

**GitHub Pages** — il workflow in `.github/workflows/deploy.yml` è già pronto:
abilita Pages con _Source: GitHub Actions_ e fai push su `main`. Imposta da solo
`VITE_BASE` (`/<nome-repo>/`); per un sito utente `<nome>.github.io` usa
`VITE_BASE: /`.

Qualunque altro host statico va bene: serve solo servire `dist/`.

---

## 4-bis. Durare nel tempo

La bomboniera è un oggetto fisico: il link stampato sopra non si cambia più.
Quello che segue è l'ordine in cui le cose si rompono davvero, dal più probabile.

**1. Il dominio scade.** È l'unico costo ricorrente e l'unico guasto che
trasforma il QR in una pagina di qualcun altro. Registra il dominio per più
anni in una volta, lascia il rinnovo automatico e controlla che la carta
collegata non scada prima. Un sottodominio gratis (`*.github.io`,
`*.vercel.app`) non scade, ma lega il link per sempre a quell'account e a
quell'azienda: non si può spostare. Il dominio proprio è l'unica cosa che ti
permette di cambiare hosting senza ristampare le bomboniere.

**2. L'hosting cambia o chiude.** Con il dominio tuo è mezz'ora di DNS. Il sito
è statico e `base` è relativo, quindi `dist/` funziona identico alla radice di
un dominio, dentro una sottocartella o su un host diverso, **senza essere
ricompilato**.

**3. Il progetto non si ricompila più.** Fra cinque anni `npm install` può non
risolvere più le dipendenze. Per questo la copia che conta non è il sorgente ma
**`dist/`**: è HTML, CSS e JavaScript normali, che i browser sapranno ancora
eseguire. Tieni uno zip di `dist/` insieme al sorgente e a `package-lock.json`,
in due posti diversi (un repo remoto e un drive).

**4. Il browser cambia.** Rischio basso: niente in questa app usa API esotiche,
e se WebGL non c'è si apre da sola la stanza 2D. L'unica dipendenza esterna a
runtime sono i font di Google: se un giorno non rispondono il sito funziona
lo stesso, cambia solo il carattere. Per essere autosufficienti al 100% basta
scaricare i due `.woff2` in `public/fonts/` e sostituire il `<link>` in
`index.html` con delle regole `@font-face`.

**5. Il QR si rovina.** Stampa l'URL anche in chiaro accanto al codice: si
digita a mano e sopravvive a un graffio. Vale la pena anche salvare l'indirizzo
su [web.archive.org](https://web.archive.org/save) una volta pubblicato.

---

## 5. Il QR e gli URL

L'app **non** genera il QR fisico, ma stampa quello che devi codificare:

1. metti in `graduationConfig.qrBaseUrl` l'URL definitivo (senza slash finale);
2. apri **`/#/qr`** (es. `http://localhost:5173/#/qr`);
3. la pagina mostra un QR per ogni variante e un bottone _scarica PNG_ — quelli
   sono i file da mandare in stampa.

**URL da codificare:**

| Bomboniera        | URL                               |
| ----------------- | --------------------------------- |
| standard          | `https://tuo-dominio/`            |
| dedicata a Marco  | `https://tuo-dominio/?for=marco`  |
| dedicata a Giulia | `https://tuo-dominio/?for=giulia` |

Le varianti si definiscono nella mappa `guests` in `src/config.ts`: ogni ospite
ha `label` (mostrato nell'intestazione) e `message` (mostrato a fine boot). Uno
slug sconosciuto viene ignorato e si apre la versione standard.

La forma `?for=` funziona ovunque senza configurazione. Se un giorno preferisci
`tuo-dominio/graduation/marco`, il parser in `src/hooks/index.ts` legge già
anche l'ultimo segmento del path: basta aggiungere il rewrite SPA dell'host
(`/* → /index.html 200`).

Stampa il QR ad almeno **2 cm** di lato: su un oggetto piccolo è il limite sotto
il quale i telefoni iniziano a faticare.

---

## 6. Dove si cambia l'aspetto

**Colori e font:** in cima a `src/styles/global.css`, blocco `:root`. Cambia
`--gold` e `--jade` e cambia tutta l'interfaccia. I font arrivano da Google
Fonts, dichiarati in `index.html` (Newsreader per i titoli, JetBrains Mono per
l'interfaccia).

**I primi piani:** `src/scenes/focus.ts`. Toccare uno scaffale, il monitor, il
piedistallo o la porta non apre un pannello: la camera vola davanti all'oggetto
e lì dentro si interagisce come nella stanza (si sfila un libro, si sceglie una
riga sullo schermo, si prende un passaggio della tesi). Ogni voce di
`FOCUS_VIEWS` è una posizione di camera:

```ts
exams: {
  target: [2.05, 1.05, -2.15],  // il punto che la camera guarda
  azimuth: 0.3,                 // 0 = di fronte (+z), PI/2 = di lato (+x)
  polar: 1.3,                   // PI/2 = ad altezza occhi, meno = più dall'alto
  zoom: 2.5,                    // quante volte più vicino della stanza intera
  spread: FOCUS_SPREAD,         // quanto si può ancora girare una volta arrivati
}
```

`npm test` controlla che ogni camera punti davvero al suo oggetto e non finisca
dietro un muro, quindi se sposti un hotspot il test te lo dice.

**La stanza 3D:** `src/scenes/Room.tsx`.

- le costanti `GOLD`, `WOOD`, `WOOD_DARK`, `SHELL` in cima sono la palette degli oggetti;
- `SceneContent` contiene luci e posizioni: ogni `<Hotspot position={[x, y, z]}>`
  si sposta cambiando tre numeri;
- `FitCamera` decide quanto si vede (`ROOM_W` / `ROOM_H`: più piccoli = più vicino);
- `<OrbitControls>` limita la rotazione — allarga `minAzimuthAngle` /
  `maxAzimuthAngle` per dare più libertà di giro.

Gli oggetti sono tutti geometrie primitive: nessun modello da scaricare, quindi
la stanza pesa poco e si carica in fretta anche da rete mobile.

**Le etichette degli hotspot:** `src/scenes/Hotspot.tsx` (`labelHeight` = quanto
in alto fluttua l'etichetta, `ring` = il cerchio dorato a terra).

---

## 7. Comportamento su dispositivi diversi

- **Mobile first:** comandi ≥ 40px, niente scroll orizzontale, sezioni come bottom sheet.
- **Niente WebGL:** parte `RoomFallback`, una griglia 2D con le stesse sei
  destinazioni. Il chunk di Three.js (~300 kB gzip) non viene nemmeno scaricato.
- **Tastiera:** il dock in basso è vera navigazione (`Tab` + `Invio`), perché le
  mesh dentro il canvas non possono ricevere il focus. C'è anche uno skip link.
  Dentro un primo piano, _Elenco completo_ apre la sezione come pannello, così
  tutto il contenuto resta leggibile senza toccare oggetti in 3D; `Esc` torna
  indietro.
- **`prefers-reduced-motion`:** niente animazioni né fluttuazioni, il boot appare
  già completo.
- **Orizzontale su telefoni bassi:** compare l'invito a ruotare.
- **Boot:** si vede per intero solo la prima volta (flag in `localStorage`), ed è
  sempre saltabile.

## Crediti dei modelli

Il guardiano della stanza nascosta è **"Rotom" di IdjeA** (Thingiverse,
`thing:4729117`), usato sotto licenza **Creative Commons — Attribution**.
La licenza chiede una sola cosa: citare l'autore. I file originali, il loro
`LICENSE.txt` e il `SOURCE.txt` con il link stanno in `src/assets/rotom/`,
accanto ai tre pezzi rinominati (`rotom-body`, `rotom-electric`, `rotom-halo`:
corpo, struttura elettrica, piastra dell'alone). `npm test` fallisce se questa
citazione sparisce dal README mentre i file sono ancora nel progetto.

Tutto il resto della stanza è geometria scritta a mano: nessun altro asset di
terze parti, nessun download a runtime.
