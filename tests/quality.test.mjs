import test from 'node:test';
import assert from 'node:assert/strict';
import {AdaptiveQuality,qualityPixelRatio} from '../src/adaptive-quality.js';
test('quality degrades one tier at a time on sustained slow frames, never on a pause',()=>{
  const q=new AdaptiveQuality();let now=0;q.observe(now);
  for(let i=0;i<150;i++)q.observe(now+=16.67);
  assert.equal(q.tier,0);
  for(let i=0;i<150;i++)q.observe(now+=33.33);
  assert.equal(q.tier,1);
  q.resetClock();q.observe(now+=10000);assert.equal(q.samples.length,0);
  for(let i=0;i<600;i++)q.observe(now+=50);
  assert.equal(q.tier,4);
  for(let i=0;i<150;i++)q.observe(now+=50);
  assert.equal(q.tier,4);
});
test('pixel-ratio tiers never increase an already low-resolution device',()=>{
  assert.equal(qualityPixelRatio(1,0),1);
  assert.equal(qualityPixelRatio(2,2),1);
  assert.equal(qualityPixelRatio(.6,4),.6);
  assert.equal(qualityPixelRatio(2,4),.7);
});

test('sustained very slow foreground frames trigger degradation instead of being discarded as pauses',()=>{
  const q=new AdaptiveQuality();let now=0;q.observe(now);
  for(let i=0;i<5;i++)q.observe(now+=400);
  assert.equal(q.tier,1);
  q.resetClock();q.observe(now+=10000);assert.equal(q.samples.length,0);
});

test('multi-second foreground stalls reduce quality within a bounded wall-clock window',()=>{
  const q=new AdaptiveQuality();let now=0;q.observe(now);
  for(let i=0;i<4;i++)q.observe(now+=1000);
  assert.equal(q.tier,1);
  q.resetClock();q.observe(now+=30000);
  assert.equal(q.samples.length,0);
  for(let i=0;i<4;i++)q.observe(now+=1000);
  assert.equal(q.tier,2);
});

test('isolated stalls and interrupted slow samples do not degrade quality',()=>{
  const q=new AdaptiveQuality();let now=0;q.observe(now);
  q.observe(now+=1200);
  for(let i=0;i<149;i++)q.observe(now+=16.67);
  assert.equal(q.tier,0);
  for(let i=0;i<3;i++)q.observe(now+=1000);
  q.resetClock();q.observe(now+=10000);
  assert.equal(q.samples.length,0);
  q.observe(now+=1000);
  assert.equal(q.tier,0);
});
