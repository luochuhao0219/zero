import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,WIN_SCORE,projectPoint,scoreState,initialState,readProgress} from '../src/game.js';

test('projection preserves a point already on the screen plane',()=>{const p=projectPoint(2,3,0,-1,4);assert.equal(p.x,2);assert.equal(p.y,3);assert.equal(p.scale,1);});
test('moving a silhouette farther from the screen increases its projection',()=>{assert.ok(projectPoint(0,2,-1.8,0,4).scale>projectPoint(0,2,-.6,0,4).scale);});
for(let i=0;i<LEVELS.length;i++)test(`${LEVELS[i].name}: target is solvable and starting state does not win`,()=>{assert.equal(scoreState(i,{level:i,...LEVELS[i].target}),100);assert.ok(scoreState(i,initialState(i))<WIN_SCORE);});
test('malformed local storage does not prevent a new game',()=>{assert.deepEqual(readProgress({getItem:()=>'{bad'}),{completed:[],works:[]});});
test('progress ignores invalid chapters and unsafe image URLs',()=>{const data={completed:[0,0,1,999,-1,'2'],works:[{level:0,image:'https://example.com/x.png'},{level:2,image:'data:image/webp;base64,ok'}]};assert.deepEqual(readProgress({getItem:()=>JSON.stringify(data)}).completed,[0,1]);assert.equal(readProgress({getItem:()=>JSON.stringify(data)}).works.length,1);});
