import test from 'node:test';
import assert from 'node:assert/strict';
import {Exploration} from '../src/explore.js';

function handles(t) {
  const nodes=new Map();
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{value:0,listeners:new Map(),captures:[],focus(){},
      setPointerCapture(pointer){this.captures.push(pointer);},
      addEventListener(type,handler){this.listeners.set(type,handler);},
      emit(type,pointerId,clientX=0,clientY=0){this.listeners.get(type)?.({button:0,pointerId,clientX,clientY,preventDefault(){}});}});
    return nodes.get(id);
  };
  const original=globalThis.document;
  globalThis.document={getElementById:node};
  t.after(()=>{if(original===undefined)delete globalThis.document;else globalThis.document=original;});
  const calls={resume:0,draw:0,save:0};
  const exploration=Object.create(Exploration.prototype);
  Object.assign(exploration,{journey:{state:{transition:null,interaction:null},progress:.75,goPosition(){calls.resume++;}},
    draft:{selected:0,actors:[{x:36,y:65},{x:64,y:65}]},
    drawLight(){calls.draw++;},drawCraft(){calls.draw++;},syncComposer(){},updateComposer(){calls.save++;},screenBounds(){return {width:100,height:100};}});
  exploration.bindSceneHandles();
  return {node,exploration,calls};
}

test('a second pointer or another museum handle cannot take over the route lock',t=>{
  const {node,exploration,calls}=handles(t),lamp=node('handle-lamp'),puppet=node('handle-puppet');
  lamp.emit('pointerdown',1);
  lamp.emit('pointerdown',2);puppet.emit('pointerdown',2);
  lamp.emit('pointermove',2,80);puppet.emit('pointermove',2,80);
  lamp.emit('pointercancel',2);puppet.emit('pointerup',2);
  assert.equal(exploration.journey.state.interaction,'lamp');
  assert.deepEqual(lamp.captures,[1]);assert.deepEqual(puppet.captures,[]);
  assert.equal(node('light-position').value,0);assert.equal(calls.resume,0);
  lamp.emit('pointermove',1,20);
  assert.equal(node('light-position').value,10);assert.equal(calls.draw,1);
  lamp.emit('lostpointercapture',1);
  assert.equal(exploration.journey.state.interaction,null);assert.equal(calls.resume,1);
  lamp.emit('pointerup',1);assert.equal(calls.resume,1);
  puppet.emit('pointerdown',2);
  assert.equal(exploration.journey.state.interaction,'puppet');
});

test('only the actor owner can finish a composition drag and restore scrolling',t=>{
  const {node,exploration,calls}=handles(t),actor=node('handle-actor-1');
  actor.emit('pointerdown',7);actor.emit('pointermove',7,10);
  assert.equal(exploration.draft.selected,1);assert.equal(exploration.draft.actors[1].x,74);
  assert.equal(calls.save,1);
  actor.emit('lostpointercapture',8);
  assert.equal(exploration.journey.state.interaction,'actor-1');assert.equal(calls.resume,0);
  actor.emit('pointercancel',7);
  assert.equal(exploration.journey.state.interaction,null);assert.equal(calls.resume,1);assert.equal(calls.save,2);
});
