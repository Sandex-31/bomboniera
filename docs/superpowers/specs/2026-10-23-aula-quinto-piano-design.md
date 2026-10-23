# L'aula: il quinto e ultimo piano, design

Data: 2026-10-23. Viene dopo il pozzo (`2026-10-21-pozzo-animal-well-design.md`): si arriva qui
buttandosi nel pozzo che si apre sotto l'altare.

**Stato: in attesa dell'approvazione di Salvo.**

## Perché

L'ultimo piano è un'aula universitaria con dieci puzzle, uno per esame. Sulla cattedra c'è la
bomboniera vera, il portatile steampunk, che è il puzzle finale. Questo piano chiude tutto il
percorso: la torre racconta tre anni di Informatica, e qui si dà l'ultimo esame. Quando si apre il
portatile, parla Salvo.

## Deciso con Salvo

- **Tema:** un'aula universitaria, l'ultimo piano.
- **Dieci puzzle collegati**, ognuno legato a un esame. Gli esami li ha scelti il builder, e sono
  quelli qui sotto, approvati da Salvo.
- **La bomboniera** sta sulla cattedra ed è il **puzzle finale**. Il modello è
  `C:\Users\salva\Downloads\FinaleQReasy.3mf`: un **portatile steampunk** con tastiera, coperchio,
  ingranaggi e un cuore sulla base rotonda.
- **Il finale non mostra il QR.** Aperto il portatile, sullo schermo parte un **video di Salvo** che
  ringrazia chi ha completato la bomboniera.
- **Il video non c'è ancora**: si mette un segnaposto, e Salvo lo registra dopo.
- **È il piano più difficile di tutti**, più del pozzo. **Un visitatore bravo ci mette ben più di
  un'ora, anche due e oltre.** Ogni puzzle chiede lavoro vero, anche con carta e penna.
- **Il libretto non ha voti veri:** ogni esame mostra «superato».
- Sulla struttura proposta, cioè risultati che passano da un puzzle all'altro, piani precedenti
  riusati, bocciatura con prossimo appello e niente indizi in chiaro, Salvo ha detto: «mi piace,
  niente da cambiare».

## Proposte mie, accettate da Salvo

- **Gli esami e i loro puzzle**, nel grafo qui sotto.
- **Le propedeuticità**: alcuni puzzle si aprono solo dopo altri, come gli esami veri.
- **I risultati passano da un puzzle all'altro.** Il risultato di un puzzle è un *dato* che serve per
  risolverne un altro, non basta che lo sblocchi.
- **I piani precedenti tornano**: alcuni puzzle si risolvono solo con soluzioni già trovate sopra.
- **Bocciato, prossimo appello.** Una risposta sbagliata chiude quel puzzle per un'attesa breve.
- **Niente indizi scritti in chiaro.** Gli indizi stanno nella stanza: lavagna, banchi, quaderni,
  registro del prof.
- **Il libretto**: ogni puzzle risolto viene registrato, e con dieci esami registrati il portatile si
  apre.
- **Sistemi Intelligenti è l'ultimo** e si risolve con i risultati di tutti gli altri, come l'ultimo
  esame vero di Salvo.
- **Il codice del portatile** si digita sulla sua tastiera.
- **Il video parte con un tocco**, perché sul telefono l'audio non parte da solo, e si può rivedere
  riaprendo il portatile.

## Il grafo

Le frecce sono propedeuticità: il puzzle a destra si apre solo dopo quello a sinistra, e ne usa il
risultato.

```
 Architettura ── byte ──────────────▶ ASD ── percorso ──┐
 Analisi ── area ──▶ Fisica 1 ── corrente ──────────────┤
 Logica ── tavola ──▶ LFT ── parola ──┐                 ├──▶ Sistemi Operativi ── ordine ──┐
 Basi di Dati ── matricola ───────────┴──▶ IUM-TWEB ── hash ──────────────────────────────┤
                                                                                         ▼
                 tutti e nove i risultati ──▶ Sistemi Intelligenti (CSP) ──▶ codice
                                                                                         ▼
                          libretto pieno ──▶ portatile sulla cattedra ──▶ codice sulla tastiera
                                                                                         ▼
                                              Rotom entra nel portatile ──▶ video di Salvo
```

