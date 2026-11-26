'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../examples/fotospass/app.js'),'utf8');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=','base64');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(mode='ok'){
 const nodes=new Map(),events={},calls=[],urls=new Set(),draws=[],saved=[],intervals=new Map(),timeouts=new Map();let nextURL=0,nextTimer=0,now=0;
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.hidden=false;this.disabled=false;this.value='';this.style={};this.dataset={};this.listeners={};this.classList={toggle(){},add(){},remove(){}};this.isConnected=true;this.complete=true;this.naturalWidth=320;this.naturalHeight=240;this.width=320;this.height=240;}
  append(...values){for(const value of values){this.children.push(value);if(this.tag==='select'&&!this.value)this.value=value.value}}
  appendChild(value){this.append(value)}
  replaceChildren(){for(const child of this.children)child.isConnected=false;this.children=[]}
  addEventListener(name,callback){this.listeners[name]=callback}
  setAttribute(name,value){this[name]=value}
  removeAttribute(name){delete this[name]}
  focus(){context.document.activeElement=this}
  getBoundingClientRect(){return {left:0,top:0,width:640,height:480}}
  getContext(){return {drawImage:(image,...args)=>draws.push({image,args}),clearRect(){},getImageData(){return{}},putImageData(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}}}
  toBlob(callback){callback(new Blob([png],{type:'image/png'}))}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id==='devices'?'select':'div'));return nodes.get(id)};
 get('delay').value='5';
 get('exit-confirm').hidden=true;
 const shared={
  async list(folder){calls.push(['list',folder]);if(mode==='denied')throw Error('Permission denied');
   return {entries:[{name:'glasses.png',isDir:false},{name:'Brille rot.PNG',isDir:false},{name:'../bad.png',isDir:false},{name:'bad.svg',isDir:false},{name:'.hidden.png',isDir:false},{name:'folder.png',isDir:true}],truncated:false};
  },
  async read(file){calls.push(['read',file]);
   if(mode==='missing')throw Error('Not found');
   if(mode==='oversize')return new Blob([new Uint8Array(2*1024*1024+1)]);
   if(mode==='svg')return new Blob(['<svg><script>alert(1)</script></svg>'.padEnd(50)]);
   if(mode==='dimensions'){const data=Buffer.from(png);data.writeUInt32BE(2048,16);return new Blob([data])}
   return new Blob([png],{type:'application/octet-stream'});
  }
 };
 const sdk={shared:mode==='absent'?undefined:shared,
  camera:{list:async()=>[{id:'video0',name:'Mock camera'}],start:async()=>{},capture:async()=>({image:'data:image/jpeg;base64,/9j/2Q=='}),stop:async()=>{}},
  photos:{save:async blob=>{saved.push(blob);return{id:'saved'}},list:async()=>[],get:async()=>new Blob([png]),delete:async()=>{}},exit:async()=>{calls.push(['exit'])},on(){}};
 class MockImage{constructor(){this.naturalWidth=800;this.naturalHeight=600}set src(value){this._src=value;queueMicrotask(()=>{if(mode==='decode-failure')this.onerror?.();else this.onload?.()})}get src(){return this._src}}
 const context={Blob,Uint8Array,DataView,Image:MockImage,console:{warn(){}},
  URL:{createObjectURL(){const url='blob:'+ ++nextURL;urls.add(url);return url},revokeObjectURL(url){urls.delete(url)}},
  setInterval(cb){const id=intervals.size+1;intervals.set(id,cb);return id},clearInterval(id){intervals.delete(id)},
  performance:{now:()=>now},setTimeout(cb,delay){const id=++nextTimer;timeouts.set(id,{cb,at:now+delay});return id},clearTimeout(id){timeouts.delete(id)},
  window:{MuPiBoxSDK:sdk,addEventListener(name,cb){const previous=events[name];events[name]=(...args)=>{previous?.(...args);cb(...args)}}},
  document:{hidden:false,getElementById:get,createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),querySelectorAll:()=>[],addEventListener(name,cb){events['document:'+name]=cb}}};
 const exposed=source.replace(/\}\)\(\);\s*$/,`;globalThis.app={categories,sharedAccessories,accessoryCache,loadSharedAccessories,accessorySource,safeAccessoryName,addSticker,freeze,savePhoto,accessoryHeight,releaseUnusedAccessories,requestExit,performExit,beginCountdown,resume,start,stop,frame,gallerySwitch,galleryOpenDetail,galleryEditPhoto,requestGalleryEdit,get dirty(){return photoDirty},get counting(){return counting},get active(){return active}, get items(){return items},setCategory(id){accessoryCategory=id;renderAccessoryMenu()}};})();`);
 vm.runInNewContext(exposed,context);
 return {app:context.app,get,calls,urls,draws,saved,events,sdk,timeouts,context,
  async advance(ms){now+=ms;const ready=[...timeouts].filter(([,task])=>task.at<=now);for(const [id,task] of ready){timeouts.delete(id);task.cb()}await tick();await tick()}};
}
test('existing five categories retain built-ins and add PNG files only from their own directories',async()=>{
 const h=setup();await tick();await tick();
 assert.equal(h.app.categories.length,5);
 const glasses=h.app.categories.find(c=>c.id==='brillen');assert.ok(glasses.types.includes('glasses'));
 assert.ok(glasses.types.includes('shared:brillen:glasses.png'));
 assert.equal(glasses.types.filter(type=>type.startsWith('shared:')).length,2);
 await h.app.loadSharedAccessories();assert.equal(glasses.types.filter(type=>type.startsWith('shared:')).length,2);
 assert.ok(h.calls.every(([,name])=>/^accessoires\/(baerte|tiere|fantasie|brillen|huete)(\/[^/]+)?$/.test(name)));
 assert.equal(h.calls.filter(([method])=>method==='read').length,0,'PNGs are read lazily');
 for(const bad of ['../x.png','.hidden.png','x.svg','https://example/x.png','x\\y.png'])assert.equal(h.app.safeAccessoryName(bad),false);
});
for(const mode of ['absent','denied'])test(mode+' leaves every built-in category available',async()=>{
 const h=setup(mode);await tick();await tick();
 assert.equal(h.app.categories.length,5);
 assert.ok(h.app.categories.every(c=>c.types.length===3));
 assert.equal(h.urls.size,0);
});
test('square SMB PNG is placed without distortion and included in saved photo',async()=>{
 const h=setup();await tick();await tick();h.app.setCategory('brillen');await tick();
 await h.app.freeze();await h.app.addSticker('shared:brillen:glasses.png');
 const item=h.app.items[0];assert.equal(item.aspect,1);
 assert.equal(h.app.accessoryHeight(item),48);
 await h.app.savePhoto();assert.equal(h.saved.length,1);assert.equal(h.saved[0].type,'image/png');
 const placed=h.draws.filter(draw=>draw.image instanceof Object&&String(draw.image.src).startsWith('blob:')).at(-1);
 assert.ok(placed);assert.ok(Math.abs(placed.args[2]-placed.args[3])<0.0001,'saved PNG stays square');
 await h.app.addSticker('glasses');assert.equal(h.app.accessoryHeight(h.app.items[1]),22.5,'built-in geometry is preserved');
});
for(const mode of ['missing','svg','oversize','dimensions','decode-failure'])test(mode+' PNG failure is isolated and does not leak an object URL',async()=>{
 const h=setup(mode);await tick();await tick();
 await assert.rejects(h.app.accessorySource('shared:brillen:glasses.png'));
 assert.equal(h.urls.size,0);assert.equal(h.app.accessoryCache.size,0);
});
test('concurrent reads share one image and pagehide frees cached and late images',async()=>{
 const h=setup();await tick();await tick();
 const key='shared:brillen:glasses.png';
 const [first,second]=await Promise.all([h.app.accessorySource(key),h.app.accessorySource(key)]);
 assert.equal(first,second);assert.equal(h.calls.filter(([method])=>method==='read').length,1);
 h.events.pagehide();assert.equal(h.urls.size,0);
 const late=setup();await tick();await tick();
 let finish;late.sdk.shared.read=()=>new Promise(resolve=>{finish=resolve});
 const pending=late.app.accessorySource(key);late.events.pagehide();finish(new Blob([png]));
 await assert.rejects(pending);assert.equal(late.urls.size,0);
});
test('refreshing the file list during an image load preserves its dimensions',async()=>{
 const h=setup();await tick();await tick();
 let finish;h.sdk.shared.read=()=>new Promise(resolve=>{finish=resolve});
 const key='shared:brillen:glasses.png',pending=h.app.accessorySource(key);
 await h.app.loadSharedAccessories();finish(new Blob([png]));await pending;
 assert.equal(h.app.sharedAccessories.get(key).width,1);
 assert.equal(h.app.sharedAccessories.get(key).height,1);
 h.events.pagehide();assert.equal(h.urls.size,0);
});
test('leaving live camera cancels countdown and stops the camera before SDK exit',async()=>{
 const h=setup();await tick();await tick();const order=[];
 h.sdk.camera.stop=async()=>{order.push('stop')};h.sdk.exit=async()=>{order.push('exit')};
 h.app.beginCountdown();assert.equal(h.app.counting,true);
 await h.app.requestExit();assert.equal(h.app.counting,false);assert.equal(h.app.active,false);
 assert.deepEqual(order,['stop','exit']);assert.equal(h.get('exit-confirm').hidden,true);
});
test('unsaved photo offers cancellation and only exits after discard confirmation',async()=>{
 const h=setup();await tick();await tick();await h.app.freeze();let exits=0;
 h.sdk.exit=async()=>{exits++};
 await h.app.requestExit();assert.equal(h.get('exit-confirm').hidden,false);assert.equal(exits,0);
 h.get('exit-cancel').listeners.click();assert.equal(h.get('exit-confirm').hidden,true);assert.equal(h.app.dirty,true);
 await h.app.requestExit();h.get('exit-discard').listeners.click();await tick();
 assert.equal(exits,1);assert.equal(h.saved.length,0);
});
test('saved photo exits directly but a subsequent edit needs confirmation again',async()=>{
 const saved=setup();await tick();await tick();await saved.app.freeze();await saved.app.savePhoto();
 assert.equal(saved.app.dirty,false);await saved.app.requestExit();assert.equal(saved.get('exit-confirm').hidden,true);
 assert.ok(saved.calls.some(([method])=>method==='exit'));
 const edited=setup();await tick();await tick();await edited.app.freeze();await edited.app.savePhoto();
 await edited.app.addSticker('glasses');await edited.app.requestExit();assert.equal(edited.get('exit-confirm').hidden,false);
 assert.ok(!edited.calls.some(([method])=>method==='exit'));
});
test('exit stays disabled while saving and edits during save remain unsaved',async()=>{
 const h=setup();await tick();await tick();await h.app.freeze();let finish;
 h.sdk.photos.save=()=>new Promise(resolve=>{finish=resolve});
 const pending=h.app.savePhoto();await tick();assert.equal(h.get('app-exit').disabled,true);
 await h.app.requestExit();assert.equal(h.get('exit-confirm').hidden,true);
 assert.ok(!h.calls.some(([method])=>method==='exit'));
 await h.app.addSticker('glasses');finish({id:'saved'});await pending;
 assert.equal(h.get('app-exit').disabled,false);assert.equal(h.app.dirty,true);
});
test('failed save keeps the photo protected; failed SDK exit can be retried',async()=>{
 const h=setup();await tick();await tick();await h.app.freeze();
 h.sdk.photos.save=async()=>{throw Error('Disk full')};await h.app.savePhoto();assert.equal(h.app.dirty,true);
 h.sdk.exit=async()=>{throw Error('Host error')};await h.app.performExit();assert.equal(h.get('app-exit').disabled,false);
 let exits=0;h.sdk.exit=async()=>{exits++};await h.app.performExit();assert.equal(exits,1);
});
test('a camera start completing after exit cannot reactivate the preview',async()=>{
 const h=setup();await tick();await tick();await h.app.freeze();let finish;
 h.sdk.camera.start=()=>new Promise(resolve=>{finish=resolve});
 h.app.resume();await tick();assert.equal(typeof finish,'function');
 await h.app.requestExit();finish();await tick();assert.equal(h.app.active,false);
});

