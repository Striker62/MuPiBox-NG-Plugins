const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const {create,fileName,safeName}=require('../examples/fotospass/admin/upload-store.js');
const jpeg=()=>new Blob([new Uint8Array([255,216,255,224,0,0,255,217])],{type:'image/jpeg'});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function backend(){
 const data=new Map(),calls=[];
 const sdk={files:{
  async list(folder){calls.push(['list',folder]);return {entries:[...data.keys()].map(key=>({name:key.split('/').pop(),isDir:false})),truncated:false};},
  async read(file){calls.push(['read',file]);return {blob:data.get(file),revision:'r1'};},
  async write(file,blob,options){calls.push(['write',file,options]);if(data.has(file))throw Error('409 conflict');data.set(file,blob);return {revision:'r1'};}
 }};
 return {sdk,data,calls,store:create(sdk)};
}
test('uploads use only the original photo directory and never replace existing files',async()=>{
 const h=backend(),saved=await h.store.upload('Mama & Papa.png',jpeg(),'0123456789abcdef');
 assert.match(saved.name,/^original-Mama-Papa-[a-f0-9]+\.jpg$/);
 assert.deepEqual(h.calls[0],['write','originale/'+saved.name,{expectedRevision:''}]);
 await assert.rejects(h.store.upload('Mama & Papa.png',jpeg(),'0123456789abcdef'),/409/);
 assert.equal(h.data.size,1);
});
test('names cannot escape scoped originals directory',()=>{
 for(const name of ['../x.jpg','x/y.jpg','x\\y.jpg','.hidden.jpg','evil.html','x..jpg'])assert.equal(safeName(name),false);
 assert.match(fileName('../../Familie.JPG','0123456789abcdef'),/^original-Familie-/);
 assert.throws(()=>fileName('bild.jpg','../bad'),/Kennung/);
});
test('invalid content and oversize are rejected before SDK writes',async()=>{
 const h=backend();
 await assert.rejects(h.store.upload('x.jpg',new Blob(['invalid'],{type:'image/jpeg'}),'0123456789abcdef'),/JPEG-Daten/);
 await assert.rejects(h.store.upload('x.jpg',new Blob(['png'],{type:'image/png'}),'0123456789abcdef'),/ungültig/);
 await assert.rejects(h.store.upload('x.jpg',new Blob([new Uint8Array(8*1024*1024+1)],{type:'image/jpeg'}),'0123456789abcdef'),/8 MiB/);
 assert.equal(h.calls.length,0);
});
test('listing filters unsafe entries and reads validate names',async()=>{
 const h=backend();h.sdk.files.list=async()=>({entries:[{name:'a.jpg'},{name:'../bad.jpg'},{name:'folder',isDir:true},{name:'a.svg'}],truncated:true});
 const result=await h.store.list();assert.equal(result.truncated,true);
 assert.deepEqual(result.entries,[{name:'a.jpg',path:'originale/a.jpg'}]);
 await assert.rejects(h.store.read('../bad.jpg'),/Bildname/);
});
function ui(settings){
 const h=backend(),nodes=new Map(),encoded=[],released=[];
 if(settings)h.sdk.settings=settings;
 const node=()=>({disabled:false,hidden:false,value:'',checked:true,files:[],children:[],append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},prepend(item){this.children.unshift(item)}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
 class Image{constructor(){this.naturalWidth=4000;this.naturalHeight=3000}async decode(){}}
 const context={Blob,Uint8Array,crypto:webcrypto,Image,
  URL:{createObjectURL(){return 'blob:local'},revokeObjectURL(url){released.push(url)}},
  window:{MuPiBoxAdminSDK:h.sdk,FotoUploadStore:{create},addEventListener(){}},
  document:{getElementById:get,createElement(tag){const element=node();if(tag==='canvas'){
   element.getContext=()=>({fillRect(){},drawImage(){}});
   element.toBlob=(callback,type,quality)=>{encoded.push({width:element.width,height:element.height,type,quality});callback(jpeg())};
  }return element;}}
 };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../examples/fotospass/admin/app.js'),'utf8'),context);
 return {...h,get,encoded,released};
}
test('upload UI converts images to JPEG 90%, limits dimensions and clears successful queue',async()=>{
 const h=ui();await tick();h.get('files').files=[{name:'Familie.png',size:100}];h.get('files').onchange();
 await h.get('upload').onclick();
 assert.equal(h.data.size,1);
 assert.deepEqual(h.encoded,[{width:2560,height:1920,type:'image/jpeg',quality:0.9}]);
 assert.equal(h.get('upload').disabled,true);assert.ok(h.released.length>0);
 assert.match(h.get('status').textContent,/1 Fotos hochgeladen/);
});
test('partial failure keeps failed and unprocessed inputs, retry does not duplicate successful photos',async()=>{
 const h=ui();await tick();const original=h.sdk.files.write;let attempt=0;
 h.sdk.files.write=async(...args)=>{if(++attempt===2)throw Error('read-only file system');return original(...args)};
 h.get('files').files=[{name:'a.jpg',size:10},{name:'b.jpg',size:10},{name:'c.jpg',size:10}];h.get('files').onchange();
 await h.get('upload').onclick();
 assert.equal(h.data.size,1);assert.match(h.get('error').textContent,/read-only/);
 assert.equal(h.get('selection').children.length,2);
 await h.get('upload').onclick();assert.equal(h.data.size,3);assert.equal(h.get('upload').disabled,true);
});

test('camera admin settings preserve other keys and use the current revision for every save',async()=>{
 let value={other:'preserve',fotoCaptureResolution:'1280x720'},revision='r1';const writes=[];
 const h=ui({get:async()=>({value,revision}),set:async(next,options)=>{writes.push([next,options]);value=next;revision='r2'}});await tick();
 assert.equal(h.get('capture-resolution').value,'1280x720');
 h.get('capture-resolution').value='1920x1080';await h.get('camera-save').onclick();
 assert.equal(writes[0][0].other,'preserve');assert.equal(writes[0][0].fotoCaptureResolution,'1920x1080');assert.equal(writes[0][1].expectedRevision,'r1');
 h.get('capture-resolution').value='auto';await h.get('camera-save').onclick();
 assert.equal(writes[1][1].expectedRevision,'r2');assert.match(h.get('camera-status').textContent,/gespeichert/);
});

test('camera setting conflicts retain the selected resolution and never overwrite blindly',async()=>{
 let writes=0;const h=ui({get:async()=>({value:{},revision:'r1'}),set:async()=>{writes++;throw Error('409 conflict')}});await tick();
 h.get('capture-resolution').value='1920x1080';await h.get('camera-save').onclick();
 assert.equal(writes,1);assert.equal(h.get('capture-resolution').value,'1920x1080');assert.match(h.get('camera-status').textContent,/409 conflict/);
});

test('missing admin settings capability disables camera saving while upload stays available',async()=>{
 const h=ui();await tick();assert.equal(h.get('camera-save').disabled,true);
 h.get('files').files=[{name:'Familie.jpg',size:100}];h.get('files').onchange();assert.equal(h.get('upload').disabled,false);
});
