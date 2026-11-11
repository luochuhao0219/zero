import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createArticulatedPuppet,jointPose,stageMotion,MuseumPerformances} from '../src/museum-animation.js';
import {syncGalleryCamera} from '../src/museum-entrance.js';
import {walkingPose,cabinetZ} from '../src/walking-path.js';
import {MUSEUM_STOPS} from '../src/route-state.js';

test('elbows and knees are child hinges with invariant rigid segment lengths',()=>{
 const rig=createArticulatedPuppet(new THREE.MeshBasicMaterial());
 assert.equal(rig.joints.frontElbow.parent,rig.joints.frontShoulder);
 assert.equal(rig.joints.frontKnee.parent,rig.joints.frontHip);
 const geometry=rig.joints.frontElbow.children[0].geometry;
 const vertices=Array.from(geometry.attributes.position.array),uv=Array.from(geometry.attributes.uv.array);
 const length=rig.joints.frontElbow.position.length();
 const motion=new MuseumPerformances([[rig]]);
 motion.update(0,.2,false,true);
 for(let i=1;i<50;i++)motion.update(i*.1,.2,false,true);
 assert.notEqual(rig.joints.frontElbow.rotation.z,15*Math.PI/180);
 assert.notEqual(rig.joints.frontKnee.rotation.z,0);
 assert.equal(rig.joints.frontElbow.position.length(),length);
 assert.deepEqual(Array.from(geometry.attributes.position.array),vertices);
 assert.deepEqual(Array.from(geometry.attributes.uv.array),uv);
});
test('all eight joint rotations loop seamlessly and pause while reading',()=>{
 assert.deepEqual(jointPose(0),jointPose(8));
 const pictures=Array.from({length:5},()=>[createArticulatedPuppet(new THREE.MeshBasicMaterial())]);
 const motion=new MuseumPerformances(pictures);
 motion.update(0,.3,false,true);motion.update(.1,.3,false,true);
 const angles=pictures.map(([r])=>r.joints.frontElbow.rotation.z);
 motion.reading=true;motion.update(.2,.3,false,true);
 assert.deepEqual(pictures.map(([r])=>r.joints.frontElbow.rotation.z),angles);
 motion.reading=false;motion.setPaused(true);motion.update(.3,.3,false,true);
 assert.deepEqual(pictures.map(([r])=>r.joints.frontElbow.rotation.z),angles);
});
test('four later cabinets have distinct rigid gestures and repeatable stage paths',()=>{
 const gestures=[1,2,3,4].map(index=>[jointPose(1.4,index,0),jointPose(4.1,index,0),stageMotion(1.4,index,0)]);
 assert.equal(new Set(gestures.map(value=>JSON.stringify(value))).size,4);
 for(let index=1;index<5;index++){
  assert.deepEqual(jointPose(0,index,0),jointPose(8,index,0));
  assert.deepEqual(stageMotion(0,index,0),stageMotion(8,index,0));
  assert.deepEqual(stageMotion(3,index,0,true),{x:0,y:0,tilt:0});
  assert.notDeepEqual(jointPose(1.4,index,0),jointPose(4.1,index,0));
 }
 assert.deepEqual(stageMotion(3,0),{x:0,y:0,tilt:0});
});
test('low 45 degree slabs stay below artwork and their click targets stay onscreen',()=>{
 assert.ok(.33+(.72+.1)*Math.SQRT1_2/2<2.4-3.45/2);
 for(const [width,height] of [[1440,900],[578,662],[390,844]]){
  const camera=new THREE.PerspectiveCamera(50,width/height,.1,1000);
  MUSEUM_STOPS.forEach((stop,i)=>{
   syncGalleryCamera(camera,walkingPose(stop.at),width/height,null);camera.updateProjectionMatrix();
   const p=new THREE.Vector3(-3.85,.52,cabinetZ(i)).project(camera);
   const x=(p.x+1)*width/2,y=(1-p.y)*height/2;
   assert.ok(x>=24&&x<=width-24);assert.ok(y>=24&&y<=height-24);
  });
 }
});
