// Node 24: node scripts/generate-icons.ts. No fonts, external artwork or dependencies.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const shapes = [
  { color: '#284958', points: [[84, 112], [112, 84], [400, 84], [428, 112], [428, 400], [400, 428], [112, 428], [84, 400]] },
  { color: '#101923', points: [[100, 120], [120, 100], [392, 100], [412, 120], [412, 392], [392, 412], [120, 412], [100, 392]] },
  { color: '#5ed8cd', points: [[152, 144], [304, 144], [360, 192], [360, 252], [310, 294], [376, 368], [300, 368], [236, 296], [212, 296], [212, 368], [152, 368]] },
  { color: '#101923', points: [[212, 200], [282, 200], [300, 216], [300, 236], [282, 252], [212, 252]] },
  { color: '#e4eef6', points: [[332, 112], [384, 112], [384, 124], [332, 124]] },
];
const directory = new URL('../public/icons/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('icon.svg', directory), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#101923"/>${shapes.map(s => `<polygon fill="${s.color}" points="${s.points.map(p => p.join(',')).join(' ')}"/>`).join('')}</svg>\n`);

function chunk(type: string, data: Buffer): Buffer {
  const bytes = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const header = Buffer.alloc(4); header.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([header, bytes, checksum]);
}
function contains(points: number[][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
for (const [size, name] of [[180, 'apple-touch-icon'], [192, 'icon-192'], [512, 'icon-512']] as const) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const rgb = [0, 0, 0];
    // Four samples per pixel keep diagonal edges legible at small sizes.
    for (const dy of [.25, .75]) for (const dx of [.25, .75]) {
      let color = '#101923';
      for (const shape of shapes) if (contains(shape.points, (x + dx) * 512 / size, (y + dy) * 512 / size)) color = shape.color;
      for (let c = 0; c < 3; c++) rgb[c] += parseInt(color.slice(1 + c * 2, 3 + c * 2), 16) / 4;
    }
    for (let c = 0; c < 3; c++) raw[y * (size * 3 + 1) + 1 + x * 3 + c] = Math.round(rgb[c]);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(new URL(`${name}.png`, directory), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
