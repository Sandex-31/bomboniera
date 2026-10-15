/** Rewrite of Progetto-SO-centrale-nucleare (Master.c, Atomo.c, Attivatore.c, Alimentazione.c,
 *  Inibitore.c): the shared memory is `d`, each process is a rule applied once per tick. */
export const TICKS = 10; // ticks per simulated second

export type Params = {
  NATOM: number; N_MAX_ATOM: number; N_MIN_ATOM: number; ENERGY_DEMAND: number;
  ENERGY_EXPLODE_THRESHOLD: number; SIM_DURATION: number; N_NUOVI_ATOMI: number;
  /** Alimentazione's nanosleep, in ms (STEP 500000 ns = 0.5 ms). */
  STEP_MS: number;
  /** The VM's process limit (ulimit -u): fork fails past it, and that is MELTDOWN. */
  MAX_PROCESSI: number;
  seed: number;
};
/** The #define values. With STEP 0.5 ms Alimentazione forks 200 000 atoms a second: MELTDOWN at once. */
export const ORIGINALI: Params = {
  NATOM: 500, N_MAX_ATOM: 80, N_MIN_ATOM: 2, ENERGY_DEMAND: 200000, ENERGY_EXPLODE_THRESHOLD: 3000000,
  SIM_DURATION: 60, N_NUOVI_ATOMI: 100, STEP_MS: 0.5, MAX_PROCESSI: 4000, seed: 20261015,
};
/** Same program, Alimentazione slowed down so the reaction can be watched. */
export const RALLENTATA: Params = { ...ORIGINALI, STEP_MS: 400 }; // picked by measurement: runs of 20–60 s, outcome depends on the seed

export type Outcome = "EXPLODE" | "BLACKOUT" | "MELTDOWN" | "Tempo scaduto";
/** struct shared_data, minus the fields no process reads. */
export type Shared = { energy: number; index: number; Scorie: number; attivatore: number; scissioni: number; energyRubata: number; logInibitore: number; Inibitore: number };
export type Sim = {
  p: Params; d: Shared; tick: number;
  /** temp of each atom that drew its n and waits for the activator before splitting */
  waiting: number[];
  out: string[]; outcome: Outcome | null;
  inhibitor: boolean;
  /** fissions and atoms born in the last tick, for the canvas: most atoms live far less than a tick */
  fissions: number; born: number;
  // Master's locals, Attivatore's flags, Alimentazione's fractional batches
  energyTemp: number; scissioniTemp: number; scorieTemp: number; usoTot: number;
  attiva: boolean; blocked: boolean; feedCarry: number;
};
export const PID_INIBITORE = 4242;
const SEP = "____________________________________________";

/** srand(time(NULL)) in every process: the k-th rand() of a given second is the same for all of them. */
export function cRand(seed: number, second: number, k = 0): number {
  let a = (Math.imul(seed, 31) + second) >>> 0;
  let v = 0;
  for (let i = 0; i <= k; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    v = ((t ^ (t >>> 14)) >>> 0) >>> 1; // 0..RAND_MAX (2^31-1)
  }
  return v;
}

/** Atomo.c Energy(n1, n2), int arithmetic included. */
export function energy(d: Shared, n1: number, n2: number): void {
  const freed = n1 * n2 - Math.max(n1, n2);
  if (d.Inibitore) {
    const x = d.energy + freed;
    d.energyRubata = Math.trunc(d.energyRubata + x / 1.7);
    d.energy = Math.trunc(x - x / 1.7);
  } else d.energy += freed;
}

const second = (s: Sim) => Math.floor(s.tick / TICKS);
/** Master, Attivatore, Alimentazione, Inibitore, plus every atom alive. */
export const procs = (s: Sim) => 4 + s.waiting.length;

function end(s: Sim, o: Outcome) {
  if (s.outcome) return;
  s.outcome = o;
  s.out.push(o);
}

/** fork(): fails past the process limit. */
function canFork(s: Sim, n: number): boolean {
  if (procs(s) + n >= s.p.MAX_PROCESSI) {
    end(s, "MELTDOWN");
    return false;
  }
  return true;
}

/** Atomo.c main(): draw n, release energy, become waste or wait for the activator. */
function atom(s: Sim, temp: number) {
  if (temp <= 0) return; // rand() % 0: SIGFPE, the process dies before doing anything
  const n = (cRand(s.p.seed, second(s)) % temp) + 1;
  energy(s.d, temp, temp - n);
  if (n <= s.p.N_MIN_ATOM) s.d.Scorie++;
  else s.waiting.push(temp - n);
}

/** fork() + execve("Atomo") for each temp; the child does index++ before execve. */
function spawn(s: Sim, temps: number[]) {
  if (!canFork(s, temps.length)) return;
  s.d.index += temps.length;
  s.born += temps.length;
  for (const t of temps) atom(s, t);
}

