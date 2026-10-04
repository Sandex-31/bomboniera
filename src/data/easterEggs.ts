import { graduationConfig } from '../config';
import { exams } from './exams';
import { projects } from './projects';
import { thesis } from './thesis';

/**
 * Objects hidden in the room. Found ones are remembered in localStorage.
 * Every `reveal` marked TODO is a line only you can write — the counter, the
 * toast and the "trovati" list all read from this array, so adding or removing
 * an entry is the whole change.
 */
export type EasterEgg = {
  id: string;
  /** Shown in the "discovered" list once found. */
  label: string;
  /** Toast text shown the moment it is found. */
  reveal: string;
};

export const easterEggs: EasterEgg[] = [
  {
    id: 'monster',
    label: 'Lattina di Monster',
    reveal: 'Streak giornaliera +1967',
  },
  {
    id: 'laura',
    label: 'Laura',
    reveal: 'Non capisco quello che hai fatto, ma BRAVO! ❤️',
  },
  {
    id: 'terminal',
    label: 'Terminale nascosto',
    reveal: 'Trova tutti i segreti 01100100 01100101 01101000 00100000 01110000 01100101 01100110 01100110 01101111 01110010 01111010 01100001',
  },
  {
    id: 'me',
    label: 'Me',
    reveal: 'Finalmente libero! Adesso platino qualcosa. 🎉',
  },
  {
    id: 'snowboard',
    label: 'Snowboard',
    reveal: 'Ringrazio questo bellissimo sport per farmi staccare la spina dopo le sessioni piú difficili (grazie ai miei genitori per gli skipass ❤️)',
  },
  {
    id: 'kite',
    label: 'Tavola da kitesurf',
    reveal: 'Snowboard ma per l\'estate, amo lo snowboard',
  },
  {
    id: 'bici',
    label: 'Bici pieghevole',
    reveal: 'Ti amo, - spese + strada = fanculo GTT',
  },
  {
    id: 'basket',
    label: 'Pallone da basket',
    reveal: 'Dire che mi ha sempre accompagnato é un eufemismo.',
  },
  {
    id: 'volley',
    label: 'Palla da pallavolo',
    reveal: 'Qualcosa di più chill, ma mi diverto davvero tantissimo. Pienissimo di persone bellissime.',
  },
  {
    id: 'gamepad',
    label: 'Controller',
    reveal: 'Dopo aver giocatore la maggior parte dei giochi usciti fin ora, posso dire: fanculo DS2 e RDR2.',
  },
  {
    id: 'cavaliere',
    label: 'Il cavaliere',
    reveal: 'Regalone da parte di Laura per un mio compleanno, viva DS1!',
  },
  {
    id: 'funko-verde',
    label: 'Gon',
    reveal: 'L’unico Funko che mi sono comprato io. guardatevi HxH',
  },
  {
    id: 'funko-viola',
    label: 'Tanjiro',
    reveal: 'Regalato dai miei leoni: Pietro, Stefano e Giovanni.',
  },
  {
    id: 'funko-scienziato',
    label: 'Rick Sanchez',
    reveal: 'Chi non ama l\'alcool? Non l\'ho ancora buttato perché adoro Rick.',
  },
  {
    id: 'funko-scatola-a',
    label: 'Gojo',
    reveal: 'Ragalato da Laura, esci da quella scatola pleaseeee.',
  },
  {
    id: 'funko-scatola-b',
    label: 'MJ',
    reveal: 'Regalato da mio fratello, prima o poi mi battera 1 vs 1.',
  },
];

export const TOTAL_EGGS = easterEggs.length;

type Command = {
  name: string;
  help: string;
  /** Hidden from `help`, but still runnable. */
  secret?: boolean;
  run: (args: string[]) => string[];
};

const bar = (pct: number, width = 24) => {
  const filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
};

const takenExams = exams.filter((e) => e.grade !== undefined);
const totalCfu = exams.reduce((sum, e) => sum + e.cfu, 0);

/**
 * Terminal commands. Add one here and it appears in `help` automatically.
 * `openSection` / `clear` / `exit` are handled by the Terminal component.
 */
