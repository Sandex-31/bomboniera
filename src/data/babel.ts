/**
 * Babel, the second floor: the six phrases set into its wall, and the chats
 * on the terminal in the column that teach the scripts they are written in.
 *
 * Nothing here is ever translated for the visitor. The chats are written in
 * Italian so they can be read and fixed, and only turned into a script when
 * shown. Each one is about the scene its two speakers act out, and says the
 * same few words again and again, so a guess at a word can be tried against
 * the scene and then against the next chat. `npm test` holds them to the
 * promise the floor makes: every letter of a phrase is in at least two words
 * of the chats readable before it, in that phrase's script.
 */
import { bare, type Script } from "../lib/scripts";

/** In the order they are meant to be read, easiest first. */
export const PHRASES: { script: Script; text: string; titles: string[] }[] = [
  {
    script: "egizi",
    text: "Perché sente sempre la musica?",
    titles: ["Baby Driver", "Baby Driver - Il genio della fuga"],
  },
  {
    script: "stelle",
    text: "il furtivo Pigmeo, così facilmente dimenticato",
    titles: ["Dark Souls", "Dark Souls 1", "Dark Souls I"],
  },
  {
    script: "blocchi",
    text: "Se vinci, vivrai. Se perdi, morirai. Se non combatti, non puoi vincere.",
    titles: ["Attack on Titan", "Attack on Titans", "L'attacco dei giganti", "Shingeki no Kyojin"],
  },
  {
    script: "tubi",
    text: "Preferisco essere una scimmia senza cervello che un mostro senza cuore.",
    titles: ["Dragon Ball", "Dragonball", "Dragon Ball Z"],
  },
  {
    script: "onde",
    text: "L'umanità è nata sulla Terra. Non è mai stato destinato a morire qui",
    titles: ["Interstellar"],
  },
  {
    script: "esagrammi",
    text: "Il tempo passa, le persone si muovono... Come il corso di un fiume, non finisce mai.",
    titles: [
      "Ocarina of Time",
      "Zelda",
      "The Legend of Zelda",
      "Zelda Ocarina of Time",
      "The Legend of Zelda: Ocarina of Time",
    ],
  },
];

/** What the two figures act out over a chat, with no words. */
export type SceneKind =
  | "musica"
  | "sonno"
  | "cibo"
  | "furto"
  | "oblio"
  | "guerra"
  | "scimmia"
  | "cuore"
  | "cielo"
  | "nascita"
  | "viaggio"
  | "fiume"
  | "tempo";

export type Chat = {
  id: string;
  /** Phase 0 is there from the start; phase k turns up once phrase k (one-based) is read. */
  phase: number;
  /** Who is talking, left and right. Each writes in their own script. */
  who: [Script, Script];
  scene: SceneKind;
  lines: { by: 0 | 1; text: string }[];
};

/** Lines alternate left and right, starting on the left. */
const talk = (...texts: string[]) => texts.map((text, i) => ({ by: (i % 2) as 0 | 1, text }));

