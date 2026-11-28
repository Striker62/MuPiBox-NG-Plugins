'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../examples/countdown/model.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,disabled:false,textContent:'',children:[],className:'',checked:false,files:[],focus(){},replaceChildren(){this.children=[];},append(item){this.children.push(item);},reportValidity(){return true;},addEventListener(name,fn){this[name]=fn;}});return nodes.get(id);};
 let stored={unrelated:'keep',countdowns:[]},revision='1',writes=0;
 const sdk={settings:{async get(){return {value:structuredClone(stored),revision};},async set(value,opts){assert.equal(opts.expectedRevision,revision);stored=structuredClone(value);revision=String(Number(revision)+1);writes++;}}};
 const context={window:{MuPiBoxAdminSDK:sdk,CountdownModel:model,addEventListener(){}},document:{getElementById:get,createElement:()=>({}),querySelectorAll:()=>[],querySelector:get,addEventListener(){}},Intl,Date,Map,JSON,crypto:require('node:crypto').webcrypto,Uint8Array,console};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../examples/countdown/admin/app.js'),'utf8'),context);
 return {get,sdk,get stored(){return stored;},get writes(){return writes;},conflict(){revision='8';}};
}
test('admin creates and saves countdowns while retaining unrelated settings',async()=>{
 const h=setup();await tick();assert.equal(h.get('add').disabled,false);h.get('add').onclick();
 assert.equal(h.get('editor').hidden,false);assert.equal(h.get('save').disabled,false);
 h.get('title').value='Mein Urlaub';h.get('title').input();h.get('image-layout').value='background';h.get('image-layout').input();await h.get('save').onclick();
 assert.equal(h.writes,1);assert.equal(h.stored.unrelated,'keep');assert.equal(h.stored.countdowns[0].title,'Mein Urlaub');assert.equal(h.get('save').disabled,true);
 assert.equal(h.stored.countdowns[0].imageLayout,'background');
});
test('conflicts retain edits and discard requires explicit in-page confirmation',async()=>{
 const h=setup();await tick();h.get('add').onclick();h.conflict();await h.get('save').onclick();
 assert.equal(h.writes,0);assert.match(h.get('status').textContent,/anderer Stelle/);assert.equal(h.get('editor').hidden,false);
 const cancelled=h.get('delete').onclick();assert.equal(h.get('confirm').hidden,false);h.get('confirm-no').onclick();await cancelled;assert.equal(h.get('editor').hidden,false);
 const deleted=h.get('delete').onclick();h.get('confirm-yes').onclick();await deleted;assert.equal(h.get('editor').hidden,true);
});
test('invalid date in an earlier event cannot silently save its previous target',async()=>{
 const h=setup();await tick();h.get('add').onclick();h.get('date').value='';h.get('date').input();h.get('add').onclick();
 await h.get('save').onclick();assert.equal(h.writes,0);assert.match(h.get('status').textContent,/Zieldatum/);
});
test('two countdowns remain selectable and editable after saving and reloading',async()=>{
 const h=setup();await tick();h.get('add').onclick();h.get('title').value='Geburtstag';h.get('title').input();
 await h.get('save').onclick();h.get('add').onclick();h.get('title').value='Urlaub';h.get('title').input();await h.get('save').onclick();
 await h.get('reload').onclick();await tick();
 assert.equal(h.get('countdown-choice').children.length,2);assert.equal(h.stored.countdowns.length,2);
 h.get('countdown-choice').value='0';h.get('countdown-choice').onchange();assert.equal(h.get('title').value,'Geburtstag');
 h.get('title').value='Geburtstag mit Freunden';h.get('title').input();await h.get('save').onclick();
 h.get('countdown-choice').value='1';h.get('countdown-choice').onchange();assert.equal(h.get('title').value,'Urlaub');
 assert.equal(h.stored.countdowns[0].title,'Geburtstag mit Freunden');assert.equal(h.stored.countdowns[1].title,'Urlaub');
});
