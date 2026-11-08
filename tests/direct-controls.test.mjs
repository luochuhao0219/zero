import test from 'node:test';
import assert from 'node:assert/strict';
import {DirectControls} from '../src/direct-controls.js';

function control() {
  const calls={release:0,cancel:0,capture:[]};
  const c=Object.create(DirectControls.prototype);
  Object.assign(c,{enabled:true,pointers:new Map([[1,{x:0,y:0}]]),drag:{mode:'orbit',x:0,y:0},
    stage:{playing:true,inputActive:true,dragOffset:0},
    canvas:{style:{},focus(){},setPointerCapture(id){calls.capture.push(id);},hasPointerCapture(){return true;},releasePointerCapture(id){calls.capture.push(-id);}},
    callbacks:{onRelease(){calls.release++;},onCancel(){calls.cancel++;}}});
  return {c,calls};
}
test('a secondary pointer cannot replace or move the active drag',()=>{
  const {c,calls}=control();const drag=c.drag;
  c.down({button:0,pointerType:'touch',pointerId:2,clientX:200,clientY:0,preventDefault(){}});
  c.move({pointerId:2,clientX:200,clientY:0});
  assert.equal(c.drag,drag);assert.equal(c.stage.dragOffset,0);
  c.up({pointerId:2},true);
  assert.equal(c.drag,drag);assert.equal(calls.cancel,0);
});
test('cancellation clears capture, pending wheel and interaction without committing a move',async()=>{
  const {c,calls}=control();c.drag.mode='arm';
  c.wheelTimer=setTimeout(()=>c.callbacks.onRelease(),10);
  c.cancel();
  assert.equal(c.drag,null);assert.equal(c.pointers.size,0);assert.equal(c.stage.inputActive,false);assert.equal(c.stage.dirty,true);
  assert.deepEqual(calls.capture,[-1]);assert.equal(calls.cancel,1);assert.equal(calls.release,0);
  c.up({pointerId:1},true);assert.equal(calls.cancel,1);
  await new Promise(resolve=>setTimeout(resolve,25));assert.equal(calls.release,0);
});
test('only the owner can release; pointercancel never commits',()=>{
  const {c,calls}=control();c.drag.mode='arm';
  c.up({pointerId:2});assert.equal(calls.release,0);assert.ok(c.drag);
  c.up({pointerId:1},true);assert.equal(calls.cancel,1);assert.equal(calls.release,0);
  assert.equal(c.stage.inputActive,false);
});
