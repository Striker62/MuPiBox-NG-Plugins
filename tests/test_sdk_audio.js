const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').resolve(__dirname,'../sdk/mupibox-sdk.js'),'utf8');

function getSDK(bridge) {
 const calls=[];
 const window={navigator:{language:'de'},console,localStorage:{getItem:()=>null,setItem:()=>{}},addEventListener:()=>{}};
 if(bridge)window.__MUPIBOX_BRIDGE__={invoke:async(method,payload)=>{calls.push({method,payload});return{ok:true}},subscribe:()=>()=>{}};
 vm.runInNewContext(code,{window,console},{filename:'mupibox-sdk.js'});
 return {sdk:window.MuPiBoxSDK,calls};
}
test('audio permission is requested through the trusted host only',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.playNote('C4',30,'musicbox');
 assert.equal(calls.length,1);
 assert.equal(calls[0].method,'audio.note');
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{note:'C4',volume:30,instrument:'musicbox'});
});
test('invalid note, volume and instruments are rejected before invoking the host',async()=>{
 const {sdk,calls}=getSDK(true);
 for(const args of [['A9',30],['C4',-1],['C4',101],['C4',50.1],['C4',30,'shell']]){
  await assert.rejects(()=>sdk.audio.playNote(...args),{name:'TypeError'});
 }
 assert.equal(calls.length,0);
});
test('browser standalone fallback stays available without a privileged bridge',async()=>{
 const {sdk}=getSDK(false);
 assert.equal(sdk.isHosted,false);
 assert.equal(await sdk.audio.playNote('G4',30,'musicbox'),false);
});
