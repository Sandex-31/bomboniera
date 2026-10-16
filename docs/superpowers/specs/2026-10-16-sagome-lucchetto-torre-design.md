# Sagome, lucchetto e torre — design

Data: 2026-10-16. Riguarda il puzzle nascosto dietro il portale (`src/scenes/Puzzle.tsx`).

## Perché

La catena dei puzzle produce soluzioni che oggi non servono a niente: l'**occhio** disegnato dagli
specchi, il codice **4 7 1 5 7** del comprensorio e il **fantasma che piange** (The Lost, da The
Binding of Isaac) composto sopra il labirinto. Questo capitolo le usa tutte e tre, e chiude
rivelando dove si trova davvero l'isola: in cima a una Torre di Babele capovolta, da scendere. I
piani di sotto sono un capitolo a parte, da progettare dopo.

## Il percorso, passo per passo

1. **La finestra delle sagome.** Sullo schermo del comprensorio (schermo 4) si apre una finestra in
   più, accanto a quella della mappa. Prima di avviarsi chiede una password di tre lettere: **EYE**.
2. **Il carosello.** Una volta avviata, mostra un carosello di silhouette nere di personaggi di
   videogiochi, ricavate da immagini vere. Undici, in quest'ordine o in un altro a scelta del
   builder:
   Samus (Metroid), Jak & Daxter, Steve (Minecraft), Link (Zelda), Lego Batman, Hollow Knight,
   **The Lost** (The Binding of Isaac), Yi (Nine Sols), il Penitente (Blasphemous), Cuphead, il
   corvo (Death's Door).
3. **Il prompt.** Si sceglie una silhouette e si preme «accetta». Per ognuna compare lo stesso
   prompt, con l'indizio **«Giapponese»**.
   - Su qualunque personaggio, The Lost compreso, scrivendo il suo nome giusto Rotom dice:
     «Bravo! giusto ma non ti servirá a un bel niente hahahahah».
   - Su The Lost la parola giusta è **TOMBINO**. Rotom dice «Complimenti, hai trovato anche
     questo».
4. **Il lucchetto.** Subito dopo, accanto a Rotom sull'isola, compare un piccolo schermo con un
   lucchetto a combinazione: cinque rotelle numeriche, ognuna si cambia trascinandola in alto o in
   basso. La combinazione è **47157**.
5. **Il tombino e la torre.** Quando il lucchetto si apre, sotto Rotom compare un tombino che si
   apre. La camera si allontana di molto e rivela che l'isola è la cima di una Torre di Babele
   capovolta che sprofonda nel vuoto. Qui il capitolo finisce.

## Deciso con Salvo

- La password d'avvio è EYE; la parola su The Lost è TOMBINO, con indizio «Giapponese»; la
  combinazione è il codice del comprensorio.
- Gli undici personaggi elencati sopra, come silhouette nere vere, prese da immagini reali.
- Lo stesso prompt per ogni silhouette. Il nome giusto di qualunque personaggio fa dire a Rotom la
  battuta «non ti servirá a un bel niente» e non sblocca nulla. Vale anche per The Lost: scrivere
  «The Lost» su The Lost dà il «Bravo!», e solo TOMBINO va avanti.
- Dopo TOMBINO: battuta di Rotom, poi lo schermo del lucchetto accanto a lui.
- Il lucchetto si usa trascinando le cifre in su e in giù.
- All'apertura: tombino sotto Rotom, la camera si allontana, si vede la torre capovolta, e ci si
  ferma qui.

## Scelte mie (confermate da Salvo nel riepilogo, salvo dove indicato)

- La finestra delle sagome c'è sullo schermo del comprensorio da subito, senza dover prima
  completare la mappa delle quote.
- Le immagini le cerco io: render ufficiali con sfondo trasparente.
- Le silhouette vengono preparate in anticipo e salvate già nere, così nel sito non finisce mai
  l'immagine a colori: chi apre gli strumenti del browser non trova la risposta.
- Una risposta sbagliata, sia la password sia il prompt, fa vibrare il campo e lo svuota, come nel
  terminale (`src/components/Hack.tsx`).
- Le rotelle del lucchetto vanno da 0 a 9 e ricominciano. Il lucchetto si apre da solo appena le
  cifre sono giuste, senza un pulsante di conferma.
- Lo schermo del lucchetto è un pannello sospeso nella scena 3D, con lo stile degli schermi
  dell'isola. Toccandolo la camera ci vola davanti, come per gli altri schermi. Non è una
  finestra del desktop.
- Trascinare una rotella non fa ruotare la camera, anche su telefono.
- L'indizio «Giapponese» compare nel prompt di ogni silhouette, non solo su The Lost: è lo
  stesso prompt per tutte.
- TOMBINO scritto su un personaggio diverso da The Lost è una risposta sbagliata.
- Dopo la battuta «Bravo! giusto…» il prompt si chiude e si torna al carosello.
- Una volta aperto, il lucchetto resta sullo schermo aperto, con le cifre giuste ferme.
- L'animazione della torre si vede una volta sola, quando il tombino si apre. Ricaricando la
  pagina, il tombino è aperto e la torre è già lì.
- Il menu di debug «salta a…» (`src/lib/stages.ts`) prende tre tappe nuove, in quest'ordine dopo
  «figura»: **avvio** (EYE), **tombino** (TOMBINO), **lucchetto** (lucchetto aperto e torre
  rivelata).

## Come si inserisce nel codice esistente

- **Finestre.** Le finestre di uno schermo si dichiarano in `SCREENS` e arrivano tramite `show()`
  in `Puzzle.tsx`, come fanno il macchinario (`MACHINE` sulla scrivania `MACHINE_DESK`) e il
  terminale (`HACK` su `HACK_DESK`). La finestra delle sagome segue lo stesso schema, sulla
  scrivania dello schermo 4. Il suo contenuto va nei `bodies` memorizzati, come gli altri.
- **Battute di Rotom.** Le battute stanno in `src/data/puzzle.ts`. Una battuta detta dopo un
  risultato in una finestra segue lo schema di `starLine`/`tapeLine`/`wiredLine`: la camera torna
  sull'isola e Rotom parla con il componente `Keeper`. La battuta «Bravo! giusto…» va detta
  sopra le finestre aperte, come `wiredLine` (`zIndexRange` più alto), perché l'utente è ancora sul
  carosello.
- **Progressi.** Ogni passo salvato ha la sua chiave `bomboniera.puzzle.*` in `src/data/puzzle.ts`,
  letta e controllata al caricamento come le altre. Le chiavi nuove vanno nella lista di
  `STAGES`; il test in `scripts/check.mjs` verifica già che ogni chiave `*_KEY` del modulo sia
  presente lì.
- **Stile.** Le finestre usano `Window` (trascinabile, ridimensionabile con il pinch, si apre nel
  posto più libero). Il terminale (`Hack.tsx`) è il modello per l'aspetto di password e prompt.
- **Camera.** I voli passano da `CameraRig` con una `View`. La rivelazione della torre è una vista
  nuova, molto allontanata. Va tenuto conto che la vista dell'isola adatta lo zoom a `VOID_W`
  (`fit`): per far vedere la torre serve uno zoom ben sotto quello che inquadra l'isola.

## Obiettivi

- Le tre soluzioni orfane (occhio, codice, figura) diventano necessarie per andare avanti.
- La rivelazione della torre deve sorprendere: è il momento più grande del puzzle finora.
- Funziona su telefono come su desktop: carosello, prompt, rotelle e animazione.

## Fuori da questo lavoro

- I piani della torre sotto l'isola, e la discesa vera e propria.
- Le battute di Rotom ancora segnaposto (`starLine`, `tapeLine`).

## Cose da evitare

- Che il sito contenga le immagini a colori, o i nomi delle risposte in chiaro dove basta aprire
  gli strumenti del browser per leggerli accanto alle silhouette. Le risposte possono stare nel
  codice come le altre (`Hack.tsx` tiene `ANSWERS` in chiaro), ma non come nome del file
  dell'immagine.
- Che trascinare una rotella o il carosello faccia girare la camera o trascini la finestra.
- Che l'animazione della torre riparta a ogni visita.

## Lasciato al builder

- L'aspetto della finestra delle sagome e il nome nel titolo.
- Come si scorre il carosello (frecce, swipe o entrambi) e come si vede la silhouette scelta.
- Quali nomi accettare per ogni personaggio. Valgono le regole del terminale: contano solo le
  lettere, maiuscole e spazi non contano. Per esempio «Jak», «Daxter» e «Jak and Daxter»
  dovrebbero valere tutti.
- Come preparare le silhouette (uno script, oppure una volta sola con il browser) e dove salvarle
  in `public/`.
- La forma della torre capovolta, purché si legga come Babele (gradoni, una rampa che gira) e
  l'isola ne sia chiaramente la cima.
- Le durate delle animazioni.

## Rischi

- Le immagini dei personaggi sono materiale protetto. Come silhouette in una bomboniera personale
  il rischio è basso, ma resta materiale di terzi pubblicato su un sito.
- Trovare render trasparenti di buona qualità per tutti e undici: per alcuni (Yi, il corvo di
  Death's Door) potrebbe servire scontornare un'immagine a mano.
