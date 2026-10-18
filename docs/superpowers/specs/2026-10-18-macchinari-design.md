# I macchinari: il puzzle del terzo piano, design

Data: 2026-10-18. Riguarda la sala macchine (`src/scenes/Engine.tsx`) e segue il capitolo
«discesa alla sala macchine» (`2026-10-18-sala-macchine-design.md`).

**Stato: approvato da Salvo, melodia compresa.**

## Perché

La sala macchine oggi si guarda e basta: caldaie, tubi, ingranaggi e leve sono scenografia. Questo
capitolo la trasforma in un unico grande macchinario rotto, fatto di cinque macchine che dipendono
l'una dall'altra. Le macchine si risolvono a mano, toccando, trascinando, tirando e tenendo premuto.
Quando funzionano tutte insieme, una pressa gigante al centro della sala sfonda il pavimento e apre
la strada al quarto piano. È lo stesso schema dei piani sopra: il tombino dell'isola e il sarcofago
di Babele.

## Deciso con Salvo

- Un mega puzzle fatto di più macchinari collegati, non un indovinello singolo.
- **Tutto manuale.** Leve, bottoni, volantini, catene, ingranaggi da spostare, pesi da appendere.
- **Niente numeri e niente parole**, da nessuna parte nei macchinari: né sui quadranti, né sui
  pezzi, né negli indizi. Si comunica con forme, colori, posizioni, movimenti e suoni.
- La difficoltà è alta, come all'isola e a Babele.
- Alla fine, con tutti i macchinari risolti, parte un'animazione che apre la strada al piano
  successivo, come sugli altri piani.

## L'idea in una riga

Rotom Calore è l'unico fuoco rimasto nella sala. Con lui si accendono le caldaie; il vapore va
portato nei tubi giusti; il vapore muove gli ingranaggi; gli ingranaggi tirano su un montacarichi
e liberano un organo a vapore; l'organo, suonato con una scheda perforata ricomposta da tre pezzi,
sblocca l'ultima leva. La leva fa scendere la pressa.

## Il grafo dei macchinari

```
 1 Caldaie ──vapore──▶ 2 Tubi ──vapore──▶ 3 Ingranaggi ──albero──▶ 4 Montacarichi
    │                     │                    │                        │
    │ pezzo di scheda     │                    ├──albero──▶ ventola     │ pezzo di scheda
    ▼                     ▼                    │   (toglie la nebbia    ▼
                      vapore all'organo        │    dall'organo)
                          │                    │
                          └────────▶ 5 Organo ◀┘ ◀── pezzo di scheda (dietro un ingranaggio)
                                        │
                                        ▼
                               6 La leva grande ──▶ la pressa
```

I tre pezzi della scheda perforata stanno in tre macchine diverse. Nessuna macchina si può
risolvere tutta senza quelle prima, ma alcune parti si possono esplorare in anticipo: i pezzi di
scheda e la bilancina si trovano anche a sala fredda. *Scelta mia:* così c'è sempre qualcosa da
guardare e il visitatore può farsi delle idee prima di poterle provare.

## Com'è la sala all'arrivo

*Cambia rispetto al capitolo precedente.* Le caldaie sono **spente** e fredde, gli ingranaggi
fermi, i manometri a riposo, niente vapore. L'unica luce viene da Rotom Calore al centro e da
qualche brace. La sala si accende a mano a mano che si risolve: è il segno dei progressi, senza
bisogno di scritte. Chi ha già visto la sala accesa nel capitolo precedente non perde niente: era
scenografia.

