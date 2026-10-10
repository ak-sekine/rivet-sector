import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { build } from 'vite';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read('public/manifest.webmanifest').toString());
describe('PWA assets and production paths', () => {
  it('declares standalone landscape gameplay within the Pages base', () => {
    expect(manifest).toMatchObject({ name: 'Rivet Sector', short_name: 'Rivet Sector',
      start_url: '/rivet-sector/', scope: '/rivet-sector/', display: 'standalone',
      orientation: 'landscape', background_color: '#101923', theme_color: '#101923' });
    for (const icon of manifest.icons) {
      expect(new URL(icon.src, 'https://example.com/rivet-sector/manifest.webmanifest').pathname).toBe(`/rivet-sector/${icon.src}`);
      expect(icon.type).toBe('image/png');
      expect(read(`public/${icon.src}`).length).toBeGreaterThan(0);
    }
  });
  it.each([[180, 'apple-touch-icon'], [192, 'icon-192'], [512, 'icon-512']])('contains a decodable %i pixel PNG (%s)', (size, name) => {
    const png = read(`public/icons/${name}.png`);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.toString('ascii', 12, 16)).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(size); expect(png.readUInt32BE(20)).toBe(size);
    expect(png[24]).toBe(8); expect(png[25]).toBe(2);
    const data = [];
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset);
      if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') data.push(png.subarray(offset + 8, offset + 8 + length));
      offset += length + 12;
    }
    expect(inflateSync(Buffer.concat(data)).length).toBe((size * 3 + 1) * size);
    expect(png.toString('ascii', png.length - 8, png.length - 4)).toBe('IEND');
  });
  it('builds HTML with resolvable manifest and Apple icon, and copies every public asset', async () => {
    await build({ logLevel: 'silent', build: { outDir: '.cache/pwa-build' } });
    const html = read('.cache/pwa-build/index.html').toString();
    expect(html).toContain('href="/rivet-sector/manifest.webmanifest"');
    expect(html).toContain('href="/rivet-sector/icons/apple-touch-icon.png"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
    expect(html).toContain('viewport-fit=cover');
    for (const path of ['manifest.webmanifest', 'icons/apple-touch-icon.png', ...manifest.icons.map((icon: { src: string }) => icon.src)]) {
      expect(read(`.cache/pwa-build/${path}`)).toEqual(read(`public/${path}`));
    }
  }, 60000);
});
