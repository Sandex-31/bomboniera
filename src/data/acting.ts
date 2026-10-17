/*
 * What the two figures of each chat do while each of its messages is on
 * screen: one beat per message, in order. The point is that a beat acts out
 * its own line — whoever says «Prendi il pane» holds out the bread — so a
 * word can be told from what the hands are doing when it turns up.
 *
 * A beat only says what changes. Everything a figure was doing (pose, face,
 * where it stands, what it holds, its loop) carries on into the next beat
 * until a beat says otherwise; `show` too, the things on stage around them.
 */

/** Whole-body poses; Folk.tsx has the joint angles for each. */
export type Pose =
  | "stand" | "talk" | "listen" | "head" | "point" | "pointBack" | "pointUp" | "lookUp"
  | "wave" | "cheer" | "shrug" | "chest" | "offer" | "raise" | "strike" | "guard"
  | "belly" | "eat" | "cradle" | "lift" | "drum" | "row" | "fear" | "wrist"
  | "proud" | "ape" | "kneel" | "sit" | "lie" | "chase";

export type Face = "calm" | "happy" | "sad" | "angry" | "surprised" | "sleep";

/** Movements that repeat on top of a pose, for as long as the beat lasts. */
export const LOOPS = [
  "walk", "bounce", "drum", "shake", "strike", "row", "scratch",
  "eat", "wave", "tremble", "rub", "tap", "look",
] as const;
export type Loop = (typeof LOOPS)[number];

/** What a figure can have in its front hand. */
export type Held = "sword" | "bread" | "baby" | "oar";

/** The things on stage around them. Folk.tsx draws each one. */
export type Prop =
  | "notes" | "drum" | "sun-low" | "sun-high" | "sun" | "zzz"
  | "table" | "bread" | "honey"
  | "gold" | "pigmeo-hide" | "pigmeo-sneak" | "pigmeo-steal" | "pigmeo-flee"
  | "question" | "army" | "skull" | "sword-down"
  | "tree" | "monkey" | "banana"
  | "monster" | "monster-noheart" | "monster-brain" | "heart-a" | "heart-b"
  | "stars" | "stars-out" | "earth" | "ship"
  | "river" | "boat" | "hourglass" | "road" | "crowd";

export type Act = {
  p?: Pose;
  f?: Face;
  /** Steps toward the other one, in drawing units (they stand 96 apart). */
  x?: number;
  h?: Held | null;
  l?: Loop | null;
};

export type Beat = { a?: Act; b?: Act; show?: Prop[] };

/** How a figure stands before its first beat. */
export const START: Required<Act> = { p: "stand", f: "calm", x: 0, h: null, l: null };

/** Each figure as it is at beat `step`, everything before it carried over. */
export function actAt(beats: Beat[], step: number) {
  let a = START;
  let b = START;
  let show: Prop[] = [];
  for (const beat of beats.slice(0, step + 1)) {
    a = { ...a, ...beat.a };
    b = { ...b, ...beat.b };
    show = beat.show ?? show;
  }
  return { a, b, show };
}

