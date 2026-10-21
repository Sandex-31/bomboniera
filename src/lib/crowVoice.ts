/**
 * The crows' voice. The original sample, `crow.wav` (or .ogg/.mp3) in
 * src/assets/animalwell/, when it is there; otherwise a rough caw made with
 * Web Audio. The context is made or woken inside a gesture; without Web
 * Audio it is silent and everything still works.
 */

const SAMPLES = import.meta.glob("../assets/animalwell/crow.{wav,ogg,mp3}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const SAMPLE = Object.values(SAMPLES)[0];

type Crow = { caw: (ms: number) => void };
const silent: Crow = { caw: () => {} };
let made: Crow | null = null;

/** The crow's voice, made on first use. Call it from inside a tap to wake the audio. */
export function crowVoice(): Crow {
  if (made) return made;
  const Context =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Context) return silent;
  made = crowOn(new Context());
  return made;
}

function crowOn(ctx: AudioContext): Crow {
  const out = ctx.createGain();
  out.gain.value = 0.35;
  out.connect(ctx.destination);
  let clip: Promise<AudioBuffer | null> | undefined;
  const sample = () =>
    (clip ??= (async () => {
      if (!SAMPLE) return null;
      try {
        return await ctx.decodeAudioData(await (await fetch(SAMPLE)).arrayBuffer());
      } catch {
        return null;
      }
    })());

  /** One caw lasting about `ms`: the sample if it is decoded, else a falling, rasping tone. */
  const caw = (ms: number) => {
    if (ctx.state === "suspended") void ctx.resume();
    void sample().then((buffer) => {
      const t = ctx.currentTime;
      const g = ctx.createGain();
      g.connect(out);
      const secs = ms / 1000;
      if (buffer) {
        const s = ctx.createBufferSource();
        s.buffer = buffer;
        // a drawn-out caw is the same one slowed down
        s.playbackRate.value = Math.min(1, buffer.duration / secs);
        s.connect(g);
        s.start(t);
        return;
      }
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(300, t + secs);
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 900;
      band.Q.value = 1.2;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + 0.02);
      g.gain.setValueAtTime(1, t + secs * 0.7);
      g.gain.linearRampToValueAtTime(0, t + secs);
      o.connect(band).connect(g);
      o.start(t);
      o.stop(t + secs + 0.02);
    });
  };

  return { caw };
}
