import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {StageStudio} from '../src/stage-studio.js';
import {StudioControls} from '../src/studio-controls.js';
import {defaultDraft,sanitizeDraft} from '../src/explore-data.js';
import {actorInWorld,actorPaperCenter,canFreePlay,movePaperItem,snapPose} from '../src/studio-space.js';
import {getJoints,jointPoint} from '../src/puppet-motion.js';
import {PIXEL_SCALE} from '../src/articulated-rig.js';
import {projectPoint} from '../src/game.js';
function fixture(t){
 const old=globalThis.document;globalThis.document={querySelector:()=>null};t.after(()=>{if(old===undefined)delete globalThis.document;else globalThis.document=old;});
 const captures=new Set(),calls=[];const canvas={style:{},focus(){},setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)};
 const studio={active:true,playback:null,draft:defaultDraft(),snapCandidate:null,stage:{canvas},frame(){return this.draft.frames[this.draft.frame];},select(kind,index,detail={}){this.selection={kind,index,...detail};if(index!==undefined)this.draft.selected=index;},beginChange(){this.previous=sanitizeDraft(this.draft);},cancelChange(){this.draft=this.previous;calls.push('cancel');},finishChange(){calls.push('finish');},changed(persist=true){calls.push(persist);}};
 const c=Object.create(StudioControls.prototype);Object.assign(c,{studio,stage:studio.stage,canvas,pointers:new Map(),pick:()=>({kind:'actor',index:0}),hit:(x,y)=>new THREE.Vector3(x/100,y/100,.08)});const event={button:0,pointerType:'mouse',pointerId:1,clientX:100,clientY:100,preventDefault(){}};return {c,studio,calls,event,captures};
}
test('direct stage manipulation accepts only the drag owner and cancelling restores the pose',t=>{
 const {c,studio,event,calls,captures}=fixture(t);c.down(event);c.down({...event,pointerId:2});c.move({...event,pointerId:2,clientX:1000});assert.equal(studio.draft.actors[0].x,36);
 c.move({...event,clientX:202.5});assert.equal(studio.draft.actors[0].x,46);c.cancelEvent({...event,pointerId:2});assert.ok(c.drag);c.cancelEvent(event);assert.equal(studio.draft.actors[0].x,36);assert.equal(captures.size,0);assert.ok(calls.includes('cancel'));
});
test('two-finger pinch resizes the selected actor and releases every capture',t=>{
 const {c,studio,event,captures}=fixture(t);c.down({...event,pointerType:'touch'});c.down({...event,pointerType:'touch',pointerId:2,clientX:200});c.move({...event,pointerType:'touch',pointerId:2,clientX:400});assert.equal(studio.draft.actors[0].size,1.35);c.up({...event,pointerId:2});assert.equal(c.drag,null);assert.equal(captures.size,0);assert.equal(studio.stage.inputActive,false);
});
test('paper-coordinate edits map to the same center after real light projection',()=>{
 const d=defaultDraft(),actor=d.actors[0],light={x:-.8,y:4.6},world=actorInWorld(actor,light),projected=projectPoint(world.x,world.y,world.z,light.x,light.y),paper=actorPaperCenter(actor);assert.ok(Math.abs(projected.x-paper.x)<1e-10);assert.ok(Math.abs(projected.y-paper.y)<1e-10);assert.equal(actorInWorld({...actor,present:false}),undefined);
});
test('the free stage unlocks only after all lessons, with bounded positions and gentle pose snaps',()=>{
 assert.equal(canFreePlay([2]),false);assert.equal(canFreePlay([2,0]),false);assert.equal(canFreePlay([2,0,1]),true);assert.deepEqual(movePaperItem({x:20,y:60},100,-100),{x:84,y:45});assert.equal(snapPose(46),45);assert.equal(snapPose(57),57);
});
test('new actor presence and movable scenery survive old-key draft round trips',()=>{
 const d=defaultDraft();d.actors[0].present=false;d.frames[0].scenery={x:77,y:50};const restored=sanitizeDraft(JSON.parse(JSON.stringify(d)));assert.equal(restored.actors[0].present,false);assert.deepEqual(restored.frames[0].scenery,{x:77,y:50});
});
test('dropping a prop near a hand attaches it, while cancelling leaves its original holder',t=>{
 const {c,studio,event}=fixture(t);studio.frame().prop={kind:'lantern',x:50,y:65,holder:-1};c.stage.studioWorld={props:{lantern:{position:new THREE.Vector3()}}};studio.paperPosition=()=>({x:50,y:65});c.pick=()=>({kind:'prop'});c.nearestHand=()=>1;c.down(event);c.move({...event,clientX:150});c.up(event);assert.equal(studio.frame().prop.holder,1);
 c.down(event);c.move({...event,clientX:300});c.cancel(true);assert.equal(studio.frame().prop.holder,1);
});