test('preview requests are spaced by at least 1100 ms without duplicate timers',async()=>{
 const h=setup();await tick();await tick();let captures=0;
 h.sdk.camera.capture=async()=>{captures++;return {image:'new'}};
 await h.advance(1099);assert.equal(captures,0);
 await h.advance(1);assert.equal(captures,1);assert.equal(h.timeouts.size,1);
 await h.app.frame();assert.equal(captures,1);assert.equal(h.timeouts.size,1);
 await h.advance(1100);assert.equal(captures,2);
});
test('slow capture is followed immediately when ready, with no parallel requests',async()=>{
 const h=setup();await tick();await tick();let finish,captures=0;
 h.sdk.camera.capture=()=>{captures++;return new Promise(resolve=>{finish=resolve})};
 await h.advance(1100);assert.equal(captures,1);
 await h.advance(1600);await h.app.frame();assert.equal(captures,1);
 finish({image:'slow'});await tick();await tick();
 await h.advance(0);assert.equal(captures,2);
});
test('hidden preview suspends capture and resumes without exceeding the rate',async()=>{
 const h=setup();await tick();await tick();let captures=0;
 h.sdk.camera.capture=async()=>{captures++;return {image:'new'}};
 h.context.document.hidden=true;await h.advance(2200);assert.equal(captures,0);
 h.context.document.hidden=false;h.events['document:visibilitychange']();
 await h.advance(0);assert.equal(captures,1);
 await h.advance(100);assert.equal(captures,1);
});
test('stop cancels pending scheduling and a late result cannot restore the preview',async()=>{
 const h=setup();await tick();await tick();let finish;
 h.sdk.camera.capture=()=>new Promise(resolve=>{finish=resolve});
 await h.advance(1100);await h.app.stop();
 assert.equal(h.timeouts.size,0);
 finish({image:'late'});await tick();await tick();
 assert.equal(h.get('preview').hidden,true);assert.equal(h.app.active,false);
 assert.equal(h.timeouts.size,0);
});

