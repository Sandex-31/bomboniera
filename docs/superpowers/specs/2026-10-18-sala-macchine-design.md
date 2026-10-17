# Discesa alla sala macchine — design

Data: 2026-10-18. Riguarda il puzzle nascosto dietro il portale (`src/scenes/Puzzle.tsx`) e segue
il capitolo «lingue di Babele» (`2026-10-17-lingue-di-babele-design.md`), con lo stesso schema
della «discesa al secondo piano» (`2026-10-17-discesa-secondo-piano-design.md`).

## Perché

Il secondo piano finisce con il sarcofago aperto e Rotom che grida «mi ritrasformooooo!!!». Oggi
dopo quella battuta non succede niente: il sarcofago resta un buco buio. Questo capitolo porta il
visitatore giù dal sarcofago al terzo piano, la **sala macchine**, e fa trasformare Rotom nella sua
nuova forma. Come per il secondo piano, il puzzle della sala macchine è un capitolo a parte (deciso
con Salvo): qui si costruiscono la discesa, la trasformazione e la sala, da guardare e basta.

## Deciso con Salvo

- Il terzo piano è la sala macchine. L'università verrà dopo.
- La forma di Rotom la scelgo io. *Scelta mia:* **Rotom Calore** (la forma forno), che sta bene
  tra caldaie, fuoco e vapore. Il modello è `rotom_heat.geo.json` nello stesso repository
  Cobblemon degli altri due (vedi `src/assets/rotom/cobblemon/SOURCE.txt`).
- La trasformazione è più ricca di quella del secondo piano: **Rotom prende fuoco e fa fumo**. Come
  esattamente, lo scelgo io (sotto).
- Il puzzle della sala si fa dopo.

## Il percorso, passo per passo

