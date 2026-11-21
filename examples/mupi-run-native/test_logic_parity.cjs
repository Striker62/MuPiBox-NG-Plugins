'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../mupi-run');
const actual=require(path.join(root,'logic.js'));
const generated=fs.readFileSync(path.resolve(__dirname,'../../dist/mupi-run-native/RunLogic.js'),'utf8').replace(/^\.pragma library\n/,'');
const context=vm.createContext({});vm.runInContext(generated+'\nthis.native=MuPiRun',context);
const qml=context.native;
for(const seed of [1,42,0xdeadbeef,0x1badc0de]) {
 const a=actual.fresh(seed),b=qml.fresh(seed);
 const actions=['start','right','jump','left','duck','right','left','pause','pause'];
 for(let frame=0;frame<15000;frame++) {
   if(frame%170===0){const act=actions[(frame/170)%actions.length];assert.equal(actual.act(a,act),qml.act(b,act),'action mismatch');}
   actual.advance(a,1/60);qml.advance(b,1/60);
   const normalized=x=>JSON.parse(JSON.stringify(x));
   assert.deepEqual(normalized(b),normalized(a),`physics drift seed=${seed} frame=${frame}`);
   if(a.phase==='over')break;
 }
}
console.log('RUN_NATIVE_LOGIC_PARITY_OK: deterministic original 60-Hz physics, hazards, note pickup and collisions for 4 seeds');