export function createSim(p: Params): Sim {
  const s: Sim = {
    p, d: { energy: 0, index: 0, Scorie: 0, attivatore: 1, scissioni: 0, energyRubata: 0, logInibitore: 0, Inibitore: 0 },
    tick: 0, waiting: [], out: ["LOADING PROCESSES"], outcome: null, inhibitor: false, fissions: 0, born: 0,
    energyTemp: 0, scissioniTemp: 0, scorieTemp: 0, usoTot: p.ENERGY_DEMAND, attiva: false, blocked: false, feedCarry: 0,
  };
  // Master: NATOM atoms, temp = rand() % (N_MAX_ATOM - 20 + 1) + 20 (all in second 0: the same temp)
  const temp = p.N_MAX_ATOM >= 20 ? (cRand(p.seed, 0) % (p.N_MAX_ATOM - 20 + 1)) + 20 : 0;
  if (p.NATOM > 0) spawn(s, Array.from({ length: p.NATOM }, () => temp));
  if (s.outcome) return s;
  s.d.index += 3; // Attivatore, Alimentazione and Inibitore each do index++
  s.out.push("LOADING PROCESSES", `Pid Inibitore->${PID_INIBITORE}`);
  return s;
}

/** kill -USR2 <pid inibitore>, as typed in a second terminal. */
export function usr2(s: Sim) {
  s.inhibitor = !s.inhibitor;
  s.out.push(`_${SEP}Inibitore ${s.inhibitor ? "Attivato" : "Disattivato"}`);
}

function report(s: Sim) {
  const { d, p } = s;
  s.out.push(
    SEP,
    `Energia tot-> ${s.energyTemp}`,
    `Energia ultimo secondo-> ${d.energy}`,
    `Energia richiesta tot->${s.usoTot}`,
    `Energia richiesta ultimo secondo->${p.ENERGY_DEMAND}`,
    `Numero di Atomi->${d.index} `,
    `Numero di Scissioni tot->${d.scissioni} `,
    `Numero di Scissioni ultimo secondo->${d.scissioni - s.scissioniTemp} `,
    `Numero di Atomi scorie totali->${d.Scorie}`,
    `Numero di Atomi scorie ultimo secondo->${d.Scorie - s.scorieTemp}`,
    `Attivazioni interrotte da Inibitore->${d.logInibitore}`,
    `Energia presa da Inibitore->${d.energyRubata}`,
    SEP,
  );
  s.energyTemp = d.energy + s.energyTemp;
  s.scissioniTemp = d.scissioni;
  s.scorieTemp = d.Scorie;
  s.usoTot += p.ENERGY_DEMAND;
  if (d.energy > p.ENERGY_EXPLODE_THRESHOLD) return end(s, "EXPLODE");
  d.energy -= p.ENERGY_DEMAND;
  if (d.energy < 0) return end(s, "BLACKOUT");
  s.out.push("");
}

/** One tick: Inibitore, Attivatore, Alimentazione, the fissions, then Master on the second. */
export function step(s: Sim): void {
  if (s.outcome) return;
  s.tick++;
  s.fissions = 0;
  s.born = 0;
  const sec = second(s);
  const onSecond = s.tick % TICKS === 0;

  // Inibitore: while active, Inibitore = 1 (never reset, as in the original) and SIGUSR1 every second
  if (s.inhibitor && onSecond) { s.d.Inibitore = 1; s.attiva = true; }

  // Attivatore: the window is open unless SIGUSR1 caught it at the top of its 2-second loop
  const loopTop = s.tick % (2 * TICKS) === 0;
  if (loopTop && s.attiva) s.blocked = true;
  if (s.blocked && onSecond) {
    s.d.logInibitore++;
    if ((cRand(s.p.seed, sec, 1) % 1000) + 1 <= 50) { s.blocked = false; s.attiva = false; }
  }
  s.d.attivatore = s.blocked ? 1 : 0;
  if (!s.blocked && loopTop) s.out.push(`${SEP}Attivatore ha attivato la scissione`);

  // Alimentazione: N_NUOVI_ATOMI every STEP_MS, fractions carried between ticks
  s.feedCarry += 1000 / TICKS / s.p.STEP_MS;
  const batches = Math.floor(s.feedCarry);
  s.feedCarry -= batches;
  const fresh = batches * s.p.N_NUOVI_ATOMI;
  if (fresh > 0) {
    if (!canFork(s, fresh)) return; // checked before building the array: 20 000 atoms a tick with the original STEP
    const temp = cRand(s.p.seed, sec) % (s.p.N_MAX_ATOM + 1);
    spawn(s, Array.from({ length: fresh }, () => temp));
  }

  // fissions: every waiting atom forks one child Atomo(temp - n) and exits; chains end within the tick
  while (s.d.attivatore === 0 && s.waiting.length && !s.outcome) {
    const parents = s.waiting;
    s.waiting = [];
    s.d.scissioni += parents.length;
    s.fissions += parents.length;
    spawn(s, parents);
  }
  if (s.outcome) return;

  if (onSecond) {
    if (sec >= s.p.SIM_DURATION) return end(s, "Tempo scaduto");
    report(s);
  }
}
