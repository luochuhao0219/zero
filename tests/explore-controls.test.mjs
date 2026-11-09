import test from 'node:test';
import assert from 'node:assert/strict';
import {FreePlayStudio} from '../src/compose-studio.js';
import {defaultDraft} from '../src/explore-data.js';

function studioCanvas(t) {
  const canvas={width:1200,height:840,listeners:new Map(),captures:[],focus(){},
    getBoundingClientRect:()=>({left:0,top:0,width:1200,height:840}),
    setPointerCapture(pointer){this.captures.push(pointer);},
    addEventListener(type,handler){this.listeners.set(type,handler);},
    emit(type,event){this.listeners.get(type)?.({button:0,preventDefault(){},...event});}};
  const original=globalThis.document;
  globalThis.document={getElementById:()=>canvas};
  t.after(()=>{if(original===undefined)delete globalThis.document;else globalThis.document=original;});
  const calls=[];
  const studio=Object.create(FreePlayStudio.prototype);
  Object.assign(studio,{draft:defaultDraft(),syncComposer(){},updateComposer(persist=true){calls.push(persist);}});
  studio.bindCanvas();
  const point={clientX:432,clientY:450};
  return {canvas,studio,calls,point};
}

test('only the owning pointer moves and saves a studio actor',t=>{
  const {canvas,studio,calls,point}=studioCanvas(t);
  canvas.emit('pointerdown',{pointerId:7,...point});
  canvas.emit('pointerdown',{pointerId:8,...point});
  canvas.emit('pointermove',{pointerId:8,clientX:552,clientY:450});
  canvas.emit('pointercancel',{pointerId:8});
  assert.equal(studio.draft.actors[0].x,36);
  assert.deepEqual(canvas.captures,[7]);assert.deepEqual(calls,[]);
  canvas.emit('pointermove',{pointerId:7,clientX:552,clientY:450});
  assert.equal(studio.draft.actors[0].x,46);assert.deepEqual(calls,[false]);
  canvas.emit('lostpointercapture',{pointerId:7});
  canvas.emit('pointerup',{pointerId:7});
  assert.deepEqual(calls,[false,true]);
});

test('closing a studio drag prevents stray moves and accepts a new owner',t=>{
  const {canvas,studio,calls,point}=studioCanvas(t);
  canvas.emit('pointerdown',{pointerId:1,...point});
  studio.cancelDrag();
  canvas.emit('pointermove',{pointerId:1,clientX:900,clientY:500});
  assert.equal(studio.draft.actors[0].x,36);assert.deepEqual(calls,[]);
  canvas.emit('pointerdown',{pointerId:2,...point});
  canvas.emit('pointermove',{pointerId:2,clientX:9000,clientY:9000});
  assert.equal(studio.draft.actors[0].x,84);assert.equal(studio.draft.actors[0].y,86);
  assert.deepEqual(canvas.captures,[1,2]);
});

test('studio keyboard nudges respect bounds and persist the result',t=>{
  const {canvas,studio,calls}=studioCanvas(t);
  canvas.emit('keydown',{key:'ArrowRight',shiftKey:true});
  assert.equal(studio.draft.actors[0].x,40);
  studio.draft.actors[0].x=83;
  canvas.emit('keydown',{key:'ArrowRight',shiftKey:true});
  assert.equal(studio.draft.actors[0].x,84);
  canvas.emit('keydown',{key:'Escape'});
  assert.deepEqual(calls,[true,true]);
});
