import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from '../vendor/three.module.js';
import {MuseumEntrance,MUSEUM_ARRIVAL,MUSEUM_ENTRANCE_MS,HALL_ZOOM,museumEntranceFrame,museumEntrancePose,syncGalleryCamera} from '../src/museum-entrance.js';
import {photoFrame} from '../src/interior-framing.js';
import {walkingPose} from '../src/walking-path.js';
import {GALLERY_SHELL} from '../src/gallery-layout.js';

test('one entrance playback advances smoothly to the scroll path without user input',()=>{
  const clock=new MuseumEntrance(0),steps=[clock.advance(0)];
  for(let now=16;now<=MUSEUM_ENTRANCE_MS;now+=16)steps.push(clock.advance(now));
  for(let i=1;i<steps.length;i++){
    assert.ok(steps[i].progress>=steps[i-1].progress);
    assert.ok(steps[i].progress-steps[i-1].progress<.0007);
  }
  assert.equal(steps[0].progress,0);
  assert.equal(steps.at(-1).progress,MUSEUM_ARRIVAL);
  assert.equal(steps.at(-1).done,true);
  assert.ok(steps[1].progress<.000001);
  assert.ok(MUSEUM_ARRIVAL-steps.at(-2).progress<.000001);
});

test('hidden-tab gaps do not skip the doorway and reduced motion arrives immediately',()=>{
  const clock=new MuseumEntrance(0);
  const first=clock.advance(16);
  assert.equal(clock.advance(2016).progress,first.progress);
  assert.ok(clock.advance(2032).progress>first.progress);
  assert.deepEqual(clock.advance(2048,true),{fraction:1,progress:MUSEUM_ARRIVAL,done:true});
});

test('the first entrance frame preserves the closed door and opens before moving forward',()=>{
  for(const aspect of [.46,.744,1,1.14,1.15,16/9,2.4]){
    const imageAspect=aspect<1.15?2/3:1.5;
    const entrance=museumEntranceFrame(imageAspect,aspect,0);
    assert.deepEqual(entrance.frame,photoFrame(imageAspect,aspect,HALL_ZOOM));
    assert.equal(entrance.reveal,1);
    assert.equal(entrance.swing,0);
    const opening=museumEntranceFrame(imageAspect,aspect,.24*MUSEUM_ARRIVAL);
    assert.ok(opening.swing>.89);
    assert.equal(opening.frame.width,entrance.frame.width);
  }
});

test('after the fifth cabinet, the corridor continues smoothly toward the stage curtain',()=>{
  const last=walkingPose(.92),before=walkingPose(.92-1e-7),after=walkingPose(.92+1e-7),end=walkingPose(1);
  assert.ok(before.position.distanceTo(last.position)<1e-8);
  assert.ok(after.position.distanceTo(last.position)<1e-8);
  assert.ok(after.look.distanceTo(last.look)<1e-8);
  assert.ok(end.position.z<last.position.z);
  assert.equal(end.position.x,0);assert.equal(end.look.x,0);
  assert.ok(end.look.z<end.position.z);
});

test('the photographed door is fully offscreen before the live room takes over',()=>{
  for(const aspect of [.46,.744,1,1.14,1.15,16/9,2.4]){
    const imageAspect=aspect<1.15?2/3:1.5;
    const {frame,opening,reveal,alignment}=museumEntranceFrame(imageAspect,aspect,MUSEUM_ARRIVAL);
    assert.ok(frame.x>opening.clear[0]+.002);
    assert.ok(frame.x+frame.width<opening.clear[1]-.002);
    assert.ok(frame.y>Math.max(opening.outer[3],opening.leaf[1])+.002);
    assert.ok(frame.y+frame.height<opening.clear[2]-.002);
    assert.equal(reveal,1);assert.equal(alignment,0);
  }
});

test('arrival joins the normal camera path in both position and speed',()=>{
  const at=museumEntrancePose(MUSEUM_ARRIVAL),expected=walkingPose(MUSEUM_ARRIVAL);
  assert.ok(at.position.distanceTo(expected.position)<1e-12);
  assert.ok(at.look.distanceTo(expected.look)<1e-12);
  const h=1e-7,left=museumEntrancePose(MUSEUM_ARRIVAL-h),right=walkingPose(MUSEUM_ARRIVAL+h);
  for(const key of ['position','look']){
    const a=at[key].clone().sub(left[key]).divideScalar(h),b=right[key].clone().sub(at[key]).divideScalar(h);
    assert.ok(a.distanceTo(b)<.02);
  }
  let previous=10;
  for(let i=0;i<=240;i++){
    const pose=museumEntrancePose(MUSEUM_ARRIVAL*i/240);
    assert.ok(pose.position.z<=previous+1e-10);previous=pose.position.z;
  }
});

test('doorway alignment preserves the real lens aspect through arrival and quality resizes',()=>{
  for(const aspect of [.46,.744,1.14,1.15,16/9,2.4]){
    const camera=new PerspectiveCamera(aspect<1.15?62:50,aspect,.06,300);
    const imageAspect=aspect<1.15?2/3:1.5;
    for(let i=0;i<=120;i++){
      const p=MUSEUM_ARRIVAL*i/120,entrance=museumEntranceFrame(imageAspect,aspect,p);
      syncGalleryCamera(camera,museumEntrancePose(p),aspect,entrance);
      assert.equal(camera.aspect,aspect);
      assert.ok(Math.abs(camera.projectionMatrix.elements[5]/camera.projectionMatrix.elements[0]-aspect)<1e-10);
    }
    const before=camera.projectionMatrix.clone(),position=camera.position.clone(),quaternion=camera.quaternion.clone();
    camera.aspect=aspect;camera.updateProjectionMatrix();
    syncGalleryCamera(camera,walkingPose(MUSEUM_ARRIVAL),aspect,null);
    assert.deepEqual(camera.projectionMatrix.elements,before.elements);
    assert.ok(camera.position.distanceTo(position)<1e-10);
    assert.ok(camera.quaternion.angleTo(quaternion)<1e-7);
  }
});

test('the portrait camera stays inside the narrower corridor at every exhibit',()=>{
  for(const aspect of [.36,.46,.744,1,16/9]){
    const camera=new PerspectiveCamera(aspect<1.15?62:50,aspect,.06,300);
    for(let p=0;p<=1;p+=.005){
      syncGalleryCamera(camera,museumEntrancePose(p),aspect,null);
      assert.ok(camera.position.x<GALLERY_SHELL.right-.5);
      assert.ok(camera.position.x>GALLERY_SHELL.left+.5);
      assert.ok(camera.position.z>GALLERY_SHELL.back+3);
    }
  }
});
