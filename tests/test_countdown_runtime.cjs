'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const model=require('../examples/countdown/model.js'),tick=()=>new Promise(resolve=>setImmediate(resolve));
test('child runtime navigates, pauses, resumes and celebrates completed targets without repeating',async()=>{
 const nodes=new Map();function element(){return {children:[],hidden:false,style:{},classList:{add(){},remove(){},toggle(){}},replaceChildren(){this.children=[];},append(node){this.children.push(node);},removeAttribute(){},setAttribute(name,value){this[name]=value;}};}
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},handlers={};let intervals=0,now=Date.now(),tickFn;
 const events=[{id:'first',title:'Geburtstag',target:new Date(now+86400000).toISOString(),zone:'Europe/Berlin',theme:'birthday',mode:'days',display:'dial',waitStart:new Date(now-86400000).toISOString(),image:'bilder/test.jpg',imageLayout:'background',animation:true},{id:'second',title:'Schon da',target:new Date(now-1000).toISOString(),zone:'Europe/Berlin',theme:'winter',mode:'clock',image:'',animation:true}];
 const sdk={config:{get:async()=>({countdowns:events})},shared:{read:async()=>new Blob(['test'],{type:'image/jpeg'})},on(name,fn){handlers[name]=fn;},exit:async()=>{}};
 const liveModel={...model,current:items=>model.current(items,now),remaining:item=>model.remaining(item,now),dial:item=>model.dial(item,now)};
 const context={window:{MuPiBoxSDK:sdk,CountdownModel:liveModel,addEventListener(){}},document:{getElementById:get,createElement:element,body:element(),addEventListener(){}},Intl,Date,Set,URL,Blob,console,setInterval(fn){tickFn=fn;intervals++;return intervals;},clearInterval(){intervals--;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../examples/countdown/app.js'),'utf8'),context);await tick();
 assert.equal(get('title').textContent,'Schon da');assert.equal(get('prev').disabled,true);assert.equal(intervals,1);
 assert.equal(get('numbers').children[0].children[0].textContent,'★');assert.equal(get('confetti').children.length,24);
 get('next').onclick();await tick();assert.equal(get('title').textContent,'Geburtstag');
 assert.equal(get('background-picture').hidden,false);assert.equal(get('picture').hidden,true);
 assert.equal(get('background-picture').style.objectFit,'contain');
 assert.equal(get('wait-clock').hidden,false);assert.equal(get('numbers').hidden,true);assert.match(get('clock-hand').transform,/^rotate\(180/);assert.match(get('clock-sector').d,/^M120 120/);
 get('prev').onclick();await tick();assert.equal(get('title').textContent,'Schon da');assert.equal(get('numbers').children[0].children[0].textContent,'★');assert.equal(get('message').textContent,'');assert.equal(get('confetti').children.length,0,'celebrates only once per session');
 assert.equal(get('background-picture').hidden,true);
 assert.equal(get('wait-clock').hidden,true);assert.equal(get('numbers').hidden,false);
 now+=3600000;tickFn();await tick();assert.equal(get('title').textContent,'Geburtstag');assert.equal(get('dots').children.length,1);
 handlers['lifecycle.pause']();assert.equal(intervals,0);handlers['lifecycle.resume']();await tick();assert.equal(intervals,1);
});
