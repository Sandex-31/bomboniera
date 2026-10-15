# Demo dei nuovi progetti — design

Data: 2026-10-15 · Stato: approvato in chat, in revisione scritta

## Obiettivo

I quattro progetti aggiunti il 15/10 (Compilatore LFT, Centrale nucleare,
Client Email, MTDI) hanno solo Codice e Documenti. Devono avere una scheda
**Prova** come ASD, Catering, Food Delivery e Film Data: qualcosa che risponde a
un input del visitatore. Il sito resta statico (GitHub Pages, nessun backend).

**Successo:** per ognuno dei quattro, da `/#/progetti/<id>` la scheda Prova si
apre per prima e in un tocco produce un risultato. Dove il codice originale può
girare nel browser gira quello (LFT); dove non può, la riscrittura segue il
codice originale riga per riga, e la pagina lo dice.

## Decisioni prese

| Domanda | Scelta |
|---|---|
| Fedeltà | Mista: codice originale per LFT (CheerpJ); riscrittura TS fedele per centrale, email, MTDI |
| Centrale nucleare | Terminale con le righe del `printf` del Master + vista animata dei processi, parametri regolabili |
| Client Email | Due client (Simone, Laura) + pannello admin nella stessa pagina, server nel browser |
| MTDI | "Il banco delle scelte" come gioco, sull'esempio degli animali esotici della relazione |
| Ordine | MTDI → Email → Centrale → LFT (LFT dipende dalla verifica di CheerpJ) |

## Fuori scope

- Far girare i binari originali della centrale (v86/Linux virtuale): troppo
  pesante; scartato in chat.
- JavaFX originale del client email: CheerpJ non lo supporta.
- Editor libero di `switch` per MTDI (scartato in favore del gioco).
- Modifiche ai sorgenti originali in `ProgettiUni-dal-laptop`.

## 1 · Integrazione nella pagina `/#/progetti`

- `Project.lab` (`src/types.ts`) passa da `"asd" | "sql" | "site"` a
  `"asd" | "sql" | "site" | "lft" | "so" | "email" | "mtdi"`.
- `DEMOS` in `src/labs/LabsPage.tsx` registra un componente `lazy` per ogni
  nuovo tipo, in `src/labs/<tipo>/`. `TRY` riceve l'etichetta della card
  ("compila ed esegui", "avvia la simulazione", "manda una mail",
  "gioca al banco delle scelte").
- In `src/data/projects.ts`: `lft` → `lab: "lft"`, `so-centrale` → `lab: "so"`,
  `client-email` → `lab: "email"`, `mtdi` → `lab: "mtdi"` e mantiene `noCode`.
  Con `lab` la scheda Prova esiste ed è la prima.
- Il test in `scripts/check-labs.mjs` che elenca i progetti con `lab` si
  aggiorna con i quattro nuovi; quello "mtdi shows documents only" diventa
  "mtdi: Prova e Documenti, niente Codice".
- Le riscritture (centrale, email, MTDI) mostrano sotto la demo una riga:
  "Riscrittura in TypeScript di `<file originali>`: stessa logica, nel
  browser." con link alla scheda Codice (assente per MTDI, che non ha codice).

## 2 · Compilatore LFT — codice originale su CheerpJ

**Build** (`scripts/labs/lft.mjs`, nuovo passo `lft` in `index.mjs`):
- `javac --release 8` sui `.java` di `LFT-5.2/src` (sorgente da
  `SOURCES.lft.dir`), `jar` in `public/labs/lft/lft.jar`.
- Copia `jasmin.jar` in `public/labs/lft/jasmin.jar`.
- Nessuna modifica ai sorgenti. Se il `Translator` non trova `text.txt` con il
  percorso relativo dentro CheerpJ, si aggiunge **una** classe di avvio
  `LabMain` (in `scripts/labs/lft/LabMain.java`, fuori dal progetto) che
  sistema il percorso e chiama `Translator.main`. Da verificare per primo
  (task 0 del piano, insieme alla cattura dello stdout).

**Runtime** (`src/labs/lft/LftLab.tsx` + `cheerpj.ts`):
- CheerpJ 4.x si carica dal loader ufficiale
  (`https://cjrtnc.leaningtech.com/<versione>/loader.js`, versione fissata)
  solo al primo clic su **Compila ed esegui**, non all'apertura della pagina.
  Licenza community: uso personale/non commerciale, ok per il sito.
