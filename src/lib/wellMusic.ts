/**
 * The well's background track: `music.ogg` (or .mp3) in src/assets/animalwell/
 * when it is there, nothing at all when it is not. Started inside a tap so the
 * browser lets it play; it loops, and fades out going up.
 */

const FILES = import.meta.glob("../assets/animalwell/music.{ogg,mp3}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const URL_ = FILES["../assets/animalwell/music.ogg"] ?? FILES["../assets/animalwell/music.mp3"];
const VOLUME = 0.4;

let audio: HTMLAudioElement | null = null;
/** Set once the track is told to stop: a tap during the fade must not bring it back. */
let leaving = false;
let fading: ReturnType<typeof setInterval> | undefined;

/** Starts the loop if there is a track and it is not playing yet. Call from a tap. */
export function startMusic() {
  if (!URL_ || leaving || typeof Audio === "undefined") return;
  clearInterval(fading);
  if (!audio) {
    audio = new Audio(URL_);
    audio.loop = true;
  }
  audio.volume = VOLUME;
  if (audio.paused) audio.play().catch(() => {});
}

/** Fades the track out over `ms`, then stops it. */
export function stopMusic(ms: number) {
  leaving = true;
  const a = audio;
  if (!a || a.paused) return;
  clearInterval(fading);
  const t0 = performance.now();
  fading = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms));
    a.volume = VOLUME * (1 - k);
    if (k >= 1) {
      clearInterval(fading);
      a.pause();
    }
  }, 50);
}

/** The floor is mounted (again): taps may start the track once more. */
export function rearmMusic() {
  leaving = false;
}
