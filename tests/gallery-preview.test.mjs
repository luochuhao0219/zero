import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from '../vendor/three.module.js';
import {galleryPreviewFrame,cropGalleryCamera} from '../src/gallery-preview.js';
import {museumEntrancePose,syncGalleryCamera} from '../src/museum-entrance.js';

test('the door-sized render projects the same room pixels as the first live entrance frame',()=>{
  for(const aspect of [.46,.744,1,1.14,1.15,16/9,2.4]){
    const {rect,entrance}=galleryPreviewFrame(aspect<1.15?1030/1526:1672/941,aspect);
    const full=new PerspectiveCamera(aspect<1.15?62:50,aspect,.06,300);
    syncGalleryCamera(full,museumEntrancePose(0),aspect,entrance);
    const cropped=full.clone();cropGalleryCamera(cropped,rect);
    for(const position of [[-5,2.4,-8],[0,4.8,2],[-6,3,-22],[0,2,-53],[4.7,0,-8]]){
      const a=new Vector3(...position).project(full),b=new Vector3(...position).project(cropped);
      assert.ok(Math.abs((b.x+1)/2-((a.x+1)/2-rect.x)/rect.width)<1e-10);
      assert.ok(Math.abs((1-b.y)/2-((1-a.y)/2-rect.y)/rect.height)<1e-10);
      assert.ok(Math.abs(a.z-b.z)<1e-10);
    }
    assert.ok(cropped.position.distanceTo(full.position)<1e-12);
    assert.ok(cropped.quaternion.angleTo(full.quaternion)<1e-7);
  }
});

test('door bounds use the same photo-to-screen mapping as the live arch mask',()=>{
  for(const aspect of [.46,1,16/9,2.4]){
    const {bounds,rect,entrance}=galleryPreviewFrame(aspect<1.15?1030/1526:1672/941,aspect);
    const {frame,opening}=entrance;
    assert.equal(bounds[0],opening.outer[0]);assert.equal(bounds[1],opening.outer[2]);
    assert.ok(Math.abs(bounds[0]+bounds[2]-opening.outer[1])<1e-12);
    assert.ok(Math.abs(bounds[1]+bounds[3]-opening.clear[2])<1e-12);
    for(const [u,v] of [[0,0],[1,1],[.3,.7]]){
      assert.ok(Math.abs(frame.x+(rect.x+u*rect.width)*frame.width-(bounds[0]+u*bounds[2]))<1e-12);
      assert.ok(Math.abs(frame.y+(rect.y+v*rect.height)*frame.height-(bounds[1]+v*bounds[3]))<1e-12);
    }
  }
});

test('the first cabinet remains visible through the open door on wide and narrow screens',()=>{
  for(const aspect of [.46,.744,1,1.14,1.15,16/9,2.4]){
    const {entrance}=galleryPreviewFrame(aspect<1.15?1030/1526:1672/941,aspect);
    const camera=new PerspectiveCamera(aspect<1.15?62:50,aspect,.06,300);
    syncGalleryCamera(camera,museumEntrancePose(0),aspect,entrance);
    const point=new Vector3(-4.28,2.4,-8).project(camera),{frame,opening}=entrance;
    const x=frame.x+(point.x+1)/2*frame.width,y=frame.y+(1-point.y)/2*frame.height;
    assert.ok(x>opening.clear[0]&&x<opening.clear[1],`cabinet behind the door leaf at aspect ${aspect}`);
    assert.ok(y>opening.outer[3]&&y<opening.clear[2]);
  }
});
