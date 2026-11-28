'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../examples/fotospass/app.js'),'utf8');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=','base64');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('extended camera uses sequential preview and a separate selected native still resolution',async()=>{
 const h=setup('ok',true,'640x480');await tick();await tick();
 const start=h.calls.find(row=>row[0]==='camera.start');
 assert.equal(start[2].fps,10);assert.equal(start[2].preview.width,640);
 assert.equal(h.calls.filter(row=>row[0]==='camera.capture').length,0);
 await h.advance(125);
 assert.equal(h.calls.filter(row=>row[0]==='camera.preview').length,2);
 await h.app.freeze();
 const capture=h.calls.find(row=>row[0]==='camera.capture');assert.equal(capture[1].width,640);
 assert.equal(h.get('photo').width,800,'decoded still dimensions are used rather than upscaling preview');
 await h.advance(1000);assert.equal(h.calls.filter(row=>row[0]==='camera.preview').length,2);
});

test('high resolution still waits for the outstanding preview and stop discards a late still',async()=>{
 const h=setup('ok',true);await tick();await tick();let finishPreview,finishCapture;
 h.sdk.camera.preview=()=>new Promise(resolve=>{finishPreview=resolve});
 const pending=h.app.frame();await h.advance(125); // scheduled request owns the single pending preview
 const taking=h.app.freeze();await tick();
 assert.equal(h.calls.filter(row=>row[0]==='camera.capture').length,0);
 h.sdk.camera.capture=()=>new Promise(resolve=>{finishCapture=resolve});
 finishPreview({image:'data:image/jpeg;base64,/9j/2Q=='});await pending;await tick();
 assert.equal(typeof finishCapture,'function');
 await h.app.stop();finishCapture({image:'data:image/jpeg;base64,/9j/2Q=='});await taking;
 assert.equal(h.app.active,false);assert.equal(h.app.dirty,false);
});

test('bucket saving retains one camera original across a failed edited save and retry',async()=>{
 const h=setup('ok',true);await tick();await tick();await h.app.freeze();let fail=true;const writes=[];
 h.sdk.photos.save=async input=>{writes.push(input.bucket);if(input.bucket==='edited'&&fail)throw Error('full');return{id:'original'}};
 await h.app.savePhoto();assert.equal(h.app.dirty,true);
 fail=false;await h.app.savePhoto();
 assert.deepEqual(writes,['originals','edited','edited']);assert.equal(h.app.dirty,false);
});

test('extended gallery combines legacy and edited photos and reads the selected bucket',async()=>{
 const h=setup('ok',true);await tick();await tick();const reads=[];
 h.sdk.photos.list=async bucket=>[{id:bucket==='edited'?'new':'legacy'}];
 h.sdk.photos.get=async(id,bucket)=>{reads.push([id,bucket]);return new Blob([png])};
 h.app.gallerySwitch(true);await tick();await tick();
 assert.deepEqual(Array.from(h.app.galleryEntries,row=>row.id),['new','legacy']);
 await h.app.galleryOpenDetail('new');assert.ok(reads.some(row=>row[0]==='new'&&row[1]==='edited'));
});

test('album import is explicit and only imports the selected host reference',async()=>{
 const h=setup('ok',true);await tick();await tick();
 h.app.gallerySwitch(true);h.app.selectGallerySource('album');await tick();await tick();
 const choices=h.get('album-choices').children;assert.equal(choices.length,1);
 choices[0].listeners.click();await tick();await tick();
 assert.equal(h.calls.filter(row=>row[0]==='album.import').length,0);
 await h.app.galleryOpenDetail('/api/gallery/local/photo/1');
 assert.equal(h.get('gallery-edit').hidden,true);assert.equal(h.get('album-import').hidden,false);
 h.get('album-import').listeners.click();await tick();await tick();
 assert.deepEqual(h.calls.filter(row=>row[0]==='album.import'),[['album.import','/api/gallery/local/photo/1']]);
});

