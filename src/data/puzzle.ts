/**
 * The hidden room behind the can, and the rules that get you there.
 *
 * It lives in its own data file because both the room (which draws the ring)
 * and the app (which counts the taps) need the same number, and neither can
 * import it from the other without dragging a 3D chunk where it does not go.
 * The puzzle itself will grow here.
 */

/** Taps on the Monster can that open the way. Ten: enough to be deliberate. */
export const PORTAL_AT = 10;

/* ------------------------------------------------------------- the rhythm */

/** Silence that closes a group of taps, in ms. */
export const GROUP_GAP = 900;

/** Silence that gives up on an attempt and clears it, in ms. */
export const DONE_GAP = 2500;

/**
 * Taps per group, in order. Nothing in the app says what it is or where it
 * comes from, and nothing should: whoever is meant to get through knows it.
 */
export const SEQUENCE = [3, 1];

/**
 * Tap times (ms) turned into how many landed in each group.
 *
 * One threshold does the whole grammar: anything faster than `gap` belongs to
 * the group being typed, anything slower starts the next one. That asks for a
 * shape, not for a tempo — a thumb on a phone cannot be trusted with a tempo.
 */
export function groupTaps(times: number[], gap = GROUP_GAP): number[] {
  const counts: number[] = [];
  let last = -Infinity;
  for (const t of times) {
    if (t - last >= gap) counts.push(1);
    else counts[counts.length - 1] += 1;
    last = t;
  }
  return counts;
}

/**
 * True while what has been tapped so far could still turn into `want`: every
 * closed group matches, and the one still being typed has not overrun.
 */
export function onTrack(counts: number[], want = SEQUENCE): boolean {
  if (counts.length > want.length) return false;
  return counts.every((n, i) => (i === counts.length - 1 ? n <= want[i] : n === want[i]));
}

/** True when the tapping is exactly `want`, with nothing left to add. */
export function solved(counts: number[], want = SEQUENCE): boolean {
  return counts.length === want.length && counts.every((n, i) => n === want[i]);
}

/* ------------------------------------------------------------- the keeper */

/**
 * Where the progress is kept. One name, used by the thing that writes it and
 * by the button that wipes it — two copies is how a reset stops resetting.
 */
export const PUZZLE_KEY = 'bomboniera.puzzle.ritmo';

/** Where the maze keeps the line that has been drawn through it. */
export const MAZE_KEY = 'bomboniera.puzzle.labirinto';

/** Where the three floors of mirrors keep what has been placed on them. */
export const BEAM_KEY = 'bomboniera.puzzle.specchi';

/** Where the plan of the other room keeps what has been laid out on it. */
export const PLAN_KEY = 'bomboniera.puzzle.pianta';

/** Where the lamps keep which of them are lit and which have been pressed. */
export const LAMPS_KEY = 'bomboniera.puzzle.lampade';

/** Where the map of the ski area keeps the altitudes worked out so far. */
export const SKI_KEY = 'bomboniera.puzzle.comprensorio';

/** Where the machine keeps which of its levers are thrown. */
export const MACHINE_KEY = 'bomboniera.puzzle.macchinario';

/**
 * Whether the database has been opened with the word off the tape. It is also
 * what wires the screens together, so the windows stop belonging to one.
 */
export const HACK_KEY = 'bomboniera.puzzle.terminale';

/** Whether the five fragments have been laid over the maze and line up. */
export const LOST_KEY = 'bomboniera.puzzle.figura';

/** Whether the window of silhouettes has been started with the word off the eye. */
export const SAGOME_KEY = 'bomboniera.puzzle.sagome';

/** Whether the word under the crying ghost has been found. */
export const TOMBINO_KEY = 'bomboniera.puzzle.tombino';

/** Where the five wheels of the lock were left. */
export const LOCK_KEY = 'bomboniera.puzzle.lucchetto';

