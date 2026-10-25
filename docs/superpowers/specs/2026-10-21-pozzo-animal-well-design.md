# Il pozzo: il quarto piano, a tema Animal Well, design

Data: 2026-10-21. Viene dopo la sala macchine (`2026-10-18-macchinari-design.md`): si arriva qui
dal buco che apre la pressa.

**Stato: approvato da Salvo.**

## Perché

Il quarto piano è il cuore di Animal Well dentro il sito. La sensazione deve essere quella del gioco:
buio quasi totale, pixel art, colori che brillano, pochi suoni. I puzzle sono quelli del gioco,
intrecciati con quelli già risolti nei piani sopra, così il piano chiude i conti con tutto il
percorso fatto fin qui. Deve essere il piano più complicato, più della sala macchine.

## Deciso con Salvo

- **Tema:** Animal Well. L'atmosfera deve essere quella del gioco e va citato il più possibile.
- **La forma:** una stanza 3D come gli altri piani, ma **più larga** delle altre. Le pareti sono lo
  **schermo 2D del gioco**, e i puzzle stanno lì dentro.
- **I cinque puzzle scelti da Salvo:** unisci i puntini, gli otto corvi in quadrato, il murale dei
  boccioli, la televisione, il murale della community.
- **Gli altri puzzle:** si possono prendere altri puzzle del gioco e unirli alle meccaniche dei piani
  sopra, comprese le soluzioni già trovate.
- **Il numero 9017432** va collegato al piano. Non ha un significato preciso, quindi il modo lo
  sceglie il builder. È stato approvato l'uso come **numero da comporre su un telefono** (i telefoni
  sono i punti di salvataggio del gioco).
- **Lo scheletro** proposto e approvato:
  - quattro pareti, ognuna con una catena di puzzle che porta a una **fiamma**;
  - le quattro fiamme accendono l'**altare** al centro;
  - poi c'è il **murale della community**;
  - completato il murale, si apre la strada al piano dopo.
- **Le quattro pareti** sono quelle proposte e approvate: la TV col telecomando, i corvi col ritmo,
  i boccioli con l'organo e gli specchi, i puntini con il telefono. Sono descritte sotto.
- **Il murale della community:** i suoi pezzi sono soluzioni che il visitatore ha già trovato nei
  piani precedenti.
- **Si gioca solo toccando.** Non c'è un personaggio da muovere.
- **Rotom:**
  - arrivato al piano diventa **Rotom Gelo**;
  - entra nel muro dicendo **«così ti controllo meglio»**;
  - dentro il muro è in **pixel art**;
  - a ogni tocco corre verso il punto toccato, come in un punta e clicca;
  - è **solo una cosa da guardare**: il tocco agisce subito e non aspetta che Rotom arrivi.
- **Materiale originale** del gioco, cioè sprite, musica ed effetti sonori, come per il brano di
  Isaac, con i crediti nel README.
- **Alla fine** si apre un **quinto piano**, come negli altri piani, **attraversando un pozzo**.

## Proposte mie, accettate da Salvo nel riepilogo

- **La trasformazione:** Rotom Calore scende nella luce fredda e bianca sotto la pressa, e lì
  diventa Rotom Gelo. Il freddo del pozzo lo trasforma.
- **Il flauto a 8 note** è lo strumento di tutto il piano. Ogni nota è una direzione (su, su-destra,
  destra, giù-destra, giù, giù-sinistra, sinistra, su-sinistra), come nel gioco. Si suona da una
  **rosa di otto frecce** sempre a portata di dito.
- **La luce UV** si trova in una parete e serve poi anche nelle altre, come nel gioco.

## Scelte mie dopo la revisione

- **Niente posizione nascosta del giocatore.** Nelle pareti non c'è un personaggio invisibile da
  muovere. Una parte di parete diventa toccabile quando la si è aperta: un passaggio aperto, un
  ponte di tartarughe, una strada di blocchi. Le uniche cose che si muovono davvero, e che le
  barriere possono fermare, sono gli animali dei puzzle: il cincillà, il porcospino, le tartarughe.
  - Il tempismo dei blocchi rosa e azzurri riguarda **il cincillà**. Il telecomando va usato mentre
    lui cammina, per non farlo cadere e portarlo fino al divano.
  - La luce della stanza buia è **intorno al dito**, non intorno a Rotom, così il tocco non aspetta
    mai Rotom.