test('album navigation appears only for photo pages and keeps paths out of picture labels',async()=>{
 const h=setup('ok',true);await tick();await tick();const pages=[];
 h.sdk.photos.album.page=async url=>{pages.push(url);return {photos:[{url:'/api/gallery/local/photo/1'}],has_more:url.includes('page=1&')};};
 h.app.gallerySwitch(true);h.app.selectGallerySource('album');await tick();await tick();
 assert.equal(h.get('album-navigation').hidden,true);assert.equal(h.get('album-choices').hidden,false);
 h.get('album-choices').children[0].listeners.click();await tick();await tick();
 assert.equal(h.get('album-navigation').hidden,false);assert.equal(h.get('album-choices').hidden,true);
 assert.equal(h.get('album-previous').disabled,true);assert.equal(h.get('album-next').disabled,false);
 const tile=h.get('gallery-grid').children[0];assert.equal(tile['aria-label'],'Foto 1');assert.equal(tile.children[1].textContent,'Foto 1');
 h.get('album-next').listeners.click();await tick();await tick();
 assert.ok(pages.at(-1).includes('page=2&'));assert.equal(h.get('album-previous').disabled,false);assert.equal(h.get('album-next').disabled,true);
 await h.app.galleryOpenDetail('/api/gallery/local/photo/1');assert.equal(h.get('album-navigation').hidden,true);
 h.get('gallery-back').listeners.click();assert.equal(h.get('album-navigation').hidden,false);
 h.get('album-back').listeners.click();await tick();await tick();assert.equal(h.get('album-navigation').hidden,true);assert.equal(h.get('album-choices').hidden,false);
});

test('camera mode enumeration failure retains the legacy capture route',async()=>{
 const h=setup('ok',true);h.sdk.camera.modes=async()=>{throw Error('unavailable')};await tick();await tick();
 assert.equal(h.app.active,true);assert.equal(h.calls.filter(row=>row[0]==='camera.preview').length,0);
 assert.equal(h.calls.filter(row=>row[0]==='camera.capture').length,1);
});
function setup(mode='ok',extended=false,preferred='auto'){
 const nodes=new Map(),events={},calls=[],urls=new Set(),draws=[],saved=[],encodings=[],fills=[],intervals=new Map(),timeouts=new Map();let nextURL=0,nextTimer=0,now=0;
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.hidden=false;this.disabled=false;this.value='';this.style={};this.dataset={};this.listeners={};this.classList={toggle(){},add(){},remove(){}};this.isConnected=true;this.complete=true;this.naturalWidth=320;this.naturalHeight=240;this.width=320;this.height=240;}
  append(...values){for(const value of values){this.children.push(value);if(this.tag==='select'&&!this.value)this.value=value.value}}
  appendChild(value){this.append(value)}
  replaceChildren(){for(const child of this.children)child.isConnected=false;this.children=[]}
  addEventListener(name,callback){const previous=this.listeners[name];this.listeners[name]=previous?function(...args){previous(...args);return callback(...args)}:callback}
  setAttribute(name,value){this[name]=value}
  removeAttribute(name){delete this[name]}
  focus(){context.document.activeElement=this}
  getBoundingClientRect(){return {left:0,top:0,width:640,height:480}}
  setPointerCapture(){}
  getContext(){return {save(){},restore(){},translate:(...args)=>draws.push({operation:'translate',args}),scale:(...args)=>draws.push({operation:'scale',args}),drawImage:(image,...args)=>draws.push({image,args}),fillRect(...args){fills.push({color:this.fillStyle,args})},clearRect(){},getImageData(){return{}},putImageData(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}}}
  toBlob(callback,type='image/png',quality){encodings.push({type,quality});const actual=mode==='jpeg-fallback'?'image/png':type;callback(new Blob([mode==='jpeg-oversize'?new Uint8Array(8*1024*1024+1):actual==='image/jpeg'?Buffer.from([255,216,255,217]):png],{type:actual}))}
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
  photos:{save:async blob=>{saved.push(blob);return{id:'saved'}},list:async()=>[],get:async()=>new Blob([png]),delete:async()=>{}},exit:async()=>{calls.push(['exit'])},on(name,handler){events['sdk:'+name]=handler}};
 if(extended){
  sdk.config={get:async()=>({fotoCaptureResolution:preferred})};
  sdk.capabilities=async()=>({methods:['camera.preview','camera.modes','photos.album.import'].map(method=>({method,available:true}))});
  sdk.camera.modes=async()=>[{width:640,height:480},{width:1920,height:1080}];
  sdk.camera.start=async(id,options)=>{calls.push(['camera.start',id,options])};
  sdk.camera.preview=async()=>{calls.push(['camera.preview']);return {image:'data:image/jpeg;base64,/9j/2Q=='}};
  sdk.camera.capture=async options=>{calls.push(['camera.capture',options]);return {image:'data:image/jpeg;base64,/9j/2Q=='}};
  sdk.photos.album={list:async()=>[{name:'Familie',photos_url:'/api/gallery/local/photos'}],page:async()=>({photos:[{url:'/api/gallery/local/photo/1',name:'Mama'}],has_more:false}),get:async()=>new Blob([png]),import:async url=>{calls.push(['album.import',url]);return{id:'imported'}}};
 }
 class MockImage{constructor(){this.naturalWidth=800;this.naturalHeight=600}set src(value){this._src=value;queueMicrotask(()=>{if(mode==='decode-failure')this.onerror?.();else this.onload?.()})}get src(){return this._src}}
 const context={Blob,Uint8Array,DataView,Image:MockImage,console:{warn(){}},
  URL:{createObjectURL(){const url='blob:'+ ++nextURL;urls.add(url);return url},revokeObjectURL(url){urls.delete(url)}},
  setInterval(cb){const id=intervals.size+1;intervals.set(id,cb);return id},clearInterval(id){intervals.delete(id)},
  performance:{now:()=>now},setTimeout(cb,delay){const id=++nextTimer;timeouts.set(id,{cb,at:now+delay});return id},clearTimeout(id){timeouts.delete(id)},
  window:{MuPiBoxSDK:sdk,addEventListener(name,cb){const previous=events[name];events[name]=(...args)=>{previous?.(...args);cb(...args)}}},
  document:{hidden:false,getElementById:get,createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),querySelectorAll:()=>[],addEventListener(name,cb){events['document:'+name]=cb}}};
 const exposed=source.replace(/\}\)\(\);\s*$/,`;globalThis.app={categories,sharedAccessories,accessoryCache,loadSharedAccessories,accessorySource,safeAccessoryName,addSticker,freeze,savePhoto,accessoryHeight,releaseUnusedAccessories,requestExit,performExit,beginCountdown,resume,start,stop,frame,gallerySwitch,galleryOpenDetail,galleryEditPhoto,requestGalleryEdit,selectGallerySource,templateBlob,get galleryEntries(){return galleryEntries},get dirty(){return photoDirty},get counting(){return counting},get active(){return active}, get items(){return items},setCategory(id){accessoryCategory=id;renderAccessoryMenu()}};})();`);
 vm.runInNewContext(exposed,context);
 return {app:context.app,get,calls,urls,draws,saved,encodings,fills,events,sdk,timeouts,context,
  async advance(ms){now+=ms;const ready=[...timeouts].filter(([,task])=>task.at<=now);for(const [id,task] of ready){timeouts.delete(id);task.cb()}await tick();await tick()}};
}