Ogni macchina è un oggetto nella scena 3D. Toccandola la camera le vola davanti (una `View`, come
il lucchetto dell'isola) e i suoi pezzi diventano manovrabili. Toccando fuori, o con un gesto
indietro, la camera torna alla vista della sala. *Scelta mia:* niente finestre del desktop su questo
piano, perché il tema è il «manuale»: si mettono le mani dentro le macchine.

## 1 · Le caldaie (il fuoco)

Tre caldaie contro il muro, ognuna con lo sportello del fuoco di forma diversa: **tondo,
triangolare, quadrato**. Le tre forme tornano in tutto il piano e sono il modo di distinguere le
tre linee di vapore.

- **Accendere.** Si trascina Rotom dentro lo sportello aperto. Prima va aperto: il chiavistello si
  gira trascinandolo.
- **Il mantice.** Con Rotom dentro, si tiene premuto il pedale del mantice. Il fuoco cresce e l'ago
  del manometro sale. Il quadrante non ha numeri: ha una fascia **verde** stretta e una **rossa**
  in fondo.
  - Lasciando il pedale con l'ago nel verde la caldaia resta accesa.
  - Lasciandolo prima, il fuoco si spegne piano piano.
  - Andando nel rosso la valvola di sicurezza fischia, esce uno sbuffo e Rotom viene sputato fuori,
    tutto annerito (buffo, non spaventoso). Si riprova.
- **La serranda.** Sopra ogni caldaia c'è una leva a tre posizioni (su, metà, giù) che regola il
  tiraggio. Cambia quanto velocemente sale l'ago: con la serranda sbagliata la fascia verde è
  impossibile da prendere (l'ago scatta oltre, o non ci arriva mai). La posizione giusta è diversa
  per ogni caldaia e si capisce dal fumo che esce dal comignolo mentre si pompa: fumo nero e denso
  vuol dire poca aria, fumo che sparisce subito vuol dire troppa.
- **Il primo pezzo di scheda** è nel cassetto della cenere della caldaia quadrata. Il cassetto si
  tira fuori trascinandolo, anche a caldaia spenta.

Accese tutte e tre, la sala si illumina di arancione e i tubi cominciano a sibilare.

## 2 · I tubi (il vapore)

Un grande pannello di tubi di rame sul muro, una griglia di circa **7 × 6** raccordi. A sinistra
entrano le tre linee di vapore delle caldaie, ognuna con la sua forma (tondo, triangolo, quadrato)
battuta sulla flangia. A destra escono **quattro** uscite, anche loro con una forma: il motore
degli ingranaggi (tondo), l'organo (triangolo), la pressa (quadrato) e una quarta uscita **senza
forma** che finisce in un fischietto inutile, messa lì per confondere.

I pezzi della griglia sono di tre tipi, ognuno manovrato in modo diverso:

- **Raccordi** (dritti, a gomito, a T): si girano di un quarto toccandoli.
- **Deviatoi**, tre in tutto: ognuno ha una leva accanto. La leva su manda il vapore da una parte,
  giù dall'altra. Non si girano.
- **Volantini**: rubinetti su certi tratti. Si aprono e chiudono girando il volantino con un
  trascinamento circolare. Servono a chiudere i rami morti, che altrimenti perdono vapore.

**Come si capisce se va bene**, senza numeri:

- Il vapore si vede scorrere nei tubi come un luccichio che avanza.
- Un tubo aperto nel vuoto **perde**: sbuffa e fischia, e la pressione di quella linea cala (l'ago
  della caldaia scende).
- Se due linee si incontrano in un raccordo **si mescolano**: il manometro di entrambe le uscite
  trema impazzito e niente si muove.
- Un'uscita è a posto quando riceve vapore solo dalla linea con la sua stessa forma e senza perdite
  per strada: la sua lancetta va nel verde e la flangia si accende.

Il pannello ha **una sola soluzione**. Alcuni raccordi sono fissi (bullonati, non si girano) e
servono da appiglio. Nessun pezzo è inutile: se un deviatoio sembra non servire, serve a evitare una
perdita.

## 3 · Gli ingranaggi (la forza)

Una parete di legno con una griglia di **perni**. Su un perno c'è il **motore** (gira quando arriva
il vapore tondo). Su altri tre perni ci sono tre **alberi d'uscita**, ognuno collegato a qualcosa
nella sala:

- l'argano del **montacarichi**;
- la **ventola** sul soffitto, sopra l'organo;
- il volano della **pressa** al centro.

Accanto c'è una rastrelliera con ingranaggi di **tre misure** (piccolo, medio, grande), qualche
pezzo per misura. Si trascinano sui perni liberi. Due ingranaggi su perni vicini ingranano solo se
le loro misure ci stanno esattamente tra quei due perni: se si accavallano non entrano, se sono
troppo lontani girano a vuoto.

**Cosa chiede ogni uscita**, senza numeri. Su ogni albero c'è una targhetta con due disegni:

- una **freccia curva**: il verso in cui deve girare (orario o antiorario);
- una **lumaca** o una **lepre**: piano o veloce. Si va piano quando si passa da un ingranaggio
  piccolo a uno grande, veloce al contrario.

Un'uscita che gira nel verso sbagliato fa danni buffi e visibili: la ventola soffia la nebbia
dentro l'organo invece di toglierla, l'argano srotola la corda. Un'uscita troppo veloce o troppo
lenta sbatte e si ferma. Le tre uscite vanno sistemate **tutte insieme**, con gli stessi pochi
ingranaggi della rastrelliera: è qui la difficoltà, perché la soluzione buona per un'uscita ruba i
pezzi alle altre.

**Il secondo pezzo di scheda** è incastrato dietro un ingranaggio della rastrelliera e si vede solo
quando lo si stacca.

## 4 · Il montacarichi (i pesi)

Un montacarichi con una gabbia che pende da un argano. La gabbia è giù, in fondo a un pozzo nel
pavimento, e dentro c'è una cassa. L'argano lo muove l'albero degli ingranaggi, ma la gabbia è
troppo pesante: per tirarla su va **bilanciata**.

- **Il braccio.** Dall'argano parte un braccio orizzontale con delle tacche a distanze uguali dal
  perno, senza numeri. A ogni tacca si può appendere un peso.
- **I pesi.** Cinque oggetti di ferro diversi, sparsi per la sala: una palla, un'incudine, una
  campana, un secchio di carbone, un ingranaggio rotto. Non si sa quanto pesano.
- **La bilancina.** Su un banco c'è una bilancia a due piatti. Si possono mettere uno o più oggetti
  per piatto e vedere quale scende. È l'unico modo di scoprire il peso relativo degli oggetti.
- La gabbia sale solo quando il braccio è **in equilibrio**: un oggetto pesa di più quanto più è
  lontano dal perno, come in un'altalena. Se il braccio pende, l'argano gira a vuoto e la gabbia
  resta giù; il braccio mostra da che parte pende, ma non di quanto.

I pesi stanno in rapporti interi semplici (per esempio uno, due, tre, quattro, cinque «unità») e
c'è **una sola** combinazione di pesi e tacche che equilibra la gabbia. Provare a caso è possibile
ma lunghissimo; pesando gli oggetti con la bilancina e ragionando si arriva in pochi passi.

Su, la cassa si apre: dentro c'è **il terzo pezzo di scheda**.

*Scelta mia:* Rotom non si può appendere come peso, anche se sarebbe buffo. Se lo si trascina sul
braccio lui scappa via. È una piccola battuta muta, e toglie un'incognita al conto.

## 5 · L'organo a vapore (la musica)

Contro il muro, una fila di **sei fischi** di ottone di altezze diverse. Da ognuno pende una
catena con una maniglia di forma diversa: tondo, triangolo, quadrato, stella, mezzaluna, goccia.
Tirando una catena il fischio suona finché la si tiene: tocco breve, nota breve; tenuta, nota lunga.

- **La nebbia.** All'inizio l'organo è avvolto nel vapore di condensa e le maniglie non si
  distinguono. Si vedono solo quando la ventola degli ingranaggi gira nel verso giusto.
- **Il vapore.** Senza la linea triangolare dei tubi i fischi non suonano: si sente solo un soffio.
- **La scheda perforata.** Accanto all'organo c'è un leggio vuoto. Ci si trascinano i tre pezzi di
  scheda trovati nelle altre macchine. Vanno messi **nell'ordine giusto e nel verso giusto**: si
  possono girare e capovolgere. Per capirlo:
  - i bordi strappati combaciano solo in un modo;
  - le forme delle sei righe sono stampate solo sul bordo sinistro del primo pezzo;
  - un foro a cavallo di uno strappo si completa solo con il pezzo giusto accanto.
- **Leggere la scheda.** Ogni colonna è un istante, ogni riga è un fischio. Un foro tondo è una
  nota breve, una fessura lunga è una nota lunga. Non ci sono note scritte: si suona la catena della
  riga, nell'ordine delle colonne.
- **Suonare.** Si tirano le catene seguendo la scheda. Il ritmo esatto non conta, contano l'ordine
  e la differenza tra breve e lunga. Un errore fa uscire uno sbuffo stonato e si ricomincia da capo.
  La melodia è lunga 12 note (sotto).

**La melodia (scelta da Salvo)** è **«Genesis Retake Light»** di Ridiculon, dalla colonna sonora
di The Binding of Isaac: Repentance (la musica della schermata del titolo). Riconoscerla non serve
per risolvere, è il premio, e richiama The Lost dell'isola.

È la frase da 0:39 a 1:00 del brano, ricavata dall'audio e approvata a orecchio da Salvo: tre
discese uguali, la terza che sale invece di fermarsi. **12 note, sei note diverse**, una per
fischio. «Lunga» vuol dire fessura sulla scheda e catena tenuta.

| # | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| nota | La♭5 | Fa5 | Do5 | La♭5 | Fa5 | Do5 | La♭5 | Fa5 | Do5 | Re5 | Mi♭5 | Sol5 |
| durata | breve | breve | **lunga** | breve | breve | **lunga** | breve | breve | breve | breve | breve | **lunga** |

I sei fischi, dal più alto e grave al più basso e acuto: Do5, Re5, Mi♭5, Fa5, Sol5, La♭5.

**Il suono.** È un organo a canne, non un flauto (Salvo l'ha chiesto dopo la prima prova): ogni
nota suona su più registri insieme (l'ottava sotto, la fondamentale e tre registri acuti), con due
file di canne appena scordate tra loro, il soffio d'aria all'attacco, un tremolo leggero e il
riverbero di una sala grande. Si genera con Web Audio, senza file audio: nel sito non entra niente
del brano originale.

Suonata giusta, l'organo ripete la melodia da solo, intera, e sotto la tastiera si sgancia un
fermo.

## 6 · La leva grande e la pressa (il finale)

Al centro della sala, dove galleggia Rotom, c'è la **pressa**: un maglio enorme appeso al soffitto,
con un volano e un pistone, fermo da sempre. Quando parte il puzzle Rotom si sposta di lato.

- Accanto c'è una **leva grande** bloccata da **tre fermi**: uno si sgancia con la linea quadrata
  dei tubi a pressione, uno con il volano degli ingranaggi che gira, uno con l'organo. Ogni fermo
  sganciato si accende. Così il visitatore vede quanto gli manca, senza scritte.
- Con tre fermi sganciati si tira la leva, trascinandola giù fino in fondo. È l'ultimo gesto
  manuale, e lo fa il visitatore, non una scena automatica.

**La scena finale**, come il sarcofago di Babele:

1. Tutte le macchine della sala partono insieme: le caldaie ruggiscono, il vapore fischia in tutti i
   tubi, gli ingranaggi girano, l'organo suona l'ultima nota della melodia.
2. Il maglio scende tre volte sul pavimento. A ogni colpo la camera trema e si apre una crepa più
   grande nelle piastre di ferro.
3. Al terzo colpo le piastre crollano e al centro si apre un buco con una luce diversa sotto (la
   luce del piano dopo, per esempio fredda e bianca, da aula).
4. Rotom dice una battuta, che scrive Salvo. Segnaposto: `«Rotom: TODO — la battuta della pressa.»`

**Il quarto piano non esiste ancora.** Il buco resta aperto e toccarlo non fa niente. Il
collegamento, la discesa e la nuova forma di Rotom si fanno nel capitolo del quarto piano, come per
il sarcofago.

## Regole che valgono per tutte le macchine

- **Niente numeri e niente parole.** Lo controlla `npm test` per quanto possibile: i componenti
  delle macchine non mostrano testo.
- **Feedback sempre visibile.** Ogni macchina mostra subito se una mossa va bene o male (vapore che
  scorre o perde, ago che sale, ingranaggio che gira o sbatte, braccio che pende). Non c'è mai un
  pulsante «verifica».
- **Niente vicoli ciechi.** Ogni pezzo si può sempre rimettere a posto o riprovare. Nessuna mossa
  rompe qualcosa per sempre.
- **Battute di Rotom.** *Scelta mia:* Rotom commenta poco, come a Babele. Parla solo a tre
  momenti: la prima caldaia accesa, la scheda ricomposta, la pressa. Le battute le scrive Salvo; nel
  codice restano dei segnaposto `TODO` come `starLine`.
- **Trascinare un pezzo non gira la camera**, anche su telefono, come le rotelle del lucchetto.
- **Movimento ridotto.** Le macchine funzionano lo stesso, senza tremolii, sbuffi e scosse; la
  scena finale salta direttamente al buco aperto.

## Scene e camera

Valgono le regole dei capitoli precedenti (`onScene`): durante una scena lo schermo si svuota e la
vista è bloccata. Sono scene:

- la battuta della prima caldaia e quella della scheda ricomposta;
- l'organo che ripete la melodia da solo;
- tutta la scena finale della pressa.

Volare davanti a una macchina non è una scena: si può tornare indietro quando si vuole.

## Progressi, reset e debug

- **Chiavi nuove in `src/data/puzzle.ts`**, una per macchina, lette e controllate al caricamento
  come le altre:
  - `bomboniera.puzzle.caldaie` (quali caldaie sono accese, posizione delle serrande, cassetto
    aperto);
  - `bomboniera.puzzle.tubi` (verso di ogni raccordo, leve dei deviatoi, volantini);
  - `bomboniera.puzzle.ingranaggi` (quale ingranaggio su quale perno);
  - `bomboniera.puzzle.montacarichi` (pesi appesi e tacche, cassa aperta);
  - `bomboniera.puzzle.organo` (pezzi sul leggio e loro verso, melodia suonata);
  - `bomboniera.puzzle.pressa` (leva tirata, pavimento sfondato).
- I pezzi di scheda trovati si ricordano con la macchina dove stavano.
- «Ricomincia il puzzle» cancella anche queste.
- Fermate nuove nel menu «salta a…», dopo «terzo piano»: **caldaie**, **tubi**, **ingranaggi**,
  **montacarichi**, **organo**, **pressa**.
- `npm test` controlla, per ogni macchina, che la soluzione salvata nel codice risolva davvero e
  che sia l'unica:
  - tubi: che la configurazione giusta porti ogni linea alla sua uscita senza perdite né incroci, e
    che nessun'altra lo faccia;
  - ingranaggi: che con i pezzi della rastrelliera esista almeno una disposizione che soddisfa le
    tre targhette;
  - montacarichi: che una sola combinazione di pesi e tacche equilibri la gabbia, e che i pesi
    relativi si possano ricavare con la bilancina;
  - organo: che la scheda ricomposta in un solo modo dia la melodia.

## Obiettivi

- Si capisce senza leggere: forme, colori e movimenti bastano.
- Ogni macchina dà la soddisfazione di un meccanismo vero: scatti, sbuffi, catene che si tendono.
- La sala che si accende piano piano è il segno dei progressi.
- Il finale è il momento più grande del piano, come la torre all'isola.
- Funziona su telefono come su desktop: i pezzi da trascinare sono abbastanza grandi per un dito.

## Fuori da questo lavoro

- Il quarto piano, la discesa nel buco e la nuova forma di Rotom.
- Le battute definitive di Rotom (le scrive Salvo).

## Cose da evitare

- Numeri o lettere da qualsiasi parte: quadranti, targhette, schede, pezzi.
- Un macchinario che si risolve provando a caso in pochi tentativi.
- Un macchinario che si risolve solo provando a caso, senza un ragionamento possibile.
- Feedback ambigui: deve essere chiaro se un ingranaggio gira, se il vapore passa, se il braccio
  pende.
- Troppi oggetti 3D animati insieme sul telefono: vapore e fuoco vanno tenuti leggeri.

## Lasciato al builder

- La disposizione esatta delle macchine lungo il muro, purché si vedano tutte girando la camera e
  la pressa resti al centro.
- La griglia dei tubi, i perni degli ingranaggi, i pesi e la melodia trascritta sulla scheda,
  rispettando l'unicità che controlla `npm test`.
- I suoni: i fischi dell'organo, il sibilo del vapore, i colpi della pressa (Web Audio, come il
  ritmo dell'isola).
- Durate e curve delle animazioni.

## Decisioni di Salvo

Nessuna. Approvati da Salvo: la sala spenta all'arrivo che si accende risolvendo, la pressa che sfonda il
pavimento, i cinque macchinari così come sono.

## Rischi

- È il capitolo più grande finora: cinque macchine 3D manovrabili. Conviene costruirle una alla
  volta, ognuna con la sua fermata di debug, e guardarle sul telefono a ogni passo.
- Il trascinamento in 3D (ingranaggi, pesi, pezzi di scheda) è più delicato di quello nelle
  finestre: va provato presto su un telefono vero.
- L'audio dell'organo su iPhone parte solo dopo un tocco: il primo tiro di catena deve sbloccarlo.
