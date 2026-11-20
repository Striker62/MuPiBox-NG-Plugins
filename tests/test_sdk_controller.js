const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../sdk/mupibox-sdk.js'),'utf8');

test('optional controller status and distinct physical buttons remain inside the SDK event channel',()=>{
 let subscriber;
 const window = {
  __MUPIBOX_BRIDGE__:{invoke: async()=>({ok:true}),subscribe: cb=>{subscriber=cb;}},
  navigator:{language:'de'},console,addEventListener:()=>{},
  localStorage:{getItem:()=>null,setItem:()=>{}}
 };
 vm.runInNewContext(source,{window,console});
 const sdk=window.MuPiBoxSDK;
 const statuses=[],edges=[];
 const stopStatus=sdk.on('controller.connection',payload=>statuses.push(payload.connected));
 sdk.on('input',payload=>edges.push(payload.button+':'+payload.action));
 subscriber({event:'controller.connection',payload:{connected:true,bluetooth:true}});
 subscriber({event:'input',payload:{button:'MUSIC',action:'press'}});
 subscriber({event:'input',payload:{button:'MUSIC',action:'release'}});
 subscriber({event:'input',payload:{button:'SPRINT',action:'press'}});
 subscriber({event:'input',payload:{button:'B',action:'press'}});
 subscriber({event:'input',payload:{button:'MUTE',action:'press'}});
 subscriber({event:'controller.connection',payload:{connected:false,bluetooth:false}});
 assert.deepEqual(statuses,[true,false]);
 assert.deepEqual(edges,['MUSIC:press','MUSIC:release','SPRINT:press','B:press','MUTE:press']);
 stopStatus();
 subscriber({event:'controller.connection',payload:{connected:true}});
 assert.deepEqual(statuses,[true,false]);
});
