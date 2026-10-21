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

import songUrl from "../assets/organo/genesis-retake-light.mp3?url";

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

/**
 * The reward for the tune played right: the organ plays it again over the
 * very phrase of «Genesis Retake Light» it comes from, 0:38.5 to 1:01 of
 * the track, as in the preview Salvo chose. Salvo chose to ship the clip
 * itself; its credit is in README.md.
 *
 * `cues` are when each note of the tune speaks and stops, in seconds from
 * the start of the clip, measured off that preview: the organ in it was
 * picked out from under the track and timed note by note.
 */
export const SONG = {
  url: songUrl,
  /** The track under the organ, in the balance of the preview: there the organ sat a third quieter. */
  gain: 0.38,
  length: 22.4,
  cues: [
    [0.54, 1.2],
    [1.28, 1.96],
    [2.04, 5.3],
    [6.04, 6.7],
    [6.78, 7.72],
    [7.8, 10.9],
    [11.54, 12.46],
    [12.54, 12.96],
    [13.04, 14.2],
    [14.28, 15.46],
    [15.54, 16.94],
    [17.02, 21.0],
  ] as readonly (readonly [number, number])[],
};

export type Voice = { stop: (at?: number) => void };

type Tune = readonly { note: number; long: boolean }[];

type Organ = {
  /** Sounds a whistle now, or at `at` on the context's clock, until it is stopped. */
  start: (note: number, at?: number) => Voice;
  play: (tune: Tune, onNote?: (k: number) => void) => Promise<void>;
  /** The tune over its track, timed by `SONG.cues`; the organ alone if the track cannot be had. */
  song: (tune: Tune, onNote?: (k: number) => void) => Promise<void>;
  puff: () => void;
};

const silent: Organ = {
  start: () => ({ stop: () => {} }),
  play: () => Promise.resolve(),
  song: () => Promise.resolve(),
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

  /** The track, fetched once, from the first pull on: it is ready long before the tune is. */
  let clip: Promise<AudioBuffer | null> | null = null;
  const loadClip = () =>
    (clip ??= fetch(SONG.url)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .catch(() => null));

  const start = (note: number, at?: number): Voice => {
    wake();
    void loadClip();
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

  const song: Organ["song"] = async (tune, onNote) => {
    wake();
    const track = await loadClip();
    if (!track) return play(tune, onNote);
    const t0 = ctx.currentTime + 0.1;
    const src = ctx.createBufferSource();
    src.buffer = track;
    const level = ctx.createGain();
    // in and out softly: the clip is cut at frames, not at a rest
    level.gain.setValueAtTime(0, t0);
    level.gain.linearRampToValueAtTime(SONG.gain, t0 + 0.08);
    level.gain.setValueAtTime(SONG.gain, t0 + SONG.length - 1);
    level.gain.linearRampToValueAtTime(0, t0 + SONG.length);
    src.connect(level).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + SONG.length);
    tune.forEach(({ note }, k) => {
      const [on, off] = SONG.cues[k];
      start(note, t0 + on).stop(t0 + off);
      setTimeout(() => onNote?.(k), (t0 - ctx.currentTime + on) * 1000);
    });
    await new Promise((done) => setTimeout(done, (t0 - ctx.currentTime + SONG.length) * 1000));
  };

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

  return { start, play, song, puff };
}
