import test from 'node:test';
import assert from 'node:assert/strict';
import {StageEntrance,STAGE_ENTRANCE_MS,STAGE_ARRIVAL,stageEntrancePose,stageTravelPhase,theaterPhotoFrame} from '../src/stage-entrance.js';
import {PerspectiveCamera,Vector3} from '../vendor/three.module.js';
import {STAGE_PORTAL,syncCurtainCamera,stagePortalRect,curtainPhotoFrame} from '../src/museum-stage-portal.js';

test('one click plays every original scene, including the paper crossing and lantern market',()=>{
  const clock=new StageEntrance(0),durations=new Map();let previous=0;
  for(let now=0;now<=STAGE_ENTRANCE_MS;now+=16){
    const step=clock.advance(now);assert.ok(step.progress>=previous);assert.ok(step.progress-previous<.004);
    const phase=stageTravelPhase(step.progress);durations.set(phase,(durations.get(phase)||0)+16);previous=step.progress;
  }
  assert.deepEqual([...durations.keys()],['curtain','screen','crossing','market','arrival','backstage']);
  for(const phase of ['screen','crossing','market'])assert.ok(durations.get(phase)>1000,phase+' must remain a visible scene');
  assert.deepEqual(clock.advance(STAGE_ENTRANCE_MS+16),{fraction:1,progress:STAGE_ARRIVAL,done:true});
});

test('loading and tab suspension cannot skip the paper crossing; reduced motion can arrive immediately',()=>{
  const clock=new StageEntrance(0);
  assert.equal(clock.advance(180,false,false).fraction,0);
  const first=clock.advance(196).fraction;assert.ok(first>0);
  assert.equal(clock.advance(5196).fraction,first);
  assert.equal(clock.advance(5212,true,false).done,false);
  assert.equal(clock.advance(5228,true,true).done,true);
});

test('the curtain starts on the actual gallery camera and clears before the original screen approach',()=>{
  for(const aspect of [.36,.46,.744,1.14,1.15,16/9,2.4]){
    const source=new PerspectiveCamera(aspect<1.15?85:50,aspect,.06,300);
    source.position.set(0,2.4,-46.6);source.lookAt(new Vector3(0,2.4,-54));
    if(aspect<1.15)source.setViewOffset(aspect,1,0,.16,aspect,1);
    source.updateMatrixWorld();
    const camera=source.clone();syncCurtainCamera(camera,source,aspect,0);
    assert.deepEqual(camera.position.toArray(),source.position.toArray());
    assert.deepEqual(camera.quaternion.toArray(),source.quaternion.toArray());
    assert.deepEqual(camera.projectionMatrix.elements,source.projectionMatrix.elements);
    for(let i=0;i<=120;i++){
      const p=STAGE_PORTAL.clearAt*i/120;syncCurtainCamera(camera,source,aspect,p);
      assert.ok(Object.values(curtainPhotoFrame(1672/941,aspect,camera,p)).every(Number.isFinite));
    }
    const rect=stagePortalRect(camera);
    assert.ok(rect.x<0&&rect.y<0&&rect.x+rect.width>1&&rect.y+rect.height>1);
    const final=curtainPhotoFrame(1672/941,aspect,camera,STAGE_PORTAL.clearAt);
    const expected=theaterPhotoFrame(1672/941,aspect,STAGE_PORTAL.clearAt);
    for(const k of Object.keys(expected))assert.ok(Math.abs(final[k]-expected[k])<1e-10);
  }
});

test('the final orbit joins the playable camera smoothly for both front and backstage levels',()=>{
  const endP=.21+STAGE_ARRIVAL*.79;
  for(const fitted of [21.6,23,38])for(const angle of [.2,Math.PI-.56]){
    const pose=p=>stageEntrancePose(p,fitted,angle),end=pose(endP);
    const expected=[Math.sin(angle)*fitted,6.15,Math.cos(angle)*fitted-.7];
    end.position.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<1e-10));
    assert.deepEqual(end.look,[0,3.5,-.65]);assert.equal(end.angle,angle);
    const before=pose(endP-1e-7);end.position.forEach((n,i)=>assert.ok(Math.abs(n-before.position[i])/1e-7<.01));
    for(let i=0;i<=500;i++){const p=pose(.59+(endP-.59)*i/500);assert.ok([...p.position,...p.look,p.angle].every(Number.isFinite));}
  }
});