test('transient preview rate limit retains camera and retries with backoff',async()=>{
 const h=setup('ok',true);await tick();await tick();let attempts=0,stops=0;
 h.sdk.camera.stop=async()=>{stops++};
 h.sdk.camera.preview=async()=>{if(++attempts===1)throw Error('rate limit exceeded');return {image:'data:image/jpeg;base64,/9j/2Q=='}};
 await h.advance(124);assert.equal(attempts,0,'leave margin below the requested 10 fps');
 await h.advance(1);assert.equal(attempts,1);assert.equal(h.app.active,true);assert.equal(stops,0);
 await h.advance(249);assert.equal(attempts,1);
 await h.advance(1);assert.equal(attempts,2);assert.equal(h.app.active,true);
});

test('persistent preview failure stops once and preserves error after host stop notification',async()=>{
 const h=setup('ok',true);await tick();await tick();let stops=0;
 h.sdk.camera.preview=async()=>{throw Error('rate limit exceeded')};
 h.sdk.camera.stop=async()=>{stops++;h.events['sdk:camera.stopped']()};
 for(const elapsed of [125,250,500,1000])await h.advance(elapsed);
 assert.equal(h.app.active,false);assert.equal(stops,1);
 assert.match(h.get('message').textContent,/rate limit exceeded/);
 assert.match(h.get('camera-state').textContent,/Vorschau fehlgeschlagen/);
});

