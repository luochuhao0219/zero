const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const url=process.env.BASE_URL||'http://127.0.0.1:4173/';
const state=page=>page.evaluate(()=>window.borrowLightDiagnostics());
const shot=(page,name)=>page.screenshot({path:path.join(root,`screenshots/v6-${name}.png`)});
const ready=page=>page.waitForFunction(()=>window.borrowLightDiagnostics?.().journey.opening.loaded&&window.borrowLightDiagnostics().journey.opening.frames>75);
const gameReady=page=>page.waitForFunction(()=>window.borrowLightDiagnostics().direct.targets.length>0);
async function touchDrag(page,from,to){
  const client=await page.context().newCDPSession(page);
  try{
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
    for(let i=1;i<=20;i++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/20,y:from.y+(to.y-from.y)*i/20}]});await page.waitForTimeout(16);}
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }finally{await client.detach();}
  await page.waitForTimeout(300);
}
async function frames(page,n=120){return page.evaluate(async n=>{const values=[];let previous;await new Promise(resolve=>{const tick=t=>{if(previous)values.push(t-previous);previous=t;if(values.length<n)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});values.sort((a,b)=>a-b);return{samples:n,medianMs:values[Math.floor(n*.5)],p95Ms:values[Math.floor(n*.95)]};},n);}

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[];const listen=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1.5});listen(page);
    await page.goto(url);await ready(page);
    assert.equal((await state(page)).playing,false,'The site opens with the story, not the game');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight*3));
    assert.ok(await page.locator('#story-title').isVisible());
    await page.mouse.move(1100,280);await page.waitForTimeout(400);const tiltA=(await state(page)).journey.opening.rotation.y;
    await page.mouse.move(740,680);await page.waitForTimeout(450);const tiltB=(await state(page)).journey.opening.rotation.y;
    assert.ok(Math.abs(tiltA-tiltB)>.02,'The opening responds to real pointer movement');
    const openingFrames=await frames(page);await shot(page,'home');
    await page.mouse.wheel(0,480);await page.waitForTimeout(350);
    const scrollMiddle=(await state(page)).journey.opening.progress;
    assert.ok(scrollMiddle>.2&&scrollMiddle<.8,'A real scroll produces an intermediate scene pose');
    await shot(page,'scroll-transition');
    await page.locator('.story-nav a[href="#craft"]').click();await page.waitForFunction(()=>window.borrowLightDiagnostics().journey.opening.progress>.98);await page.waitForTimeout(600);
    await page.locator('[data-craft="2"]').click();assert.equal(await page.locator('[data-craft="2"]').getAttribute('aria-expanded'),'true');
    assert.equal((await state(page)).journey.opening.feature,2);await shot(page,'craft');
    await page.locator('.story-nav a[href="#light"]').click();await page.waitForFunction(()=>window.borrowLightDiagnostics().journey.active==='light');await page.waitForTimeout(800);
    const beforeStudy=(await state(page)).journey.study,rect=await page.locator('#study-window').boundingBox(),orb=await page.locator('#study-light').boundingBox();
    await page.mouse.move(orb.x+orb.width/2,orb.y+orb.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.72,rect.y+rect.height*.38,{steps:25});await page.mouse.up();await page.waitForTimeout(350);
    const afterStudy=(await state(page)).journey.study;
    assert.ok(afterStudy.light.x-beforeStudy.light.x>.4&&beforeStudy.light.y-afterStudy.light.y>.2,'Dragging the orb changes both light axes');
    assert.ok(afterStudy.draws>beforeStudy.draws);
    await page.locator('#study-light').focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(250);
    assert.ok((await state(page)).journey.study.target.x<afterStudy.target.x,'The light has keyboard control');
    await shot(page,'light');
    // The chapter anchor deliberately leaves a little breathing room below the
    // header. Scroll beyond the opening's final visible strip before testing pause.
    await page.mouse.wheel(0,160);await page.waitForTimeout(300);
    assert.ok(await page.locator('#journey-opening').evaluate(el=>el.getBoundingClientRect().bottom<0));
    const offscreenA=await state(page);await page.waitForTimeout(350);const offscreenB=await state(page);
    assert.equal(offscreenA.journey.opening.frames,offscreenB.journey.opening.frames,'Offscreen opening stops rendering');
    assert.equal(offscreenA.time,offscreenB.time,'Offscreen game stops rendering');
    await page.locator('#skip-to-game').click();await gameReady(page);
    assert.equal((await state(page)).journey.gameActive,true);assert.equal(await page.locator('#journey-opening').evaluate(el=>el.inert),true);
    const gameBounds=await page.locator('#stage-container').boundingBox();assert.ok(gameBounds.y>=72&&gameBounds.y+gameBounds.height<=1000);
    await shot(page,'game');
    await page.locator('#exit-game').click();await page.waitForFunction(()=>!window.borrowLightDiagnostics().playing);await page.waitForTimeout(950);
    assert.equal(await page.locator('#journey-opening').evaluate(el=>el.inert),false);
    assert.ok(await page.locator('#play-title').isVisible());assert.ok(await page.evaluate(()=>scrollY>1000));await shot(page,'play');
    await page.locator('#home-link').click();await page.waitForFunction(()=>scrollY<2);await page.waitForTimeout(250);
    const resumed=(await state(page)).journey.opening.frames;await page.waitForTimeout(250);assert.ok((await state(page)).journey.opening.frames>resumed);
    await page.locator('#story-collection').click();assert.equal(await page.locator('#collection-dialog').evaluate(el=>el.open),true);await page.locator('[data-close="collection-dialog"]').click();await shot(page,'outro');
    await page.close();

    const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const mp=await mobile.newPage();listen(mp);await mp.goto(url);await ready(mp);await shot(mp,'mobile-home');
    assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await touchDrag(mp,{x:100,y:680},{x:100,y:270});assert.ok(await mp.evaluate(()=>scrollY>200),'Reading page accepts real touch scrolling');
    await mp.locator('#home-link').tap();await mp.waitForFunction(()=>scrollY<2);
    await mp.locator('.scroll-invitation').tap();await mp.waitForFunction(()=>window.borrowLightDiagnostics().journey.opening.progress>.98);await mp.waitForTimeout(600);await shot(mp,'mobile-craft');
    await mp.locator('[data-craft="1"]').tap();assert.equal(await mp.locator('[data-craft="1"]').getAttribute('aria-expanded'),'true');
    await mp.locator('#study-light').scrollIntoViewIfNeeded();await mp.waitForTimeout(500);
    const mo=await mp.locator('#study-light').boundingBox(),mobileBefore=(await state(mp)).journey.study.target,scrollBefore=await mp.evaluate(()=>scrollY);
    await touchDrag(mp,{x:mo.x+mo.width/2,y:mo.y+mo.height/2},{x:mo.x+mo.width/2+100,y:mo.y+mo.height/2-65});
    const mobileAfter=(await state(mp)).journey.study.target;
    assert.ok(mobileAfter.x-mobileBefore.x>.2,'Real touch moves the orb');assert.ok(Math.abs(await mp.evaluate(()=>scrollY)-scrollBefore)<3,'Orb dragging does not scroll the page');await shot(mp,'mobile-light');
    await mp.locator('#skip-to-game').tap();await gameReady(mp);await shot(mp,'mobile-game');
    await mp.locator('#exit-game').tap();await mp.waitForFunction(()=>!window.borrowLightDiagnostics().playing);await mp.waitForTimeout(950);
    const previewScroll=await mp.evaluate(()=>scrollY),preview=await mp.locator('#stage').boundingBox();
    const swipeY=Math.min(760,preview.y+180);await touchDrag(mp,{x:310,y:swipeY},{x:310,y:swipeY-200});
    assert.ok(await mp.evaluate(()=>scrollY)>previewScroll+70,'The embedded preview does not trap touch scrolling');
    assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

    await mobile.close();
    const reduced=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),rp=await reduced.newPage();listen(rp);
    await rp.goto(url);await ready(rp);const reduceA=(await state(rp)).journey.opening.rotation;await rp.mouse.move(1200,700);await rp.waitForTimeout(400);const reduceB=(await state(rp)).journey.opening.rotation;
    assert.deepEqual(reduceA,reduceB,'Reduced motion disables idle and pointer sway');
    await rp.locator('.story-nav a[href="#light"]').click();await rp.locator('#study-light').focus();const keyBefore=(await state(rp)).journey.study.target.x;await rp.keyboard.press('ArrowRight');assert.ok((await state(rp)).journey.study.target.x>keyBefore);
    await rp.locator('#skip-to-game').click();await gameReady(rp);await rp.keyboard.press('Escape');assert.equal((await state(rp)).playing,false);
    assert.deepEqual(errors,[]);
    const report={date:new Date().toISOString(),browser:browser.version(),openingFrames,pointerTilt:{before:tiltA,after:tiltB},intermediateScroll:scrollMiddle,lightDrag:{before:beforeStudy.light,after:afterStudy.light},touchLight:{before:mobileBefore,after:mobileAfter},checks:['Story is the default entry','Pointer-responsive artwork','Native scroll scene transition','Craft detail selection','Mouse and keyboard light manipulation','Offscreen rendering pause','Header shortcut enters fullscreen game','Exit restores the reading site','Collection accessible from closing section','Real mobile touch scrolling','Real touch light manipulation','Game preview does not trap page scrolling','Reduced-motion reading and game navigation'],errors};
    fs.writeFileSync(path.join(root,'docs/journey-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
