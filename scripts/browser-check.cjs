// Run against npm run dev -- --port 4173. Set PLAYWRIGHT_MODULE if Playwright is not installed locally.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:4173/rivet-sector/';
(async () => {
  fs.mkdirSync('.cache', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true,
    args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const errors = [];
    const setup = async (page) => {
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(baseUrl);
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
    assert.equal(await page.locator('#dodge').isVisible(), false);
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
    await page.waitForTimeout(150); assert(Math.abs((await state(page)).yaw - yaw - 80 * .004) < 1e-6);
    await page.evaluate(() => window.testScene.metadata.camera.look(-window.testScene.metadata.camera.yaw, 0));
    await place(page, -4, -.01);
    await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
    assert((await state(page)).player.z < .03);
    await place(page, 0, 7.7);
    await page.keyboard.down('w'); await page.waitForTimeout(400); await page.keyboard.up('w');
    assert((await state(page)).player.z <= 7.72);
    await page.keyboard.down('s'); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const blurred = await state(page); await page.waitForTimeout(150);
    assert.equal((await state(page)).player.z, blurred.player.z); await page.keyboard.up('s');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await place(page, 0, -6);
    await page.keyboard.down('Shift'); await page.waitForTimeout(900);
    assert(Math.abs((await state(page)).player.z + 8.5) < .01);
    await page.keyboard.up('Shift');
    await page.keyboard.down('w'); await page.keyboard.down('Shift');
    await page.waitForFunction(() => window.testScene.metadata.dodge.active);
    assert.equal(await page.evaluate(() => window.testScene.getTransformNodeByName('torso-joint').rotation.x), .16);
    await page.keyboard.up('w'); await page.waitForTimeout(350); await page.keyboard.up('Shift');
    assert((await state(page)).player.z > -6.05);
    assert.equal(await page.evaluate(() => window.testScene.getTransformNodeByName('torso-joint').rotation.x), 0);
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
    assert(m1.player.z > m0.player.z + .3); assert(Math.abs(m1.yaw - m0.yaw - 40 * .010) < 1e-6);
    await touch('touchEnd', []); await mobile.waitForTimeout(100);
    const m2 = await state(mobile); await mobile.waitForTimeout(150);
    assert.equal((await state(mobile)).player.z, m2.player.z);
    const dodgeBox = await mobile.locator('#dodge').boundingBox();
    assert(dodgeBox.width >= 44 && dodgeBox.height >= 44);
    assert(dodgeBox.x + dodgeBox.width <= 390 && dodgeBox.y + dodgeBox.height <= 844);
    await place(mobile, 0, -6);
    await mobile.evaluate(() => window.testScene.metadata.camera.look(-window.testScene.metadata.camera.yaw, 0));
    const db = { x: dodgeBox.x + dodgeBox.width / 2, y: dodgeBox.y + dodgeBox.height / 2, id: 3 };
    await touch('touchStart', [{ x:sx,y:sy-40,id:1 }, { x:280,y:400,id:2 }]);
    await touch('touchStart', [{ x:sx,y:sy-40,id:1 }, { x:280,y:400,id:2 }, db]);
    await mobile.waitForFunction(() => window.testScene.metadata.dodge.active);
    assert(await mobile.locator('#dodge').evaluate(b => b.classList.contains('cooldown') && b.classList.contains('pressed')));
    const dodgeYaw = (await state(mobile)).yaw;
    await touch('touchMove', [{ x:sx,y:sy,id:1 }, { x:300,y:410,id:2 }, db]);
    await mobile.waitForTimeout(900);
    const dodgeEnd = await state(mobile);
    assert(Math.abs(dodgeEnd.yaw - dodgeYaw - .2) < 1e-6);
    // The stick also moves normally while CDP adds the third finger; exact distance is unit-tested.
    assert(Math.abs(dodgeEnd.player.x) < .01); assert(dodgeEnd.player.z > -3.6 && dodgeEnd.player.z < -2.5, JSON.stringify(dodgeEnd));
    await mobile.waitForTimeout(200); assert.equal((await state(mobile)).player.z, dodgeEnd.player.z);
    await touch('touchCancel', []);
    assert.equal(await mobile.locator('#dodge').evaluate(b => b.classList.contains('pressed')), false);
    await mobile.screenshot({ path: '.cache/tps-mobile-portrait.png' });
    await mobile.setViewportSize({ width: 844, height: 390 }); await mobile.waitForTimeout(150);
    const landscape = await mobile.locator('#stick').boundingBox();
    assert.equal(await mobile.locator('.portrait-hint').isVisible(), false);
    assert.deepEqual(await mobile.locator('#scene').evaluate(canvas => [canvas.clientWidth, canvas.clientHeight]), [844, 390]);
    assert(landscape.x >= 0 && landscape.y >= 0 && landscape.y + landscape.height <= 390);
    const landscapeDodge = await mobile.locator('#dodge').boundingBox();
    assert(landscapeDodge.x + landscapeDodge.width <= 844 && landscapeDodge.y + landscapeDodge.height <= 390);
    await mobile.screenshot({ path: '.cache/tps-mobile-landscape.png' });
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight), true);
    assert.deepEqual(errors, []);
    // Force initialization failure and check the maintained error UI.
    const failure = await browser.newPage();
    await failure.addInitScript(() => HTMLCanvasElement.prototype.getContext = () => null);
    await failure.goto(baseUrl);
    await failure.waitForSelector('#error:not([hidden])');
    console.log('PASS: robot/TPS/PWA/WebGL, WASD/Shift, dodge hold/cooldown/torso, pointer lock/Esc/drag, collision, three touch pointers, portrait/landscape control bounds');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