test('permission errors never restart or retry the camera',async()=>{
 const h=setup('ok',true);await tick();await tick();let attempts=0;
 h.sdk.camera.preview=async()=>{attempts++;throw Error('permission denied')};
 await h.advance(125);await h.advance(2000);
 assert.equal(h.app.active,false);assert.equal(attempts,1);
 assert.match(h.get('message').textContent,/permission denied/);
});

test('preview learns a slower host rate and retains it after successful frames',async()=>{
 const h=setup('ok',true);await tick();await tick();let calls=0;
 // The first frame succeeded at time zero. Simulate a host accepting only
 // one preview per second, regardless of the requested camera FPS.
 let now=0,lastAccepted=0;
 h.sdk.camera.preview=async()=>{calls++;if(now-lastAccepted<1000)throw Error('preview rate limited');lastAccepted=now;return {image:'data:image/jpeg;base64,/9j/2Q=='}};
 for(const elapsed of [125,250,500,1000]){now+=elapsed;await h.advance(elapsed)}
 assert.equal(h.app.active,true);assert.equal(calls,4);
 assert.match(h.get('message').textContent,/angepasst/);
 now+=999;await h.advance(999);assert.equal(calls,4);
 now++;await h.advance(1);assert.equal(calls,5);assert.equal(h.app.active,true);
});

test('unsupported admin resolution selects a native mode within the limit without upscaling',async()=>{
 const h=setup('ok',true,'1280x720');await tick();await tick();await h.app.freeze();
 const capture=h.calls.find(row=>row[0]==='camera.capture');assert.equal(capture[1].width,640);assert.equal(capture[1].height,480);
});

test('external camera stop waits for the simple start action and then resumes the automatic camera',async()=>{
 const h=setup('ok',true);await tick();await tick();
 const starts=()=>h.calls.filter(row=>row[0]==='camera.start').length;
 assert.equal(starts(),1);
 h.events['sdk:camera.stopped']();await tick();await h.advance(2000);
 assert.equal(h.app.active,false);assert.equal(starts(),1,'never bypass the host stop with an automatic restart');
 assert.equal(h.get('freeze').textContent,'Kamera starten');assert.equal(h.get('freeze').disabled,false);
 await h.get('freeze').listeners.click();await tick();
 assert.equal(h.app.active,true);assert.equal(starts(),2);assert.match(h.get('freeze').textContent,/Foto machen/);
});

test('two-finger zoom and pan are bounded and confirmation locks the photo for editing',async()=>{
 const h=setup();await tick();await tick();await h.app.freeze();
 assert.deepEqual(h.draws.filter(row=>row.operation==='scale').at(-1).args,[-1,1]);
 assert.equal(h.get('align-actions').hidden,false);
 const event=(pointerId,clientX,clientY)=>({pointerId,clientX,clientY,preventDefault(){}}),events=h.get('painting').listeners;
 events.pointerdown(event(1,200,240));events.pointerdown(event(2,440,240));
 events.pointermove(event(1,80,240));events.pointermove(event(2,560,240));
 assert.deepEqual(h.draws.filter(row=>row.operation==='scale').at(-1).args,[-2,2]);
 events.pointerup(event(1,80,240));events.pointerup(event(2,560,240));
 events.pointerdown(event(1,0,0));events.pointermove(event(1,100000,-100000));
 const shift=h.draws.filter(row=>row.operation==='translate').at(-1).args;
 assert.deepEqual(shift,[320,0],'photo remains inside its fixed frame');
 events.pointercancel(event(1,100000,-100000));
 h.get('image-done').listeners.click();assert.equal(h.get('align-actions').hidden,true);
 const before=h.draws.filter(row=>row.operation==='scale').length;
 events.pointerdown(event(1,200,240));events.pointerdown(event(2,440,240));events.pointermove(event(2,600,240));
 assert.equal(h.draws.filter(row=>row.operation==='scale').length,before,'gestures cannot move the background in accessory mode');
 h.get('undo').listeners.click();
 assert.deepEqual(h.draws.filter(row=>row.operation==='translate').at(-1).args,[160,120]);
});

