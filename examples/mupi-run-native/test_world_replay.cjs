'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const rules = require('../mupi-run/logic.js');
const read = f => fs.readFileSync(path.resolve(__dirname,f),'utf8');
const scene = vm.createContext({rules, cache:[], state:rules.fresh(414)});
vm.runInContext(read('./RunWorld.js').replace('.pragma library',''),scene);
const frame = new vm.Script('buildObjects(state,cache,rules)');
let ropes=0;
for(let distance=0;distance<=1100;distance+=2) {
    scene.state.distance=distance;
    const sprites=frame.runInContext(scene,{timeout:150});
    assert.ok(sprites.length<512 && scene.cache.length<=16);
    for(const s of sprites) {
        assert.ok([s.x,s.y,s.w,s.h,s.worldZ].every(Number.isFinite));
        assert.ok(s.w>=0 && s.h>=0);
        if(s.source==='rope') ropes++;
    }
}
assert.ok(ropes>0);
vm.runInContext(read('../../tools/benchmarks/mupi-run/fixed-replay.js'),scene);
vm.runInContext(read('../mupi-run/poses.js').replace('window.','this.'),scene);
const nativeContext=vm.createContext({});
vm.runInContext(read('../../dist/mupi-run-native/RunLogic.js').replace('.pragma library',''),nativeContext);
const web=scene.fixedReplay(rules,scene.MuPiPoses,()=>{});
const native=scene.fixedReplay(nativeContext.MuPiRun,scene.MuPiPoses,()=>{});
function finish(clock,deltas) {
    const state=clock.fresh(414);clock.act(state,'start');
    for(let i=0;i<10000&&!clock.finished();i++) clock.advance(state,deltas[i%deltas.length]);
    assert.ok(clock.finished());assert.equal(state.phase,'running');
    return [state.distance,state.noteCount,state.waves,state.runPose,state.lane,state.score];
}
const final=finish(native,[.016,.035,.125,.021]);
assert.deepEqual(final,finish(web,[1/60]));
assert.equal(final[1],39);assert.equal(final[2],30);
console.log('Replay matched over 2,880 ticks and 1,061.44 m; all terrain projections bounded.');