async function openGalleryPhoto(h){
 h.app.gallerySwitch(true);await tick();await tick();
 await h.app.galleryOpenDetail('original');
}
test('gallery image opens in editor at original dimensions; saving creates a copy',async()=>{
 const h=setup();await tick();await tick();let deleted=0;
 h.sdk.photos.delete=async()=>{deleted++};
 await openGalleryPhoto(h);await h.app.galleryEditPhoto('original');
 assert.equal(h.app.active,false);assert.equal(h.app.dirty,true);
 assert.equal(h.get('editor-view').hidden,false);assert.equal(h.get('gallery-view').hidden,true);
 assert.equal(h.get('photo').width,800);assert.equal(h.get('photo').height,600);
 assert.equal(h.get('painting').width,800);assert.equal(h.app.items.length,0);
 await h.app.addSticker('glasses');await h.app.savePhoto();
 assert.equal(h.saved.length,1);assert.equal(deleted,0);assert.equal(h.app.dirty,false);
});
test('editing another gallery photo protects unsaved changes and permits cancellation',async()=>{
 const h=setup();await tick();await tick();await h.app.freeze();
 await h.app.addSticker('glasses');await openGalleryPhoto(h);
 h.app.requestGalleryEdit();
 assert.equal(h.get('gallery-edit-confirm').hidden,false);
 h.get('gallery-edit-cancel').listeners.click();
 assert.equal(h.get('gallery-view').hidden,true);assert.equal(h.app.items.length,1);assert.equal(h.app.dirty,true);
 await openGalleryPhoto(h);h.app.requestGalleryEdit();h.get('gallery-edit-discard').listeners.click();
 await tick();await tick();
 assert.equal(h.app.items.length,0);assert.equal(h.get('photo').width,800);
});
test('gallery decode failure retains the current draft and shows an error',async()=>{
 const h=setup('decode-failure');await tick();await tick();await h.app.freeze();
 await openGalleryPhoto(h);await h.app.galleryEditPhoto('original');
 assert.match(h.get('gallery-status').textContent,/Bearbeiten fehlgeschlagen/);
 assert.equal(h.get('photo').width,320);assert.equal(h.app.dirty,true);
 assert.equal(h.get('gallery-edit').disabled,false);
});
test('leaving gallery while image loading prevents late editor replacement',async()=>{
 const h=setup();await tick();await tick();await openGalleryPhoto(h);
 let finish;
 h.context.Image=class {constructor(){this.naturalWidth=800;this.naturalHeight=600}set src(value){finish=()=>this.onload()}};
 const loading=h.app.galleryEditPhoto('original');await tick();
 h.app.gallerySwitch(false);finish();await loading;
 assert.equal(h.get('photo').width,320);assert.equal(h.app.dirty,false);
});
