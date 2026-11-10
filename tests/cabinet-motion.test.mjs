import test from 'node:test';
import assert from 'node:assert/strict';
import {CabinetClock,CABINET_LOOP_SECONDS,cabinetMotionAmount,cabinetPose} from '../src/cabinet-motion.js';
import {MUSEUM_STOPS} from '../src/route-state.js';

test('the greeting loops without a pose or speed discontinuity and rests between gestures',()=>{
  const start=cabinetPose(0);
  assert.deepEqual(cabinetPose(CABINET_LOOP_SECONDS),start);
  assert.deepEqual(cabinetPose(CABINET_LOOP_SECONDS-.001),start);
  assert.deepEqual(cabinetPose(.001),start);
  assert.ok(cabinetPose(3).front>85);assert.ok(cabinetPose(3).bow<-.05);
  for(let t=0;t<8;t+=.05){
    const pose=cabinetPose(t),next=cabinetPose(t+8);
    for(const key of Object.keys(pose))assert.ok(Math.abs(pose[key]-next[key])<1e-10);
    assert.ok(pose.front>=35&&pose.front<=93);assert.ok(pose.back>=10&&pose.back<=44);
    assert.ok(pose.bow>=-.065&&pose.bow<=0);
    assert.deepEqual(cabinetPose(t,0),start);
  }
});

test('only the fourth cabinet animates, with a smooth approach and reduced-motion fallback',()=>{
  for(const stop of MUSEUM_STOPS){
    assert.equal(cabinetMotionAmount(stop.at),stop.id==='people'?1:0);
    assert.equal(cabinetMotionAmount(stop.at,false),0);
    assert.equal(cabinetMotionAmount(stop.at,true,true),0);
  }
  assert.ok(cabinetMotionAmount(.70)>0&&cabinetMotionAmount(.70)<1);
  assert.ok(Math.abs(cabinetMotionAmount(.70)-cabinetMotionAmount(.78))<1e-12);
});

test('paused, distant and backgrounded cabinets resume without time jumps',()=>{
  const clock=new CabinetClock();clock.tick(0,true);clock.tick(.05,true);
  assert.equal(clock.seconds,.05);
  clock.tick(.1,false);clock.tick(12,false);assert.equal(clock.seconds,.05);
  clock.tick(12.05,true);assert.equal(clock.seconds,.05);
  clock.tick(12.1,true);assert.ok(Math.abs(clock.seconds-.10)<1e-10);
  clock.tick(40,true);assert.ok(Math.abs(clock.seconds-.10)<1e-10);
  clock.tick(40.05,true);assert.ok(Math.abs(clock.seconds-.15)<1e-10);
});

test('gesture timing is independent of refresh rate',()=>{
  const clocks=[30,60,120].map(fps=>{
    const clock=new CabinetClock();
    for(let frame=0;frame<=fps*3;frame++)clock.tick(frame/fps,true);
    return cabinetPose(clock.seconds);
  });
  for(const pose of clocks)for(const key of Object.keys(pose))assert.ok(Math.abs(pose[key]-clocks[0][key])<1e-10);
});
