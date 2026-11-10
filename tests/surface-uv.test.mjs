import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry} from '../vendor/three.module.js';
import {surfaceUV} from '../src/surface-uv.js';

function span(geometry,face){
  const {start,count}=geometry.groups[face],uv=geometry.attributes.uv;
  const points=Array.from({length:count},(_,offset)=>{
    const i=geometry.index?geometry.index.getX(start+offset):start+offset;
    return [uv.getX(i),uv.getY(i)];
  });
  return [0,1].map(axis=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis])));
}
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.00001,`${actual} vs ${expected}`);

test('long and short walls keep the same physical texture scale',()=>{
  for(const length of [6,86]){
    const dimensions=[.3,5.8,length];
    const geometry=surfaceUV(new BoxGeometry(...dimensions),dimensions,{meters:[2.5,2.5]});
    const [u,v]=span(geometry,0);
    near(u/length,1/2.5);near(v/5.8,1/2.5);
    geometry.dispose();
  }
});

test('rectangular paving keeps square texture units on indexed and unindexed boxes',()=>{
  const dimensions=[22,.18,86];
  for(const indexed of [true,false]){
    const original=new BoxGeometry(...dimensions),geometry=indexed?original:original.toNonIndexed();
    surfaceUV(geometry,dimensions,{meters:[1.8,1.8]});
    const [u,v]=span(geometry,2);
    near(u/22,v/86);near(u/22,1/1.8);
    geometry.dispose();if(!indexed)original.dispose();
  }
});

test('the vertical grain follows posts, horizontal beams and specified panel boards',()=>{
  for(const [dimensions,face,axis] of [[[.28,4.8,.32],0,undefined],[[21.5,.29,.32],4,undefined],[[.055,.68,1.42],0,1]]){
    const geometry=surfaceUV(new BoxGeometry(...dimensions),dimensions,{meters:[.65,2.4],grain:true,grainAxis:axis});
    const [,v]=span(geometry,face),length=axis===undefined?Math.max(...dimensions):dimensions[axis];
    near(v/length,1/2.4);geometry.dispose();
  }
});
