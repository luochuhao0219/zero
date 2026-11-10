import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultDraft,sanitizeDraft,selectFrame,readCompositions,COMPOSITION_KEY} from '../src/explore-data.js';
import {STORY_STARTERS,starterDraft,samplePlay,PLAY_DURATION,copySavedDraft} from '../src/studio-story.js';
import {propPosition} from '../src/studio-effects.js';
import {FreePlayStudio} from '../src/compose-studio.js';
const image='data:image/webp;base64,AAAA';

test('old drafts migrate into three independent scenes without losing poses',()=>{
  const legacy={title:'旧草稿',scene:'garden',actors:[{x:29,pose:100},{x:72,flip:true}]},d=sanitizeDraft(legacy);
  assert.equal(d.title,'旧草稿');assert.equal(d.frames.length,3);assert.equal(d.actors,d.frames[0].actors);
  selectFrame(d,1);d.actors[0].x=50;assert.equal(d.frames[0].actors[0].x,29);assert.equal(d.frames[2].actors[0].pose,100);
  const restored=sanitizeDraft(JSON.parse(JSON.stringify(d)));assert.equal(restored.frame,1);assert.equal(restored.actors,restored.frames[1].actors);assert.equal(restored.actors[0].x,50);
});
test('every starter contains a complete editable story and makes independent drafts',()=>{
  for(const s of STORY_STARTERS){const d=starterDraft(s.id);assert.equal(d.title,s.title);assert.equal(d.frames.length,3);assert.ok(d.frames.every(f=>f.line&&f.prop.kind!=='none'));assert.notEqual(d.frames[0].actors[0].x,d.frames[2].actors[0].x);d.frames[0].actors[0].x=99;assert.notEqual(starterDraft(s.id).actors[0].x,99);}
  assert.equal(starterDraft('blank').frames[0].line,'');
});
test('malformed story fields are bounded and unsupported resources are ignored',()=>{
  const d=sanitizeDraft({frame:999,count:1,light:'unsafe',sound:'remote.mp3',synopsis:'字'.repeat(200),frames:[{line:'台'.repeat(100),prop:{kind:'script',x:Infinity,y:-10,holder:1}},{prop:{kind:'umbrella',x:999,y:999,holder:0}}]});
  assert.equal(d.frame,2);assert.equal(d.light,'warm');assert.equal(d.sound,'none');assert.equal(d.synopsis.length,60);
  assert.deepEqual(d.frames[0].prop,{kind:'none',x:50,y:25,holder:-1});assert.equal(d.frames[0].line.length,36);
  assert.deepEqual(d.frames[1].prop,{kind:'umbrella',x:84,y:85,holder:0});
});
test('playback interpolates the route and reaches the final scene without mutating edits',()=>{
  const d=starterDraft('farewell'),before=JSON.stringify(d);
  const start=samplePlay(d,0),middle=samplePlay(d,2250),end=samplePlay(d,PLAY_DURATION);
  assert.equal(start.index,0);assert.equal(start.actors[0].x,32);assert.ok(middle.actors[0].x>32&&middle.actors[0].x<43);
  assert.equal(end.index,2);assert.equal(end.progress,1);assert.equal(end.actors[0].x,24);assert.equal(end.line,d.frames[2].line);
  assert.equal(JSON.stringify(d),before);
  assert.equal(samplePlay(d,2250,true).actors[0].x,32);assert.equal(samplePlay(d,4500,true).actors[0].x,43);
});
test('each transition reaches its next key pose smoothly before the next line',()=>{
  const d=starterDraft('home');for(const boundary of [4000,8000]){const a=samplePlay(d,boundary-.01),b=samplePlay(d,boundary);assert.ok(Math.abs(a.actors[0].x-b.actors[0].x)<.001);}
});
test('held props follow the chosen actor while free props keep their own coordinates',()=>{
  const d=starterDraft('lantern'),f=d.frames[0],before=propPosition(f,2);f.actors[0].x+=10;assert.ok(Math.abs(propPosition(f,2).x-before.x-10)<1e-10);
  f.prop.holder=-1;assert.deepEqual(propPosition(f,2),{x:50,y:60,size:1});
});
test('gallery round-trips complete stories while legacy tickets stay image-only',()=>{
  const draft=starterDraft('garden'),works=[{id:'saved-1',title:draft.title,image,date:'today',draft},{title:'旧戏票',image,date:'yesterday'}];
  const restored=readCompositions({getItem:key=>key===COMPOSITION_KEY?JSON.stringify(works):null});
  assert.deepEqual(restored[0].draft,sanitizeDraft(draft));assert.equal(restored[0].id,'saved-1');assert.equal(restored[1].draft,undefined);
  const edited=copySavedDraft(restored[0]),duplicate=copySavedDraft(restored[0],true);edited.actors[0].x=79;
  assert.equal(restored[0].draft.actors[0].x,23);assert.equal(duplicate.title,'樱下相逢·副本');assert.equal(copySavedDraft(restored[1]),null);
});
function saveFixture(t,throws=false){
  const original=globalThis.document,elements=new Map(['compose-status','compose-save'].map(key=>[key,{}]));
  globalThis.document={getElementById:id=>elements.get(id)};t.after(()=>{if(original===undefined)delete globalThis.document;else globalThis.document=original;});
  const first={title:'已收藏',image,draft:defaultDraft()},writes=[];const studio=Object.create(FreePlayStudio.prototype);
  Object.assign(studio,{draft:starterDraft('home'),works:[first],editingWork:first,poster:()=>image,syncComposer(){},renderWorks(){},toast(){},storage:{setItem:(key,value)=>{if(throws)throw new Error('full');writes.push({key,value});}}});
  return {studio,first,writes};
}
test('editing replaces one saved work; a copied draft saves a separate story',t=>{
  const {studio,writes,first}=saveFixture(t);studio.saveComposition();assert.equal(studio.works.length,1);assert.notEqual(studio.works[0],first);assert.equal(JSON.parse(writes[0].value)[0].draft.frames.length,3);
  assert.equal(JSON.parse(writes[1].value).editingId,studio.works[0].id);
  studio.editingWork=null;studio.draft=copySavedDraft(studio.works[0],true);studio.saveComposition();assert.equal(studio.works.length,2);assert.equal(studio.works[0].title,'夜归珞珈·副本');assert.equal(studio.works[1].title,'夜归珞珈');
});
test('failed saves preserve the previous gallery and its editable original',t=>{
  const {studio,first}=saveFixture(t,true);studio.saveComposition();assert.deepEqual(studio.works,[first]);assert.equal(studio.editingWork,first);
});

