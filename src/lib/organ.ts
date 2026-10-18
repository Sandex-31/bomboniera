/**
 * The steam organ's voice, made in the browser: no recording of anything.
 *
 * It is the recipe Salvo picked by ear from the preview: every note sounds on
 * several ranks of pipes at once (the octave below, the note itself and three
 * above), each rank twice and a hair apart, with a puff of air as a pipe
 * speaks, a slow tremble, and the long tail of a big stone hall.
 *
 * Browsers only let sound start inside a gesture, so the context is made, or
 * woken, the first time a chain is pulled. Without Web Audio it is silent and
 * everything still works.
 */

/** The six whistles, from the tallest and lowest to the shortest and highest. */
export const NOTES = ["C5", "D5", "Eb5", "F5", "G5", "Ab5"] as const;
const HZ = [523.25, 587.33, 622.25, 698.46, 783.99, 830.61];

/** The ranks every note sounds on: how far above the note, and how loud. */
const RANKS: [number, number][] = [
  [0.5, 0.35],
  [1, 1],
  [2, 0.55],
  [3, 0.25],
  [4, 0.22],
];
/** The shape of one pipe's sound: how strong each harmonic is. */
const HARMONICS = [0, 1, 0.5, 0.3, 0.18, 0.1, 0.06];
/** The second pipe of each rank, a few cents sharp of the first. */
const SHIMMER = 2 ** (4 / 1200);

const ATTACK = 0.06;
const RELEASE = 0.12;
/** How long the organ holds a short and a long note when it plays by itself, in seconds. */
const SHORT = 0.42;
const LONG = 1.25;
const GAP = 0.09;

export type Voice = { stop: (at?: number) => void };

type Organ = {
  /** Sounds a whistle now, or at `at` on the context's clock, until it is stopped. */
  start: (note: number, at?: number) => Voice;
  play: (tune: { note: number; long: boolean }[], onNote?: (k: number) => void) => Promise<void>;
  puff: () => void;
};

const silent: Organ = {
  start: () => ({ stop: () => {} }),
  play: () => Promise.resolve(),
  puff: () => {},
};

let made: Organ | null = null;

/** The organ, made on first use. Call it from inside a tap or a press. */
export function organ(): Organ {
  if (made) return made;
  const Context =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Context) return silent;
  const ctx = new Context();
  made = organOn(ctx);
  return made;
}

function noise(ctx: BaseAudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A big hall's echo: noise that dies away over three seconds, its top end dulled. */
function hall(ctx: BaseAudioContext) {
  const seconds = 3.2;
  const buffer = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const smooth = Math.exp((-2 * Math.PI * 6000) / ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const raw = (Math.random() * 2 - 1) * Math.exp(-i / ctx.sampleRate / 0.75);
      last = raw + (last - raw) * smooth;
      data[i] = last;
    }
  }
  return buffer;
}

/** The organ on a given context: the page's own, or an offline one to render it to a file. */
export function organOn(ctx: BaseAudioContext): Organ {
  const wave = ctx.createPeriodicWave(new Float32Array(HARMONICS), new Float32Array(HARMONICS.length));
  const out = ctx.createGain();
  out.gain.value = 0.42;
  out.connect(ctx.destination);
  const dry = ctx.createGain();
  dry.gain.value = 0.55;
  dry.connect(out);
  const echo = ctx.createConvolver();
  echo.buffer = hall(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.6;
  echo.connect(wet).connect(out);
  const chiffNoise = noise(ctx, 0.2);

  const wake = () => {
    // an offline context starts by being rendered, never by being woken
    if (typeof AudioContext !== "undefined" && ctx instanceof AudioContext && ctx.state === "suspended")
      void ctx.resume();
  };

  const start = (note: number, at?: number): Voice => {
    wake();
    const f = HZ[note];
    const t = at ?? ctx.currentTime;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + ATTACK);
    // the tremble: a slow wobble on the loudness
    const trem = ctx.createGain();
    trem.gain.value = 1;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.value = 0.06;
    lfo.connect(depth).connect(trem.gain);
    env.connect(trem);
    trem.connect(dry);
    trem.connect(echo);

    const pipes: OscillatorNode[] = [lfo];
    for (const [ratio, level] of RANKS) {
      for (const [detune, gain] of [
        [1, 1],
        [SHIMMER, 0.6],
      ]) {
        const osc = ctx.createOscillator();
        osc.setPeriodicWave(wave);
        osc.frequency.value = f * ratio * detune;
        const g = ctx.createGain();
        g.gain.value = (level * gain) / 2.4;
        osc.connect(g).connect(env);
        pipes.push(osc);
      }
    }
    // the puff of air as the pipe speaks
    const chiff = ctx.createBufferSource();
    chiff.buffer = chiffNoise;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = f * 4;
    band.Q.value = 1.2;
    const chiffGain = ctx.createGain();
    chiffGain.gain.setValueAtTime(0.5, t);
    chiffGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    chiff.connect(band).connect(chiffGain).connect(env);
    chiff.start(t);
    chiff.stop(t + 0.1);
    pipes.forEach((p) => p.start(t));

    let stopped = false;
    return {
      stop: (at) => {
        if (stopped) return;
        stopped = true;
        const now = at ?? ctx.currentTime;
        env.gain.cancelScheduledValues(now);
        env.gain.setValueAtTime(at === undefined ? env.gain.value : 1, now);
        env.gain.linearRampToValueAtTime(0, now + RELEASE);
        pipes.forEach((p) => p.stop(now + RELEASE + 0.02));
      },
    };
  };

  const play: Organ["play"] = (tune, onNote) =>
    new Promise((done) => {
      wake();
      let k = 0;
      const next = () => {
        if (k >= tune.length) return done();
        const { note, long } = tune[k];
        onNote?.(k);
        const voice = start(note);
        k++;
        setTimeout(
          () => {
            voice.stop();
            setTimeout(next, GAP * 1000);
          },
          (long ? LONG : SHORT) * 1000,
        );
      };
      next();
    });

  const puff = () => {
    wake();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = chiffNoise;
    src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(low).connect(g).connect(dry);
    src.start(t);
    src.stop(t + 0.4);
  };

  return { start, play, puff };
}