1. **La battuta** (c'è già): il sarcofago si apre e Rotom dice `sarcLine`,
   «Rotom: mi ritrasformooooo!!!».
2. **La discesa.** Premendo il pulsante della battuta, la scena non finisce: Rotom lascia il suo
   posto accanto al sarcofago, si porta sopra l'apertura, si rimpicciolisce e scende a spirale
   dentro il sarcofago, come è sceso nel tombino dell'isola. La camera lo segue giù nel buio.
3. **L'arrivo.** Si sbuca dal soffitto della sala macchine. Rotom esce dal buio ancora in forma
   Lavaggio e si trasforma prendendo fuoco (sotto).
4. **La sala.** La camera si allontana e mostra la sala, che si può girare e zoomare come le altre.
   Non c'è niente da risolvere.

## La trasformazione: fuoco e fumo

*Scelte mie, tutte da controllare a occhio:*

- Rotom Lavaggio scende e si ferma al suo posto. Inizia a **tremare** e diventa rosso, sempre più
  acceso, come un metallo che si scalda.
- Gli spuntano **fiamme** attorno, prima piccole, poi alte fino a coprirlo quasi tutto.
- Le fiamme esplodono in una **nuvola di fumo** grigio scuro che lo nasconde del tutto. Dentro la
  nuvola c'è il lampo, e la forma cambia lì, mentre non si vede.
- Il fumo si apre e sale verso l'alto, e sotto c'è **Rotom Calore**. Per qualche secondo gli restano
  addosso delle fiammelle e un filo di fumo, poi galleggia normale.
- Tutta la trasformazione dura circa 4–5 secondi. Deve essere chiaro che è lo stesso Rotom che si è
  trasformato, non un personaggio nuovo che è comparso.
- **Il passaggio veloce** (tutte le volte dopo la prima) non ripete lo spettacolo: un lampo con uno
  sbuffo di fumo e basta.
- Risalendo dalla sala macchine a Babele, Rotom Calore torna Lavaggio con il lampo normale del
  secondo piano.
- Con il **movimento ridotto** si salta subito a Rotom Calore fermo, senza fuoco né fumo.

## La sala macchine: l'ambientazione

*Scelte mie:*

- Una sala dentro il gradone sotto Babele, con lo stesso impianto delle altre (vista dall'alto con
  la camera ortografica, muro visto solo da dentro) ma in **metallo e mattoni scuri**, non in
  pietra calda.
- **Caldaie** con la bocca del fuoco accesa, **tubi** di rame lungo i muri e sopra la testa,
  **ingranaggi** grandi che girano piano, **leve** e **manometri** con l'ago che trema, **sbuffi di
  vapore** che escono ogni tanto dai tubi.
- La luce viene dal fuoco delle caldaie: arancione, calda, con un leggero tremolio.
- Nel soffitto c'è l'apertura da cui si arriva (il fondo del sarcofago, visto da sotto).
- Leve, ingranaggi e manometri per ora sono solo scenografia. Il puzzle verrà dopo e potrà usarli o
  cambiarli. La sala deve lasciare posto per un puzzle grande come quello dell'isola.
- Rotom Calore galleggia al centro.

## Muoversi tra i piani

Funziona come tra isola e Babele (`goTo` in `Puzzle.tsx`):

- a Babele, toccare il sarcofago aperto porta giù alla sala macchine;
- nella sala macchine, toccare l'apertura nel soffitto riporta su a Babele;
- la discesa completa (battuta, spirale, fuoco e fumo) si vede solo la prima volta; dopo il
  passaggio è breve, in entrambe le direzioni;
- ricaricando si riparte dall'ultimo piano visitato;
- le finestre aperte di un piano non seguono il visitatore negli altri piani. *Scelta mia:* quelle
  di Babele si chiudono quando si lascia il piano, come succede già oggi risalendo all'isola; non
  vengono ricordate per il ritorno;
- «Torna nella stanza» continua a funzionare.

Oggi Babele dà per scontato di essere arrivati dall'alto (`from="base"`, direzione in giù).
Arrivando dalla sala macchine Rotom sale dal basso e passa da Calore a Lavaggio: Babele deve sapere
da quale piano si arriva.

*Scelta mia:* se il visitatore ricarica dopo la battuta del sarcofago ma prima di scendere, toccare
il sarcofago aperto fa partire la discesa completa (senza ripetere la battuta).

## Progressi e debug

- Il terzo piano è il piano `2` nella chiave che c'è già, `FLOOR_KEY`. `floorFrom` oggi accetta solo
  0 e 1 e va allargata.
- Serve un segno che il visitatore è sceso al terzo piano almeno una volta, per scegliere tra
  discesa lunga e passaggio veloce. Oggi `descended` vale per tutti i piani insieme e va diviso per
  passaggio.
- Una tappa nuova **«terzo piano»** in `STAGES` (`src/lib/stages.ts`), dopo «sarcofago», che
  porta il visitatore nella sala macchine.
- «Ricomincia il puzzle» azzera anche questo.

## Rotom Calore nel codice

- Copiare `rotom_heat.geo.json`, `rotom_heat.png` e `rotom_heat_emissive.png` in
  `src/assets/rotom/cobblemon/`, senza modificarli, e aggiungerli a `SOURCE.txt`.
- Aggiungere la forma `"heat"` a `RotomForm` e a `FORMS` in `src/scenes/Rotom.tsx`. Il lettore
  Bedrock (`src/lib/bedrock.ts`) c'è già; va controllato a occhio che il forno non esca smontato.

## Obiettivi

- La discesa nel sarcofago è il seguito naturale della battuta: una scena unica, senza tagli bruschi.
- La trasformazione si capisce e diverte: si vede Rotom scaldarsi, bruciare e uscire dal fumo
  cambiato.
- Funziona su telefono come su desktop, senza scatti.
- Durante le scene lo schermo è libero (regola già in vigore: `onScene`).

## Fuori da questo lavoro

- Il puzzle della sala macchine.
- L'università e i piani dopo.
- Cambiare la discesa dall'isola o le scene di Babele, oltre al collegamento col sarcofago.

## Cose da evitare

- Fuoco e fumo che sembrano un'esplosione che distrugge Rotom, o che spaventano: deve essere buffo.
- Fumo che copre tutto lo schermo o resta troppo a lungo.
- Una discesa lunga che riparte a ogni visita.
- Rotom che rotola o si gira di schiena verso la camera.
- Tocchi durante la scena che fanno partire altro sotto.

## Lasciato al builder

- Come disegnare fuoco e fumo (sprite, particelle, mesh semplici con shader): l'importante è il
  risultato a occhio e che regga sul telefono.
- Durate e curve, dentro i 4–5 secondi della trasformazione.
- La forma esatta della sala, delle caldaie e degli ingranaggi.
- Se la sala macchine è un file a parte (per esempio `src/scenes/Engine.tsx`) e quanto riusare da
  `Babel.tsx`.

## Rischi

- Troppe particelle o luci sul telefono: il fuoco va tenuto leggero.
- Lo stile low-poly di Rotom accanto a fuoco e fumo morbidi può stonare: va controllato a occhio.
