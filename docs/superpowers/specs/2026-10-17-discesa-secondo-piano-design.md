# Discesa al secondo piano — design

Data: 2026-10-17. Riguarda il puzzle nascosto dietro il portale (`src/scenes/Puzzle.tsx`) e segue
il capitolo «sagome, lucchetto e torre» (`2026-10-16-sagome-lucchetto-torre-design.md`).

## Perché

L'isola si è appena rivelata come la cima di una Torre di Babele capovolta. Adesso si scende. La
torre è fatta di piani, e ogni piano è un puzzle intero: tanti passaggi intrecciati, come quelli
dell'isola, ognuno con un tema diverso. A ogni piano Rotom cambia forma. Questo capitolo porta il
visitatore giù nel tombino fino al secondo piano e costruisce la sala dove vivrà il puzzle del
secondo piano. Il puzzle stesso è un capitolo a parte: Salvo lo spiegherà dopo.

Dentro il capitolo c'è anche una regola che vale per tutto il puzzle: quando parte una scena, lo
schermo si svuota e lascia vedere solo la scena.

## I piani, in grande (contesto, non da costruire ora)

- **Primo piano: l'isola.** Tema: schermi e finestre. È fatto.
- **Secondo piano: le lingue di Babele.** Rotom diventa **Rotom Lavaggio**. Il tema è deciso, il
  puzzle no.
- **Piani dopo:** la sala macchine (leve, ingranaggi, tubi, oggetti fisici nella scena) e
  l'università (gli esami e i progetti di Salvo). L'ordine e le forme di Rotom per questi piani non
  sono decisi.
- Ogni piano deve avere una quantità di passaggi simile all'isola: complicato e pieno, non un
  puzzle singolo.

## Il percorso di questo capitolo, passo per passo

