const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Recorder=require('../examples/Buecherkiste/admin/book-recorder.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const nodes=new Map(),events={},writes=[];let finish;
 const html=fs.readFileSync(path.join(__dirname,'../examples/Buecherkiste/admin/index.html'),'utf8');
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(match=>match[1]));
 class Node{
  constructor(){this.children=[];this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.dataset={};this.files=[];}
  append(...items){this.children.push(...items);if(!this.value&&items[0]?.value!==undefined)this.value=items[0].value;}
  replaceChildren(...items){this.children=[];this.value='';this.append(...items);}
  addEventListener(name,fn){this[name]=fn;}
  setAttribute(name,value){this[name]=value;}removeAttribute(name){delete this[name];}focus(){}
 }
 const get=id=>{assert.ok(ids.has(id),'unknown HTML id: '+id);if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 get('audio-format').value='webm';
 const data={id:'buch',revision:'b1',info:{title:'Mein Buch'},coverOnly:false,pages:[{path:'images/01.jpg',blob:new Blob(['image']),text:'Hallo'}]};
 const sdk={audio:{
  listInputDevices:async()=>({box:[{id:'mic',label:'USB'}],secureContext:false}),
  startRecording:options=>new Promise(resolve=>{finish=()=>resolve({path:options.path,revision:'r1',size:100});}),
  getRecordingStatus:async()=>({state:'recording',durationMs:100}),stopRecording:async()=>finish(),cancelRecording:async()=>{},
  playRecording:async()=>({player:{pause(){}},release(){}}),deleteRecording:async()=>{}
 }};
 const context={Blob,File,Option:class extends Node{constructor(text,value){super();this.textContent=text;this.value=value;}},
  URL:{createObjectURL:()=> 'blob:preview',revokeObjectURL(){}},
  window:{MuPiBoxAdminSDK:sdk,BookRecorder:{create:(sdk,opts)=>Recorder.create(sdk,{...opts,unique:()=> 'recording123'})},
   BookStore:{create:()=>({list:async()=>[{id:'buch',title:'Mein Buch'}],load:async()=>data,save:async draft=>{writes.push(draft.pages.map(page=>({...page})));return {...data,revision:'b2',pages:draft.pages};}})},
   addEventListener(name,fn){events[name]=fn;}},document:{getElementById:get,createElement:()=>new Node()}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../examples/Buecherkiste/admin/app.js'),'utf8'),context);
 return {get,events,writes};
}
test('book administration locks page changes during recording and enables publication only after preview/adoption',async()=>{
 const h=setup();await tick();h.get('editor-existing').value='buch';h.get('editor-load').onclick();await tick();await tick();
 assert.equal(h.get('audio-start').disabled,true,'explicit microphone selection required');
 await h.get('audio-scan').onclick();assert.equal(h.get('audio-start').disabled,false);
 const pending=h.get('audio-start').onclick();await tick();
 assert.equal(h.get('editor-save').disabled,true);assert.equal(h.get('admin-pages').inert,true);assert.equal(h.get('audio-stop').disabled,false);
 await h.get('audio-stop').onclick();await pending;
 assert.equal(h.get('audio-adopt').disabled,true);assert.equal(h.get('editor-save').disabled,true);
 await h.get('audio-play').onclick();assert.equal(h.get('audio-adopt').disabled,false);
 await h.get('audio-adopt').onclick();assert.equal(h.get('editor-save').disabled,false);
 assert.match(h.get('audio-assignment').textContent,/audio\/seite-001-recording123\.ogg/);
 await h.get('editor-save').onclick();assert.equal(h.writes[0][0].recording.path,'audio/seite-001-recording123.ogg');
 h.events.pagehide();
});
