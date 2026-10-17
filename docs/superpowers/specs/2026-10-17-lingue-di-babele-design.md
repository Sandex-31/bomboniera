# Le lingue di Babele: il puzzle del secondo piano, design

Data: 2026-10-17. Riguarda la sala del secondo piano (`src/scenes/Babel.tsx`) e segue il capitolo
«discesa al secondo piano» (`2026-10-17-discesa-secondo-piano-design.md`).

## Perché

Il secondo piano è Babele, dove le lingue si sono separate. Il visitatore deve imparare sei
alfabeti inventati senza che nessuno glieli spieghi. Li impara come un archeologo: guarda persone
che parlano, capisce dai loro gesti di cosa parlano, fa ipotesi e le conferma quando la stessa
parola ricompare in un altro alfabeto. Il puzzle deve essere lungo e pieno come l'isola, non un
indovinello singolo.

**Anti-obiettivi:**
- Niente indizi espliciti. Nessuna tabella o legenda, e nessuna chat che dica «questa lettera è la
  A». Si capisce dagli argomenti e dai gesti.
- Nessuna lettera di una frase da indovinare alla cieca. Deve sempre essere già comparsa, in quello
  stesso alfabeto, nelle chat che il visitatore ha già potuto leggere.

## I sei alfabeti (decisi da Salvo)

Ogni simbolo è una lettera dell'alfabeto italiano di 21 lettere, nell'ordine
`a b c d e f g h i l m n o p q r s t u v z`.

| Popolo (nome di lavoro) | Simboli |
|---|---|
| Stelle | `✳✬✴✶✵◓✻✿◒✺✦✰✾❃★✡✱✷✲✪◑` |
| Blocchi | `▔▌▪█▧▭▀▯▉✚❘▓‗░▤▩❚‖▂✜▅` |
| Tubi | `╮┦⌎┞╰⌒┟⌔╭┬┌╯┼┴╵⌍╷┧┐├┤` |
| Onde | `≴≿⊱≳≵⊰⋞⋚≲≦⋭⊽≸⋧⋉≼≶≧⋨⋗≺` |
| Egizi | geroglifici, vedi sotto |
| Esagrammi | `䷶䷫䷒䷅䷔䷨䷧䷟䷂䷐䷺䷏䷪䷣䷕䷴䷓䷾䷌䷬䷿` |

- Nei Blocchi la `r` era un trattino `-`. *Su indicazione di Salvo l'ho sostituito con `▤`*, così
  non si confonde con la punteggiatura.