/**
 * Which floor of the tower the visitor is on: 0 the island, 1 the one below.
 * Missing means they have never been down, which is what makes the first
 * descent the long one.
 */
export const FLOOR_KEY = 'bomboniera.puzzle.piano';

/** How many floors are built so far, the island included. */
export const FLOORS = 2;

/** The stored floor, read back: anything that is not a floor is the island. */
export function floorFrom(stored: string | null): number {
  const n = Number(stored);
  return stored !== null && stored !== '' && Number.isInteger(n) && n >= 0 && n < FLOORS ? n : 0;
}

/** Which of the six wall phrases of Babel have been read, by index. */
export const LANG_KEY = 'bomboniera.puzzle.lingue';

/** What has been written into the six slots of the sarcophagus. */
export const TITLES_KEY = 'bomboniera.puzzle.sarcofago';

/** Which chats of the terminal have been opened, so the rest still say «nuova». */
export const CHAT_KEY = 'bomboniera.puzzle.chat';

/** The read phrases, read back: anything that is not a list of distinct phrases is none. */
export function langFrom(stored: string | null): number[] {
  try {
    const list: unknown = JSON.parse(stored ?? '[]');
    const ok =
      Array.isArray(list) &&
      list.every((n) => Number.isInteger(n) && n >= 0 && n < 6) &&
      new Set(list).size === list.length;
    return ok ? (list as number[]) : [];
  } catch {
    return [];
  }
}

/**
 * What it says once the sarcophagus has its six titles and opens.
 *
 * TODO: da scrivere — questa riga è segnaposto.
 */
export const sarcLine = 'Rotom: TODO — la battuta del sarcofago.';

/**
 * The one thing the keeper says once the star has finished drawing itself.
 *
 * TODO: da scrivere — questa riga è segnaposto.
 */
export const starLine = 'Rotom: TODO — la battuta dopo la stella.';

/**
 * And the one it says once the machine has finished drawing.
 *
 * This is the line that names what the creature is, because a drawing eight
 * pixels across cannot be relied on to name itself and whoever cannot place
 * it would otherwise be stuck.
 *
 * TODO: da scrivere — questa riga è segnaposto.
 */
export const tapeLine = 'Rotom: TODO — la battuta che nomina Animal Well.';

/**
 * And the one it says once the word off the tape has opened the database.
 *
 * It is the only place the cables are explained: they turn up on the floor a
 * second earlier, and nothing else in the room says what they are for.
 */
export const wiredLine =
  "Rotom: ...Va bene. Non me l'aspettavo. Hai letto il nastro, hai il nome giusto, sei dentro il DB. Ti stendo i cavi: da qui in poi le finestre passano da uno schermo all'altro. Non rompere niente. Pff.";

/** What it says to anyone who names a silhouette right: right, and useless. */
export const bravoLine = 'Rotom: Bravo! giusto ma non ti servirá a un bel niente hahahahah';

/** And what it says when the word under the crying ghost is the right one. */
export const tombinoLine = 'Rotom: Complimenti, hai trovato anche questo.';

/** What it says once the tower has been seen, before it dives into the manhole. */
export const systemLine = 'Rotom: Eccoci qua, adesso sai quanto é complicato entrare nel sistema';

/**
 * What the keeper says once the rhythm is right, one line per tap forward.
 * The screens come up when it has finished talking.
 */
export const keeperLines: string[] = [
  '?: Complimenti, spero tu non abbia sparato a caso ma sappia che questo é il numero preferito di Salvo.',
  'Rotom: Comunque sia, io sono Rotom, gestisco tutti i server di Salvo, ho l\'intero controllo dei software e delle app che sta sviluppando, sono pronto a difendere questo posto con la mia vita.',
  'Rotom: Peró... dato che hai indovinato la sequenza giusta, devo darti la possibilitá di provare ad accedere ai dati segreti del DB di Salvo, vedremo cosa riuscirai a combinare...Pff.',
];
