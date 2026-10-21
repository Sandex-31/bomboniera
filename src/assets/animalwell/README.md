# Animal Well: i file originali

Qui vanno gli sprite, i tile, la musica e i suoni di **Animal Well** (Billy Basso, Shared Memory,
Bigmode), con i crediti nel README del progetto come per il brano di Isaac. Finché un file manca, il
pozzo disegna al suo posto un rettangolo della stessa misura nel colore del suo sprite, e i suoni
sono un bip di Web Audio: non si rompe niente.

## Sprite

Ogni foglio ha i fotogrammi **affiancati in orizzontale**, tutti della stessa misura, PNG con lo
sfondo trasparente. La misura è in pixel logici dello schermo, che è 320×180 come una stanza del
gioco. I nomi sono quelli di `src/lib/well/sprites.ts`: se una misura cambia, va cambiata anche lì.

| `SpriteId`     | File               | Fotogramma | Fotogrammi | Cosa sono                                    |
| -------------- | ------------------ | ---------- | ---------- | -------------------------------------------- |
| `rotomFrost`   | `rotom-frost.png`  | 12×12      | 2          | Rotom Gelo, da disegnare nello stile del gioco |
| `chinchilla`   | `chinchilla.png`   | 16×12      | 2          | il cincillà che cammina                      |
| `chest`        | `chest.png`        | 16×12      | 2          | il baule, chiuso e aperto                    |
| `porcupine`    | `porcupine.png`    | 16×12      | 2          | il porcospino che cammina                    |
| `crow`         | `crow.png`         | 12×12      | 2          | il corvo, fermo e mentre gracchia            |
| `turtle`       | `turtle.png`       | 16×8       | 2          | la tartaruga, sott'acqua e a galla           |
| `bud`          | `bud.png`          | 8×12       | 2          | il bocciolo, chiuso e fiorito                |
| `ghost`        | `ghost.png`        | 16×16      | 2          | il fantasma della stanza buia                |
| `candle`       | `candle.png`       | 8×12       | 2          | la candela, spenta e accesa                  |
| `phone`        | `phone.png`        | 16×16      | 1          | il telefono, il punto di salvataggio         |
| `tv`           | `tv.png`           | 32×24      | 2          | la televisione, spenta e accesa              |
| `face`         | `face.png`         | 12×12      | 8          | la faccia di fantasma: una per direzione del flauto, nell'ordine su, su-destra, destra, giù-destra, giù, giù-sinistra, sinistra, su-sinistra |
| `flame`        | `flame.png`        | 8×12       | 4          | la fiamma                                    |
| `blockPink`    | `block-pink.png`   | 8×8        | 2          | il blocco rosa, pieno e vuoto                |
| `blockBlue`    | `block-blue.png`   | 8×8        | 2          | il blocco azzurro, pieno e vuoto             |
| `switchYellow` | `switch-yellow.png`| 8×8        | 2          | l'interruttore giallo, su e premuto          |
| `switchGreen`  | `switch-green.png` | 8×8        | 2          | l'interruttore verde, su e premuto           |
| `switchPink`   | `switch-pink.png`  | 8×8        | 2          | l'interruttore rosa, su e premuto            |

## Tile

| `SpriteId` | File        | Tile | Quanti | Cosa sono                                   |
| ---------- | ----------- | ---- | ------ | ------------------------------------------- |
| `tile`     | `tiles.png` | 8×8  | 16     | le pietre delle stanze, in una sola riga    |

## Musica

- `music.ogg` (o `.mp3`): una traccia di sottofondo del gioco, scelta da Salvo, che possa andare in
  loop.

## Suoni

- `flute-u.wav`, `flute-ur.wav`, `flute-r.wav`, `flute-dr.wav`, `flute-d.wav`, `flute-dl.wav`,
  `flute-l.wav`, `flute-ul.wav`: le otto note del flauto, una per direzione;
- `switch.wav`: un interruttore premuto;
- `chest.wav`: il baule che si apre;
- `firecracker.wav`: il petardo;
- `phone-busy.wav`: il tono di occupato;
- `phone-ring.wav`: il telefono che squilla;
- `flame.wav`: la fiamma presa;
- `mural.wav`: un pezzo del murale messo al suo posto.
- `crow.wav` (o `.ogg`, `.mp3`): un solo verso del corvo, breve; i versi lunghi sono lo stesso
  rallentato.
