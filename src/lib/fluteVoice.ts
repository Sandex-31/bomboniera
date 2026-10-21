/**
 * The flute's voice. The original samples, `flute-<dir>.wav` (or .ogg/.mp3)
 * in src/assets/animalwell/, when they are there; otherwise a breathy flute
 * made with Web Audio. Like the organ, the context is made or woken inside a
 * gesture, and without Web Audio it is silent and everything still works.
 */

import { DIRS } from "./flute";

/**
 * D major pentatonic, clockwise from up: D4 E4 F#4 A4 B4 D5 E5 F#5.
 * Any two sound well together, so no wrong note is ever ugly.
 */
const HZ = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];

const SAMPLES = import.meta.glob("../assets/animalwell/flute-*.{wav,ogg,mp3}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const sampleUrl = (k: number) =>
  Object.entries(SAMPLES).find(([path]) => new RegExp(`/flute-${DIRS[k]}\.\w+$`).test(path))?.[1];

const ATTACK = 0.05;
const RELEASE = 0.15;

export type Voice = { stop: () => void };
type Flute = { start: (note: number) => Voice; puff: () => void };

const silent: Flute = { start: () => ({ stop: () => {} }), puff: () => {} };
let made: Flute | null = null;

/** The flute, made on first use. Call it from inside a tap or a press. */
export function fluteVoice(): Flute {
  if (made) return made;
  const Context =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Context) return silent;
  made = fluteOn(new Context());
  return made;
}

function fluteOn(ctx: AudioContext): Flute {
  const out = ctx.createGain();
  out.gain.value = 0.5;
  out.connect(ctx.destination);
  const air = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = air.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const clips: (Promise<AudioBuffer | null> | undefined)[] = [];
  const clip = (k: number) =>
    (clips[k] ??= (async () => {
      const url = sampleUrl(k);
      if (!url) return null;
      try {
        return await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
      } catch {
        return null;
      }
    })());

  const start = (k: number): Voice => {
    // resumed inside the press, or iOS keeps the context asleep
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + ATTACK);
    env.connect(out);
    const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
    let stopped = false;

    // a sample, once decoded and if the press is still on; the synth sounds meanwhile
    const synth: GainNode = ctx.createGain();
    synth.connect(env);
    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.value = HZ[k];
    const top = ctx.createOscillator();
    top.type = "triangle";
    top.frequency.value = HZ[k] * 2;
    const topGain = ctx.createGain();
    topGain.gain.value = 0.15;
    // a slow breath on the pitch
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5;
    const depth = ctx.createGain();
    depth.gain.value = 3;
    vibrato.connect(depth).connect(tone.detune);
    const breath = ctx.createBufferSource();
    breath.buffer = air;
    breath.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = HZ[k] * 3;
    band.Q.value = 1.5;
    const breathGain = ctx.createGain();
    breathGain.gain.value = 0.12;
    tone.connect(synth);
    top.connect(topGain).connect(synth);
    breath.connect(band).connect(breathGain).connect(synth);
    sources.push(tone, top, vibrato, breath);
    sources.forEach((s) => s.start(t));

    void clip(k).then((buffer) => {
      if (!buffer || stopped) return;
      synth.gain.value = 0;
      const s = ctx.createBufferSource();
      s.buffer = buffer;
      s.connect(env);
      s.start();
      sources.push(s);
    });

    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        const now = ctx.currentTime;
        env.gain.cancelScheduledValues(now);
        env.gain.setValueAtTime(env.gain.value, now);
        env.gain.linearRampToValueAtTime(0, now + RELEASE);
        sources.forEach((s) => s.stop(now + RELEASE + 0.02));
      },
    };
  };

  /** A breath with no note: the flute blown wrong. */
  const puff = () => {
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = air;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.6, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    s.connect(low).connect(g).connect(out);
    s.start(t);
    s.stop(t + 0.4);
  };

  return { start, puff };
}
