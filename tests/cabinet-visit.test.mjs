import test from 'node:test';import assert from 'node:assert/strict';
import {CabinetVisit} from '../src/cabinet-visit.js';import {MUSEUM_STOPS} from '../src/route-state.js';
import {walkingPose} from '../src/walking-path.js';
test('large wheel jumps stop at every cabinet and cannot release reading',()=>{
 const gate=new CabinetVisit();let current=.1;
 for(const stop of MUSEUM_STOPS){assert.equal(gate.constrain(current,1),stop.at);assert.equal(gate.constrain(stop.at,0),stop.at);assert.equal(gate.constrain(stop.at,1),stop.at);assert.ok(gate.finish());current=stop.at+.04;}
 assert.equal(gate.constrain(.97,1),1);
});
test('reverse walks lock at the first encountered cabinet and reset releases route state',()=>{const gate=new CabinetVisit();assert.equal(gate.constrain(.96,.1),.92);gate.finish();assert.equal(gate.constrain(.87,.1),.74);gate.reset();assert.equal(gate.locked,null);});
test('five reading poses face glass perpendicularly with continuous bounded path',()=>{
 for(const stop of MUSEUM_STOPS){const a=walkingPose(stop.at),b=walkingPose(stop.at-1e-7),c=walkingPose(stop.at+1e-7);assert.equal(a.position.z,a.look.z);assert.equal(a.position.y,a.look.y);assert.ok(a.position.distanceTo(b.position)<.001);assert.ok(a.look.distanceTo(c.look)<.001);}
 for(let p=.1;p<=1;p+=.0005){const a=walkingPose(p),b=walkingPose(p+.00001);assert.ok(a.position.distanceTo(b.position)<.03);assert.ok(a.look.distanceTo(b.look)<.03);}
});