1. **La rivelazione** (c'è già): il lucchetto si apre, il tombino scorre via, la camera si allontana
   e scopre la torre.
2. **La battuta.** La camera torna su Rotom, che dice:
   «Rotom: Eccoci qua, adesso sai quanto é complicato entrare nel sistema».
3. **La discesa.** Premendo il pulsante della battuta, Rotom si porta sopra il tombino, si
   rimpicciolisce, scende a spirale e viene risucchiato dentro con una scintilla elettrica. La
   camera lo segue giù nel pozzo, che è buio.
4. **L'arrivo.** Si sbuca dal soffitto del secondo piano. Rotom esce dal buio e con un lampo si
   trasforma in Rotom Lavaggio.
5. **Il secondo piano.** La sala si può guardare come l'isola: si gira la camera e si zooma. Per ora
   non c'è niente da risolvere.

## Lo schermo libero durante le scene

Quando parte una scena, sparisce in dissolvenza tutto quello che sta sopra la vista 3D:

- le finestre aperte (sagome.exe, mappa, frammenti, macchinario, terminale e le altre);
- il pulsante «Torna nella stanza»;
- il menu di debug («ricomincia il puzzle» e «salta a…»).

Resta la scena e, se Rotom parla, il suo fumetto con il pulsante.

Contano come scena:

- ogni volta che Rotom parla: le battute iniziali, `starLine`, `tapeLine`, `wiredLine`,
  `tombinoLine`, `bravoLine` e la battuta nuova di questo capitolo;
- il tombino che si apre e la camera che vola alla torre;
- la discesa di Rotom nel tombino e l'arrivo al secondo piano;
- in futuro, le scene dei piani nuovi. La regola deve essere facile da riusare.

Finita la scena, le finestre tornano esattamente com'erano: stesse posizioni, dimensioni e
contenuto, niente perso. Vengono **nascoste, non chiuse**. Anche il «Bravo! giusto…», che arriva
mentre il visitatore usa il carosello, nasconde il carosello. Quando Rotom ha finito, il carosello
ricompare dove era.

**La camera durante le scene (deciso con Salvo).** Quando Rotom parla, la camera vola a
inquadrarlo, qualunque cosa il visitatore stesse guardando. Per tutta la scena la vista 3D è
bloccata: niente rotazione, zoom o tocchi su schermi, lucchetto, tombino e Rotom. Questo vale per
ogni scena: le battute, la rivelazione, la discesa e l'arrivo. *Scelta mia:* finita una battuta
detta mentre il visitatore era davanti a uno schermo (per esempio il «Bravo!» sul carosello), la
camera torna a quello schermo e le finestre ricompaiono. Finita una battuta detta dall'isola, la
camera resta su Rotom.

Le finestre che oggi si chiudono da sole, prima del lucchetto (`setStack([])` dopo TOMBINO) e prima
della torre (`unlock`), continuano a chiudersi come adesso.

## Rotom: modelli nuovi

- Tutte le forme di Rotom vengono dal pacchetto **«Rotom (Cobblemon)» di heaveninvoid_** su
  Sketchfab
  (https://sketchfab.com/3d-models/rotom-cobblemon-91fda41630654f7d90b115f33b641dc7), basato su
  un modello di JoeSeff. Contiene tutte le forme: normale, Lavaggio, Taglio, Calore, Vortice e
  Gelo. È low-poly, in stile Minecraft/Cobblemon.
- **Anche il Rotom dell'isola viene sostituito** con la forma normale del pacchetto. Il vecchio
  modello di Thingiverse (i tre STL in `src/assets/rotom/`), con occhi e sorriso disegnati nel
  codice, va tolto.
- Su Sketchfab il download non c'è. Il modello è quello ufficiale del mod Cobblemon, che pubblica i
  file nel suo repository GitLab (`gitlab.com/cable-mc/cobblemon`, licenza MPL-2.0):
  `common/src/main/resources/assets/cobblemon/bedrock/pokemon/models/0479_rotom/` contiene
  `rotom.geo.json` e `rotom_{wash,mow,heat,fan,frost}.geo.json`, e
  `.../textures/pokemon/0479_rotom/` le texture, con le versioni `*_emissive.png` per le parti che
  si illuminano. I file vanno copiati in `src/assets/rotom/`. Sono nel formato dei modelli di
  Minecraft Bedrock (cubi con UV e ossa con pivot) e servono un piccolo lettore che li trasformi in
  mesh three.js, con texture filtrate senza sfocatura. *Scelta mia: lettore nel progetto, invece di
  una conversione a mano in GLB.* Ogni forma è un file a parte, nello stesso sistema di misure,
  quindi scala e pivot coincidono per il lampo della trasformazione.
- Il credito nel README passa dal modello di IdjeA a quello di Cobblemon (MPL-2.0,
  con il link al repository). Il controllo in `scripts/check.mjs` (che oggi cerca «IdjeA») va
  aggiornato di conseguenza.
- Quello che Rotom fa oggi resta: guarda sempre verso la camera girando solo sull'asse verticale,
  galleggia, sobbalza quando viene toccato, sull'isola si tocca per il ritmo, e luccica di più
  quando è "sveglio". Se il modello nuovo non ha parti adatte al luccichio, il builder sceglie un
  equivalente (una luce, un alone), purché si veda che reagisce.
- Il gioco non verrà pubblicato. Il modello va bene anche se la sua licenza è restrittiva.

## Il secondo piano: l'ambientazione

- Una sala circolare dentro un gradone della torre, nella stessa pietra calda dell'esterno e con
  gli stessi archi.
- Sui muri ci sono iscrizioni in tante scritture diverse. Per ora sono solo scenografia: il puzzle
  delle lingue verrà dopo e potrà cambiarle o usarle.
- Nel soffitto c'è il buco del tombino da cui si è arrivati.
- In basso c'è un passaggio chiuso verso il piano dopo.
- La luce viene da fiaccole o bracieri.
- Rotom Lavaggio galleggia al centro.
- La sala deve essere pronta a ricevere un puzzle grande come l'isola, quindi deve lasciare posto.

## Progressi e debug

- Una chiave nuova in `src/data/puzzle.ts`, per esempio `bomboniera.puzzle.discesa`, segna che il
  visitatore è sceso. Va nella lista di `STAGES` in `src/lib/stages.ts`, come tappa **«secondo
  piano»** dopo «lucchetto». Il test di `scripts/check.mjs` controlla già che ogni chiave `*_KEY`
  ci sia.
- Ricaricando si riparte dall'ultimo piano visitato, senza rivedere la discesa. Il piano in cui
  si trova il visitatore va salvato a parte (non è un passo risolto, quindi non è una tappa di
  `STAGES`, e «ricomincia il puzzle» lo deve azzerare comunque).

## Come si inserisce nel codice esistente

- **Battute.** La battuta nuova va in `src/data/puzzle.ts` accanto a `tombinoLine`, e si dice con
  `Keeper` come le altre.
- **Camera.** I voli passano da `CameraRig` con una `View` memorizzata. Il volo che segue Rotom nel
  pozzo è una vista nuova, o una sequenza di viste.
- **Il desktop.** Le finestre sono in `Puzzle` (`stack`), mentre le battute e la rivelazione sono
  dentro `Island`, che è memorizzata. Per svuotare lo schermo, `Puzzle` deve sapere quando `Island`
  è in scena: serve un segnale da `Island` verso l'alto, o lo stato delle scene spostato in
  `Puzzle`.
- **Movimento ridotto.** Tutte le animazioni rispettano `reduced`, come quelle che ci sono già: con
  il movimento ridotto si salta subito allo stato finale.

## Scelte mie (da controllare)

- La battuta viene detta da sola, subito dopo la rivelazione della torre: la camera resta un
  momento sulla torre e poi torna su Rotom.
- Se il visitatore ricarica dopo la rivelazione ma prima della discesa, toccare il tombino aperto
  fa ripartire la battuta e poi la discesa. Il tocco non porta più alla vista della torre.
- **Navigazione libera tra i piani (deciso con Salvo: in futuro potrebbero esserci puzzle che
  coinvolgono più piani).** *Come, scelta mia:* sull'isola, toccare il tombino aperto porta giù;
  al secondo piano, toccare il buco nel soffitto riporta su. La discesa completa (battuta,
  risucchio, lampo) si vede solo la prima volta; dopo, il passaggio è breve: la camera attraversa
  il pozzo buio e Rotom cambia forma con un lampo veloce, in entrambe le direzioni. Le finestre
  aperte di un piano restano a quel piano. Ricaricando si riparte dall'ultimo piano visitato.
  Il modo di passare da un piano all'altro va pensato per piani a venire, non solo per due.
  «Torna nella stanza» continua a funzionare.
- La torre resta di otto gradoni: bastano per i piani che verranno.

## Obiettivi

- La discesa deve essere il seguito naturale della rivelazione: una sola scena lunga, senza tagli
  bruschi.
- Si deve capire che Rotom si è trasformato, non che è comparso un personaggio nuovo.
- Funziona su telefono come su desktop.
- Le scene si vedono pulite, senza finestre davanti.

## Fuori da questo lavoro

- Il puzzle delle lingue del secondo piano.
- I piani dopo il secondo.
- Le battute di Rotom ancora segnaposto (`starLine`, `tapeLine`).

## Cose da evitare

- Finestre perse o riaperte in un altro posto dopo una scena.
- Una discesa che riparte a ogni visita.
- Rotom che rotola o si gira di schiena verso la camera.
- Trascinare o toccare durante una scena che fa partire altro sotto, per esempio un tocco su Rotom
  durante la discesa che conta come ritmo.

## Lasciato al builder

- Le durate delle animazioni e le curve.
- Come si collega il pozzo alla sala: la stessa scena 3D sotto l'isola, oppure una scena separata
  con il buio del pozzo che nasconde il passaggio.
- Come si vede il lampo della trasformazione.
- Quali scritture mettere sui muri e come disegnarle (texture generate, testo, simboli).
- La forma esatta della sala, delle fiaccole e del passaggio chiuso.
- Come si estrae ogni forma dal file del pacchetto, se sono tutte in un solo modello.

## Rischi

- Il formato Bedrock ha dettagli da rispettare (pivot e rotazioni delle ossa, UV «a scatola» o per
  faccia, `inflate`, cubi specchiati): un lettore sbagliato dà un Rotom smontato. Va confrontato a
  occhio con le immagini del mod.
- Lo stile low-poly è diverso da quello attuale dell'isola: va controllato a occhio che non stoni
  con gli schermi e la torre.
