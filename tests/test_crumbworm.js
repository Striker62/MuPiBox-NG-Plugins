/* MuPi Krümelwurm: deterministic, offline engine checks. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const g = require('../examples/crumbworm/web/logic.js');

test('initial state is inside the garden and starts paused', () => {
  const engine = g.create(() => .15);
  const state = engine.snapshot();
  assert.equal(state.phase, 'ready');
  assert.equal(state.body.length, 3);
  assert.ok(state.food.position >= 0 && state.food.position < g.WIDTH*g.HEIGHT);
  assert.ok(!state.body.includes(state.food.position));
  assert.deepEqual(engine.tick(),state);
});

test('movement, pause and restart', () => {
  const engine = g.create(() => 0);
  engine.start();
  const before = engine.snapshot();
  const after = engine.tick();
  assert.equal(after.phase,'playing');
  assert.equal(after.body[0],before.body[0]+1);
  assert.equal(after.body.length,3);
  engine.pause();
  assert.deepEqual(engine.tick(),engine.snapshot());
  engine.reset();
  assert.equal(engine.snapshot().phase,'ready');
  assert.equal(engine.snapshot().points,0);
});

test('cannot reverse and cannot queue two turns in a single tick', () => {
  const engine = g.create(() => 0);
  assert.equal(engine.turn('left'),false);
  assert.equal(engine.turn('up'),true);
  assert.equal(engine.turn('down'),false);
  assert.equal(engine.turn('left'),false);
  engine.start();
  engine.tick();
  assert.equal(engine.snapshot().direction,'up');
  assert.equal(engine.turn('left'),true);
});

test('eating crumbs grows the worm and scores points', () => {
  // Initial body [204,203,202]; position 205 occupies index 202
  // of the sorted available cells (381 cells).
  const engine = g.create(() => 202.5 / 381);
  const start = engine.snapshot();
  assert.equal(start.food.position,205);
  engine.start();
  const after = engine.tick();
  assert.equal(after.body.length,4);
  assert.equal(after.meals,1);
  assert.equal(after.points,10);
  assert.ok(after.food && !after.body.includes(after.food.position));
});

test('colliding with the wall ends the round', () => {
  const engine = g.create(() => 0);
  engine.start();
  for (let i = 0; i < 14; i++) engine.tick();
  assert.equal(engine.snapshot().phase,'over');
  assert.deepEqual(engine.tick(),engine.snapshot());
});

test('food selection never picks an occupied cell and handles a full garden', () => {
  const entire = Array.from({length:g.WIDTH*g.HEIGHT},(_,i)=>i);
  assert.equal(g.chooseFood(entire,()=>0),null);
  const single = g.chooseFood(entire.slice(1),()=>.99,true);
  assert.deepEqual(single,{position:0,gold:true});
});

test('new touch rounds start safely in the chosen direction', () => {
  const deltas = {up:-g.WIDTH, down:g.WIDTH, left:-1, right:1};
  for (const [direction, delta] of Object.entries(deltas)) {
    const engine = g.create(() => .42);
    const ready = engine.reset(direction);
    assert.equal(ready.phase, 'ready');
    assert.equal(ready.direction, direction);
    assert.equal(ready.queued, direction);
    assert.equal(ready.body[0] - ready.body[1], delta);
    assert.equal(ready.body[1] - ready.body[2], delta);
    engine.start();
    const moved = engine.tick();
    assert.equal(moved.phase, 'playing', direction);
    assert.equal(moved.body[0], ready.body[0]+delta, direction);
  }
});

test('invalid initial directions revert to the backwards-compatible right direction', () => {
  const engine=g.create(()=>.5);
  const initial=engine.snapshot();
  assert.deepEqual(engine.reset('diagonal').body,initial.body);
  assert.equal(engine.snapshot().direction,'right');
});