test('the live performance ends on foreground wall time, releases sound and restores editing',t=>{
 const original=globalThis.document,playButton={setAttribute(){}};globalThis.document={getElementById:()=>playButton};t.after(()=>{if(original===undefined)delete globalThis.document;else globalThis.document=original;});
 const inputs=[{},{}],calls=[],draft=defaultDraft(),before=JSON.stringify(draft),studio=Object.create(StageStudio.prototype);
 Object.assign(studio,{draft,active:true,stage:{time:0,reduced:false},root:{classList:{add(){},remove(){}},querySelectorAll:()=>inputs},controls:{cancel(){}},sound:{start(){calls.push('start');},stop(){calls.push('stop');}},world:{set(){calls.push('frame');}},hint(){},closeMotionMenu(){},renderMotions(){}});
 studio.startPerformance();assert.ok(inputs.every(node=>node.inert));studio.playback.start-=12010;studio.tick(0);assert.equal(studio.playback,null);assert.ok(inputs.every(node=>node.inert===false));assert.ok(calls.includes('stop'));assert.equal(JSON.stringify(draft),before);
});
test('wide scenery can be grabbed away from its center without stealing actor handles',()=>{
 const c=Object.create(StudioControls.prototype),scene={kind:'scenery',point:{x:0,y:0,z:.02},screen:{x:0,y:0},width:8,height:1};c.targets=()=>[scene];c.screen=point=>({x:point.x*100,y:point.y*100});assert.equal(c.pick(300,20),scene);assert.equal(c.pick(500,20),null);
 const hand={kind:'arm',screen:{x:300,y:20}};c.targets=()=>[hand,scene];assert.equal(c.pick(300,20),hand);
});

test('dragging a hand drives shoulder and elbow IK and cancellation restores the complete joint pose',t=>{
 const {c,studio,event}=fixture(t),rig=new THREE.Group();rig.userData.jointNodes={};c.stage.projected=[{actors:[rig]}];const actor=studio.draft.actors[0],start=jointPoint(actor,'handFront',{x:0,y:14}),before=getJoints(actor);c.hit=(x,y)=>new THREE.Vector3((x-240)*PIXEL_SCALE,(410-y)*PIXEL_SCALE,.08);c.pick=()=>({kind:'hand',index:0,side:'Front',part:'handFront'});const pointer={...event,clientX:start.x,clientY:start.y};c.down(pointer);c.move({...pointer,clientX:start.x+6,clientY:start.y-30});const after=getJoints(studio.draft.actors[0]);assert.notEqual(after.shoulderFront,before.shoulderFront);assert.notEqual(after.elbowFront,before.elbowFront);const hand=jointPoint(studio.draft.actors[0],'handFront',{x:0,y:14});assert.ok(Math.hypot(hand.x-start.x-6,hand.y-start.y+30)<2);c.cancel(true);assert.deepEqual(getJoints(studio.draft.actors[0]),before);
});
test('joint keyboard edits target the current key pose without changing the act starting pose',t=>{
 const {c,studio,event}=fixture(t),base=studio.draft.actors[0],keys=studio.draft.actors.map(a=>({...a}));studio.actors=()=>keys;studio.selection={kind:'joint',index:0,part:'torso',joint:'waist'};c.key({...event,key:'ArrowDown'});assert.equal(getJoints(keys[0]).waist,3);assert.equal(getJoints(base).waist,0);studio.selection={kind:'joint',index:0,part:'shinFront',joint:'kneeFront'};c.key({...event,key:'e'});assert.equal(getJoints(keys[0]).kneeFront,3);assert.equal(getJoints(base).kneeFront,0);
});