- Sequenza per ogni esecuzione:
  1. scrive il programma come `text.txt` nel file system di CheerpJ;
  2. esegue `Translator` → cattura lo stdout ("Input OK" o l'errore del
     parser) e legge `Output.j`;
  3. esegue `jasmin.Main Output.j` → `Output.class`;
  4. esegue `Output` con stdin preso dal campo "input per `read()`" (un
     intero per riga).
- La pagina mostra tre riquadri: **programma** (editor monospaziato con 4
  esempi: quello di `text.txt`, un `for`, un `if/else` annidato, uno con
  errore di sintassi), **Jasmin generato** (`Output.j`), **output**.

**Errori:** CheerpJ non raggiungibile → "Il runtime Java non si è caricato", e
il resto della pagina (Codice, Documenti) funziona. Errore del parser →
mostrato com'è, in rosso, e i passi 3–4 non partono.

## 3 · Centrale nucleare — riscrittura TS

`src/labs/so/engine.ts` (puro, senza DOM) + `SoLab.tsx` (UI) + `canvas.ts`.

**Motore**, deterministico con seme (stesso generatore di
`scripts/labs/seed.mjs`), avanza a tick; ogni secondo simulato produce un
report del Master.

- **Parametri** (default = `#define` originali): `NATOM 500`,
  `N_MAX_ATOM 80`, `N_MIN_ATOM 2`, `ENERGY_DEMAND 200000`,
  `ENERGY_EXPLODE_THRESHOLD 3000000`, `SIM_DURATION 60`,
  `N_NUOVI_ATOMI 100`, più `MAX_PROCESSI`: è l'`ulimit -u` della VM, che
  nell'originale fa scattare MELTDOWN perché Alimentazione forka 100 atomi
  ogni 0,5 ms. Il ritmo di Alimentazione è scalato a "ogni N tick", e la
  pagina lo dichiara.
- **Atomo(temp)**: `n = rand(1..temp)`; energia liberata come in
  `Energy(temp, temp−n)`, cioè `temp·(temp−n) − max(temp, temp−n)`; con
  l'inibitore attivo, `energyRubata += e/1.7` e all'energia va il resto, con
  la stessa aritmetica intera di `Atomo.c`. Se `n ≤ N_MIN_ATOM` → scoria,
  termina. Altrimenti aspetta la finestra dell'attivatore, poi si scinde: un
  figlio `Atomo(temp−n)`, `scissioni++`, `index++`.
- **Attivatore**: apre la finestra (`attivatore = 0`) ogni 2 secondi; dopo un
  SIGUSR1 dell'inibitore resta fermo (`logInibitore++` a ogni attesa) finché
  un'estrazione ≤ 50 su 1000 lo sblocca.
- **Inibitore**: parte disattivo; `kill -USR2 <pid>` lo attiva/disattiva e
  stampa "Inibitore Attivato/Disattivato" come l'handler originale. Attivo →
  `Inibitore = 1` e SIGUSR1 all'attivatore ogni secondo.
- **Alimentazione**: `N_NUOVI_ATOMI` atomi con `temp = rand(0..N_MAX_ATOM)`.
- **Master**: ogni secondo stampa il blocco originale (stesse righe, stessi
  testi, stessi separatori), poi controlla: energia > soglia → `EXPLODE`;
  energia − domanda < 0 → `BLACKOUT`; processi > `MAX_PROCESSI` →
  `MELTDOWN`; tempo = `SIM_DURATION` → `Tempo scaduto`. Il primo esito ferma
  la simulazione.

**Pagina:** riga di controlli (cursori per i parametri, seme, velocità 1×/4×/
16×, **Avvia**/**Stop**/**Ricomincia**, pulsante `kill -USR2 <pid>` con il pid
fittizio stampato da "Pid Inibitore->"). Sotto, a due colonne (una sola sotto
i 720 px): terminale a sinistra; a destra un canvas con gli atomi come punti
(colore per `temp`, scorie grigie, lampo alla scissione), la barra
dell'energia con le linee di domanda e soglia, e i contatori.

**Prestazioni:** il canvas disegna al massimo 2000 punti (oltre: un campione
più il contatore); il motore tiene contatori aggregati e non crea oggetti
oltre `MAX_PROCESSI`.

## 4 · Client Email — riscrittura TS

`src/labs/email/server.ts` (puro) + `socket.ts` + `EmailLab.tsx`.

