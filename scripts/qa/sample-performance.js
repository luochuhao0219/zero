/** Run with agent-browser eval "$(cat scripts/qa/sample-performance.js)".
 * Observe real rAF intervals and renderer counters; never modifies application state.
 * Optional window.__qaScroll=true exercises the current route using native scrollTo.
 */
(async () => {
  const duration = 12000;
  const scroll = window.__qaScroll === true;
  const before = window.borrowLightDiagnostics();
  const samples = [];
  const start = performance.now();
  let previous = null;
  await new Promise(resolve => {
    function frame(now) {
      if (previous !== null) samples.push(now - previous);
      previous = now;
      const elapsed = now - start;
      if (scroll) {
        const track = document.getElementById('journey-opening');
        const p = .5 - .45 * Math.cos(elapsed / duration * Math.PI * 2);
        window.scrollTo({top: p * (track.offsetHeight - innerHeight), behavior: 'instant'});
      }
      if (elapsed < duration) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
  const after = window.borrowLightDiagnostics();
  const sorted = [...samples].sort((a, b) => a - b);
  const canvas = document.getElementById('opening-canvas');
  const gl = canvas.getContext('webgl2');
  const extension = gl?.getExtension('WEBGL_debug_renderer_info');
  return {
    date: new Date().toISOString(), wallDurationMs: +(performance.now()-start).toFixed(1), mode: scroll ? 'native-scroll-forward-and-back' : 'idle',
    route: before.journey.route, playing: before.playing,
    durationMs: +samples.reduce((a,b) => a+b,0).toFixed(1), frames: samples.length,
    avgFPS: +(samples.length * 1000 / samples.reduce((a,b)=>a+b,0)).toFixed(2),
    medianMs: +sorted[Math.floor(sorted.length * .5)].toFixed(2),
    p95Ms: +sorted[Math.floor(sorted.length * .95)].toFixed(2),
    over25ms: samples.filter(t => t > 25).length,
    maxMs: +Math.max(...samples).toFixed(2),
    draws: {passage: after.journey.opening.frames-before.journey.opening.frames, stage: after.frames-before.frames},
    renderedFPS: {passage: +((after.journey.opening.frames-before.journey.opening.frames)*1000/(performance.now()-start)).toFixed(2), stage: +((after.frames-before.frames)*1000/(performance.now()-start)).toFixed(2)},
    steadyQuality: before.qualityTier===after.qualityTier&&before.journey.opening.qualityTier===after.journey.opening.qualityTier,
    memory: {stage:after.memory,passage:after.journey.opening.memory},post:after.post,compositeMode:after.journey.opening.compositeMode,
    viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
    userAgent: navigator.userAgent,
    renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER),
    qualityAtStart: {passageTier: before.journey.opening.qualityTier, stageTier: before.qualityTier},
    quality: {passageTier: after.journey.opening.qualityTier, stageTier: after.qualityTier, passageDPR: after.journey.opening.pixelRatio, stageDPR: after.pixelRatio,
      shadows: after.shadows, reflection: after.reflection, stageDrawCalls: after.drawCalls, stageTriangles: after.triangles},
    assetErrors: after.journey.opening.assetErrors,
  };
})()
