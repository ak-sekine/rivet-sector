import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { generateAssets, imageSpecs, soundSpecs, SAMPLE_RATE } from '../scripts/generate-2d-assets';

const asset = (name: string) => readFileSync(new URL(`../public/2d/assets/${name}`, import.meta.url));
describe('code-generated 2D assets', () => {
  it.each(imageSpecs)('decodes RGBA PNG %s (%i x %i, %i frames)', (name, width, height, frames) => {
    const png = asset(name); expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(width); expect(png.readUInt32BE(20)).toBe(height);
    expect(png[24]).toBe(8); expect(png[25]).toBe(6);
    const chunks: Buffer[] = [];
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
      const body = png.subarray(offset + 4, offset + 8 + length);
      let crc = 0xffffffff;
      for (const byte of body) { crc ^= byte; for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
      expect(png.readUInt32BE(offset + 8 + length)).toBe((crc ^ 0xffffffff) >>> 0);
      if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
      offset += length + 12;
    }
    const pixels = inflateSync(Buffer.concat(chunks)); expect(pixels.length).toBe((width * 4 + 1) * height);
    if (name === 'player.png' || name === 'enemy.png') {
      expect(width * height / (32 * 32)).toBe(frames);
      expect(pixels[4]).toBe(0); // First pixel alpha is transparent.
    }
    expect(png.toString('ascii', png.length - 8, png.length - 4)).toBe('IEND');
  });
  it.each(soundSpecs)('decodes mono PCM WAV %s (%f seconds)', (name, seconds) => {
    const wav = asset(name); expect(wav.toString('ascii', 0, 4)).toBe('RIFF'); expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt32LE(4)).toBe(wav.length - 8); expect(wav.readUInt16LE(20)).toBe(1); expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(SAMPLE_RATE); expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(Math.round(seconds * SAMPLE_RATE) * 2);
    let peak = 0, energy = 0;
    for (let i = 44; i < wav.length; i += 2) { const sample = wav.readInt16LE(i); peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
    expect(peak).toBeLessThan(32767); expect(energy).toBeGreaterThan(100000);
    expect(wav.readInt16LE(44)).toBe(0); expect(Math.abs(wav.readInt16LE(wav.length - 2))).toBeLessThan(10);
  });
  it('regenerates every committed asset byte-for-byte', () => {
    const directory = mkdtempSync(join(tmpdir(), 'rivet-2d-assets-'));
    try {
      generateAssets(directory);
      expect(readdirSync(directory).length).toBe(14);
      for (const name of readdirSync(directory)) expect(readFileSync(join(directory, name))).toEqual(asset(name));
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
