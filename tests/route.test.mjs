import test from 'node:test';
import assert from 'node:assert/strict';
import {RouteState, museumStop, smooth, MUSEUM_STOPS} from '../src/route-state.js';

test('public scroll ends in the hall without choosing a branch', () => {
  const state = new RouteState();
  state.setProgress(20);
  assert.equal(state.route, 'public');
  assert.equal(state.atHall, true);
  assert.equal(state.position, 1);
});
test('transitions reject repeated clicks and release their lock', () => {
  const state = new RouteState();
  assert.equal(state.begin('museum', 0), true);
  assert.equal(state.begin('game', 100), false);
  assert.equal(state.advance(450), .5);
  assert.equal(state.advance(900), 1);
  assert.equal(state.transition, null);
  assert.equal(state.begin('game', 901), true);
});
test('local route progress survives a return and optional resume', () => {
  const state = new RouteState();
  state.begin('museum', 0); state.advance(1000); state.setProgress(.71);
  state.begin('public', 1000); state.advance(2000);
  assert.equal(state.position, 1);
  state.begin('museum', 2000, {resume: true}); state.advance(3000);
  assert.equal(state.position, .71);
  state.setProgress(.2);
  assert.equal(museumStop(state.position).id, 'heritage');
});
test('interactions and games guard camera transitions; reduced motion ends immediately', () => {
  const state = new RouteState(); state.interaction = 'lamp';
  assert.equal(state.begin('museum', 0), false);
  state.interaction = null; state.gameActive = true;
  assert.equal(state.begin('museum', 0), false);
  state.gameActive = false; state.begin('museum', 0); state.advance(0, true);
  assert.equal(state.transition, null);
});
test('museum intervals cover the whole reversible route and interpolation is continuous', () => {
  assert.equal(MUSEUM_STOPS[0].from, 0);
  MUSEUM_STOPS.slice(1).forEach((stop, i) => assert.equal(stop.from, MUSEUM_STOPS[i].to));
  for (const stop of MUSEUM_STOPS) assert.equal(museumStop(stop.at).id, stop.id);
  assert.equal(smooth(0, 1, 0), 0); assert.equal(smooth(0, 1, 1), 1);
  assert.ok(Math.abs(smooth(0, 1, .50001) - smooth(0, 1, .5)) < .0001);
});

test('museum, game and hall keep independent coordinates and reject unknown branches', () => {
  const state = new RouteState();
  state.setProgress(1);
  assert.equal(state.begin('unknown', 0), false);
  state.begin('museum', 0);state.advance(900);state.setProgress(.98);
  state.begin('game', 1000);state.advance(1900);state.setProgress(.82);
  state.begin('public', 2000);state.advance(2900);
  assert.deepEqual(state.progress, {public:1,museum:.98,game:.82});
  assert.equal(state.atHall,true);
});
