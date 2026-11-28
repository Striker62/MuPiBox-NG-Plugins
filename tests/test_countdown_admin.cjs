'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../examples/countdown/model.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,disabled:false,textContent:'',children:[],className:'',checked:false,files:[],focus(){},replaceChildren(){this.children=[];},append(item){this.children.push(item);},reportValidity(){return true;},addEventListener(name,fn){this[name]=fn;}});return nodes.get(id);};
 let stored={unrelated:'keep',countdowns:[]},revision='1',writes=0;
 const sdk={settings:{async get(){return {value:structuredClone(stored),revision};},async set(value,opts){assert.equal(opts.expectedRevision,revision);stored=structuredClone(value);revision=String(Number(revision)+1);writes++;}}};
 const context={window:{MuPiBoxAdminSDK:sdk,CountdownModel:model,addEventListener(){}},document:{getElementById:get,createElement:()=>({children:[],append(...items){this.children.push(...items);}}),querySelectorAll:()=>[],querySelector:get,addEventListener(){}},Intl,Date,Map,JSON,crypto:require('node:crypto').webcrypto,Uint8Array,Blob,console};
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
test('unit checkboxes and optional text persist and empty unit selection is rejected',async()=>{
 const h=setup();await tick();h.get('add').onclick();
 h.get('unit-days').checked=false;h.get('unit-hours').checked=true;h.get('unit-minutes').checked=true;h.get('unit-seconds').checked=true;h.get('show-text').checked=true;h.get('show-text').input();
 await h.get('save').onclick();assert.deepEqual(h.stored.countdowns[0].units,['hours','minutes','seconds']);assert.equal(h.stored.countdowns[0].showText,true);
 for(const name of ['hours','minutes','seconds'])h.get('unit-'+name).checked=false;h.get('unit-seconds').input();await h.get('save').onclick();
 assert.equal(h.writes,1);assert.match(h.get('status').textContent,/mindestens eine/);
});
test('parents can save a fixed clock start which survives reloading and reject start after target',async()=>{
 const h=setup();await tick();h.get('add').onclick();h.get('display').value='dial';h.get('display').input();
 assert.equal(h.get('dial-settings').hidden,false);assert.equal(h.get('unit-settings').hidden,true);
 await h.get('save').onclick();assert.equal(h.stored.countdowns[0].display,'dial');
 const start=h.stored.countdowns[0].waitStart;await h.get('reload').onclick();await tick();assert.equal(h.stored.countdowns[0].waitStart,start);
 h.get('start-date').value='2100-12-31';h.get('start-date').input();await h.get('save').onclick();assert.equal(h.writes,1);assert.match(h.get('status').textContent,/Start vor dem Ziel/);
});
test('templates survive source deletion and create independent countdowns requiring a new target',async()=>{
 const h=setup();await tick();h.get('add').onclick();h.get('title').value='Gute Nacht';h.get('title').input();h.get('sleep-symbol').checked=true;h.get('sleep-symbol').input();
 h.get('template-name').value='Schlafenszeit';h.get('save-template').onclick();await h.get('save').onclick();
 assert.equal(h.stored.countdownTemplates.length,1);assert.equal(h.stored.countdownTemplates[0].title,'Schlafenszeit');
 assert.equal(h.stored.countdownTemplates[0].sleepSymbol,true);
 const templateId=h.stored.countdownTemplates[0].id,sourceId=h.stored.countdowns[0].id;assert.notEqual(templateId,sourceId);
 const remove=h.get('delete').onclick();h.get('confirm-yes').onclick();await remove;await h.get('save').onclick();
 await h.get('reload').onclick();await tick();assert.equal(h.stored.countdowns.length,0);assert.equal(h.get('templates').children.length,1);
 h.get('templates').children[0].children[1].onclick();assert.equal(h.get('title').value,'Schlafenszeit');assert.equal(h.get('date').value,'');
 assert.equal(h.get('sleep-symbol').checked,true);
 await h.get('save').onclick();assert.match(h.get('status').textContent,/Zieldatum/);
 h.get('date').value='2030-01-02';h.get('date').input();h.get('title').value='Heute schlafen gehen';h.get('title').input();await h.get('save').onclick();
 assert.equal(h.stored.countdowns.length,1);assert.notEqual(h.stored.countdowns[0].id,templateId);assert.equal(h.stored.countdownTemplates[0].title,'Schlafenszeit');
});
test('template and source share a pending GIF upload safely without duplicating the file',async()=>{
 const h=setup();await tick();let uploads=0;h.sdk.files={write:async(path,blob,opts)=>{uploads++;assert.match(path,/^bilder\/.+\.gif$/);assert.equal(opts.expectedRevision,'');return {revision:'image'};}};
 h.get('add').onclick();
 const file=new Blob([Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64')],{type:'image/gif'});file.name='test.gif';
 h.get('image').files=[file];h.get('image').onchange();h.get('save-template').onclick();await h.get('save').onclick();
 assert.equal(uploads,1);assert.equal(h.stored.countdowns[0].image,h.stored.countdownTemplates[0].image);
 assert.equal(h.get('save').disabled,true);
});
test('loading automatically removes expired events while retaining templates and other settings',async()=>{
 const h=setup();await tick();h.get('add').onclick();await h.get('save').onclick();
 const source=h.stored.countdowns[0],now=Date.now();
 h.stored.countdowns=[{...source,id:'late',target:new Date(now+2*86400000).toISOString()},{...source,id:'expired',target:new Date(now-3600001).toISOString()},{...source,id:'near',target:new Date(now+86400000).toISOString()}];
 h.stored.countdownTemplates=[{...source,id:'template',target:new Date(now-3600001).toISOString()}];
 await h.get('reload').onclick();await tick();
 assert.deepEqual(h.stored.countdowns.map(item=>item.id),['near','late']);assert.equal(h.stored.countdownTemplates.length,1);assert.equal(h.stored.unrelated,'keep');
 assert.equal(h.get('countdown-choice').children[0].textContent,'1. '+source.title);
});
test('built-in boy GIFs are selectable and preserved in templates without uploading files',async()=>{
 const h=setup();await tick();h.get('add').onclick();h.get('event-gif').value='geburtstag-junge';h.get('event-gif').onchange();
 h.get('save-template').onclick();await h.get('save').onclick();
 assert.equal(h.stored.countdowns[0].eventGif,'geburtstag-junge');assert.equal(h.stored.countdowns[0].image,'');assert.equal(h.stored.countdownTemplates[0].eventGif,'geburtstag-junge');
 const file=new Blob(['example'],{type:'image/png'});file.name='own.png';h.get('image').files=[file];h.get('image').onchange();assert.equal(h.get('event-gif').value,'');
});
