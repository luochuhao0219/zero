const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const url = (process.env.BASE_URL || 'http://127.0.0.1:4173/').replace(/#.*$/, '') + '#play';
const diagnostics = page => page.evaluate(() => window.borrowLightDiagnostics());
const project = (page, x, y, z) => page.evaluate(p => window.borrowLightProject(...p), [x, y, z]);
async function ready(page) {
  await page.waitForFunction(() => window.borrowLightDiagnostics().direct.targets.length > 0);
}
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, {steps: 25});
  await page.mouse.up();
}
async function sampleFrames(page, count = 180) {
  return page.evaluate(async count => {
    const deltas = [];
    let last;
    await new Promise(resolve => {
      function frame(t) {
        if (last) deltas.push(t - last);
        last = t;
        if (deltas.length < count) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    deltas.sort((a, b) => a - b);
    return {samples: count, medianMs: deltas[Math.floor(count * .5)],
      p95Ms: deltas[Math.floor(count * .95)], framesOver34ms: deltas.filter(d => d > 34).length};
  }, count);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  try {
    const errors = [];
    const listen = page => {
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    };
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1.5});
    listen(page);
    await page.goto(url);
    await page.waitForFunction(() => window.borrowLightDiagnostics);
    assert.equal((await diagnostics(page)).fallback, false);
    await page.waitForFunction(() => window.borrowLightDiagnostics().curtainOpen > .99);
    await page.waitForFunction(() => document.querySelector('#stage-container').dataset.ready === 'true');
    const idleA = await diagnostics(page);
    assert.equal(idleA.neighborhood.assetsLoaded, 3, 'All local neighborhood textures load');
    await page.waitForTimeout(1100);
    const idleB = await diagnostics(page);
    assert.ok(Math.abs(idleB.actorPose[0].pose - idleA.actorPose[0].pose) > 3, 'Idle joints animate');
    assert.equal(idleB.textureUploads, idleA.textureUploads);
    assert.equal(idleB.canvasRedraws, 0);
    const renderer = await page.evaluate(() => {
      const gl = document.querySelector('#stage').getContext('webgl2');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'not exposed';
    });
    const idleFrames = await sampleFrames(page);
    await page.screenshot({path: path.join(root, 'screenshots/v8-play-preview.png')});
    await page.locator('#replay-intro').click();
    await page.waitForFunction(() => window.borrowLightDiagnostics().curtainOpen < .3);
    await page.waitForFunction(() => window.borrowLightDiagnostics().curtainOpen > .99);
    await page.locator('#start-game').click();
    await page.waitForTimeout(150);
    assert.notEqual(await page.locator('#stage-container').evaluate(el => getComputedStyle(el).transform), 'none');
    await ready(page);

    await page.screenshot({path: path.join(root, 'screenshots/v8-game.png')});
    const before = await diagnostics(page);
    const lamp = before.direct.targets.find(t => t.id === 'lamp').screen;
    const goal = await project(page, -3, 4, -4.8);
    await page.mouse.move(lamp.x, lamp.y);
    await page.mouse.down();
    await page.mouse.move(goal.x, goal.y);
    const immediate = await diagnostics(page);
    await page.waitForTimeout(80);
    const middle = await diagnostics(page);
    await page.waitForTimeout(500);
    const settled = await diagnostics(page);
    await page.mouse.up();
    assert.ok(Math.abs(immediate.renderState.lightX - before.renderState.lightX) < 4.5, 'Input is interpolated');
    assert.ok(middle.renderState.lightX > -3 && middle.renderState.lightX < before.renderState.lightX);
    assert.ok(Math.abs(settled.renderState.lightX + 3) < .01, 'Position settles accurately');

    const current = (await diagnostics(page)).direct.targets.find(t => t.id === 'lamp').screen;
    const end = await project(page, 2, 4, -4.8);
    const graphics = await diagnostics(page);
    const uploads = graphics.textureUploads;
    await page.mouse.move(current.x, current.y);
    await page.mouse.down();
    const [dragFrames] = await Promise.all([
      sampleFrames(page),
      (async () => {
        for (let i = 1; i <= 150; i++) {
          await page.mouse.move(current.x + (end.x - current.x) * i / 150, current.y + (end.y - current.y) * i / 150);
          await page.waitForTimeout(20);
        }
      })()
    ]);
    await page.mouse.up();
    assert.equal((await diagnostics(page)).textureUploads, uploads, 'Dragging reuses GPU textures');
    assert.equal((await diagnostics(page)).canvasRedraws, 0);
    assert.equal(await page.locator('#complete-dialog').evaluate(el => el.open), false, 'Unsolved state cannot complete');

    await page.locator('#front-view').click();
    await page.waitForTimeout(450);
    const orbit = await diagnostics(page);
    assert.ok(orbit.viewTransition && orbit.cameraAngle > .25 && orbit.cameraAngle < 2.5);
    await ready(page);
    const front = await diagnostics(page), shadow = front.direct.targets.find(t => t.id === 'shadow').screen;
    await drag(page, shadow, {x: shadow.x + 45, y: shadow.y - 25});
    assert.ok(Math.abs((await diagnostics(page)).state.lightX - front.state.lightX) > .1, 'Front shadow is draggable');

    // Real gestures also work with OS reduced-motion preferences.
    const reduced = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    const rp = await reduced.newPage(); listen(rp);
    await rp.goto(url); await rp.waitForFunction(() => window.borrowLightDiagnostics);
    const r1 = await diagnostics(rp); await rp.waitForTimeout(700); const r2 = await diagnostics(rp);
    assert.equal(r1.curtainOpen, 1); assert.deepEqual(r1.actorPose, r2.actorPose);
    assert.equal(r1.neighborhood.phase, 0); assert.equal(r2.neighborhood.phase, 0);
    await rp.locator('#start-game').click(); await ready(rp);
    await drag(rp, (await diagnostics(rp)).direct.targets.find(t => t.id === 'lamp').screen, await project(rp, -2.2, 4.6, -4.8));
    const rd = await diagnostics(rp), handle = rd.direct.targets.find(t => t.id === 'depth').screen;
    const a = await project(rp, -.8, 2.7, -.5), b = await project(rp, -.8, 2.7, -2.3);
    const delta = (1.05 - rd.state.depth) / 1.8;
    await drag(rp, handle, {x: handle.x + (b.x - a.x) * delta, y: handle.y + (b.y - a.y) * delta});
    await rp.waitForFunction(() => document.querySelector('#complete-dialog').open, {}, {timeout: 2500});

    // The short landscape viewport must retain the chapter navigation and controls.
    await page.keyboard.press('Escape');
    await page.setViewportSize({width: 844, height: 390});
    await page.waitForTimeout(1000);
    assert.ok(Math.abs((await diagnostics(page)).journey.progress-.855)<.001, 'Resize preserves the reading position');
    await page.screenshot({path: path.join(root, 'screenshots/v8-landscape-preview.png')});
    const layouts = [];
    for (let i = 0; i < 2; i++) {
      if (i) { await page.locator('#start-game').click(); await ready(page); }
      const bounds = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth, viewport: innerWidth,
        bottom: document.querySelector('.site-footer').getBoundingClientRect().bottom, height: innerHeight
      }));
      assert.ok(bounds.width <= bounds.viewport);
      if(i)assert.ok(bounds.bottom <= bounds.height + 1, 'Fullscreen game keeps chapter navigation in view');
      layouts.push(bounds);
    }
    await page.screenshot({path: path.join(root, 'screenshots/v8-landscape-game.png')});
    assert.deepEqual(errors, []);
    const report = {date: new Date().toISOString(), browser: browser.version(), renderer,
      viewport: '1440 × 1000 / DPR 1.5', graphics: {neighborhood: graphics.neighborhood, pixelRatio: graphics.pixelRatio, roofTiles: graphics.roofTiles, materialAssetsLoaded: graphics.materialAssetsLoaded, drawCalls: graphics.drawCalls, triangles: graphics.triangles, shadows: graphics.shadows, reflection: graphics.reflection}, idleFrames, dragFrames,
      interpolation: {before: before.renderState.lightX, immediate: immediate.renderState.lightX,
        middle: middle.renderState.lightX, settled: settled.renderState.lightX}, layouts,
      checks: ['Local neighborhood texture loading', 'Neighborhood reduced-motion freeze', 'Articulated idle motion', 'Opening replay', 'Continuous stage layout transition',
        'Real pointer drag interpolation and settling', 'No canvas redraw or texture uploads during drag',
        'Camera easing', 'Front shadow direct manipulation', 'Reduced-motion gesture completion',
        '844px landscape layout'], errors};
    fs.writeFileSync(path.join(root, 'docs/continuous-game-motion-verification.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exit(1);});
