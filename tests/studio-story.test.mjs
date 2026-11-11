import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultDraft,sanitizeDraft,selectFrame,readCompositions,COMPOSITION_KEY} from '../src/explore-data.js';
import {STORY_STARTERS,starterDraft,samplePlay,PLAY_DURATION,copySavedDraft} from '../src/studio-story.js';
import {propPosition} from '../src/studio-effects.js';
import {saveStudioWork,restoreStudio} from '../src/studio-storage.js';
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
  const d=starterDraft('farewell');d.frames.forEach(f=>delete f.actions);const before=JSON.stringify(d);
  const start=samplePlay(d,0),middle=samplePlay(d,2250),end=samplePlay(d,PLAY_DURATION);
  assert.equal(start.index,0);assert.equal(start.actors[0].x,32);assert.ok(middle.actors[0].x>32&&middle.actors[0].x<43);
  assert.equal(end.index,2);assert.equal(end.progress,1);assert.equal(end.actors[0].x,24);assert.equal(end.line,d.frames[2].line);
  assert.equal(JSON.stringify(d),before);
  assert.equal(samplePlay(d,2250,true).actors[0].x,32);assert.equal(samplePlay(d,4500,true).actors[0].x,43);
});
test('each transition reaches its next key pose smoothly before the next line',()=>{
  const d=starterDraft('home');d.frames.forEach(f=>delete f.actions);for(const boundary of [4000,8000]){const a=samplePlay(d,boundary-.01),b=samplePlay(d,boundary);assert.ok(Math.abs(a.actors[0].x-b.actors[0].x)<.001);}
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
test('editing replaces one saved work; copying creates a separate work and refresh restores the editing link',()=>{
  const entries=new Map(),storage={setItem:(k,v)=>entries.set(k,v),getItem:k=>entries.get(k)||null};
  const first={id:'saved-1',title:'原作',image,draft:defaultDraft()},draft=starterDraft('home');
  const saved=saveStudioWork(storage,[first],first,draft,image);assert.equal(saved.works.length,1);assert.equal(saved.work.id,'saved-1');assert.equal(first.title,'原作');
  storage.setItem('borrow-light-draft-v1',JSON.stringify({...draft,editingId:saved.work.id}));const restored=restoreStudio(storage);assert.equal(restored.editingWork.id,'saved-1');
  const copy=saveStudioWork(storage,saved.works,null,copySavedDraft(saved.work,true),image);assert.equal(copy.works.length,2);assert.notEqual(copy.work.id,'saved-1');assert.equal(copy.work.title,'夜归珞珈·副本');
});
test('failed saves preserve the previous gallery and editable original',()=>{
  const first={id:'saved-1',title:'原作',image,draft:defaultDraft()},works=[first];assert.throws(()=>saveStudioWork({setItem:()=>{throw new Error('full');}},works,first,starterDraft('home'),image),/full/);assert.equal(works[0],first);assert.equal(first.title,'原作');
});
