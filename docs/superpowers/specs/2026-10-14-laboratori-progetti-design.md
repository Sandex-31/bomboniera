# Laboratori dei progetti — design

Data: 2026-10-14 · Stato: approvato in chat, in revisione scritta

## Obiettivo

Chi apre la bomboniera deve poter **usare** i quattro progetti d'esame, non
leggerne una descrizione: far girare il codice originale, interrogare i database,
navigare il frontend, sfogliare i sorgenti veri. Il sito resta statico (GitHub
Pages, nessun backend).

**Successo:** per ogni progetto, da `/#/progetti`, in meno di tre tocchi si arriva
a qualcosa che risponde a un input del visitatore e che è prodotto dal codice o
dai dati del progetto, non da una riscrittura.

## Decisioni prese

| Domanda | Scelta |
|---|---|
| Demo vive, codice o entrambi | Entrambi |
| Fedeltà | Codice originale che gira (C→WASM, `.db` veri, frontend vero), non riscritture TS |
| Dati dei film (CSV Kaggle persi) | Wikidata (CC0) |
| Recensioni, chat, ordini del delivery | Generati a seed fisso, etichettati "dati generati per la demo" |
| Dove | Nuova pagina `/#/progetti`; il pannello della stanza resta e ci rimanda |

## Fuori scope

- La business logic Java di Cat & Ring dal vivo: `sqlite-jdbc` è nativo e non
  gira in una JVM nel browser. Si mostrano il `.db` vero e il report JUnit vero.
- Il backend Spring/Express di Film Data: viene sostituito da risposte JSON
  statiche generate dagli stessi dati.
- Architettura degli Elaboratori e LFT: arriveranno dal portatile; la pipeline
  deve permettere di aggiungerli con una voce in più, non con codice nuovo.

## 1 · Dati

### Film Data (Wikidata)

`scripts/labs/film.mjs` interroga una volta l'endpoint SPARQL di Wikidata e
salva il risultato grezzo in `scripts/labs/cache/wikidata-films.json` (committato,
così il build non dipende dalla rete).

- ~500 film: istanza di *film* (Q11424) con sitelink su it.wikipedia, ordinati per
  numero di sitelink (proxy di notorietà).
- Campi: titolo italiano (fallback inglese), anno (P577), durata (P2047), generi
  (P136, etichetta italiana), descrizione Wikidata come `description`, `tagline`
  vuota se assente, immagine solo se il file è su Wikimedia Commons con licenza libera.
- Mappatura sullo schema del progetto: `movies(id, title, year, description,
  tagline, duration, rating)`, `genres(id, genre)`, `posters(id, link)`.
- `rating` = media delle recensioni generate, scala 0–5 come nel dataset originale.
- Locandina mancante → SVG tipografico generato (titolo + anno + colore dal
  genere), salvato come file, mai un'immagine protetta.

### Generati (seed fisso)

Un unico PRNG deterministico (`mulberry32`, seed costante) in
`scripts/labs/seed.mjs`, così ogni build produce gli stessi dati e i diff restano
leggibili.

- **Recensioni film:** 3–12 per film, `review_type` Fresh/Rotten, testo composto
  da frasi-modello per genere, data tra l'anno del film e oggi. Utenti fittizi.
- **Chat film:** 0–6 messaggi pre-caricati per film; i messaggi del visitatore
  restano in memoria nella pagina.
- **Food Delivery:** schema SQL tradotto dallo schema E-R del PDF (Utente, Conto,
  MetodoPagamento, Ristorante, Portata, Ordine, Rider, Recensione + associazioni),
  vincoli `CHECK`/`FOREIGN KEY` dove il PDF li indica. Seed: ~40 ristoranti,
  ~300 utenti, ~60 rider, ~3000 ordini, recensioni coerenti con gli ordini; le
  regole del PDF (Top Partner, priorità Premium) sono rispettate dai dati.

Ogni vista che mostra dati generati porta la targhetta **"dati generati per la
demo"**.

## 2 · Pipeline di build (`scripts/labs/`)

Si lancia con `npm run labs` (o `npm run labs -- asd` per uno solo). Scrive in
`public/labs/<id>/` e **i risultati vengono committati**: il workflow di deploy
non cambia e non ha bisogno di Docker.

| Script | Input | Output |
|---|---|---|
| `asd.mjs` | `~/Workspace/laboratorio-algoritmi-2024-2025-main` | `ex1..ex4` `main_*.{js,wasm}` e `test_*.{js,wasm}` via `docker run emscripten/emsdk emcc`, flag `-sMODULARIZE -sEXPORT_ES6 -sINVOKE_RUN=0 -sEXPORTED_RUNTIME_METHODS=callMain,FS -sALLOW_MEMORY_GROWTH`; dataset compressi |
| `catering.mjs` | lo zip in `Downloads/Telegram Desktop` | `catering.db`, `tests.json` (da `docker run maven:3-eclipse-temurin-11 mvn test`, parsing dei report Surefire) |
| `film.mjs` | cache Wikidata + `Project_IUM_TWEB/TWEB/solution/Website` | `site/` (copia del frontend), `api/*.json`, `posters/*.svg`, `shim.js`, `charts/*.png` (immagini estratte dagli output del notebook) |
| `delivery.mjs` | schema + seed | `delivery.db`, `schema.sql`, pagine del PDF come immagini |
| `code.mjs` | i repo/sorgenti | `code/<file>` + `code/index.json` (albero, lingua, dimensione) |