- **Gli Egizi (li ha lasciati scegliere a me).** Ogni lettera è una figura umana di profilo, in
  stile geroglifico, che fa un'azione il cui verbo italiano comincia con quella lettera. È
  l'alfabeto più facile e quello da cui si parte. Fanno eccezione `h` e `q`, che usano i veri segni
  egizi di quei suoni (il recinto di canne e il pendio), perché non ci sono verbi adatti. *Proposta
  mia:*

  a alzare (braccia al cielo) · b bere (beve da una coppa) · c cadere (cade all'indietro) ·
  d dormire (disteso su un letto) · e entrare (passa sotto una porta) · f fuggire (corre voltandosi)
  · g guardare (mano sopra gli occhi) · h recinto di canne · i inginocchiarsi · l lanciare (lancia
  un bastone) · m mangiare (seduto, mano alla bocca) · n nuotare · o offrire (porge un vaso) ·
  p pregare (in piedi, mani avanti) · q pendio · r remare · s sedere · t tirare con l'arco ·
  u urlare (mani alla bocca) · v vecchio (curvo col bastone) · z zappare

  Li disegno come piccoli SVG e non come caratteri Unicode, perché sui telefoni quei caratteri
  spesso non si vedono.
- Gli altri cinque alfabeti sono caratteri Unicode con i font di sistema. *Scelta mia:* se sul
  telefono di Salvo qualcuno compare come quadratino, quell'alfabeto si disegna o si aggiunge un
  font ridotto con solo quei simboli. Non lo faccio in anticipo.
- **Come si scrive con gli alfabeti.** Le lettere accentate prendono la lettera base (à→a, è/é→e,
  ì→i). Spazi, virgole, punti, puntini, punti di domanda e apostrofi restano come sono, così si
  vede dove finiscono le parole. Le lettere che non esistono nell'alfabeto italiano (j k w x y) non
  compaiono mai, né nelle frasi né nelle chat.

## Le sei frasi (decise da Salvo) e il loro alfabeto

Ogni frase è scritta in un alfabeto diverso. *L'abbinamento e l'ordine sono una scelta mia*: si va
dalla frase più facile alla più difficile, cominciando dagli Egizi come voleva Salvo.

| # | Alfabeto | Frase | Titolo |
|---|---|---|---|
| 1 | Egizi | «Perché sente sempre la musica?» | Baby Driver |
| 2 | Stelle | «il furtivo Pigmeo, così facilmente dimenticato» | Dark Souls |
| 3 | Blocchi | «Se vinci, vivrai. Se perdi, morirai. Se non combatti, non puoi vincere.» | Attack on Titan |
| 4 | Tubi | «Preferisco essere una scimmia senza cervello che un mostro senza cuore.» | Dragon Ball |
| 5 | Onde | «L'umanità è nata sulla Terra. Non è mai stato destinato a morire qui» | Interstellar |
| 6 | Esagrammi | «Il tempo passa, le persone si muovono... Come il corso di un fiume, non finisce mai.» | The Legend of Zelda: Ocarina of Time |

## La sala

Resta la sala circolare di pietra del capitolo precedente, con queste modifiche:

- **Via le iscrizioni di prova** (greco, ebraico, rune...). Confonderebbero, perché sono scritture
  vere. Il muro torna pietra con i corsi dei blocchi.
- **Le sei frasi sono incastonate nel muro**, su sei lastre distribuite lungo la circonferenza, a
  un'altezza che si legge girando la camera. Sono incise scure nella pietra, come le iscrizioni di
  adesso. Una frase lunga va a capo su due o tre righe della lastra.
- **La colonna grande.** Dove c'era l'arco sigillato (sul lato lontano, quello che la camera
  inquadra per primo) sorge una colonna grossa, appoggiata al muro, con uno schermo incastrato.
  L'arco sigillato non serve più, perché si scende dal sarcofago. *Scelta mia.*
- **Il sarcofago** compare solo alla fine, dal centro del pavimento (vedi sotto). Fino ad allora il
  centro è vuoto e Rotom Lavaggio galleggia lì.
- Bracieri, nicchie e buco nel soffitto restano.

## Il terminale delle chat

- Toccando lo schermo nella colonna si apre una finestra, la stessa finestra di vetro dell'isola
  (`Window`). Dentro c'è un terminale con la **lista delle chat**.
- Ogni voce della lista mostra le due figurine dei partecipanti e un segno «nuova» finché non è
  stata aperta. Le chat bloccate non compaiono affatto. *Scelta mia:* la lista non promette niente
  di quello che verrà.
- **Una chat aperta** ha due parti:
  - **in alto, la scena:** le due figure, una per lato, recitano in loop l'argomento della chat.
    Se parlano di guerra si avvicinano, si sfidano e combattono. Se parlano di musica uno suona e
    l'altro balla;
  - **sotto, i messaggi:** compaiono uno alla volta come in una chat vera, a sinistra e a destra,
    ognuno scritto nell'alfabeto di chi parla. Un pulsante fa ripartire la conversazione.
- Nessuna traduzione, mai.

### Le figure

*Lo stile lo decido io (Salvo mi ha lasciato la scelta).*

Sono sagome piatte in SVG, tutte sullo stesso scheletro semplice: testa, busto, due braccia e due
gambe. Si muovono con animazioni CSS, una per ogni tipo di scena. Ogni popolo ha forma e colori
presi dal suo alfabeto:

- **Stelle:** testa a stella, luminose, bianco-oro.
- **Blocchi:** fatte di rettangoli pieni, grigio pietra, movimenti a scatti.
- **Tubi:** corpo di linee sottili ad angolo retto, verde terminale.
- **Onde:** contorni curvi, testa a mezzaluna, azzurro.
- **Egizi:** di profilo, pelle ocra, gonnellino bianco, come nei geroglifici.
- **Esagrammi:** tuniche a righe orizzontali piene e spezzate, rosso lacca e nero.

Le scene sono un insieme fisso di animazioni riusate da più chat: combattere, suonare e ballare,
dormire e svegliarsi, mangiare, rubare di nascosto, dimenticare (punto interrogativo sulla testa),
guardare il cielo e le stelle, nascere e morire, camminare e viaggiare, il fiume che scorre, la
scimmia, il cuore e il cervello. Quante e quali esattamente lo decide chi scrive le chat. Ogni
scena deve far capire l'argomento senza testo.

### Le chat: chi parla e di cosa

I testi sono salvati **in italiano** nel codice e vengono scritti nell'alfabeto del parlante solo
al momento di mostrarli. Così si possono rileggere e correggere facilmente.

**Come si sbloccano.** All'inizio ci sono solo le chat tra Egizi. Ogni frase decifrata sblocca:
- chat tra persone dell'alfabeto della frase successiva;
- chat miste tra quell'alfabeto e quelli già visti.

| Fase | Quando | Chat nuove (proposta) | Argomenti, presi dalla frase da decifrare dopo |
|---|---|---|---|
| 0 | dall'inizio | 3 Egizi–Egizi | musica, sentire, «perché?», «sempre» |
| 1 | frase 1 decifrata | 2 Stelle–Stelle, 1 Stelle–Egizi | uno piccolo e furtivo che ruba, dimenticare, «così», «facile» |
| 2 | frase 2 | 2 Blocchi–Blocchi, 2 miste | guerra, vincere, perdere, morire, combattere, «se», «non» |
| 3 | frase 3 | 2 Tubi–Tubi, 2 miste | la scimmia, il cervello, il cuore, il mostro, preferire, essere |
| 4 | frase 4 | 2 Onde–Onde, 2 miste | la Terra, l'umanità, nascere, morire, il destino, «qui», «mai» |
| 5 | frase 5 | 2 Esagrammi–Esagrammi, 2 miste | il tempo, il fiume, le persone che si muovono, finire, «come» |

In totale circa 23 chat, ognuna di 4–8 messaggi brevi. Tutte le frasi sui muri si possono tentare
fin dall'inizio, ma senza le chat della propria fase non si riescono a leggere.

**Regole per chi scrive le chat** (le controlla `npm test`):
1. **Copertura.** Ogni lettera di una frase compare, nel suo alfabeto, in almeno **due parole
   diverse** delle chat sbloccate entro la sua fase. La frase 1 usa le chat della fase 0, la frase 2
   quelle delle fasi 0 e 1, e così via.
2. **Incrocio.** Ogni chat mista contiene almeno una parola detta da tutti e due i parlanti, ognuno
   nel suo alfabeto. Per esempio uno chiede «guerra?» e l'altro risponde «guerra!». È la stele di
   Rosetta che conferma le ipotesi.
3. Nessuna chat contiene la frase da decifrare intera. Le sue parole compaiono sparse, in altri
   contesti.
4. Solo lettere dell'alfabeto italiano a 21 lettere, più accenti e la punteggiatura detta sopra.

*Scelta mia:* scrivo io i testi delle chat. **Salvo li approva prima che entrino nel gioco.**

## Decifrare una frase

- Toccando una lastra la camera la inquadra e si apre un piccolo campo dove scrivere la traduzione
  in italiano.
- **Come viene controllata la risposta.** Contano solo le lettere: maiuscole, accenti, spazi,
  punteggiatura e apostrofi non contano. Quindi «perche sente sempre la musica» va bene. È la stessa
  regola del terminale dell'isola (`Hack.tsx`). *Nota: a Salvo avevo detto che contava anche la
  divisione in parole. Così è più semplice e più tollerante con gli apostrofi; cambia solo se lui
  preferisce l'altra regola.*
- Una risposta sbagliata fa tremare il campo e lo svuota. Si può riprovare all'infinito.
- **Una risposta giusta** fa illuminare la lastra di un bianco lieve, e quel bianco resta. Nella
  lista delle chat compaiono quelle nuove con il segno «nuova».
- Una frase già decifrata, toccata, mostra la sua traduzione e non chiede altro.

## Il sarcofago

- **La scena.** Quando si accende la sesta lastra, dal centro del pavimento si alza un sarcofago.
  È una scena come quelle dell'isola: lo schermo si svuota e la camera inquadra. Rotom si sposta di
  lato per lasciargli posto.
- **I sei slot.** Toccando il sarcofago si apre una finestra con sei slot dove scrivere i titoli
  delle opere da cui vengono le frasi, in qualsiasi ordine.
  - Ogni slot si illumina appena contiene un titolo giusto non ancora usato in un altro slot.
  - **Titoli accettati (le varianti ovvie, come voleva Salvo).** Si confrontano solo le lettere,
    come per le frasi:
    - Baby Driver: «Baby Driver», «Baby Driver - Il genio della fuga»;
    - Dark Souls: «Dark Souls», «Dark Souls 1», «Dark Souls I»;
    - Attack on Titan: «Attack on Titan», «Attack on Titans», «L'attacco dei giganti», «Shingeki no
      Kyojin»;
    - Dragon Ball: «Dragon Ball», «Dragonball», «Dragon Ball Z»;
    - Interstellar;
    - Zelda: «Ocarina of Time», «Zelda», «The Legend of Zelda», «Zelda Ocarina of Time», «The Legend
      of Zelda: Ocarina of Time».
  - I titoli contengono k, w e y. Lì vanno bene, perché si scrivono con la tastiera e non con gli
    alfabeti.
- **Quando sono giusti tutti e sei** il coperchio scivola via. Rotom dice una battuta e dentro il
  sarcofago si apre la discesa al piano sotto. La battuta, di Salvo, è
  «Rotom: mi ritrasformooooo!!!».
- **Il terzo piano non esiste ancora.** Il sarcofago resta aperto e buio, e toccarlo non fa niente.
  Il collegamento si aggiunge quando costruiremo il terzo piano.

## Scene e camera

Valgono le regole del capitolo precedente: durante una scena le finestre si nascondono, non si
chiudono, e la vista è bloccata. Sono scene:
- il sarcofago che si alza;
- il coperchio che si apre;
- la battuta di Rotom.

Decifrare una lastra non è una scena: la lastra si illumina e basta.

## Progressi, reset e debug

- **Chiavi nuove in `src/data/puzzle.ts`:**
  - una per le frasi decifrate (per esempio `bomboniera.puzzle.lingue`, con l'elenco delle frasi);
  - una per i titoli già inseriti negli slot (`bomboniera.puzzle.sarcofago`);
  - una per le chat già aperte, che serve al segno «nuova».
- «Ricomincia il puzzle» cancella anche queste.
- Fermate nuove nel menu «salta a…»: «lingue: 3 frasi» (le prime tre decifrate) e «sarcofago»
  (tutte e sei decifrate, sarcofago alzato, slot vuoti).

## Cosa resta al builder

- La posizione esatta di lastre e colonna. Le lastre vanno lontane dalla colonna e leggibili girando
  la camera, su telefono compreso.
- Il disegno dei 21 geroglifici, delle figure e delle animazioni, purché si capiscano a colpo
  d'occhio.
- I testi delle chat, rispettando le regole di copertura e incrocio. Salvo li approva prima del
  merge.
- L'aspetto del terminale, coerente con quello dell'isola.

## Fuori da questo capitolo

- Il terzo piano e la discesa dal sarcofago.
- La battuta definitiva di Rotom sul sarcofago, che scrive Salvo.
