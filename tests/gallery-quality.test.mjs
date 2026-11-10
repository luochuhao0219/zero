import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryRenderSettings} from '../src/gallery-quality.js';

test('the gallery retains readable pixel density and edge sampling at every quality tier',()=>{
  for(const density of [1,1.5,2])for(let tier=0;tier<=4;tier++){
    const settings=galleryRenderSettings(1280,720,density,tier,4);
    assert.ok(settings.pixelRatio>=Math.min(density,density>1?1.25:1));
    assert.ok(settings.pixelRatio<=density);
    assert.ok(settings.samples>=2);
  }
  assert.equal(galleryRenderSettings(563,757,2,0).pixelRatio,2);
  assert.ok(galleryRenderSettings(563,757,2,4).pixelRatio>1.4);
});

test('large displays and limited hardware stay within the existing pixel and sample budgets',()=>{
  for(const [width,height] of [[563,757],[1966,1164],[3840,2160],[7680,4320]]){
    let previous=Infinity;
    for(let tier=0;tier<=4;tier++){
      const settings=galleryRenderSettings(width,height,2,tier,2);
      assert.ok(width*height*settings.pixelRatio**2<=6400000.001);
      assert.ok(settings.pixelRatio<=previous);previous=settings.pixelRatio;
      assert.ok(settings.samples<=2);
    }
  }
  assert.equal(galleryRenderSettings(1280,720,1,4,0).samples,0);
  assert.equal(galleryRenderSettings(1280,720,.8,4).pixelRatio,.8);
});
