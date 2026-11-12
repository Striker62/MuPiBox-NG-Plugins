'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../sdk/mupibox-sdk.js'),'utf8');
function host(preview=false){
 const calls=[];
 const window={navigator:{language:'de'},console,localStorage:{getItem:()=>null,setItem(){}},addEventListener(){}};
 if(!preview)window.__MUPIBOX_BRIDGE__={invoke:async(method,payload)=>{
  calls.push({method,payload});
  return method==='tts.status'?{enabled:true,available:true,language:'de'}:{speaking:true};
 },subscribe:()=>()=>{}};
 vm.runInNewContext(code,{window,console});
 return {sdk:window.MuPiBoxSDK,calls};
}
test('TTS forwards text to configured host voice, not a new voice selection',async()=>{
 const {sdk,calls}=host();
 const status=await sdk.tts.status();
 assert.deepEqual(JSON.parse(JSON.stringify(status)),{enabled:true,available:true,language:'de'});
 const response=await sdk.tts.speak(' Hallo Welt ');
 assert.equal(response.speaking,true);
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[
  {method:'tts.status',payload:{}},
  {method:'tts.speak',payload:{text:'Hallo Welt'}}
 ]);
});
test('TTS limits work on Unicode code points without invoking host',async()=>{
 const {sdk,calls}=host();
 for(const value of ['', ' ', null, 123, 'a'.repeat(601), '\0', 'ok\0no']){
  await assert.rejects(()=>sdk.tts.speak(value),{name:'TypeError'});
 }
 await sdk.tts.speak('ä'.repeat(600));
 assert.equal(calls.length,1);
 assert.equal(calls[0].payload.text.length,600);
});
test('Standalone preview does not pretend to speak through appliance',async()=>{
 const {sdk}=host(true);
 const status=await sdk.tts.status();
 assert.equal(status.available,false);
 await assert.rejects(()=>sdk.tts.speak('Hallo'),/MuPiBox host unavailable/);
});
test('Bundled Bücherkiste SDK is identical to public SDK',()=>{
 assert.equal(fs.readFileSync(path.join(__dirname,'../examples/Buecherkiste/mupibox-sdk.js'),'utf8'),code);
});