export const CHATS: Chat[] = [
  /* ---- phase 0: the Egyptians, among themselves */
  {
    id: "e-musica",
    phase: 0,
    who: ["egizi", "egizi"],
    scene: "musica",
    lines: talk(
      "Senti la musica?",
      "Sì, la sento sempre.",
      "Suoni tu?",
      "Suono il tamburo. Ascolta!",
      "Che bella musica. Balliamo!",
      "Balliamo sempre.",
    ),
  },
  {
    id: "e-sonno",
    phase: 0,
    who: ["egizi", "egizi"],
    scene: "sonno",
    lines: talk(
      "Perché suoni? Dormo!",
      "Perché è mattina. Sveglia!",
      "No, la notte è lunga.",
      "Senti il sole? Sempre tardi, tu.",
      "Perché sempre io?",
    ),
  },
  {
    id: "e-cibo",
    phase: 0,
    who: ["egizi", "egizi"],
    scene: "cibo",
    lines: talk(
      "Hai fame?",
      "Sì, tanta fame. Mangiamo pane.",
      "Pane e miele. Prendi!",
      "Grazie. È buono, sempre buono.",
      "E poi la musica?",
      "Prima il pane, poi la musica.",
    ),
  },

  /* ---- phase 1: the Stars */
  {
    id: "s-furto",
    phase: 1,
    who: ["stelle", "stelle"],
    scene: "furto",
    lines: talk(
      "Guarda, un piccolo pigmeo!",
      "Dove? Non lo vedo.",
      "È furtivo, cammina piano.",
      "Ruba il mio oro!",
      "Fermo, piccolo ladro!",
      "È già fuggito. Furbo, il pigmeo.",
    ),
  },
  {
    id: "s-oblio",
    phase: 1,
    who: ["stelle", "stelle"],
    scene: "oblio",
    lines: talk(
      "Come ti chiami?",
      "L'ho dimenticato.",
      "Dimenticato? Così facilmente?",
      "Dimentico tutto, facilmente.",
      "Anche me?",
      "Chi sei tu?",
    ),
  },
  {
    id: "se-musica",
    phase: 1,
    who: ["stelle", "egizi"],
    scene: "musica",
    lines: talk(
      "Musica?",
      "Musica! Senti?",
      "Sì, sento la musica.",
      "Sempre musica, qui.",
      "Così bella, così facile.",
    ),
  },

  /* ---- phase 2: the Blocks */
  {
    id: "b-guerra",
    phase: 2,
    who: ["blocchi", "blocchi"],
    scene: "guerra",
    lines: talk(
      "La guerra è qui.",
      "Combatti con me?",
      "Combatto. Se vinciamo, viviamo.",
      "E se perdiamo?",
      "Se perdiamo, moriamo.",
      "Allora non perdiamo. Vinciamo!",
    ),
  },
  {
    id: "b-duello",
    phase: 2,
    who: ["blocchi", "blocchi"],
    scene: "guerra",
    lines: talk(
      "Tu non puoi vincere.",
      "Io vinco sempre.",
      "Hai paura di morire?",
      "No. Chi non combatte muore.",
      "Allora combatti!",
      "Hai perso. Vivrai, ma hai perso.",
    ),
  },
  {
    id: "be-pane",
    phase: 2,
    who: ["blocchi", "egizi"],
    scene: "guerra",
    lines: talk(
      "Guerra!",
      "Guerra? Perché?",
      "Perché non abbiamo pane.",
      "Prendi il pane. Niente guerra.",
      "Pane… grazie. Niente guerra.",
    ),
  },
  {
    id: "bs-oro",
    phase: 2,
    who: ["blocchi", "stelle"],
    scene: "furto",
    lines: talk(
      "Il pigmeo ha rubato l'oro.",
      "L'oro? Il mio oro?",
      "Sì, il tuo oro. Combattiamo?",
      "No, lo ritrovo. È facile.",
      "Facile? Buona fortuna.",
    ),
  },

  /* ---- phase 3: the Pipes */
  {
    id: "t-scimmia",
    phase: 3,
    who: ["tubi", "tubi"],
    scene: "scimmia",
    lines: talk(
      "Guarda, una scimmia sull'albero.",
      "È felice, mangia banane.",
      "Non pensa a niente. Pazza scimmia!",
      "Senza pensieri. Preferisco essere così.",
      "Una scimmia? Davvero?",
      "Meglio scimmia che triste.",
    ),
  },
  {
    id: "t-mostro",
    phase: 3,
    who: ["tubi", "tubi"],
    scene: "cuore",
    lines: talk(
      "Il mostro ha un cuore?",
      "No, è senza cuore.",
      "E il cervello?",
      "Un cervello enorme, ma niente cuore.",
      "Preferisco un cuore piccolo.",
      "Anche io. Il cuore prima di tutto.",
    ),
  },
  {
    id: "te-cuore",
    phase: 3,
    who: ["tubi", "egizi"],
    scene: "cuore",
    lines: talk(
      "Cuore.",
      "Cuore? La musica è nel cuore.",
      "Sì, nel cuore. Sempre.",
      "Senti? Il cuore suona.",
    ),
  },
  {
    id: "tb-mostro",
    phase: 3,
    who: ["tubi", "blocchi"],
    scene: "guerra",
    lines: talk(
      "Un mostro! Aiuto!",
      "Un mostro? Combatto io.",
      "È enorme, senza paura.",
      "Anche io sono senza paura. Mostro, vieni!",
      "Forza, vinci tu!",
    ),
  },

  /* ---- phase 4: the Waves */
  {
    id: "o-cielo",
    phase: 4,
    who: ["onde", "onde"],
    scene: "cielo",
    lines: talk(
      "Guarda le stelle.",
      "Laggiù c'è la terra. Siamo nati là.",
      "Gli umani sono nati sulla terra?",
      "Sì, ma guarda in alto. Il destino è lassù.",
      "Quando partiamo?",
      "Presto. Non restiamo qui per sempre.",
    ),
  },
  {
    id: "o-nascita",
    phase: 4,
    who: ["onde", "onde"],
    scene: "nascita",
    lines: talk(
      "Un bambino è nato!",
      "Nato oggi? Quanto è piccolo.",
      "Un giorno morirà, come tutti.",
      "Non dire così. Il suo destino è grande.",
      "Destinato alle stelle, allora.",
      "Sì. Non morirà mai qui.",
    ),
  },
  {
    id: "os-stelle",
    phase: 4,
    who: ["onde", "stelle"],
    scene: "cielo",
    lines: talk(
      "Stelle.",
      "Stelle! Siamo noi.",
      "Andiamo tra le stelle?",
      "Sì, andiamo. Qui è finito.",
    ),
  },
  {
    id: "ot-terra",
    phase: 4,
    who: ["onde", "tubi"],
    scene: "viaggio",
    lines: talk(
      "Terra!",
      "Terra? Dove?",
      "Là, la nostra terra. La vedi?",
      "La vedo. Che bella terra.",
      "L'umanità la lascia.",
      "Perché? Preferisco restare.",
    ),
  },

  /* ---- phase 5: the Hexagrams */
  {
    id: "x-fiume",
    phase: 5,
    who: ["esagrammi", "esagrammi"],
    scene: "fiume",
    lines: talk(
      "Guarda il fiume.",
      "Scorre sempre, non si ferma.",
      "L'acqua passa e torna?",
      "Non torna mai. Passa e basta.",
      "Come il tempo.",
      "Sì, come il tempo.",
    ),
  },
  {
    id: "x-viaggio",
    phase: 5,
    who: ["esagrammi", "esagrammi"],
    scene: "viaggio",
    lines: talk(
      "Dove vanno le persone?",
      "Si muovono, sempre avanti.",
      "E quando finisce il viaggio?",
      "Non finisce. Un passo, poi un altro.",
      "Il corso della vita.",
      "Corre come l'acqua.",
    ),
  },
  {
    id: "xo-tempo",
    phase: 5,
    who: ["esagrammi", "onde"],
    scene: "tempo",
    lines: talk(
      "Tempo.",
      "Tempo? Non ho tempo.",
      "Il tempo passa per tutti.",
      "Anche per le stelle?",
      "Anche per le stelle. Tutto finisce.",
    ),
  },
  {
    id: "xe-fiume",
    phase: 5,
    who: ["esagrammi", "egizi"],
    scene: "fiume",
    lines: talk(
      "Fiume.",
      "Il fiume! Remo sul fiume.",
      "Remi sempre?",
      "Sempre. Il fiume non si ferma.",
    ),
  },
];

/**
 * The chats there are to read, given the phrases read so far: the first few,
 * and the ones each read phrase opens. A phrase guessed out of turn opens its
 * own phase and no other.
 */
export const unlockedChats = (solved: number[]) =>
  CHATS.filter((c) => c.phase === 0 || solved.includes(c.phase - 1));

export const acceptsPhrase = (i: number, typed: string) => bare(typed) === bare(PHRASES[i].text);

/** Which phrase a title belongs to, or null if it is none of theirs. */
export function titleOf(typed: string): number | null {
  const want = bare(typed);
  const i = PHRASES.findIndex((p) => p.titles.some((t) => bare(t) === want));
  return want && i >= 0 ? i : null;
}

/** Which slots name a work that no slot before them has named already. */
export function rightSlots(slots: string[]): boolean[] {
  const named = new Set<number>();
  return slots.map((s) => {
    const i = titleOf(s);
    if (i === null || named.has(i)) return false;
    named.add(i);
    return true;
  });
}

/** All six works named, each once, in whatever order. */
export const titlesDone = (slots: string[]) => rightSlots(slots).filter(Boolean).length === PHRASES.length;