- **La luce UV è una lanterna** che si accende e si spegne con un tasto. Accesa, illumina in viola
  un cerchio intorno al dito, e gli indizi nascosti si vedono solo dentro quel cerchio: bisogna
  cercarli. Usa lo stesso sistema di luce della stanza buia.
- **Come escono le cifre dei puntini.**
  - Ogni pilastro, toccato con la luce UV, mette sulla mappa un **gruppo di puntini**.
  - Unendo i puntini di un gruppo si disegna **una cifra**.
  - L'ordine delle cifre è quello dei pilastri lungo le pareti, in senso orario, partendo dal punto
    in cui Rotom arriva. Sulla mappa si vede dove sta ogni pilastro, quindi l'ordine si ricava
    guardando e non va indovinato.
- **Gli specchi del murale dei boccioli sono fissi.** Sono un disegno da leggere: il raggio tocca i
  boccioli nell'ordine giusto. Il visitatore non li sposta.
- **La strada per tornare su** è come negli altri piani:
  - toccando il buco della pressa nel soffitto si risale alla sala macchine;
  - Rotom torna Calore salendo e ridiventa Gelo quando riscende;
  - lo stato di ogni parete resta salvato.
- **I pezzi del murale** stanno sull'altare, non su una parete, quindi la regola del niente numeri
  e niente parole non vale. Ogni pezzo si vede con l'aspetto che aveva nel suo piano, per esempio
  47157 sulle rotelle del lucchetto, o la frase di Babele nella sua scrittura.

## Il grafo

```
                        ┌───────────────────────────────┐
  arrivo: Rotom Gelo ──▶│ parete 4: la stanza buia       │──▶ luce UV ──┐
                        └───────────────────────────────┘              │ serve a 1, 3, 4
  parete 1: cincillà e baule ─▶ telecomando ─▶ blocchi ─▶ TV ─▶ fiamma ①
  parete 2: porcospino nella scatola ─▶ otto corvi (ordine + ritmo) ─▶ fiamma ②
  parete 3: tartarughe col flauto ─▶ murale dei boccioli (organo + specchi) ─▶ fiamma ③
  parete 4: pilastri (UV, su tutte le pareti) ─▶ unisci i puntini ─▶ 9017432 al telefono ─▶ fiamma ④
                                   │
             ① ② ③ ④ sull'altare ─▶ murale della community ─▶ il pozzo ─▶ quinto piano
```

Le pareti si possono aprire tutte da subito, ma non si finiscono in qualsiasi ordine:

- **la luce UV**, della parete 4, serve per finire la 1, la 3 e la 4;
- **il flauto** serve dappertutto e c'è dall'inizio. *Scelta mia:* senza flauto non si può
  provare niente.

## Le pareti

Ogni parete è uno schermo 2D del gioco. Dentro ci sono una o più stanze di Animal Well
attaccate, che si attraversano toccando.

### Parete 1: il salotto della TV

1. **Il cincillà e il baule**, dal gioco.
   - Un baule sta su una mensola di blocchi verdi.
   - Il cincillà va verso dove tocchi.
   - Lo porti sotto il baule e premi l'interruttore verde: il baule gli cade in testa e si apre.
   - Dentro c'è il **telecomando**.
2. **I blocchi rosa e azzurri**, dal gioco.
   - Il telecomando scambia in un colpo tutti i blocchi della parete: quando i rosa sono pieni gli
     azzurri sono vuoti, e viceversa.
   - Il cincillà, che va verso dove tocchi, deve arrivare al divano. Va scambiato il colore dei
     blocchi mentre lui cammina, al momento giusto, perché non cada.