export const BEATS: Record<string, Beat[]> = {
  /* ---- phase 0 */
  "e-musica": [
    { a: { p: "listen", f: "surprised" }, show: ["notes"] }, // Senti la musica?
    { b: { p: "listen", f: "happy" }, a: { p: "stand", f: "calm" } }, // Sì, la sento sempre.
    { a: { p: "point" } }, // Suoni tu?
    { b: { p: "drum", l: "drum" }, show: ["notes", "drum"] }, // Suono il tamburo. Ascolta!
    { a: { p: "cheer", f: "happy", l: "bounce" } }, // Che bella musica. Balliamo!
    { b: { p: "cheer", l: "bounce" } }, // Balliamo sempre.
  ],
  "e-sonno": [
    { a: { p: "lie", f: "angry" }, b: { p: "drum", f: "happy", l: "drum" }, show: ["drum", "notes", "sun-low"] }, // Perché suoni? Dormo!
    { b: { p: "talk", x: 40, l: "shake" }, show: ["drum", "sun-low"] }, // Perché è mattina. Sveglia!
    { a: { f: "sleep" }, b: { p: "shrug", f: "calm", l: null }, show: ["drum", "sun-low", "zzz"] }, // No, la notte è lunga.
    { b: { p: "pointUp", f: "angry" }, show: ["drum", "sun-high"] }, // Senti il sole? Sempre tardi, tu.
    { a: { p: "sit", f: "sad" } }, // Perché sempre io?
  ],
  "e-cibo": [
    { a: { p: "talk" }, show: ["table"] }, // Hai fame?
    { b: { p: "belly", f: "sad", l: "rub" }, show: ["table", "bread"] }, // Sì, tanta fame. Mangiamo pane.
    { a: { p: "offer", f: "happy", h: "bread", x: 12 }, show: ["table", "honey"] }, // Pane e miele. Prendi!
    { a: { p: "stand", h: null, x: 0 }, b: { p: "eat", f: "happy", h: "bread", l: "eat" } }, // Grazie. È buono, sempre buono.
    { a: { p: "listen" }, show: ["table", "honey", "notes"] }, // E poi la musica?
    { b: { p: "offer", l: null } }, // Prima il pane, poi la musica.
  ],

  /* ---- phase 1 */
  "s-furto": [
    { a: { p: "point", f: "surprised" }, show: ["gold", "pigmeo-hide"] }, // Guarda, un piccolo pigmeo!
    { b: { p: "shrug", l: "look" } }, // Dove? Non lo vedo.
    { a: { f: "calm" }, show: ["gold", "pigmeo-sneak"] }, // È furtivo, cammina piano.
    { b: { p: "pointBack", f: "angry", l: null }, show: ["pigmeo-steal"] }, // Ruba il mio oro!
    { a: { p: "chase", f: "angry", x: 24, l: "walk" } }, // Fermo, piccolo ladro!
    { a: { p: "stand", l: null }, b: { p: "shrug", f: "sad" }, show: ["pigmeo-flee"] }, // È già fuggito. Furbo, il pigmeo.
  ],
  "s-oblio": [
    { a: { p: "offer", f: "happy", x: 10 } }, // Come ti chiami?
    { b: { p: "head", f: "sad", l: "scratch" }, show: ["question"] }, // L'ho dimenticato.
    { a: { p: "shrug", f: "surprised", x: 0 } }, // Dimenticato? Così facilmente?
    { b: { p: "shrug", f: "happy", l: null } }, // Dimentico tutto, facilmente.
    { a: { p: "chest", f: "sad" }, show: [] }, // Anche me?
    { b: { p: "point", f: "surprised" }, show: ["question"] }, // Chi sei tu?
  ],
  "se-musica": [
    { a: { p: "listen", f: "surprised" }, show: ["notes"] }, // Musica?
    { b: { p: "drum", f: "happy", l: "drum" }, show: ["notes", "drum"] }, // Musica! Senti?
    { a: { f: "happy" } }, // Sì, sento la musica.
    { b: { p: "cheer", l: "bounce" } }, // Sempre musica, qui.
    { a: { p: "cheer", l: "bounce" } }, // Così bella, così facile.
  ],

  /* ---- phase 2 */
  "b-guerra": [
    { a: { p: "point", f: "angry" }, b: { f: "surprised" }, show: ["army"] }, // La guerra è qui.
    { b: { p: "offer", f: "calm", h: "sword" } }, // Combatti con me?
    { a: { p: "raise", h: "sword" } }, // Combatto. Se vinciamo, viviamo.
    { b: { p: "fear", f: "sad", h: null, l: "tremble" } }, // E se perdiamo?
    { a: { p: "chest", f: "sad", h: null }, show: ["army", "skull"] }, // Se perdiamo, moriamo.
    { a: { p: "raise", f: "angry", h: "sword" }, b: { p: "raise", f: "angry", h: "sword", l: "bounce" }, show: ["army"] }, // Allora non perdiamo. Vinciamo!
  ],
  "b-duello": [
    { a: { p: "guard", f: "angry", h: "sword", x: 8 }, b: { p: "guard", h: "sword", x: 8 } }, // Tu non puoi vincere.
    { b: { p: "raise", f: "happy" } }, // Io vinco sempre.
    { a: { p: "point" }, show: ["skull"] }, // Hai paura di morire?
    { b: { p: "guard", f: "angry", x: 16 }, show: [] }, // No. Chi non combatte muore.
    { a: { p: "strike", l: "strike", x: 16 }, b: { l: "strike" } }, // Allora combatti!
    { a: { p: "kneel", f: "sad", h: null, l: null }, b: { p: "raise", f: "happy", l: null }, show: ["sword-down"] }, // Hai perso. Vivrai, ma hai perso.
  ],
  "be-pane": [
    { a: { p: "raise", f: "angry", h: "sword" } }, // Guerra!
    { b: { p: "shrug", f: "surprised" } }, // Guerra? Perché?
    { a: { p: "belly", f: "sad", h: null, l: "rub" }, show: ["sword-down"] }, // Perché non abbiamo pane.
    { b: { p: "offer", f: "happy", h: "bread", x: 16 } }, // Prendi il pane. Niente guerra.
    { a: { p: "eat", f: "happy", h: "bread", l: "eat" }, b: { p: "stand", h: null } }, // Pane… grazie. Niente guerra.
  ],
  "bs-oro": [
    { a: { p: "point", f: "angry" }, show: ["pigmeo-flee"] }, // Il pigmeo ha rubato l'oro.
    { b: { p: "head", f: "surprised" } }, // L'oro? Il mio oro?
    { a: { p: "raise", h: "sword" }, show: [] }, // Sì, il tuo oro. Combattiamo?
    { b: { p: "proud", f: "happy" } }, // No, lo ritrovo. È facile.
    { a: { p: "shrug", f: "happy", h: null } }, // Facile? Buona fortuna.
  ],

  /* ---- phase 3 */
  "t-scimmia": [
    { a: { p: "pointUp", f: "surprised" }, show: ["tree", "monkey"] }, // Guarda, una scimmia sull'albero.
    { b: { p: "talk", f: "happy" }, show: ["tree", "monkey", "banana"] }, // È felice, mangia banane.
    { a: { p: "head", f: "happy", l: "scratch" } }, // Non pensa a niente. Pazza scimmia!
    { b: { p: "ape", l: "bounce" } }, // Senza pensieri. Preferisco essere così.
    { a: { p: "shrug", f: "surprised", l: null } }, // Una scimmia? Davvero?
    { a: { f: "sad" } }, // Meglio scimmia che triste.
  ],
  "t-mostro": [
    { a: { p: "chest" }, show: ["monster"] }, // Il mostro ha un cuore?
    { b: { p: "point", f: "sad" }, show: ["monster", "monster-noheart"] }, // No, è senza cuore.
    { a: { p: "head", f: "surprised" } }, // E il cervello?
    { b: { p: "pointUp", f: "calm" }, show: ["monster", "monster-noheart", "monster-brain"] }, // Un cervello enorme, ma niente cuore.
    { a: { p: "chest", f: "happy" }, show: ["monster", "monster-noheart", "monster-brain", "heart-a"] }, // Preferisco un cuore piccolo.
    { b: { p: "chest", f: "happy" }, show: ["monster", "monster-noheart", "monster-brain", "heart-a", "heart-b"] }, // Anche io. Il cuore prima di tutto.
  ],
  "te-cuore": [
    { a: { p: "chest", f: "happy" }, show: ["heart-a"] }, // Cuore.
    { b: { p: "chest", f: "happy" }, show: ["heart-a", "notes"] }, // Cuore? La musica è nel cuore.
    { show: ["heart-a", "heart-b", "notes"] }, // Sì, nel cuore. Sempre.
    { b: { p: "listen" } }, // Senti? Il cuore suona.
  ],
  "tb-mostro": [
    { a: { p: "fear", f: "surprised", l: "tremble" }, show: ["monster"] }, // Un mostro! Aiuto!
    { b: { p: "raise", f: "angry", h: "sword" } }, // Un mostro? Combatto io.
    { a: { p: "pointUp" } }, // È enorme, senza paura.
    { b: { p: "guard", x: 20 } }, // Anche io sono senza paura. Mostro, vieni!
    { a: { p: "cheer", f: "happy", l: "bounce" }, b: { p: "strike", l: "strike" } }, // Forza, vinci tu!
  ],

  /* ---- phase 4 */
  "o-cielo": [
    { a: { p: "pointUp", f: "happy" }, show: ["stars"] }, // Guarda le stelle.
    { b: { p: "point" }, show: ["stars", "earth"] }, // Laggiù c'è la terra. Siamo nati là.
    { a: { p: "shrug", f: "surprised" } }, // Gli umani sono nati sulla terra?
    { b: { p: "pointUp", f: "happy" } }, // Sì, ma guarda in alto. Il destino è lassù.
    { a: { p: "talk", f: "calm" }, show: ["stars", "earth", "ship"] }, // Quando partiamo?
    { a: { p: "cheer", f: "happy" }, b: { p: "wave", l: "wave" } }, // Presto. Non restiamo qui per sempre.
  ],
  "o-nascita": [
    { a: { p: "cradle", f: "happy", h: "baby" } }, // Un bambino è nato!
    { b: { p: "point", f: "happy", x: 16 } }, // Nato oggi? Quanto è piccolo.
    { a: { f: "sad" }, show: ["skull"] }, // Un giorno morirà, come tutti.
    { b: { p: "pointUp" }, show: ["stars"] }, // Non dire così. Il suo destino è grande.
    { a: { p: "lift", f: "happy" } }, // Destinato alle stelle, allora.
    { b: { p: "cheer", l: "bounce" } }, // Sì. Non morirà mai qui.
  ],
  "os-stelle": [
    { a: { p: "pointUp" }, show: ["stars"] }, // Stelle.
    { b: { p: "chest", f: "happy" } }, // Stelle! Siamo noi.
    { a: { p: "offer", f: "happy" }, show: ["stars", "ship"] }, // Andiamo tra le stelle?
    { b: { p: "wave", l: "wave" } }, // Sì, andiamo. Qui è finito.
  ],
  "ot-terra": [
    { a: { p: "point", f: "surprised" }, show: ["earth"] }, // Terra!
    { b: { p: "shrug", l: "look" } }, // Terra? Dove?
    { a: { p: "pointUp", f: "happy" } }, // Là, la nostra terra. La vedi?
    { b: { p: "lookUp", f: "happy", l: null } }, // La vedo. Che bella terra.
    { a: { p: "wave", f: "sad", l: "wave" }, show: ["earth", "ship"] }, // L'umanità la lascia.
    { b: { p: "proud", f: "sad" } }, // Perché? Preferisco restare.
  ],

  /* ---- phase 5 */
  "x-fiume": [
    { a: { p: "point" }, show: ["river"] }, // Guarda il fiume.
    { b: { p: "talk" } }, // Scorre sempre, non si ferma.
    { a: { p: "shrug", f: "surprised" } }, // L'acqua passa e torna?
    { b: { p: "wave", l: "wave" } }, // Non torna mai. Passa e basta.
    { a: { p: "point", f: "calm" }, show: ["river", "hourglass"] }, // Come il tempo.
    { b: { p: "talk", l: null } }, // Sì, come il tempo.
  ],
  "x-viaggio": [
    { a: { p: "shrug" }, show: ["road", "crowd"] }, // Dove vanno le persone?
    { b: { p: "point" } }, // Si muovono, sempre avanti.
    { a: { f: "surprised" } }, // E quando finisce il viaggio?
    { b: { p: "stand", l: "walk" } }, // Non finisce. Un passo, poi un altro.
    { a: { p: "stand", f: "happy", l: "walk" } }, // Il corso della vita.
    { show: ["road", "crowd", "river"] }, // Corre come l'acqua.
  ],
  "xo-tempo": [
    { a: { p: "wrist", l: "tap" }, show: ["sun"] }, // Tempo.
    { b: { p: "wrist", f: "sad", l: "tap" } }, // Tempo? Non ho tempo.
    { a: { p: "point", l: null }, show: ["sun", "hourglass"] }, // Il tempo passa per tutti.
    { b: { p: "pointUp", f: "surprised", l: null }, show: ["stars", "hourglass"] }, // Anche per le stelle?
    { a: { p: "pointUp", f: "sad" }, show: ["stars-out", "hourglass"] }, // Anche per le stelle. Tutto finisce.
  ],
  "xe-fiume": [
    { a: { p: "point" }, show: ["river"] }, // Fiume.
    { b: { p: "row", f: "happy", h: "oar", l: "row" }, show: ["river", "boat"] }, // Il fiume! Remo sul fiume.
    { a: { p: "shrug", f: "surprised" } }, // Remi sempre?
    { a: { p: "stand", f: "happy" } }, // Sempre. Il fiume non si ferma.
  ],
};