- **Radici**, aperte da subito: Architettura, Analisi, Logica, Basi di Dati.
- **Fisica** richiede Analisi. **ASD** richiede Architettura. **LFT** richiede Logica.
- **IUM-TWEB** richiede LFT e Basi di Dati.
- **Sistemi Operativi** richiede ASD e Fisica.
- **Sistemi Intelligenti** richiede tutti gli altri nove.

*Scelta mia:* queste propedeuticità servono al puzzle e non sono quelle vere dell'università.

## I dieci puzzle

Di ogni puzzle si dice dove si gioca nell'aula, cosa prende (da altri puzzle o dai piani
precedenti) e cosa dà. Le note tra virgolette sono di Salvo, da `src/data/exams.ts`, e sono il seme
del puzzle.

### 1. Architettura degli Elaboratori: il programma sulla lavagna

> «se avessi programmato a 01010100110 sarebbe stato più semplice»

- **Dove:** un angolo della lavagna con un breve programma in pseudo-assembly (registri, `ADD`,
  `SHL`, `AND`, un salto), e accanto un banco di **8 interruttori** a leva.
- **Prende:** il valore iniziale di un registro viene da un **piano precedente**. *Scelta mia:* è una
  cifra del numero **9017432** del telefono del pozzo. Quale cifra lo dice un disegno sulla lavagna,
  per esempio una cornetta con una posizione, mai un numero.
- **Si gioca:** il visitatore esegue il programma a mano e mette il risultato in binario sugli
  8 interruttori.
- **Dà:** un **byte**, che diventa i pesi del grafo di ASD.
- La pila altissima di libri accanto, le «1700 pagine di orale», è solo decorazione.

### 2. Analisi Matematica: l'area sotto la curva

> «passata al secondo colpo solo perché l'esame era strutturato a minchia»

- **Dove:** la lavagna grande, con il grafico di una funzione su una quadrettatura.
- **Si gioca:** l'area sotto la curva tra due estremi segnati, cioè un integrale definito. Si trova
  contando quadretti e mezzi quadretti o con il calcolo vero, e il risultato è intero.
- **Il secondo colpo** (*scelta mia*):
  - la **prima** risposta giusta viene comunque bocciata, con un motivo assurdo scritto sul
    registro;
  - la stessa risposta, data di nuovo al prossimo appello, passa;
  - una risposta sbagliata viene bocciata normalmente;
  - il registro deve far capire che la risposta era giusta, per esempio con il numero corretto
    cerchiato in rosso e il motivo assurdo, così il visitatore riprova la stessa risposta.
- **Dà:** l'**area**, un intero, che diventa la tensione della batteria di Fisica.

### 3. Fisica 1: il circuito e l'elettrocalamita

> «Provato mille volte»

Deciso con Salvo: il puzzle di Fisica riguarda l'**elettrodinamica**.

- **Dove:** un banco da laboratorio con una batteria, una scatola di resistenze, un amperometro e
  un'**elettrocalamita**. Sotto l'elettrocalamita c'è un peso di ferro.
- **Prende:** la **tensione** della batteria è l'area di Analisi, in volt.
- **Si gioca** (*scelta mia*):
  - le resistenze non hanno il valore scritto: si legge dalle **bande colorate**, con il codice dei
    colori vero;
  - il visitatore le monta in serie e in parallelo sugli attacchi del circuito;
  - l'elettrocalamita solleva il peso solo con la corrente giusta, né troppa né troppo poca. Con
    troppa corrente il filo fuma e il puzzle è bocciato;
  - va calcolata con Ohm e Kirchhoff, perché l'ago dell'amperometro trema e una lettura sola non
    basta. È il «provato mille volte»: chi tira a indovinare guardando l'ago non ci arriva.
