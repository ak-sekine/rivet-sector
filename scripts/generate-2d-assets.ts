// Node 24: deterministic pixel art + mono 16-bit PCM, using only Node built-ins.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

type Color = readonly [number, number, number, number];
const palette = {
  ink: [9, 20, 29, 255], dark: [23, 45, 56, 255], steel: [53, 83, 95, 255],
  light: [117, 157, 165, 255], white: [219, 249, 237, 255], teal: [76, 216, 194, 255],
  deep: [32, 109, 112, 255], orange: [246, 158, 67, 255], rust: [141, 68, 39, 255],
} satisfies Record<string, Color>;
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function canvas(width: number, height: number) {
  const pixels = Buffer.alloc(width * height * 4);
  const pixel = (x: number, y: number, color: Color) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && x < width && y >= 0 && y < height) pixels.set(color, (y * width + x) * 4);
  };
  const rect = (x: number, y: number, w: number, h: number, color: Color) => {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) pixel(px, py, color);
  };
  return { width, height, pixel, rect, png() {
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
    const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  } };
}
type Canvas = ReturnType<typeof canvas>;
function robot(c: Canvas, ox: number, oy: number, direction: number, frame: number, enemy = false, ghost = false) {
  const p = palette, glow = enemy ? p.orange : p.teal, shade = enemy ? p.rust : p.deep;
  const stride = [0, -1, 0, 1][frame % 4], bob = frame % 2;
  const r = (x: number, y: number, w: number, h: number, color: Color) => c.rect(ox + x, oy + y, w, h, ghost ? [color[0], color[1], color[2], 130] : color);
  // Identical armored silhouette and palette across directions; only visor / pack changes.
  r(7, 27, 19, 3, [0, 0, 0, 70]);
  r(9, 21 + stride, 6, 7, p.ink); r(18, 21 - stride, 6, 7, p.ink);
  r(10, 22 + stride, 4, 4, p.steel); r(19, 22 - stride, 4, 4, p.steel);
  r(9, 26 + stride, 6, 2, shade); r(18, 26 - stride, 6, 2, shade);
  r(7, 12 + bob, 19, 11, p.ink); r(9, 13 + bob, 15, 8, shade);
  r(10, 14 + bob, 13, 2, p.light); r(11, 17 + bob, 11, 3, p.steel);
  r(4, 14 - stride, 5, 9, p.ink); r(25, 14 + stride, 4, 9, p.ink);
  r(5, 15 - stride, 3, 5, p.light); r(25, 15 + stride, 3, 5, p.steel);
  r(5, 21 - stride, 3, 2, glow); r(25, 21 + stride, 3, 2, glow);
  r(9, 4 + bob, 15, 11, p.ink); r(10, 5 + bob, 13, 8, p.steel);
  r(12, 5 + bob, 9, 2, p.light); r(14, 2 + bob, 2, 3, p.ink); r(14, 2 + bob, 2, 1, glow);
  if (direction === 0) { r(11, 9 + bob, 11, 3, glow); r(12, 9 + bob, 3, 1, p.white); r(15, 17 + bob, 3, 2, glow); }
  if (direction === 1) { r(12, 8 + bob, 9, 4, p.dark); r(14, 9 + bob, 5, 2, shade); r(12, 15 + bob, 9, 6, p.dark); r(15, 16 + bob, 3, 3, glow); }
  if (direction === 2) { r(9, 9 + bob, 5, 3, glow); r(9, 9 + bob, 2, 1, p.white); r(21, 15 + bob, 4, 6, p.dark); }
  if (direction === 3) { r(20, 9 + bob, 5, 3, glow); r(23, 9 + bob, 2, 1, p.white); r(8, 15 + bob, 4, 6, p.dark); }
}
export const imageSpecs = [
  ['player.png', 128, 128, 16], ['enemy.png', 64, 32, 2], ['floor.png', 32, 32, 1],
  ['wall.png', 32, 32, 1], ['obstacle.png', 32, 32, 1], ['energy.png', 16, 8, 1],
  ['impact.png', 192, 32, 6], ['afterimage.png', 128, 32, 4],
] as const;
export const soundSpecs = [['shot.wav', .12], ['hit.wav', .16], ['explosion.wav', .24], ['dodge.wav', .18], ['bgm.wav', 12]] as const;
export const SAMPLE_RATE = 22050;
function random(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 0x100000000 * 2 - 1; };
}
function wav(samples: Float64Array): Buffer {
  const result = Buffer.alloc(44 + samples.length * 2);
  result.write('RIFF'); result.writeUInt32LE(result.length - 8, 4); result.write('WAVEfmt ', 8);
  result.writeUInt32LE(16, 16); result.writeUInt16LE(1, 20); result.writeUInt16LE(1, 22);
  result.writeUInt32LE(SAMPLE_RATE, 24); result.writeUInt32LE(SAMPLE_RATE * 2, 28); result.writeUInt16LE(2, 32); result.writeUInt16LE(16, 34);
  result.write('data', 36); result.writeUInt32LE(samples.length * 2, 40);
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = .8 / Math.max(peak, .8);
  for (let i = 0; i < samples.length; i++) result.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * gain)) * 32767), 44 + i * 2);
  return result;
}
const sine = (phase: number) => Math.sin(phase * Math.PI * 2);
const chip = (phase: number) => (sine(phase) + sine(phase * 3) / 3 + sine(phase * 5) / 5) / 1.53;
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
function sound(name: string, duration: number): Buffer {
  const samples = new Float64Array(Math.round(duration * SAMPLE_RATE)), noise = random(73019);
  let filtered = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE, p = t / duration;
    const env = Math.min(1, t / .003) * (1 - p) ** 2;
    filtered = filtered * .7 + noise() * .3;
    if (name === 'shot.wav') samples[i] = chip(1500 * t - 4700 * t * t) * env * .42;
    if (name === 'hit.wav') samples[i] = (sine(880 * t) * sine(1297 * t) * .45 + filtered * .4) * env;
    if (name === 'explosion.wav') samples[i] = (filtered * .9 + sine(100 * t - 130 * t * t) * .35) * env;
    if (name === 'dodge.wav') samples[i] = (chip(180 * t + 1500 * t * t) * .35 + filtered * .12) * env;
  }
  return wav(samples);
}
function music(): Buffer {
  const samples = new Float64Array(12 * SAMPLE_RATE), noise = random(42817);
  const roots = [45, 41, 38, 40, 45, 40], motif = [12, 19, 24, 19, 15, 19, 22, 19];
  const add = (start: number, length: number, voice: (t: number) => number) => {
    const begin = Math.round(start * SAMPLE_RATE), count = Math.round(length * SAMPLE_RATE);
    for (let i = 0; i < count && begin + i < samples.length; i++) {
      const t = i / SAMPLE_RATE, envelope = Math.min(1, t / .006, (length - t) / .015);
      samples[begin + i] += voice(t) * Math.max(0, envelope);
    }
  };
  for (let step = 0; step < 48; step++) {
    const start = step * .25, root = roots[Math.floor(step / 8)];
    const note = root + motif[step % 8] + (step >= 32 && step % 4 === 2 ? 12 : 0);
    add(start, .22, t => chip(hz(note) * t) * .19 * Math.exp(-t * 4));
    add(start, .055, t => noise() * .065 * Math.exp(-t * 55)); // closed hat
    if (step % 2 === 0) {
      add(start, .42, t => (sine(hz(root - 12) * t) + sine(hz(root - 12) * 3 * t) / 9) * .24);
      if (step % 4 === 0) add(start, .18, t => sine(65 * t + 2 * (1 - Math.exp(-t * 35))) * .4 * Math.exp(-t * 20));
      else add(start, .12, t => (noise() * .22 + sine(185 * t) * .12) * Math.exp(-t * 26));
    }
  }
  // Every voice has an attack/release and finishes before 12s; both loop endpoints are zero.
  samples[0] = 0; samples[samples.length - 1] = 0;
  return wav(samples);
}
export function generateAssets(directory: string | URL = new URL('../public/2d/assets/', import.meta.url)) {
  mkdirSync(directory, { recursive: true });
  const output = (name: string, data: Buffer | string) => writeFileSync(directory instanceof URL ? new URL(name, directory) : resolve(directory, name), data);
  const player = canvas(128, 128);
  for (let d = 0; d < 4; d++) for (let f = 0; f < 4; f++) robot(player, f * 32, d * 32, d, f);
  output('player.png', player.png());
  const enemy = canvas(64, 32); robot(enemy, 0, 0, 0, 0, true); robot(enemy, 32, 0, 0, 1, true); output('enemy.png', enemy.png());
  const ghost = canvas(128, 32);
  for (let d = 0; d < 4; d++) robot(ghost, d * 32, 0, d, 0, false, true);
  output('afterimage.png', ghost.png());
  const p = palette, floor = canvas(32, 32);
  floor.rect(0, 0, 32, 32, p.dark); floor.rect(1, 1, 30, 30, [28, 49, 59, 255]);
  floor.rect(2, 2, 28, 1, [35, 60, 69, 255]); floor.rect(2, 29, 28, 1, [19, 36, 46, 255]);
  for (const [x, y] of [[4, 4], [27, 4], [4, 27], [27, 27]]) floor.pixel(x, y, p.steel);
  floor.rect(14, 14, 4, 1, [32, 54, 64, 255]); output('floor.png', floor.png());
  const wall = canvas(32, 32); wall.rect(0, 0, 32, 32, p.ink); wall.rect(1, 1, 30, 24, p.steel);
  wall.rect(2, 2, 28, 2, p.light); wall.rect(3, 6, 26, 13, p.dark); wall.rect(4, 7, 24, 1, p.deep);
  wall.rect(5, 21, 22, 2, p.teal); wall.rect(1, 26, 30, 4, p.dark);
  for (const x of [5, 13, 21]) wall.rect(x, 10, 2, 7, p.ink);
  output('wall.png', wall.png());
  const box = canvas(32, 32); box.rect(1, 3, 30, 28, p.ink); box.rect(2, 2, 28, 25, p.steel);
  box.rect(3, 3, 26, 2, p.light); box.rect(5, 7, 22, 17, p.dark);
  box.rect(8, 9, 16, 2, p.deep); box.rect(14, 13, 4, 8, p.orange);
  for (let x = 4; x < 28; x++) for (let y = 25; y < 28; y++) box.pixel(x, y, Math.floor(x / 4) % 2 ? p.orange : p.ink);
  for (const [x, y] of [[4, 6], [27, 6], [4, 22], [27, 22]]) box.pixel(x, y, p.light);
  output('obstacle.png', box.png());
  const energy = canvas(16, 8); energy.rect(1, 3, 13, 2, [32, 109, 112, 150]); energy.rect(5, 2, 9, 4, p.teal); energy.rect(8, 3, 7, 2, p.white); output('energy.png', energy.png());
  const impact = canvas(192, 32);
  for (let f = 0; f < 6; f++) {
    const radius = 2 + f * 2;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const distance = Math.hypot(x - 15.5, y - 15.5);
      if (distance < radius && (f < 2 || distance > radius - 3)) impact.pixel(f * 32 + x, y, f < 2 ? p.white : f < 4 ? p.orange : p.rust);
    }
    for (let n = 0; n < 8; n++) {
      const a = n * Math.PI / 4 + .1 * f;
      impact.rect(f * 32 + Math.round(15 + Math.cos(a) * (radius + 2)), Math.round(15 + Math.sin(a) * (radius + 2)), 2, 2, p.orange);
    }
  }
  output('impact.png', impact.png());
  for (const [name, duration] of soundSpecs) output(name, name === 'bgm.wav' ? music() : sound(name, duration));
  output('catalog.json', JSON.stringify({ generator: 'generate-2d-assets.ts', seed: '73019 / 42817', images: imageSpecs.map(([file, width, height, frames]) => ({ file, width, height, frames })), audio: soundSpecs.map(([file, seconds]) => ({ file, seconds, sampleRate: SAMPLE_RATE, channels: 1, bits: 16 })) }, null, 2) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateAssets(); console.log('Generated 8 PNGs (32 frames), 4 SFX WAVs, 12s BGM WAV, catalog.json');
}
