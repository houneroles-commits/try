// Generates PWA icons (PNG) with zero dependencies: terracotta rounded square,
// cream sun over brown furrow waves. Run: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CLAY = [179, 84, 47];
const CLAY_DEEP = [154, 68, 35];
const CREAM = [255, 246, 234];
const SOIL = [59, 42, 30];

function drawIcon(size) {
  const img = Buffer.alloc(size * size * 4);
  const r = size * 0.22; // corner radius
  const cx = size * 0.5, sunY = size * 0.40, sunR = size * 0.185;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // rounded-square mask
      const dx = Math.max(r - x, x - (size - 1 - r), 0);
      const dy = Math.max(r - y, y - (size - 1 - r), 0);
      const inside = dx * dx + dy * dy <= r * r;
      if (!inside) { img[i + 3] = 0; continue; }
      // background: vertical clay gradient
      const t = y / size;
      let px = [
        CLAY[0] + (CLAY_DEEP[0] - CLAY[0]) * t,
        CLAY[1] + (CLAY_DEEP[1] - CLAY[1]) * t,
        CLAY[2] + (CLAY_DEEP[2] - CLAY[2]) * t,
      ];
      // furrow waves (soil) across the lower third
      const w1 = size * 0.68 + Math.sin((x / size) * Math.PI * 2.2) * size * 0.045;
      const w2 = size * 0.82 + Math.sin((x / size) * Math.PI * 2.2 + 1.4) * size * 0.04;
      if (y > w2) px = SOIL.map((c) => c * 0.9);
      else if (y > w1) px = SOIL;
      // sun disc (cream) with soft edge
      const d = Math.hypot(x - cx, y - sunY);
      if (d < sunR) px = CREAM;
      else if (d < sunR + size * 0.012) {
        const a = 1 - (d - sunR) / (size * 0.012);
        px = px.map((c, k) => c + (CREAM[k] - c) * a);
      }
      img[i] = px[0]; img[i + 1] = px[1]; img[i + 2] = px[2]; img[i + 3] = 255;
    }
  }
  return png(size, size, img);
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), drawIcon(size));
  console.log(`icon-${size}.png written`);
}