3. **La televisione**, scelta da Salvo.
   - Col telecomando accendi la TV e compaiono facce di fantasmi.
   - Ogni faccia guarda in una direzione. **Lo sguardo si vede bene solo con la luce UV.**
   - Le direzioni, in ordine, sono le note da suonare col flauto: le suoni e prendi la **fiamma ①**.

### Parete 2: i corvi

1. **Il porcospino nella scatola**, dal gioco.
   - Un porcospino cammina sempre dritto e torna indietro quando sbatte.
   - Con un interruttore alzi e abbassi una barriera finché non è passato su tre interruttori
     gialli.
   - Si apre il passaggio verso i corvi.
2. **Gli otto corvi in quadrato**, scelti da Salvo, uniti al **ritmo**, il primo puzzle del sito.
   - Otto corvi stanno sui lati e sugli angoli di un quadrato: ogni corvo è una direzione del flauto.
   - Gracchiano uno alla volta, **con un ritmo**: alcuni colpi sono brevi, altri lunghi.
   - Va ripetuto col flauto l'ordine giusto *e* il ritmo giusto: note brevi e lunghe, come i tocchi
     del primo puzzle.
   - Un errore fa ricominciare i corvi da capo, con lo stesso ordine.
   - Riuscito, si apre una stanza segreta con la **fiamma ②**.

### Parete 3: il murale dei boccioli

1. **Le tartarughe**, dal gioco.
   - Il murale è irraggiungibile, al di là dell'acqua.
   - Suoni il flauto e le tartarughe salgono a galla: ci passi sopra.
   - La melodia che le fa salire è dipinta vicino all'acqua e si vede con la luce UV.
2. **Il murale dei boccioli**, scelto da Salvo, unito all'**organo** del terzo piano e agli
   **specchi** del primo.
   - Ci sono quattro boccioli. Ognuno, toccato, suona con la **voce dell'organo a vapore**
     (`src/lib/organ.ts`).
   - L'ordine non è dipinto in chiaro. Sul murale c'è un raggio di luce che rimbalza su degli
     **specchi**, come nel puzzle degli specchi del primo piano, e tocca i boccioli uno dopo l'altro:
     quello è l'ordine.
   - Alcuni specchi si vedono solo con la luce UV.
   - Suonati nell'ordine giusto, il murale si apre sulla **fiamma ③**.

### Parete 4: la stanza buia e i pilastri

1. **La stanza buia dei fantasmi**, dal gioco. È la prima cosa che si incontra.
   - Al buio si vede solo intorno al dito.
   - Un petardo spaventa i fantasmi.
   - Tre candele accese mostrano i tre interruttori.
   - Premuti tutti e tre, si apre il baule con la **luce UV**.
2. **I pilastri**, da «unisci i puntini».
   - Ci sono sette pilastri **sparsi su tutte e quattro le pareti**, con dei segni che si vedono solo
     con la luce UV. Ognuno è un timbro.
   - Toccandoli, i timbri finiscono su una **mappa del piano**: ogni timbro è un gruppo di puntini,
     messo dove sta il suo pilastro.
3. **Unisci i puntini**, scelto da Salvo.
   - Sulla mappa unisci col dito i puntini di ogni gruppo: ogni gruppo disegna una cifra.
   - In ordine, in senso orario dal punto di arrivo, le cifre danno **9017432**.
4. **Il telefono**, dal gioco.
   - Accanto alla mappa c'è uno dei telefoni del gioco, con la rotella.
   - Si compone **9017432** e si prende la **fiamma ④**.
   - Un numero sbagliato dà il tono di occupato.

## Il finale: l'altare e il murale della community

1. Al centro della stanza c'è l'**altare con quattro candele**. Ogni fiamma presa su una parete va a
   una candela e la accende.
2. Con quattro candele accese, sull'altare si apre un **pannello**: una griglia di pezzi vuoti.
3. **Il murale della community.** Nel gioco il murale era diviso in cinquanta pezzi tra migliaia di
   giocatori. Qui la community è il visitatore stesso nei piani precedenti:
   - ogni pezzo del murale è una **soluzione già trovata**;
   - sul pannello vanno rimessi i pezzi giusti al posto giusto;
   - i pezzi falsi, presi da altri giochi o da soluzioni scartate, restano fuori.
