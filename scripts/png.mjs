/**
 * Just enough PNG to make the silhouettes: read the non-interlaced images a
 * wiki hands out — 8-bit, or a packed palette for pixel art — and write plain
 * RGBA back. Nothing but node:zlib —
 * a whole image library for this would be the heaviest thing in the repo.
 */
import { deflateSync, inflateSync } from "node:zlib";

export const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Bytes per pixel, by colour type, at bit depth 8. */
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** @returns {{ width: number, height: number, data: Uint8Array }} RGBA, 8 bits */
export function decode(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG");

  let width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  let palette = null, alpha = null;
  const idat = [];
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    const name = buf.toString("latin1", at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + len);
    if (name === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      type = body[9];
      interlace = body[12];
    } else if (name === "PLTE") palette = body;
    else if (name === "tRNS") alpha = body;
    else if (name === "IDAT") idat.push(body);
    else if (name === "IEND") break;
    at += 12 + len;
  }
  // packed depths only come with one channel: a palette or a grey
  const packed = depth < 8 && (type === 0 || type === 3);
  if (depth !== 8 && !packed) throw new Error(`PNG bit depth ${depth} with colour type ${type}: not supported`);
  if (interlace) throw new Error("interlaced PNG: not supported");
  if (!(type in CHANNELS)) throw new Error(`PNG colour type ${type}: not supported`);
  if (type === 3 && !palette) throw new Error("palette PNG without a palette");

  const bpp = packed ? 1 : CHANNELS[type];
  const stride = packed ? Math.ceil((width * depth) / 8) : width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[row + x - bpp] : 0;
      const b = y > 0 ? px[row - stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[row - stride + x - bpp] : 0;
      const predict = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter];
      if (predict === undefined) throw new Error(`PNG row filter ${filter}: unknown`);
      px[row + x] = (line[x] + predict) & 0xff;
    }
  }

  if (packed) {
    // one byte per pixel from here on, as if it had been 8-bit all along
    const per = 8 / depth;
    const mask = (1 << depth) - 1;
    const wide = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byte = px[y * stride + Math.floor(x / per)];
        const v = (byte >> (8 - depth * ((x % per) + 1))) & mask;
        // a grey is stretched to the full range; a palette index stays an index
        wide[y * width + x] = type === 0 ? Math.round((v * 255) / mask) : v;
      }
    }
    return expand(wide, width, height, type, 1, palette, alpha);
  }
  return expand(px, width, height, type, bpp, palette, alpha);
}

/** Unfiltered pixels, one or more bytes each, out to RGBA. */
function expand(px, width, height, type, bpp, palette, alpha) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * bpp;
    const d = i * 4;
    if (type === 6) data.set(px.subarray(s, s + 4), d);
    else if (type === 2) {
      data.set(px.subarray(s, s + 3), d);
      // a tRNS on RGB names the one colour that is see-through
      data[d + 3] =
        alpha && px[s] === alpha.readUInt16BE(0) && px[s + 1] === alpha.readUInt16BE(2) && px[s + 2] === alpha.readUInt16BE(4)
          ? 0
          : 255;
    } else if (type === 3) {
      const p = px[s];
      data.set(palette.subarray(p * 3, p * 3 + 3), d);
      data[d + 3] = alpha && p < alpha.length ? alpha[p] : 255;
    } else if (type === 4) {
      data.fill(px[s], d, d + 3);
      data[d + 3] = px[s + 1];
    } else {
      data.fill(px[s], d, d + 3);
      data[d + 3] = 255;
    }
  }
  return { width, height, data };
}

export function chunk(name, body) {
  const out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0);
  out.write(name, 4, "latin1");
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}

/** RGBA, 8 bits, every row unfiltered. */
export function encode({ width, height, data }) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0);
  head.writeUInt32BE(height, 4);
  head[8] = 8;
  head[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", head),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