test('loaded images keep their orientation and the saved result uses the transformed photo',async()=>{
 const h=setup();await tick();await tick();h.app.gallerySwitch(true);await tick();
 await h.app.galleryOpenDetail('saved');await h.app.galleryEditPhoto('saved');
 assert.deepEqual(h.draws.filter(row=>row.operation==='scale').at(-1).args,[1,1]);
 h.get('painting').listeners.wheel({clientX:320,clientY:240,deltaY:-100,preventDefault(){}});
 const scale=h.draws.filter(row=>row.operation==='scale').at(-1).args;
 assert.ok(scale[0]>1);assert.equal(scale[0],scale[1]);
 h.get('image-done').listeners.click();
 const before=h.draws.length;await h.app.savePhoto();
 assert.ok(h.draws.slice(before).some(row=>row.image===h.get('photo')),'JPEG composition reads the same rendered canvas shown in the editor');
 assert.equal(h.saved.length,1);assert.equal(h.saved[0].type,'image/jpeg');
});
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
 await h.app.savePhoto();assert.equal(h.saved.length,1);assert.equal(h.saved[0].type,'image/jpeg');
 assert.deepEqual(h.encodings.at(-1),{type:'image/jpeg',quality:0.9});
 assert.equal(h.fills.at(-1).color,'#fff');
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
for(const mode of ['jpeg-fallback','jpeg-oversize'])test(mode+' rejects unusable output and preserves unsaved changes',async()=>{
 const h=setup(mode);await tick();await tick();await h.app.freeze();await h.app.savePhoto();
 assert.equal(h.saved.length,0);assert.equal(h.app.dirty,true);
 assert.match(h.get('message').textContent,/Speichern fehlgeschlagen/);
});

test('templates load only allowed files from originale and edited copies use photo SDK',async()=>{
 const h=setup();await tick();await tick();const templateCalls=[];let deleted=0;
 h.sdk.shared.list=async folder=>{templateCalls.push(['list',folder]);return {entries:[{name:'Mama.jpg'},{name:'../bad.jpg'},{name:'phone.HEIC'},{name:'folder.jpg',isDir:true}],truncated:false}};
 h.sdk.shared.read=async file=>{templateCalls.push(['read',file]);return new Blob([png])};
 h.sdk.photos.delete=async()=>{deleted++};
 h.app.gallerySwitch(true);await tick();await tick();h.app.selectGallerySource('templates');await tick();await tick();
 assert.deepEqual(Array.from(h.app.galleryEntries,x=>x.id),['Mama.jpg']);
 assert.equal(h.get('gallery-delete').hidden,true);
 assert.ok(templateCalls.every(([,name])=>name==='originale'||name==='originale/Mama.jpg'));
 await h.app.galleryOpenDetail('Mama.jpg');await h.app.galleryEditPhoto('Mama.jpg');
 assert.equal(h.get('editor-view').hidden,false);assert.equal(h.get('photo').width,800);
 await h.app.addSticker('glasses');await h.app.savePhoto();
 assert.equal(h.saved.length,1);assert.equal(h.saved[0].type,'image/jpeg');assert.equal(deleted,0);
});
test('invalid templates are rejected without raw paths or executable formats',async()=>{
 const h=setup();await tick();await tick();let reads=0;
 h.sdk.shared.read=async()=>{reads++;return new Blob(['<svg>not a photo</svg>'])};
 await assert.rejects(h.app.templateBlob('../file.jpg'),/Vorlagenname/);
 assert.equal(reads,0);
 await assert.rejects(h.app.templateBlob('fake.jpg'),/Bildvorlage/);
 h.sdk.shared.read=async()=>new Blob([new Uint8Array(8*1024*1024+1)]);
 await assert.rejects(h.app.templateBlob('large.jpg'),/8 MiB/);
});
test('missing template permission is visible and saved photo gallery still works',async()=>{
 const h=setup();await tick();await tick();h.app.gallerySwitch(true);await tick();
 h.sdk.shared.list=async()=>{throw Error('Permission denied')};
 h.app.selectGallerySource('templates');await tick();assert.match(h.get('gallery-status').textContent,/Permission denied/);
 h.sdk.photos.list=async()=>[{id:'saved'}];h.app.selectGallerySource('photos');await tick();await tick();
 assert.deepEqual(Array.from(h.app.galleryEntries,x=>x.id),['saved']);
 assert.equal(h.get('gallery-delete').hidden,false);
});