4. I pezzi proposti, *scelta mia*, sono uno per piano o puzzle:
   - l'**occhio** disegnato dagli specchi;
   - **The Lost** del labirinto;
   - il codice **47157** del comprensorio;
   - il disegno del nastro del macchinario;
   - una frase di Babele;
   - la **scheda perforata** dell'organo;
   - la **stella degli otto oggetti** dello studio.

   Il builder sceglie quali e quanti, purché siano almeno sei e tutti riconoscibili da chi ha
   giocato.
5. **La posizione di ogni pezzo** la dà l'ordine dei piani: dall'alto in basso, come si è scesi.
   *Scelta mia.*
6. Completato il murale, sotto l'altare si apre **il pozzo**. Rotom esce dal muro, torna in 3D e ci
   si butta dentro.
7. **Il quinto piano non esiste ancora.** Come per la pressa, il pozzo resta aperto e toccarlo non
   fa niente: il collegamento si fa nel capitolo del quinto piano.

## Regole per tutto il piano

- **Niente parole e niente numeri dentro le pareti**, come nel gioco. Unica eccezione: le cifre che
  escono unendo i puntini, che sono disegnate dal visitatore.
- **Ogni tocco agisce subito.** Rotom corre verso il punto toccato, ma non fa da tramite.
- **Il feedback si vede sempre**: un interruttore premuto brilla, un errore fa un suono sordo.
- **Lo stato si salva** come sugli altri piani, in `src/data/puzzle.ts` con le chiavi e in
  `src/lib/stages.ts` per i salti di debug. Va aggiunta almeno una fermata per parete e una per il
  murale.
- **Riduzione del movimento**: come negli altri piani, Rotom salta invece di correre e le animazioni
  si accorciano.
- **Funziona sul telefono**:
  - la stanza più larga deve comunque stare nell'inquadratura;
  - ogni parete, vista da vicino, riempie lo schermo;
  - la rosa del flauto non copre la parte della parete su cui si gioca.

## Il materiale originale

- Sprite, tile, musica ed effetti sonori sono **quelli di Animal Well** (Billy Basso, Shared Memory,
  Bigmode). Il materiale lo procura Salvo, oppure il builder gli indica cosa cercare.
- I file vanno in `src/assets/animalwell/`, con la sezione dei crediti nel README come per Isaac.
- La musica di sottofondo è una traccia del gioco, scelta da Salvo.
- **Rotom Gelo in pixel art** non esiste nel gioco: va disegnato nello stile degli sprite di Animal
  Well, con la stessa palette e la stessa risoluzione.

## Lasciato al builder

- Le stanze esatte di ogni parete: forma, piattaforme, posizione degli oggetti.
- Le melodie: quella dei corvi, quella della TV, quella delle tartarughe, l'ordine dei boccioli.
- Come la stanza 3D, più larga, mostra le quattro pareti e come si va da una all'altra.
  Si parte dall'inquadratura delle macchine del terzo piano (`facing` in
  `src/scenes/machines/hall.tsx`).
- Quanto è grande e dove sta la rosa del flauto.
- Il disegno della mappa per i puntini, purché le cifre escano leggibili.
- Le battute di Rotom diverse da «così ti controllo meglio». Le scrive Salvo; nel frattempo si usa
  il segnaposto `«Rotom: TODO — …»` come negli altri piani.

## Fuori da questo lavoro

- Il quinto piano e la discesa nel pozzo fino a lì.
- Il materiale originale vero e proprio, se Salvo non l'ha ancora procurato. Finché manca, si usano
  segnaposto dello stesso formato e la stessa dimensione.

## Cose da evitare

- Un piano che si risolve provando a caso: ogni melodia e ogni ordine si ricavano da un indizio.
- Uno sprite o un suono che non sia di Animal Well dentro le pareti, a parte Rotom Gelo.
- Tocchi che aspettano Rotom: è solo da guardare.
- Testo spiegato sulle pareti.
