/*
 * The sprites of the well: Animal Well's own sheets, dropped by hand into
 * src/assets/animalwell/ (the README there lists them). A sheet is its
 * frames side by side, each `w` by `h`. Until a sheet is there, its sprite is
 * a rectangle of the same size in its key colour, so a wall can be built and
 * played before the art arrives, and nothing moves when it does.
 */

export type SpriteId =
  | "rotomFrost"
  | "chinchilla"
  | "chest"
  | "porcupine"
  | "crow"
  | "turtle"
  | "bud"
  | "ghost"
  | "candle"
  | "phone"
  | "tv"
  | "face"
  | "flame"
  | "blockPink"
  | "blockBlue"
  | "switchYellow"
  | "switchGreen"
  | "switchPink"
  | "tile";

type Sprite = { file: string; w: number; h: number; frames: number; key: string };

const DIR = "src/assets/animalwell/";

export const SPRITES: Record<SpriteId, Sprite> = {
  // not in the game: drawn in its style, at its size, floating; two frames of bobbing
  rotomFrost: { file: `${DIR}rotom-frost.png`, w: 12, h: 12, frames: 2, key: "#9FE8FF" },
  chinchilla: { file: `${DIR}chinchilla.png`, w: 16, h: 12, frames: 2, key: "#C8B89A" },
  // shut and open
  chest: { file: `${DIR}chest.png`, w: 16, h: 12, frames: 2, key: "#C9A227" },
  porcupine: { file: `${DIR}porcupine.png`, w: 16, h: 12, frames: 2, key: "#8A6A4A" },
  // still and cawing
  crow: { file: `${DIR}crow.png`, w: 12, h: 12, frames: 2, key: "#3A3A55" },
  // under water and afloat
  turtle: { file: `${DIR}turtle.png`, w: 16, h: 8, frames: 2, key: "#4FA36B" },
  // shut and in flower
  bud: { file: `${DIR}bud.png`, w: 8, h: 12, frames: 2, key: "#E070A0" },
  ghost: { file: `${DIR}ghost.png`, w: 16, h: 16, frames: 2, key: "#D8E0F0" },
  // cold and lit
  candle: { file: `${DIR}candle.png`, w: 8, h: 12, frames: 2, key: "#F0E0B0" },
  phone: { file: `${DIR}phone.png`, w: 16, h: 16, frames: 1, key: "#B04030" },
  // off and on
  tv: { file: `${DIR}tv.png`, w: 32, h: 24, frames: 2, key: "#506070" },
  // one frame for each of the flute's eight directions, in its order
  face: { file: `${DIR}face.png`, w: 12, h: 12, frames: 8, key: "#A0F0D0" },
  flame: { file: `${DIR}flame.png`, w: 8, h: 12, frames: 4, key: "#FF8A2A" },
  // full and empty
  blockPink: { file: `${DIR}block-pink.png`, w: 8, h: 8, frames: 2, key: "#FF5FA8" },
  blockBlue: { file: `${DIR}block-blue.png`, w: 8, h: 8, frames: 2, key: "#4FB8FF" },
  // up and pressed
  switchYellow: { file: `${DIR}switch-yellow.png`, w: 8, h: 8, frames: 2, key: "#F2D02A" },
  switchGreen: { file: `${DIR}switch-green.png`, w: 8, h: 8, frames: 2, key: "#5FD35F" },
  switchPink: { file: `${DIR}switch-pink.png`, w: 8, h: 8, frames: 2, key: "#FF7FC0" },
  // the tile sheet: one frame per kind of stone
  tile: { file: `${DIR}tiles.png`, w: 8, h: 8, frames: 16, key: "#2A3140" },
};

/** The sheets that are there, by file name. A missing one is simply not in it. */
const URLS = import.meta.glob("../../assets/animalwell/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const urlOf = (file: string) => URLS[`../../assets/animalwell/${file.slice(DIR.length)}`];

const images = new Map<SpriteId, HTMLImageElement | null>();
function image(id: SpriteId) {
  if (!images.has(id)) {
    const url = urlOf(SPRITES[id].file);
    if (!url) images.set(id, null);
    else {
      const img = new Image();
      img.src = url;
      images.set(id, img);
    }
  }
  return images.get(id);
}

/** Where the face's pupil sits for each of the flute's eight directions (u, ur, r, dr, d, dl, l, ul), from its centre. */
const GAZE: [number, number][] = [[0, -2], [2, -2], [2, 0], [2, 2], [0, 2], [-2, 2], [-2, 0], [-2, -2]];

/**
 * The stand-in for a missing sheet, drawn in code so the frames still read
 * apart: the first is a plain block of the key colour; a block's second is
 * only its outline (empty); any other second is lighter with a bright core
 * (lit, open, pressed, in flower); a face shows where it looks with a pupil.
 */
function placeholder(ctx: CanvasRenderingContext2D, id: SpriteId, s: Sprite, x: number, y: number, frame: number) {
  const f = ((frame % s.frames) + s.frames) % s.frames;
  ctx.fillStyle = s.key;
  if (id === "face") {
    ctx.fillRect(x, y, s.w, s.h);
    const [dx, dy] = GAZE[f];
    ctx.fillStyle = "#10151D";
    ctx.fillRect(x + s.w / 2 - 1 + dx, y + s.h / 2 - 1 + dy, 2, 2);
  } else if (f === 0 || s.frames > 2) {
    ctx.fillRect(x, y, s.w, s.h);
  } else if (id === "blockPink" || id === "blockBlue") {
    ctx.fillRect(x, y, s.w, 1);
    ctx.fillRect(x, y + s.h - 1, s.w, 1);
    ctx.fillRect(x, y, 1, s.h);
    ctx.fillRect(x + s.w - 1, y, 1, s.h);
  } else {
    ctx.fillRect(x, y, s.w, s.h);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(x + 1, y + 1, s.w - 2, s.h - 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + Math.floor(s.w / 2) - 1, y + Math.floor(s.h / 2) - 1, 2, 2);
  }
}

/** Frame `frame` of a sprite with its top left at (x, y), facing the other way when `flip`. */
export function drawSprite(ctx: CanvasRenderingContext2D, id: SpriteId, x: number, y: number, frame = 0, flip = false) {
  const s = SPRITES[id];
  const img = image(id);
  x = Math.round(x);
  y = Math.round(y);
  if (!img || !img.complete || img.naturalWidth === 0) {
    placeholder(ctx, id, s, x, y, frame);
    return;
  }
  const f = ((frame % s.frames) + s.frames) % s.frames;
  if (!flip) {
    ctx.drawImage(img, f * s.w, 0, s.w, s.h, x, y, s.w, s.h);
    return;
  }
  ctx.save();
  ctx.translate(x + s.w, y);
  ctx.scale(-1, 1);
  ctx.drawImage(img, f * s.w, 0, s.w, s.h, 0, 0, s.w, s.h);
  ctx.restore();
}