- **Dà:** la **corrente** giusta, in milliampere interi, che entra in Sistemi Operativi come quanto
  di tempo.
- Un piccolo «grazie Archeus» quando riesce. La forma la sceglie il builder.

### 4. Logica Matematica: gli interruttori di verità

> «Spararsi nella giugulare è più divertente di quest'esame»

- **Dove:** una fila di banchi con tre interruttori, cioè le variabili, e una lampadina, cioè
  l'uscita.
- **Si gioca:** su un quaderno abbandonato c'è una formula in simboli logici (∧ ∨ ¬ →). Il
  visitatore riempie la **tavola di verità** segnando, per ogni combinazione, se la lampadina deve
  essere accesa.
- **Dà:** la **tavola**, otto bit, che diventa le transizioni mancanti dell'automa di LFT.

### 5. Linguaggi Formali e Traduttori: l'automa

> «la valutazione del prof è stata 2 secondi di sguardo e un "top ok"»

- **Dove:** una lavagna laterale con un automa a stati finiti disegnato a metà.
- **Prende:** la **tavola di Logica**. Ogni riga dice se una delle frecce mancanti c'è o no.
- **Si gioca:** completato l'automa, il visitatore cerca la **parola più corta accettata** e la
  compone toccando le lettere.
- **Quando riesce**, compare il prof per due secondi, dice «top ok» e se ne va.
- **Dà:** la **parola**, che diventa il messaggio di commit di IUM-TWEB.

### 6. Algoritmi e Strutture Dati: il percorso tra i banchi

> «il prof dell'orale era simpaticissimo e brasileiro»

- **Dove:** il pavimento dell'aula. I banchi sono i **nodi** di un grafo e i corridoi tra loro sono
  gli **archi**.
- **Prende:** i **pesi** degli archi vengono dal byte di Architettura: ogni bit decide se un arco è
  lento o veloce. *Scelta mia:* la forma del grafo richiama il **labirinto** del primo piano.
- **Si gioca:** il percorso minimo dalla porta alla cattedra, come in Dijkstra, toccando i banchi in
  ordine.
- **Dà:** l'**ordine** dei banchi, che diventa l'ordine di arrivo dei processi in Sistemi Operativi.
- Da qualche parte c'è un dettaglio brasiliano, scelto dal builder.

### 7. Basi di Dati: il JOIN dei due registri

> «L'unico esame dove ho parlato con un tutor, inutile»

- **Dove:** sulla cattedra, due registri: **studenti** (nome, matricola) ed **esiti** (matricola,
  esame, esito).
- **Prende:** *scelta mia*, i nomi nel registro sono i personaggi dei piani sopra, come Rotom, il
  keeper e le sagome, così si riconoscono.
- **Si gioca:** il visitatore compone una query toccando dei cartellini (`SELECT`, `JOIN`, `ON`,
  `WHERE`, i campi) per trovare l'unico studente che soddisfa una condizione, risolvibile solo
  incrociando le due tabelle. La condizione la sceglie il builder.
- **Il tutor:** un personaggio che, toccato, dà consigli del tutto inutili. È una battuta.
- **Dà:** una **matricola**, che serve a IUM-TWEB.

### 8. IUM-TWEB: il git esploso

> «l'ultimo giorno della consegna Senia mi chiama dicendomi che era esploso tutto il git mentre ero
> a bologna per il pycon»

- **Dove:** il proiettore dell'aula, che mostra un file in conflitto (`<<<<<<<`, `=======`,
  `>>>>>>>`).
- **Prende:** la **matricola** di Basi di Dati, che serve come valore dentro il file, e la
  **parola** di LFT, che va scritta come messaggio di commit.
- **Si gioca:** per ogni conflitto si sceglie quale versione tenere. La scelta giusta si capisce dal
  codice stesso, perché una delle due versioni rompe qualcosa di visibile. Poi si fa il commit con la
  parola giusta.