- **Server** (porta di `ServerMain.java`): stesso formato di messaggio
  (`DA:`/`A:`/testo/`---END---`), registrazione `CLIENT:<email>` e admin,
  consegna immediata a chi è collegato, coda per chi non lo è e consegna al
  login, `DELETE_MESSAGE`, log verso l'admin con gli stessi testi
  ("Client registrato: …", "Messaggio mandato a: …", …). Stato in memoria
  della pagina; `messages.txt` diventa un array.
- **Socket finta**: una coda asincrona per client (`send(line)`,
  `onLine(cb)`), con 50–150 ms di ritardo così si vede il viaggio.
- **Client** (dalle FXML `Login`, `EmailClient`, `EmailAdmin`): login per
  indirizzo, lista messaggi, lettura, **Scrivi**, **Rispondi**, **Inoltra**,
  **Elimina**, destinatari multipli separati da virgola come nell'originale.
  Account: `simone@example.com`, `laura@example.com`, `giacomo@example.com`
  (utenti) e `admin@example.com` (admin), gli stessi della copia pubblicata.
- **Pagina:** tre finestre affiancate (impilate su schermi stretti): Simone,
  Laura, Admin. Giacomo non è aperto: una mail per lui resta in coda, e il
  pulsante "apri Giacomo" mostra la consegna al login. Stile ispirato a
  `Sign.css`, non una copia pixel per pixel.

## 5 · MTDI — Il banco delle scelte

`src/labs/mtdi/switch.ts` (puro) + `MtdiLab.tsx`.

- **Modello:** lo `switch` degli animali esotici della relazione (casi 1–10 +
  `default`), ogni `case` con il suo verso e un flag `break`.
  `run(valore, breaks)` restituisce i case eseguiti, in ordine.
- **Pagina:** a sinistra il codice Java, con le righe eseguite evidenziate; a
  destra i "banchi", un riquadro per `case`. Scegli un numero (1–12: 11 e 12
  mostrano `default`) e il banco giusto si accende; un interruttore su ogni
  banco toglie o rimette il `break`, e il fall-through scende banco per banco
  con una breve animazione (spenta con `prefers-reduced-motion`).
- Un riquadro "Prima dello switch" mostra la versione `if/else if` della
  relazione, per il confronto che l'attività propone.

## 6 · Errori e degradazione

- Ogni demo è `lazy` dentro il `Suspense` esistente; un errore di caricamento
  mostra lo stesso messaggio delle altre demo.
- Solo LFT dipende dalla rete (CheerpJ); le altre tre funzionano offline una
  volta caricata la pagina.
- Nessuna demo blocca il thread principale per più di un frame: la centrale
  avanza i tick a lotti dentro `requestAnimationFrame`.

## 7 · Verifica (`npm test`)

In `scripts/check-labs.mjs`, senza browser:
- **MTDI:** `run` su 1..12 con tutti i `break` → un solo case (o `default`);
  senza il `break` del case 3 → eseguiti 3 e 4.
- **Email:** invio a un collegato → consegnato e loggato all'admin; invio a un
  non collegato → in coda, consegnato al login; `DELETE_MESSAGE` lo toglie;
  più destinatari.
- **Centrale:** a seme fisso, quattro configurazioni producono
  rispettivamente `EXPLODE`, `BLACKOUT`, `MELTDOWN`, `Tempo scaduto`; il
  blocco stampato ha le righe del `printf` originale; l'energia di un atomo
  coincide con la formula di `Atomo.c` su casi scritti a mano.
- **LFT (build):** `lft.jar` contiene `Translator.class` e `jasmin.jar`
  esiste; se `java` è installato, `java` sul `text.txt` d'esempio produce un
  `Output.j` uguale a quello della consegna.
- **Pagina:** render SSR di ogni progetto con la scheda Prova; `mtdi` senza
  Codice.
- **LFT nel browser:** verifica manuale, perché CheerpJ non gira in Node:
  compilare ed eseguire i 4 esempi e vedere comparire l'errore di sintassi.

## Peso

Circa 160 KB in più in `public/labs/lft/` (`lft.jar` ~30 KB, `jasmin.jar`
128 KB) e qualche decina di KB di codice per le tre riscritture, caricato solo
aprendo la demo. CheerpJ (~20 MB) non è nel bundle: arriva dalla sua CDN al
primo uso e poi resta in cache.
