import test from 'node:test';
import assert from 'node:assert/strict';
import {PauseState} from '../src/pause-state.js';
test('visibility, route and lost-context pauses cannot overwrite each other',()=>{
  const stage=new PauseState();
  stage.set('route',true);stage.set('visibility',true);
  stage.set('visibility',false);assert.equal(stage.active,true);
  stage.set('context',true);stage.set('route',false);assert.equal(stage.active,true);
  stage.set('context',false);assert.equal(stage.active,false);
});
