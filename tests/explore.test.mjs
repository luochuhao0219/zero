import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultDraft,sanitizeDraft,readCompositions,readJSON,COMPOSITION_KEY} from '../src/explore-data.js';

test('damaged or unavailable storage falls back without preventing the journey',()=>{
  for(const storage of [{getItem:()=>'{broken'},{getItem:()=>{throw new Error('blocked');}}]){
    assert.deepEqual(readCompositions(storage),[]);
    assert.deepEqual(sanitizeDraft(readJSON(storage,'draft',null)),defaultDraft());
  }
});
test('restored drafts cannot place controls outside their supported ranges',()=>{
  const draft=sanitizeDraft({title:'题'.repeat(1000),scene:'javascript:bad',count:1,selected:1,actors:[{x:999,y:-100,size:Infinity,pose:999,flip:'false',variant:3}]});
  assert.equal(draft.title.length,18);assert.equal(draft.scene,'bridge');assert.equal(draft.selected,0);
  assert.deepEqual(draft.actors[0],{x:84,y:45,size:1,pose:120,flip:false,variant:0});
});
test('each default draft owns its actors',()=>{
  const one=defaultDraft(),two=defaultDraft();one.actors[0].x=80;assert.equal(two.actors[0].x,36);
});
test('gallery restores only bounded local images and keeps the six most recent works',()=>{
  const entries=[{title:'external',image:'https://example.org/x.webp'},{title:'svg',image:'data:image/svg+xml;base64,AAAA'},{title:'large',image:'data:image/webp;base64,'+'A'.repeat(600000)},...Array.from({length:10},(_,i)=>({title:String(i),image:'data:image/webp;base64,AAAA',date:'2026-11-07'}))];
  const works=readCompositions({getItem:key=>key===COMPOSITION_KEY?JSON.stringify(entries):null});
  assert.deepEqual(works.map(w=>w.title),['0','1','2','3','4','5']);
});
