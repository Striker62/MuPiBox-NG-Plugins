'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const G=require('../examples/mupi-run/logic.js');

function nextAction(s){
 const imminent=s.obstacles.filter(o=>!o.checked&&o.z>0&&o.z<56).sort((a,b)=>a.z-b.z);
 if(!imminent.length)return null;
 const item=imminent[0];
 const group=imminent.filter(o=>Math.abs(o.z-item.z)<3);
 const speed=s.speed;
 const safe=G.LANES.filter(l=>!group.some(o=>o.lane===l));
 if(item.lane===null){
   if(item.z<speed*.66+2&&s.duckAge<0&&s.jumpAge<0)return 'duck';
   return null;
 }
 if(s.distance<65&&item.kind==='jump'&&item.z>32&&s.lane!==item.lane){
   return item.lane<s.lane?'left':'right';
 }
 const occupying=group.find(o=>o.lane!==null&&Math.abs(o.lane-s.visualLane)<.65);
 if(!occupying)return null;
 if(occupying.kind==='jump'&&item.z<speed*.67+2){
   if(s.jumpAge<0)return 'jump';
   return null;
 }
 if(occupying.kind==='jump')return null;
 if(occupying.kind==='duck'&&item.z<speed*.67+2){
   if(s.duckAge<0&&s.jumpAge<0)return 'duck';
   return null;
 }
 if(occupying.kind==='duck')return null;
 if(safe.length){
   const dest=safe.sort((a,b)=>Math.abs(a-s.lane)-Math.abs(b-s.lane))[0];
   if(s.lane!==dest)return dest<s.lane?'left':'right';
 }
 return null;
}
test('automated controller can complete all three terrains without teleporting',()=>{
 const s=G.fresh(414);G.act(s,'start');
 const count={left:0,right:0,jump:0,duck:0};
 const terrains=new Set();
 for(let i=0;i<1100&&s.phase==='running';i++){
   const action=nextAction(s);
   if(action&&G.act(s,action))count[action]++;
   G.step(s,.05);terrains.add(s.lastTerrain);
 }
 assert.equal(s.phase,'running','Autopilot died at '+s.distance.toFixed(1)+' m from '+s.crash);
 assert.ok(s.distance>650,'too short: '+s.distance);
 for(const name of ['river','boardwalk','forest'])assert.ok(terrains.has(name));
 assert.ok(count.duck>0&&count.jump>0&&count.left+count.right>0,JSON.stringify(count));
 console.log('Autopilot controls:',count,'distance',s.distance.toFixed(1),'m');
});