I percorsi sorgente stanno in un'unica tabella in `scripts/labs/sources.mjs`:
aggiungere un progetto = una voce lì + una in `src/data/projects.ts`.

Il tipo `Project` guadagna un campo opzionale `lab?: 'asd' | 'sql' | 'site'`
(il tipo di demo nella scheda Prova); la cartella è sempre `public/labs/<id>/`.
Senza `lab` il progetto ha solo Codice e Documenti.

### Dataset ASD

- **ex1** `records.csv`: generato nel formato della consegna
  (`id,field1,field2,field3`, `field1` da parole della Divina Commedia di
  pubblico dominio). Tre taglie: 1k, 100k, 1M record; la 1M si scarica solo su
  richiesta.
- **ex2** `dictionary.txt` (7,5 MB → gzip) e `correctme.txt` da Telegram.
- **ex3** testo per la parola più frequente: la Divina Commedia.
- **ex4** `italian_dist_graph.csv` (2,3 MB → gzip), 56 640 archi.

Il codice C non viene modificato: i `main` leggono già i file da `argv`. I file
vengono scritti nel MEMFS di emscripten e il programma si lancia con
`callMain([...])`; `stdout`/`stderr` vanno su un terminale nella pagina.

### Esploratore del codice — esclusioni

`code.mjs` copia solo file di testo tracciati da git (o presenti nello zip) e
**scarta** `.env*`, `config/*secret*`, `*.key`, `*.pem`, `serviceAccountKey*`,
`node_modules`, `target`, `.idea`, `.venv`, `*.db`, binari e file > 300 KB. Prima
di ogni copia cerca pattern di segreti (`password\s*=`, `mongodb+srv://`,
`AKIA`, `-----BEGIN`); un match ferma il build con il nome del file.

## 3 · Pagina `/#/progetti`

- Routing: `main.tsx` già distingue `#/qr`; si aggiunge `#/progetti` e
  `#/progetti/<id>[/<tab>]`, montati lazy (`React.lazy`) così la stanza 3D non
  paga il peso dei laboratori.
- **Indice:** quattro schede (titolo, esame, anno, cosa si può provare).
- **Progetto:** tre schede.
  - **Prova** — la demo:
    - *ASD*: scelta esercizio → form con gli stessi argomenti del `main`
      (campo/algoritmo, parola, lunghezza minima, città di partenza) → terminale
      con l'output e il tempo; bottone "esegui gli unit test" che lancia
      `test_exN`. Per ex4, i primi risultati della BFS anche come lista leggibile.
    - *Cat & Ring*: browser delle tabelle di `catering.db` + editor SQL con
      query d'esempio; accanto il report JUnit (test, esito, durata).
    - *Film Data*: il frontend originale in un `<iframe>` (`site/index.html`);
      `shim.js` sostituisce `axios` e `io()` così `localhost:3000/3002` diventano
      letture di `api/*.json` e una chat locale. Sotto, i grafici del notebook.
    - *Food Delivery*: browser + SQL su `delivery.db`, query d'esempio che
      rispondono alle domande del PDF (Top Partner, rider disponibili, ...).
  - **Codice** — albero da `code/index.json`, file aperto con evidenziazione;
    deep link al file nell'URL.
  - **Documenti** — relazioni PDF (`<iframe>` nativo), README renderizzato.
- SQL nel browser: `sql.js` (dipendenza nuova, ~1 MB wasm, caricato solo nelle
  schede dei database). Evidenziazione: `highlight.js` core + i linguaggi usati
  (C, Java, JS, SQL, HTML, CSS, Markdown), caricato solo nella scheda Codice.
  Nessun'altra dipendenza.
- Stile: token di `global.css`; su telefono schede impilate, terminale e
  tabelle con scroll interno, mai orizzontale sulla pagina.
- Nella stanza: `Projects.tsx` aggiunge a ogni dettaglio il link
  **"APRI IL LABORATORIO →"** verso `#/progetti/<id>`.

## 4 · Errori e degradazione

- WASM o `sql.js` non caricano → messaggio nella scheda Prova con link a
  Codice e Documenti; il resto della pagina funziona.
- Un `main` C che termina con codice ≠ 0 → l'output resta visibile, con lo stato
  di uscita.
- Query SQL errata → errore di SQLite mostrato sotto l'editor; database aperto
  in sola lettura in memoria, ricaricabile con "ripristina".
- Iframe di Film Data: se un endpoint non è nel set statico, lo shim risponde
  404 come il server vero, così il frontend mostra il suo stato di errore.

## 5 · Verifica

`npm test` (`scripts/check.mjs`) guadagna un blocco:

- ogni progetto in `projects.ts` con `lab` ha `public/labs/<id>/` con gli
  artefatti attesi;
- ASD: carica `main_ex2` in Node, `callMain` su un `correctme` minimo e confronta
  l'output; esegue `test_ex1..4` e richiede codice di uscita 0;
- `catering.db` e `delivery.db`: una query per tabella risponde; `tests.json`
  ha zero fallimenti;
- Film: ogni URL chiamato da `Website/public/javascripts` (`top10`,
  `genre/:g`, `search`, `:id`) ha un JSON corrispondente;
- `code/index.json` non contiene nessun percorso escluso.

Poi verifica manuale nel browser (desktop e larghezza telefono) prima del commit.

## Peso

Stima 15–25 MB in `public/labs/` (dataset compressi, wasm ~100–300 KB ciascuno,
`sql.js` ~1 MB). Niente viene scaricato finché non si apre il progetto.
