'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../examples/mupi-run/logic.js');

test('identical timed inputs survive skipped paints and preserve contact and distance', () => {
  function run(intervals) {
    const s=game.fresh(213);
    game.act(s,'start');
    s.notes=[{z:7,lane:0}];
    s.obstacles=[{kind:'jump',item:'rock',lane:0,z:9,checked:false}];
    const events=[[0.25,'jump'],[1.5,'left'],[1.66,'duck'],[3.0,'right']];
    let now=0,index=0;
    for(const [end,action] of [...events,[4,null]]){
      while(now<end-1e-12){
        const dt=Math.min(intervals[index++%intervals.length],end-now);
        game.advance(s,dt);now+=dt;
      }
      if(action)game.act(s,action);
    }
    return [s.phase,s.distance,s.runPose,s.visualLane,s.completedJumps,s.noteCount,s.obstacles,s.notes];
  }
  const fixed=run([1/60]);
  assert.equal(fixed[0],'running');assert.equal(fixed[4],1);assert.equal(fixed[5],1);
  assert.deepEqual(run([1/30]),fixed);
  assert.deepEqual(run([.016,.041,.008,.38,.056,.1]),fixed);
});
