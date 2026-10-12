// npm run preview -- --port 4173, then npm run check:2d.
// PLAYWRIGHT_MODULE: optional external Playwright path. TEST_BASE_URL: local or public lab URL.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:4173/rivet-sector/';
const snapshot = page => page.evaluate(() => window.rivet2d.snapshot());
(async () => {
  fs.mkdirSync('.cache', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true,
    args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [], failedAssets = [];
  const setup = async page => {
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && /\.(png|wav|js|css)/.test(r.url())) failedAssets.push(`${r.status()} ${r.url()}`); });
    await page.goto(baseUrl); await page.waitForFunction(() => !!window.rivet2d && document.getElementById('loading').hidden);
    await page.waitForTimeout(200);
    assert.equal((await snapshot(page)).version, '4.2.1'); assert((await snapshot(page)).pointers >= 3);
  };
  const bounds = async (page, ids) => {
    const size = page.viewportSize(), boxes = {};
    for (const id of ids) {
      const box = await page.locator(id).boundingBox(); assert(box, id);
      assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width && box.y + box.height <= size.height, `${id} ${JSON.stringify(box)}`);
      boxes[id] = box;
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
    return boxes;
  };
  try {
    const pc = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await setup(pc);
    assert.equal((await snapshot(pc)).audio.unlocked, false);
    assert.equal(await pc.locator('#move-stick').isVisible(), false);
    await bounds(pc, ['.hud', '#mute', '.pc-help', '#game']);
    const legacy = await browser.newPage(); await legacy.goto(new URL('2d/', baseUrl).href); await legacy.waitForURL(baseUrl); await legacy.close();
    const canvas = await pc.locator('canvas').boundingBox();
    const initial = await snapshot(pc);
    // Phaser zoom scales around the viewport center, not its origin.
    const targetX = canvas.x + canvas.width / 2 + (768 - initial.camera.x - canvas.width / 2) * initial.camera.zoom;
    const targetY = canvas.y + canvas.height / 2 + (352 - initial.camera.y - canvas.height / 2) * initial.camera.zoom;
    await pc.mouse.move(targetX, targetY); await pc.mouse.down();
    await pc.waitForFunction(() => window.rivet2d.snapshot().hits >= 2);
    await pc.waitForFunction(() => window.rivet2d.snapshot().audio.loaded === 5 && window.rivet2d.snapshot().audio.playing);
    await pc.screenshot({ path: '.cache/2d-pc.png' });
    await pc.mouse.up(); const count = (await snapshot(pc)).shots; await pc.waitForTimeout(350); assert.equal((await snapshot(pc)).shots, count);
    const before = await snapshot(pc); await pc.keyboard.down('KeyD'); await pc.waitForTimeout(250); await pc.keyboard.up('KeyD');
    const moved = await snapshot(pc); assert(moved.player.x > before.player.x + 5); assert(moved.camera.x > before.camera.x);
    await pc.waitForTimeout(100); const stopped = (await snapshot(pc)).player; await pc.waitForTimeout(150); assert.deepEqual((await snapshot(pc)).player, stopped);
    await pc.keyboard.down('Space'); await pc.waitForFunction(() => window.rivet2d.snapshot().dodges === 1);
    await pc.waitForTimeout(500); assert.equal((await snapshot(pc)).dodges, 1); await pc.keyboard.up('Space');
    await pc.keyboard.press('KeyM'); assert.equal((await snapshot(pc)).audio.muted, true); assert.equal((await snapshot(pc)).audio.playing, false);
    await pc.locator('#mute').click(); await pc.waitForFunction(() => window.rivet2d.snapshot().audio.playing);
    // Browser visibility handler, with deterministic synthetic hidden state.
    await pc.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await pc.waitForTimeout(150); assert.equal((await snapshot(pc)).audio.playing, false); assert.equal((await snapshot(pc)).audio.context, 'suspended');
    const paused = (await snapshot(pc)).time; await pc.waitForTimeout(200); assert.equal((await snapshot(pc)).time, paused);
    await pc.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await pc.waitForFunction(() => window.rivet2d.snapshot().audio.playing);
    // Decode every PNG/WAV through browser codecs under the actual Pages base path.
    const decoded = await pc.evaluate(async () => {
      const base = new URL('2d/assets/', location.href), catalog = await (await fetch(new URL('catalog.json', base))).json();
      const images = await Promise.all(catalog.images.map(async spec => {
        const r = await fetch(new URL(spec.file, base)); const bitmap = await createImageBitmap(await r.blob());
        return { file: spec.file, ok: r.ok, width: bitmap.width, height: bitmap.height, expected: [spec.width, spec.height] };
      }));
      const context = new AudioContext();
      const audio = await Promise.all(catalog.audio.map(async spec => {
        const r = await fetch(new URL(spec.file, base)); const buffer = await context.decodeAudioData(await r.arrayBuffer());
        return { file: spec.file, ok: r.ok, seconds: buffer.duration, expected: spec.seconds };
      })); await context.close(); return { images, audio };
    });
    for (const im of decoded.images) { assert(im.ok); assert.deepEqual([im.width, im.height], im.expected); }
    for (const wav of decoded.audio) { assert(wav.ok); assert(Math.abs(wav.seconds - wav.expected) < .001); }
    console.log('PASS PC: Phaser 4.2.1, WASD/stop, camera follow, mouse held fire/target hits, Space press edge, audio unlock/5 decodes/BGM/mute/visibility, all 8 PNG decodes');

    const sizes = [[320,568],[375,667],[375,812],[390,844],[430,932]];
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await setup(mobile);
    for (const [width,height] of sizes) {
      await mobile.setViewportSize({width,height}); await mobile.waitForTimeout(200);
      const b = await bounds(mobile, ['.hud','#game','#controls','#move-stick','#dodge2d','#aim-stick']);
      assert(b['#game'].y + b['#game'].height <= b['#controls'].y);
      assert(b['#move-stick'].x + b['#move-stick'].width <= b['#dodge2d'].x);
      assert(b['#dodge2d'].x + b['#dodge2d'].width <= b['#aim-stick'].x);
      for (const id of ['#move-stick','#dodge2d','#aim-stick']) assert(b[id].y >= b['#controls'].y);
      assert.equal(await mobile.locator('#size-hint').isVisible(),false);
      const c = await mobile.locator('canvas').boundingBox(); assert.equal(c.width,b['#game'].width); assert.equal(c.height,b['#game'].height);
      assert.equal((await snapshot(mobile)).camera.zoom,width/320);
      await mobile.screenshot({path: `.cache/2d-${width}x${height}.png`});
      console.log(`PASS portrait ${width}x${height}: separated regions, non-overlapping controls, exact canvas size, no scroll`);
    }
    await mobile.setViewportSize({width:390,height:844}); await mobile.waitForTimeout(200);
    const boxes = await bounds(mobile, ['#move-stick','#aim-stick','#dodge2d']);
    const center = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    const left = center(boxes['#move-stick']), right = center(boxes['#aim-stick']), dodge = center(boxes['#dodge2d']);
    const cdp = await mobile.context().newCDPSession(mobile);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const moveFinger = { ...left, id: 1 }, aimFinger = { ...right, id: 2 }, dodgeFinger = { ...dodge, id: 3 };
    const m0 = await snapshot(mobile);
    await touch('touchStart', [moveFinger, aimFinger]);
    moveFinger.y += 35; aimFinger.x += 33; aimFinger.y -= 16.5;
    await touch('touchMove', [moveFinger, aimFinger]);
    await mobile.waitForFunction(() => window.rivet2d.snapshot().shots >= 2);
    const m1 = await snapshot(mobile); assert(m1.player.y > m0.player.y + 5); assert(m1.shots >= 2);
    await touch('touchStart', [moveFinger, aimFinger, dodgeFinger]);
    await mobile.waitForFunction(() => window.rivet2d.snapshot().dodges === 1 && window.rivet2d.snapshot().dodgeRemaining > 0);
    const m2 = await snapshot(mobile); assert.equal(m2.stamina, 75); assert.equal(await mobile.locator('#dodge2d').getAttribute('aria-disabled'), 'true');
    await mobile.screenshot({ path: '.cache/2d-mobile-input.png' });
    await mobile.waitForFunction(n => window.rivet2d.snapshot().shots > n && window.rivet2d.snapshot().dodgeRemaining === 0, m2.shots); const held = await snapshot(mobile); assert.equal(held.dodges, 1); assert(held.shots > m2.shots);
    await touch('touchEnd', [dodgeFinger]); // release only dodge, retain movement/fire
    await mobile.waitForFunction(y => window.rivet2d.snapshot().player.y > y, held.player.y); const remaining = await snapshot(mobile); assert(remaining.player.y > held.player.y); assert(remaining.shots >= held.shots);
    await touch('touchCancel', []); await mobile.waitForTimeout(100);
    const cancelled = await snapshot(mobile); await mobile.waitForTimeout(350);
    const ended = await snapshot(mobile); assert.deepEqual(ended.player, cancelled.player); assert.equal(ended.shots, cancelled.shots);
    assert.equal(await mobile.locator('#move-stick').evaluate(el => el.classList.contains('active')), false);
    assert.equal(await mobile.locator('#aim-stick').evaluate(el => el.classList.contains('active')), false);
    // A captured finger remains active outside its original stick and panel.
    await touch('touchStart', [{...left,id:1},{...right,id:2}]);
    await touch('touchMove', [{...left,y:left.y-100,id:1},{...right,x:right.x+33,id:2}]);
    const captured = await snapshot(mobile);
    await mobile.waitForFunction(y => window.rivet2d.snapshot().player.y < y, captured.player.y);
    await touch('touchEnd', [{...left,y:left.y-100,id:1}]);
    await mobile.waitForTimeout(100); const released = await snapshot(mobile); await mobile.waitForFunction(n => window.rivet2d.snapshot().shots > n, released.shots);
    assert.deepEqual((await snapshot(mobile)).player,released.player); assert((await snapshot(mobile)).shots > released.shots);
    await mobile.evaluate(() => window.dispatchEvent(new Event('blur')));
    const blurred = await snapshot(mobile); await mobile.waitForTimeout(300); assert.equal((await snapshot(mobile)).time,blurred.time);
    await touch('touchCancel',[]); await mobile.evaluate(() => window.dispatchEvent(new Event('focus')));
    await mobile.setViewportSize({width:844,height:390}); await mobile.waitForTimeout(200);
    assert(await mobile.locator('#size-hint').isVisible());
    await mobile.screenshot({path:'.cache/2d-small-landscape.png'});
    // Synthetic safe-area equivalent padding verifies the flex allocation; hardware insets need device testing.
    await mobile.setViewportSize({width:390,height:844});
    await mobile.locator('#lab').evaluate(el => { el.style.paddingTop='47px'; el.style.paddingBottom='34px'; el.style.paddingLeft='8px'; el.style.paddingRight='8px'; });
    await mobile.waitForTimeout(200);
    const safe = await bounds(mobile,['#game','#controls','#aim-stick','#dodge2d']);
    assert(safe['#controls'].y+safe['#controls'].height<=810);
    assert.equal((await mobile.locator('canvas').boundingBox()).width,safe['#game'].width);
    await mobile.screenshot({path:'.cache/2d-safe-area.png'});
    console.log('PASS mobile emulation: three fingers, independent release/cancel, capture outside control, blur/resume, small-screen guidance, synthetic safe area');

    const silent = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await silent.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    await setup(silent); const s0 = await snapshot(silent); await silent.keyboard.down('KeyD'); await silent.waitForTimeout(150); await silent.keyboard.up('KeyD');
    assert((await snapshot(silent)).player.x > s0.player.x); assert.equal((await snapshot(silent)).audio.context, 'unavailable');
    assert.deepEqual(failedAssets, []); assert.deepEqual(errors, []);
    console.log('PASS sound-unavailable fallback; no browser runtime errors or failed assets');
    console.log(JSON.stringify({ url: baseUrl, decoded: { png: decoded.images.length, wav: decoded.audio.length }, screenshots: ['.cache/2d-pc.png', ...sizes.map(([w,h]) => `.cache/2d-${w}x${h}.png`), '.cache/2d-mobile-input.png', '.cache/2d-safe-area.png'] }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
