import test from 'node:test';import assert from 'node:assert/strict';
import {CabinetVisit} from '../src/cabinet-visit.js';import {MUSEUM_STOPS} from '../src/route-state.js';
import {walkingPose} from '../src/walking-path.js';
test('arrivals snap front-on and the next scroll continues without a finish action',()=>{
 const visit=new CabinetVisit();let current=.1;
 for(const stop of MUSEUM_STOPS){
  assert.equal(visit.constrain(current,1),stop.at);
  assert.equal(visit.aligned.id,stop.id);
  assert.equal(visit.constrain(stop.at,stop.at),stop.at);
  const departure=stop.at+.02;
  assert.equal(visit.constrain(stop.at,departure),departure);
  assert.equal(visit.aligned,null);
  current=stop.at+.04;
 }
 assert.equal(visit.constrain(.97,1),1);
});
test('scrolling during arrival waits only for alignment and then resumes automatically',()=>{
 const visit=new CabinetVisit();assert.equal(visit.constrain(.15,.25),.20);
 assert.equal(visit.constrain(.18,.24),.20);
 assert.equal(visit.constrain(.19,.23),.20);
 assert.equal(visit.constrain(.20,.20),.23);
 assert.equal(visit.aligned,null);assert.equal(visit.pendingTarget,null);
});
test('reverse scrolling leaves the current cabinet and can revisit it after walking away',()=>{
 const visit=new CabinetVisit();assert.equal(visit.constrain(.96,.1),.92);
 assert.equal(visit.constrain(.92,.90),.90);
 assert.equal(visit.constrain(.88,.87),.87);
 assert.equal(visit.constrain(.87,.96),.92);
 assert.equal(visit.constrain(.92,.1),.74);
});
test('small departures and immediate reversals do not get stuck on the same cabinet',()=>{
 const visit=new CabinetVisit();assert.equal(visit.constrain(.18,.21),.20);
 assert.equal(visit.constrain(.20,.205),.205);
 assert.equal(visit.constrain(.205,.195),.195);
 assert.equal(visit.constrain(.195,.19),.19);
});
test('numbered shortcuts can pass intermediate cabinets and still align at the destination',()=>{
 const visit=new CabinetVisit();visit.constrain(.1,.3);visit.seek(.92);
 for(const p of [.25,.38,.56,.74,.90])assert.equal(visit.constrain(p,p+.01),p+.01);
 assert.equal(visit.constrain(.92,.92),.92);assert.equal(visit.aligned.id,'legacy');
 assert.equal(visit.constrain(.92,.95),.95);
 visit.seek(.1);assert.equal(visit.constrain(.70,.1),.1);
 assert.equal(visit.constrain(.1,.1),.1);assert.equal(visit.aligned,null);
});
test('fresh input interrupts a shortcut so subsequent arrivals still snap',()=>{
 const visit=new CabinetVisit();visit.seek(.92);visit.interrupt();
 assert.equal(visit.constrain(.30,.50),.38);
 visit.reset();assert.equal(visit.aligned,null);assert.equal(visit.destination,null);
 assert.equal(visit.constrain(.4,.1),.38);
});
test('five reading poses face glass perpendicularly with continuous bounded path',()=>{
 for(const stop of MUSEUM_STOPS){const a=walkingPose(stop.at),b=walkingPose(stop.at-1e-7),c=walkingPose(stop.at+1e-7);assert.equal(a.position.z,a.look.z);assert.equal(a.position.y,a.look.y);assert.ok(a.position.distanceTo(b.position)<.001);assert.ok(a.look.distanceTo(c.look)<.001);}
 for(let p=.1;p<=1;p+=.0005){const a=walkingPose(p),b=walkingPose(p+.00001);assert.ok(a.position.distanceTo(b.position)<.03);assert.ok(a.look.distanceTo(b.look)<.03);}
});
