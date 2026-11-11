import test from 'node:test';
import assert from 'node:assert/strict';
import {FoyerEntrance,FOYER_OPENING,foyerFrame,foyerPhase,publicCampusProgress,fitPhotoToOpening} from '../src/foyer-entrance.js';
import {photoPoint} from '../src/interior-framing.js';

test('the entrance traverses a single corridor before reaching the two-door hall',()=>{
  for(const from of [0,.15,.29]){
    const walk=new FoyerEntrance(0,from),phases=[],durations=new Map();let previous=from;
    for(let now=0;now<walk.duration+16;now+=16){
      const step=walk.advance(now),phase=foyerPhase(step.progress);
      if(phases.at(-1)!==phase)phases.push(phase);
      durations.set(phase,(durations.get(phase)||0)+16);
      assert.ok(step.progress>=previous);assert.ok(step.progress-previous<.004);previous=step.progress;
    }
    assert.ok(phases.indexOf('corridor')<phases.indexOf('hall'));
    assert.ok(durations.get('corridor')>=1200,'the connecting corridor must remain visible');
    assert.equal(walk.advance(walk.duration+32).progress,1);
    assert.equal(walk.advance(walk.duration+48).done,true);
  }
});

test('tab suspension preserves the walk; reduced motion goes straight to the hall',()=>{
  const walk=new FoyerEntrance(0,.2),before=walk.advance(16);
  assert.deepEqual(walk.advance(5016),before);
  assert.equal(walk.advance(5032,true).progress,1);
});

test('the corridor arch has fully cleared before switching to the hall plate',()=>{
  for(const aspect of [.36,.5,.744,1.14,1.15,16/9,2.4]){
    const {frame,alignment}=foyerFrame(1.5,aspect,.90);
    assert.equal(alignment,1);
    assert.ok(frame.x>FOYER_OPENING.clear[0]);
    assert.ok(frame.x+frame.width<FOYER_OPENING.clear[1]);
    assert.ok(frame.y>FOYER_OPENING.outer[3]);
    assert.ok(frame.y+frame.height<FOYER_OPENING.clear[2]);
    assert.deepEqual(foyerFrame(1.5,aspect,.91).frame,frame);
  }
});

test('fitting a photograph places its center in the visible doorway',()=>{
  for(const aspect of [.5,16/9]){
    const rect={x:.42,y:.32,width:.16,height:.45},frame=fitPhotoToOpening(1.5,aspect,rect);
    const center=photoPoint([.5,.5],frame);
    assert.ok(Math.abs(center[0]-(rect.x+rect.width/2))<1e-12);
    assert.ok(Math.abs(center[1]-(rect.y+rect.height/2))<1e-12);
  }
  assert.equal(publicCampusProgress(0),0);
  assert.equal(publicCampusProgress(.43),.23);
  assert.equal(publicCampusProgress(1),.23);
});