test('stopping a preview cancels its frame and sound without changing the editable draft',t=>{
  const originals={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,matchMedia:globalThis.matchMedia};
  const nodes=new Map(),callbacks=[],cancelled=[],calls=[];
  for(const id of ['compose-edit-controls','compose-frame-controls','compose-restore','compose-play','compose-canvas','compose-progress','compose-frame-label'])nodes.set(id,{disabled:false,getContext:()=>({})});
  globalThis.document={getElementById:id=>nodes.get(id)};globalThis.requestAnimationFrame=callback=>(callbacks.push(callback),callbacks.length);globalThis.cancelAnimationFrame=id=>cancelled.push(id);globalThis.matchMedia=()=>({matches:false});
  t.after(()=>{for(const [key,value] of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
  const studio=Object.create(FreePlayStudio.prototype),draft=starterDraft('lantern'),before=JSON.stringify(draft);
  Object.assign(studio,{draft,dialog:{querySelectorAll:()=>[]},sound:{start:kind=>calls.push(kind),stop:()=>calls.push('stop')},drawComposition(){},syncComposer:()=>calls.push('sync')});
  studio.startPlayback(draft,'compose');assert.equal(nodes.get('compose-edit-controls').disabled,true);
  callbacks[0](0);callbacks[1](6000);assert.equal(nodes.get('compose-frame-label').textContent,'演出中 · 相遇');
  studio.stopPlayback();assert.equal(studio.playback,null);assert.equal(nodes.get('compose-edit-controls').disabled,false);assert.equal(cancelled.length,1);assert.equal(calls.at(-1),'sync');assert.equal(JSON.stringify(draft),before);
});