- **Una telefonata di Senia** a metà puzzle, solo come scena.
- **Dà:** l'**hash** del commit, i primi caratteri, che entra in Sistemi Intelligenti.

### 9. Sistemi Operativi: il deadlock e l'umore del prof

> «ho capito che i voti sono completamente a discrezione dell'umore di un professore»

- **Dove:** una fila di banchi con 5 processi, cioè 5 studenti, e le risorse condivise (penne,
  calcolatrici, fogli), come i filosofi a cena.
- **Prende:** l'**ordine di arrivo** da ASD e il **quanto di tempo** da Fisica.
- **Si gioca:** i processi sono bloccati in deadlock.
  - Il visitatore stabilisce l'ordine in cui prendono le risorse, così rompe l'attesa circolare.
  - Poi li fa girare in round robin con quel quanto e indica **in che ordine finiscono**.
- **L'umore del prof:** una faccia sulla cattedra cambia espressione. Il voto sul libretto per questo
  esame dipende dall'umore di quel momento. È l'unico voto casuale del piano e non cambia la
  soluzione.
- **Dà:** l'**ordine di fine** dei processi, che entra in Sistemi Intelligenti.

### 10. Sistemi Intelligenti: il CSP finale

> «Ultimo esame del mio percorso, ho pianto l'anima quando sono uscito da quell'orale»

- **Dove:** il libretto aperto sulla cattedra, accanto al portatile.
- **Prende:** **tutti e nove** i risultati.
- **Si gioca:** un problema a vincoli. Ci sono nove caselle da riempire, e ogni vincolo usa il
  risultato di un altro puzzle. La soluzione possibile è **una sola**.
- **Dà:** il **codice del portatile**, letto dalle caselle in ordine.

## Il finale: il portatile steampunk

1. Il portatile sta sulla cattedra, chiuso. Toccato prima del tempo non si apre, e Rotom fa una
   battuta.
2. Con il libretto pieno, cioè dieci esami registrati, il coperchio si alza, ma il portatile è
   spento e gli ingranaggi sono fermi.
3. Il visitatore digita il **codice di Sistemi Intelligenti** sulla **tastiera del portatile**, cioè
   sui tasti del modello 3D.
   - Un codice sbagliato fa un rumore di ingranaggi inceppati.
   - Qui non c'è bocciatura né appello.
4. Con il codice giusto gli **ingranaggi girano** e il cuore si illumina.
5. *Scelta mia:* **Rotom entra nel portatile**, come fa nel gioco con gli elettrodomestici, e lo
   schermo si accende.
6. Sullo schermo c'è un tasto di riproduzione: toccato, parte il **video di Salvo**.
7. Riaprendo il portatile in un'altra visita, il video si rivede subito, senza rifare il codice.

### Il segnaposto del video

- Il file sarà `public/media/finale.mp4`, con l'audio.
- Finché il file manca, lo schermo mostra un segnaposto: «il video di Salvo arriverà qui». Non si
  rompe niente, come per le immagini mancanti in `Media.tsx`.
- Il builder indica nel README quale risoluzione e quale peso deve avere il video per scaricarsi bene
  da telefono.

### Il modello 3D

- Il .3mf pesa 284 MB e contiene **5 copie** dello stesso oggetto. Se ne prende **una**, semplificata
  e convertita in un **GLB leggero**, al massimo qualche MB.
- Vanno separati dalla base, per poterli animare o toccare:
  - il **coperchio**, con la cerniera, per aprirlo;
  - gli **ingranaggi**, per farli girare;
  - i **tasti**, per toccarli. Se sono troppo piccoli da staccare, sopra la tastiera va una griglia
    di zone toccabili invisibili.
- Il colore lo decide il builder: il verde acqua dell'anteprima non è per forza quello della stampa.
- Per lavorare sul modello c'è Blender, collegato con l'MCP.

