'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const sdkJS=fs.readFileSync(path.join(__dirname,'../sdk/mupibox-sdk.js'),'utf8');

function host() {
 const calls=[],intervals=new Map();
 let next=1;
 let revision=1;
 const win={
  Blob, console, navigator:{language:'de'}, document:{hidden:false},
  addEventListener:()=>{},
  setInterval:(cb,interval)=>{const id=next++;intervals.set(id,{cb,interval});return id},
  clearInterval:id=>intervals.delete(id),
  __MUPIBOX_BRIDGE__:{
   invoke:async(method,payload)=>{
    calls.push({method,payload});
    if(method==='shared.list')return {entries:[{name:'Ole',path:'books/Ole',isDir:true}],revision:String(revision),truncated:false};
    if(method==='shared.read')return {blob:new Blob(['{"title":"Ole"}'],{type:'application/json'})};
    return {};
   },
   subscribe:()=>()=>{}
  }
 };
 vm.runInNewContext(sdkJS,{window:win,console});
 return {sdk:win.MuPiBoxSDK,calls,intervals,win,update:()=>{revision++}};
}

test('shared SDK lists and reads only scoped relative names',async()=>{
 const h=host();
 const result=await h.sdk.shared.list('books');
 assert.equal(result.entries[0].name,'Ole');
 const blob=await h.sdk.shared.read('books/Ole/book.json');
 assert.equal(JSON.parse(await blob.text()).title,'Ole');
 assert.deepEqual(JSON.parse(JSON.stringify(h.calls)),[
  {method:'shared.list',payload:{path:'books'}},
  {method:'shared.read',payload:{path:'books/Ole/book.json'}}
 ]);
});

test('shared SDK rejects traversal and arbitrary host paths',async()=>{
 const h=host();
 for(const name of ['../etc','books//Ole','/etc/shadow','books/../Ole','books/.hidden','C:\\Windows','books/test:foo']){
  await assert.rejects(()=>h.sdk.shared.read(name),{name:'TypeError'});
  await assert.rejects(()=>h.sdk.shared.list(name),{name:'TypeError'});
 }
 assert.equal(h.calls.length,0);
});

test('shared watcher detects new books by revision and stops polling cleanly',async()=>{
 const h=host();
 const changes=[];
 const stop=h.sdk.shared.watch('books',result=>changes.push(result.revision),{intervalMs:15000});
 await new Promise(setImmediate);
 assert.deepEqual(changes,['1']);
 assert.equal(h.intervals.size,1);
 const timer=[...h.intervals.values()][0];
 await timer.cb();
 assert.deepEqual(changes,['1']);
 h.update();
 await timer.cb();
 assert.deepEqual(changes,['1','2']);
 h.win.document.hidden=true;
 h.update();
 await timer.cb();
 assert.deepEqual(changes,['1','2']);
 stop();
 assert.equal(h.intervals.size,0);
});
