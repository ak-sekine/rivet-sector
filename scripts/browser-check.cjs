// Run against npm run dev -- --port 4173. Set PLAYWRIGHT_MODULE if Playwright is not installed locally.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('.cache', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true,
    args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const errors = [];
    const setup = async (page) => {
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://localhost:4173/rivet-sector/');
      await page.waitForFunction(() => document.querySelector('#status').textContent === 'TPS PROTOTYPE');
      const pwa = await page.evaluate(async () => {
        const link = document.querySelector('link[rel="manifest"]');
        const response = await fetch(link.href);
        const manifest = await response.json();
        const icons = await Promise.all([...manifest.icons.map(icon => new URL(icon.src, link.href).href),
          document.querySelector('link[rel="apple-touch-icon"]').href].map(async url => {
          const response = await fetch(url);
          const bitmap = await createImageBitmap(await response.blob());
          return { ok: response.ok, width: bitmap.width, height: bitmap.height };
        }));
        return { ok: response.ok, manifest, icons, standalone: matchMedia('(display-mode: standalone)').matches };
      });
      assert(pwa.ok); assert.equal(pwa.manifest.display, 'standalone');
      assert.equal(pwa.manifest.start_url, '/rivet-sector/');
      assert.equal(pwa.standalone, false); // Ordinary browser launch, not a real installed app.
      assert.deepEqual(pwa.icons, [192, 512, 180].map(size => ({ ok: true, width: size, height: size })));
      await page.evaluate(async () => {
        const source = await (await fetch('/rivet-sector/src/rendering/engine.ts')).text();
        const url = source.match(/from "([^"]+Engines_engine[^\"]+)"/)[1];
        const { Engine } = await import(url);
        window.testScene = Engine.Instances[0].scenes[0];
      });
    };
    const state = page => page.evaluate(() => ({ player: { ...window.testScene.metadata.player },
      yaw: window.testScene.metadata.camera.yaw, camera: window.testScene.activeCamera.position.asArray() }));
    const place = (page, x, z) => page.evaluate(([x, z]) => Object.assign(window.testScene.metadata.player, { x, z }), [x, z]);
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await setup(page);
    assert(await page.evaluate(() => window.testScene.getMeshByName('player-head').isEnabled()));
    assert.equal(await page.evaluate(() => window.testScene.activeCamera.name), 'tps');
    assert.equal(await page.locator('#stick').isVisible(), false);
    await page.screenshot({ path: '.cache/tps-pc.png' });
    const before = await state(page);
    await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
    assert((await state(page)).player.z > before.player.z + .5);
    const stopped = await state(page); await page.waitForTimeout(200);
    assert.equal((await state(page)).player.z, stopped.player.z);
    await page.mouse.click(700, 400); await page.waitForTimeout(100);
    assert(await page.evaluate(() => document.pointerLockElement === document.querySelector('#scene')));
    await page.mouse.move(850, 430); await page.waitForTimeout(150);
    assert.notEqual((await state(page)).yaw, before.yaw);
    await page.keyboard.press('Escape');
    assert(await page.evaluate(() => document.pointerLockElement === null));
    // Exercise drag fallback by simulating the unsupported API.
    await page.evaluate(() => document.querySelector('#scene').requestPointerLock = undefined);
    const yaw = (await state(page)).yaw;
    await page.mouse.move(600, 400); await page.mouse.down(); await page.mouse.move(680, 400); await page.mouse.up();
    await page.waitForTimeout(150); assert.notEqual((await state(page)).yaw, yaw);
    await page.evaluate(() => window.testScene.metadata.camera.look(-window.testScene.metadata.camera.yaw / .003, 0));
    await place(page, -4, -.01);
    await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
    assert((await state(page)).player.z < .03);
    await place(page, 0, 7.7);
    await page.keyboard.down('w'); await page.waitForTimeout(400); await page.keyboard.up('w');
    assert((await state(page)).player.z <= 7.72);
    await page.keyboard.down('s'); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const blurred = await state(page); await page.waitForTimeout(150);
    assert.equal((await state(page)).player.z, blurred.player.z); await page.keyboard.up('s');
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await setup(mobile); assert(await mobile.locator('#stick').isVisible());
    assert(await mobile.locator('.portrait-hint').isVisible());
    const box = await mobile.locator('#stick').boundingBox();
    const sx = box.x + box.width / 2, sy = box.y + box.height / 2;
    const cdp = await mobile.context().newCDPSession(mobile);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    await touch('touchStart', [{ x: sx, y: sy, id: 1 }, { x: 300, y: 400, id: 2 }]);
    const m0 = await state(mobile);
    await touch('touchMove', [{ x: sx, y: sy - 40, id: 1 }, { x: 340, y: 430, id: 2 }]);
    await mobile.waitForTimeout(500);
    const m1 = await state(mobile);
    assert(m1.player.z > m0.player.z + .3); assert.notEqual(m1.yaw, m0.yaw);
    await touch('touchEnd', []); await mobile.waitForTimeout(100);
    const m2 = await state(mobile); await mobile.waitForTimeout(150);
    assert.equal((await state(mobile)).player.z, m2.player.z);
    await mobile.screenshot({ path: '.cache/tps-mobile-portrait.png' });
    await mobile.setViewportSize({ width: 844, height: 390 }); await mobile.waitForTimeout(150);
    const landscape = await mobile.locator('#stick').boundingBox();
    assert.equal(await mobile.locator('.portrait-hint').isVisible(), false);
    assert.deepEqual(await mobile.locator('#scene').evaluate(canvas => [canvas.clientWidth, canvas.clientHeight]), [844, 390]);
    assert(landscape.x >= 0 && landscape.y >= 0 && landscape.y + landscape.height <= 390);
    await mobile.screenshot({ path: '.cache/tps-mobile-landscape.png' });
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight), true);
    assert.deepEqual(errors, []);
    // Force initialization failure and check the maintained error UI.
    const failure = await browser.newPage();
    await failure.addInitScript(() => HTMLCanvasElement.prototype.getContext = () => null);
    await failure.goto('http://localhost:4173/rivet-sector/');
    await failure.waitForSelector('#error:not([hidden])');
    console.log('PASS: robot/TPS, WASD/stop/blur, pointer lock/Esc/drag, walls/obstacles, touch simultaneous movement/look/release, portrait/landscape/resize, WebGL error UI');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
