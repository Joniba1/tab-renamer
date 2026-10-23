/**
 * Renders the extension icons into public/icon/<size>.png with no image
 * dependencies (PNG encoded by hand with node:zlib).
 *
 *   node scripts/generate-icons.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZES = [16, 32, 48, 128];
const SUPERSAMPLE = 4;

type RGBA = [number, number, number, number];
const BACKGROUND: RGBA = [79, 70, 229, 255]; // indigo
const TAB: RGBA = [255, 255, 255, 255];
const CURSOR: RGBA = [79, 70, 229, 255];

function roundedRect(x: number, y: number, x0: number, y0: number, x1: number, y1: number, r: number) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** Shape in a 0..1 coordinate space: a browser tab with a text cursor. */
function sample(x: number, y: number): RGBA | null {
  if (!roundedRect(x, y, 0, 0, 1, 1, 0.22)) return null;
  // Tab body: rounded top corners, flat bottom running off the icon edge.
  const inTab = roundedRect(x, y, 0.16, 0.3, 0.84, 1.2, 0.1) && y <= 0.84;
  if (!inTab) return BACKGROUND;
  // Text cursor ("I-beam") inside the tab.
  const stem = x >= 0.47 && x <= 0.53 && y >= 0.42 && y <= 0.74;
  const caps = (y >= 0.42 && y <= 0.47) || (y >= 0.69 && y <= 0.74);
  if (stem || (caps && x >= 0.39 && x <= 0.61)) return CURSOR;
  return TAB;
}

function render(size: number): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  const n = SUPERSAMPLE;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < n; sy++) {
        for (let sx = 0; sx < n; sx++) {
          const c = sample((px + (sx + 0.5) / n) / size, (py + (sy + 0.5) / n) / size);
          if (c == null) continue;
          r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3];
        }
      }
      const i = (py * size + px) * 4;
      if (a > 0) {
        pixels[i] = Math.round(r / a);
        pixels[i + 1] = Math.round(g / a);
        pixels[i + 2] = Math.round(b / a);
      }
      pixels[i + 3] = Math.round(a / (n * n));
    }
  }
  return encodePng(size, size, pixels);
}

function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

mkdirSync('public/icon', { recursive: true });
for (const size of SIZES) {
  writeFileSync(`public/icon/${size}.png`, render(size));
  console.log(`public/icon/${size}.png`);
}
