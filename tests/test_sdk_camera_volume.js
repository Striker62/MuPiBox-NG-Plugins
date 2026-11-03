'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sdkCode=fs.readFileSync(path.join(__dirname,'../sdk/mupibox-sdk.js'),'utf8');
function setup() {
 const calls=[],window={
  console,navigator:{language:'de'},
  localStorage:{getItem:()=>null,setItem:()=>{}},
  addEventListener:()=>{},
  __MUPIBOX_BRIDGE__:{
   invoke:async(method,payload)=>{
    calls.push({method,payload});
    if(method==='camera.list')return {devices:[{id:'video0',name:'USB Camera'}]};
    if(method==='camera.capture')return {image:'data:image/jpeg;base64,/9j/2Q==',width:320,height:240};
    return {ok:true};
   },
   subscribe:()=>()=>{}
  }
 };
 vm.runInNewContext(sdkCode,{window,console});
 return {sdk:window.MuPiBoxSDK,calls};
}
test('volume relative option uses distinct flagged capability; legacy stays untouched',async()=>{
 const {sdk,calls}=setup();
 await sdk.audio.playNote('G4',70,'musicbox',{relative:true});
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{method:'audio.note',payload:{note:'G4',volume:70,instrument:'musicbox',relative:true}});
 await sdk.audio.playNote('C4',30,'musicbox');
 assert.equal(Object.hasOwn(calls[1].payload,'relative'),false);
 for(const option of [{relative:'yes'},null,[]]){
  await assert.rejects(()=>sdk.audio.playNote('C4',70,'musicbox',option),{name:'TypeError'});
 }
});
test('camera methods only send supported high-level requests to the host',async()=>{
 const {sdk,calls}=setup();
 const list=await sdk.camera.list();assert.equal(list.length,1);
 await sdk.camera.start('video0');
 const frame=await sdk.camera.capture();assert.match(frame.image,/^data:image\/jpeg;base64,/);
 await sdk.camera.stop();
 assert.deepEqual(calls.map(c=>c.method),['camera.list','camera.start','camera.capture','camera.stop']);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[1].payload)),{id:'video0'});
});
test('camera path injection and arbitrary methods are rejected before invoking the host',async()=>{
 const {sdk,calls}=setup();
 for(const id of ['../video0','/dev/video0','video0;sh','video000','video1000','video-1',null]){
  await assert.rejects(()=>sdk.camera.start(id),{name:'TypeError'});
 }
 assert.equal(calls.length,0);
});
