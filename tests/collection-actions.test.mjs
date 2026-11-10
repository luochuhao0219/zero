import test from 'node:test';
import assert from 'node:assert/strict';
import {deleteSavedWork} from '../src/collection-actions.js';
import {readProgress} from '../src/game.js';
import {readCompositions,COMPOSITION_KEY,DRAFT_KEY} from '../src/explore-data.js';
const image='data:image/webp;base64,AAAA';
function storageFixture(entries={}){
  const entriesMap=new Map(Object.entries(entries));
  return {getItem:key=>entriesMap.get(key)??null,setItem:(key,value)=>entriesMap.set(key,value)};
}
test('deleting a game photo persists after reload without resetting completed chapters',()=>{
  const first={id:1,level:0,image},second={id:2,level:1,image};
  const progress={completed:[0,1],works:[first,second]},storage=storageFixture();
  const next=deleteSavedWork(storage,'borrow-light-v1',progress,first);
  assert.deepEqual(next.completed,[0,1]);assert.deepEqual(next.works,[second]);
  assert.deepEqual(readProgress(storage),next);assert.equal(progress.works.length,2);
});
test('deleting one duplicate-looking ticket keeps the other ticket and the studio draft',()=>{
  const first={title:'同名戏票',image,date:'2026-11-10'},second={...first};
  const storage=storageFixture({[DRAFT_KEY]:'{"title":"正在编辑"}'});
  const next=deleteSavedWork(storage,COMPOSITION_KEY,[first,second],first);
  assert.equal(next.length,1);assert.equal(next[0],second);
  assert.deepEqual(readCompositions(storage),[second]);assert.equal(storage.getItem(DRAFT_KEY),'{"title":"正在编辑"}');
});
test('deleting the last work restores an empty collection on reload',()=>{
  const work={title:'最后一张',image,date:''},storage=storageFixture();
  assert.deepEqual(deleteSavedWork(storage,COMPOSITION_KEY,[work],work),[]);
  assert.deepEqual(readCompositions(storage),[]);
});
test('storage failure leaves the original collection intact and signals failure',()=>{
  const work={title:'保留',image},works=[work];
  assert.throws(()=>deleteSavedWork({setItem:()=>{throw new Error('storage blocked');}},COMPOSITION_KEY,works,work),/storage blocked/);
  assert.deepEqual(works,[work]);
});
test('a stale delete action does not remove another work or write storage',()=>{
  const work={title:'仍在',image},works=[work];
  assert.equal(deleteSavedWork({setItem:()=>assert.fail('must not write')},COMPOSITION_KEY,works,{...work}),works);
});