export const commands: Command[] = [
  {
    name: 'help',
    help: 'elenca i comandi disponibili',
    run: () => [
      'Comandi disponibili:',
      ...commands.filter((c) => !c.secret).map((c) => `  ${c.name.padEnd(12)} ${c.help}`),
      '',
      'Suggerimento: non tutti i comandi sono in questa lista.',
    ],
  },
  {
    name: 'about',
    help: 'chi sta parlando',
    run: () => [
      `${graduationConfig.name}`,
      `${graduationConfig.degreeLong} — ${graduationConfig.university}`,
      `${graduationConfig.startYear} → ${graduationConfig.year}`,
      '',
      'Costruisce cose, le rompe, capisce perché, ricomincia.',
    ],
  },
  {
    name: 'exams',
    help: 'riepilogo degli esami',
    run: () => [
      `Esami registrati: ${exams.length}`,
      `CFU totali:       ${totalCfu}`,
      takenExams.length
        ? `Media aritmetica: ${(
          takenExams.reduce((s, e) => s + (e.grade ?? 0), 0) / takenExams.length
        ).toFixed(2)}`
        : 'Media: n/d',
      '',
      ...exams.map((e) => `  [anno ${e.year}] ${e.name}`),
    ],
  },
  {
    name: 'projects',
    help: 'elenca i progetti',
    run: () =>
      projects.length
        ? projects.map((p, i) => `  #${String(i + 1).padStart(2, '0')}  ${p.title} — ${p.tech.join(', ')}`)
        : ['Nessun progetto registrato.'],
  },
  {
    name: 'thesis',
    help: 'apre la sezione tesi',
    run: () => [thesis.title, '', 'Apertura della sezione tesi...'],
  },
  {
    name: 'coffee',
    help: 'consumo di caffeina (--years N)',
    run: (args) => {
      const i = args.indexOf('--years');
      const years = i >= 0 ? Number(args[i + 1]) || 3 : 3;
      const cups = Math.round(years * 282);
      return [
        `Caffè consumati in ${years} anni:`,
        '',
        `${bar(100, 28)} ${cups} tazze`,
        '',
        'Sostenibilità del modello: discutibile.',
      ];
    },
  },
  {
    name: 'sudo',
    help: 'prova `sudo graduate`',
    run: (args) => {
      if (args[0] !== 'graduate') {
        return [`sudo: ${args[0] ?? '<comando>'}: comando non trovato`, 'Prova: sudo graduate'];
      }
      return [
        'Verifica dei requisiti...',
        '',
        `  crediti          ${bar(100, 20)} 100%`,
        `  tesi             ${bar(100, 20)} 100%`,
        `  pazienza         ${bar(100, 20)} 100%`,
        `  ore di sonno     ${bar(12, 20)}  12%`,
        '',
        'Tutti i requisiti sono soddisfatti.',
        '',
        'Congratulazioni 🎓',
      ];
    },
  },
  {
    name: 'graduate',
    help: 'permessi insufficienti',
    run: () => ['Permesso negato. Serve `sudo`.'],
  },
  {
    name: 'whoami',
    help: 'identità corrente',
    run: () => ['undergraduate (in scadenza)'],
  },
  {
    name: 'uptime',
    help: 'da quanto va avanti',
    run: () => {
      const days = Math.round(
        (Date.now() - new Date(`${graduationConfig.startYear}-09-01`).getTime()) / 86_400_000,
      );
      return [`up ${days} giorni,  load average: 0.97, 1.42, 2.31`];
    },
  },
  {
    name: 'ls',
    help: 'elenca il contenuto della stanza',
    run: () => ['scrivania/  libreria/  tesi.pdf  progetti/  porta  .segreti/'],
  },
  {
    name: 'cat',
    help: 'legge un file',
    run: (args) =>
      args[0] === 'tesi.pdf'
        ? ['Errore: formato binario. Usa la sezione TESI.']
        : [`cat: ${args[0] ?? ''}: file o directory non esistente`],
  },
  {
    name: 'rm',
    help: 'non farlo',
    secret: true,
    run: (args) =>
      args.join(' ').includes('rf')
        ? [
          'Operazione bloccata.',
          'Tre anni di lavoro non stanno dietro a una conferma mancata.',
        ]
        : ['rm: operando mancante'],
  },
  {
    name: 'exit',
    help: 'chiude il terminale',
    run: () => ['Disconnessione...'],
  },
  {
    name: 'clear',
    help: 'pulisce lo schermo',
    run: () => [],
  },
];