## Regole per tutto il piano

- **Bocciato, prossimo appello.** Una risposta sbagliata chiude il puzzle per circa 30 secondi, mai
  più di un minuto. Sopra il puzzle si vede la data del prossimo appello, con il conto alla
  rovescia. Il valore esatto lo decide il builder.
- **I puzzle sono deterministici.** Le soluzioni non cambiano tra una visita e l'altra. L'unica cosa
  che cambia è il voto dell'umore in Sistemi Operativi.
- **Nessun indizio in chiaro, ma parole e numeri sono ammessi.** A differenza del pozzo, qui siamo
  all'università: lavagne, registri e quaderni sono scritti. Come usarli, però, lo deve capire il
  visitatore.
- **Ogni risultato che passa a un altro puzzle resta visibile nell'aula** dopo che è stato trovato,
  scritto o disegnato vicino al puzzle che lo ha dato. Il visitatore non deve ricordarselo.
- **Almeno tre puzzle usano soluzioni dei piani precedenti.** Quelli proposti:
  - Architettura, con il 9017432 del pozzo;
  - ASD, con il labirinto;
  - Basi di Dati, con i personaggi.

  Il builder può cambiarli, purché restino riconoscibili. *Scelta mia, dopo la revisione:* queste
  soluzioni non vengono copiate nell'aula. Chi non le ricorda risale dal buco nel soffitto e va a
  rivederle. La regola del «non ricordare a memoria» vale solo per i risultati dell'aula.
- **Il libretto** si può sempre aprire, da un oggetto nell'aula o dall'HUD, e mostra gli esami
  superati.
  - Ogni esame mostra «superato», come deciso con Salvo.
  - Fa eccezione Sistemi Operativi, il cui voto lo dà l'umore del prof.
- **Rotom** torna normale, non più Gelo, appena atterra nell'aula, e si siede in un banco. Le battute
  le scrive Salvo; nel frattempo si usa il segnaposto `«Rotom: TODO — …»` come negli altri piani.
- **Lo stato si salva** come sugli altri piani: le chiavi in `src/data/puzzle.ts` e le fermate in
  `src/lib/stages.ts`, almeno una per puzzle più una per il portatile.
- **L'arrivo e il ritorno** funzionano come negli altri piani:
  - il pozzo del quarto piano diventa toccabile e porta qui;
  - un buco nel soffitto dell'aula riporta al pozzo;
  - lo stato di ogni puzzle resta salvato.
- **Funziona sul telefono**: ogni puzzle visto da vicino riempie lo schermo, con bersagli toccabili
  di almeno 44 px, come nel pozzo.
- **Riduzione del movimento**: come negli altri piani.

## Lasciato al builder

- La disposizione dell'aula: gradoni, finestre, dove sta ogni puzzle. Ogni puzzle ha la sua
  inquadratura ravvicinata, come le pareti del pozzo.
- I valori concreti di ogni puzzle: il programma, la funzione, la formula, l'automa, il grafo, le
  tabelle, il conflitto, i vincoli del CSP. Vanno scelti in modo che ogni catena dia **una sola**
  soluzione.
- Come appare ogni risultato quando entra nel puzzle successivo.
- La lunghezza del codice del portatile.
- Lo stile grafico dell'aula, che si deve accordare con gli altri piani 3D e con il portatile
  steampunk.

## Fuori da questo lavoro

- Il video vero, che registra Salvo.
- Un sesto piano: l'aula è l'ultimo.

## Cose da evitare

- Un puzzle che si risolve provando a caso: ogni risposta si ricava da un indizio, e l'appello rende
  costosi i tentativi.
- Un puzzle che chiede di ricordare un risultato invece di ritrovarlo nell'aula.
- Il QR nel finale.
- Testo scritto da Claude al posto di Salvo nel finale: il finale è il suo video.
- Un modello 3D che fa scaricare decine di MB a chi apre il sito dal telefono.
