'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../sdk/mupibox-sdk.js'),'utf8');
const photoID='20261105T163201.123456789Z-0123456789abcdef.png';

function host(){
 const calls=[];
 const window={
  Blob,console,navigator:{language:'de'},addEventListener:()=>{},
  __MUPIBOX_BRIDGE__:{
   invoke:async(method,payload)=>{
    calls.push({method,payload});
    if(method==='photos.list')return {photos:[{id:photoID}]};
    if(method==='photos.get')return {blob:new Blob(['image'],{type:'image/png'})};
    return {id:photoID,ok:true};
   },subscribe:()=>()=>{}
  }
 };
 vm.runInNewContext(code,{window,console});
 return {sdk:window.MuPiBoxSDK,calls};
}

test('photo SDK transfers Blob without converting it to base64 or paths',async()=>{
 const {sdk,calls}=host();
 const blob=new Blob(['safe image'],{type:'image/png'});
 const metadata=await sdk.photos.save({blob,filename:'../../ignored'});
 assert.equal(metadata.id,photoID);
 assert.equal(calls[0].method,'photos.save');
 assert.equal(calls[0].payload.blob,blob);
 assert.deepEqual(Object.keys(calls[0].payload),['blob']);
 const list=await sdk.photos.list();
 assert.equal(list[0].id,photoID);
 const returned=await sdk.photos.get(photoID);
 assert.equal(returned.type,'image/png');
 await sdk.photos.delete(photoID);
 assert.deepEqual(calls.map(x=>x.method),['photos.save','photos.list','photos.get','photos.delete']);
});

test('photo SDK rejects arbitrary file paths, mime and excessive Blob sizes',async()=>{
 const {sdk,calls}=host();
 for(const id of ['/etc/shadow','../photos','test.png','20261105T163201.123456789Z-0123456789abcdeg.png']){
  await assert.rejects(()=>sdk.photos.get(id),{name:'TypeError'});
  await assert.rejects(()=>sdk.photos.delete(id),{name:'TypeError'});
 }
 for(const blob of [new Blob(['x'],{type:'text/html'}),new Blob([],{type:'image/png'}),new Blob([Buffer.alloc(8*1024*1024+1)],{type:'image/jpeg'}),null]){
  await assert.rejects(()=>sdk.photos.save(blob),{name:'TypeError'});
 }
 assert.equal(calls.length,0);
});
