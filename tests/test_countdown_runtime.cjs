'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const model=require('../examples/countdown/model.js'),tick=()=>new Promise(resolve=>setImmediate(resolve));
test('child runtime navigates, pauses, resumes and celebrates completed targets without repeating',async()=>{
 const nodes=new Map();function element(){return {children:[],hidden:false,style:{},classList:{add(){},remove(){},toggle(){}},replaceChildren(){this.children=[];},append(node){this.children.push(node);},removeAttribute(){},setAttribute(){}};}
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},handlers={};let intervals=0;
 const events=[{id:'first',title:'Geburtstag',target:new Date(Date.now()+86400000).toISOString(),zone:'Europe/Berlin',theme:'birthday',mode:'days',image:'bilder/test.jpg',imageLayout:'background',animation:true},{id:'second',title:'Schon da',target:'2025-01-01T00:00:00.000Z',zone:'Europe/Berlin',theme:'winter',mode:'clock',image:'',animation:true}];
 const sdk={config:{get:async()=>({countdowns:events})},shared:{read:async()=>new Blob(['test'],{type:'image/jpeg'})},on(name,fn){handlers[name]=fn;},exit:async()=>{}};
 const context={window:{MuPiBoxSDK:sdk,CountdownModel:model,addEventListener(){}},document:{getElementById:get,createElement:element,body:element(),addEventListener(){}},Intl,Date,Set,URL,Blob,console,setInterval(){intervals++;return intervals;},clearInterval(){intervals--;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../examples/countdown/app.js'),'utf8'),context);await tick();
 assert.equal(get('title').textContent,'Geburtstag');assert.equal(get('prev').disabled,true);assert.equal(intervals,1);
 assert.equal(get('background-picture').hidden,false);assert.equal(get('picture').hidden,true);
 get('next').onclick();await tick();assert.equal(get('title').textContent,'Schon da');assert.equal(get('numbers').children[0].children[0].textContent,'Hurra!');assert.equal(get('confetti').children.length,24);
 assert.equal(get('background-picture').hidden,true);
 get('prev').onclick();await tick();get('next').onclick();await tick();assert.equal(get('confetti').children.length,0,'celebrates only once per session');
 handlers['lifecycle.pause']();assert.equal(intervals,0);handlers['lifecycle.resume']();await tick();assert.equal(intervals,1);
});
