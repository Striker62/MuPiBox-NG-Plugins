'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const G = require('../examples/mupi-run/logic.js');

test('start, lane change, stop at riverbanks, jump and crouch',()=>{
  const s=G.fresh(123);
  assert.equal(s.phase,'ready');
  assert.equal(G.act(s,'start'),true);
  G.act(s,'left');G.act(s,'left');assert.equal(s.lane,-1);
  G.act(s,'right');assert.equal(s.lane,0);
  G.act(s,'jump');assert.ok(G.jumpHeight(s)<1);
  assert.equal(G.act(s,'duck'),false);  // cannot duck mid-jump
  for(let i=0;i<8;i++)G.step(s,.05);
  assert.ok(G.jumpHeight(s)>28);
  for(let i=0;i<22;i++)G.step(s,.05);
  assert.equal(s.jumpAge,-1);
  G.act(s,'duck');assert.equal(G.ducking(s),true);
});

test('hazards are solvable: lane avoidance plus actual duck under full-width bridge',()=>{
  const s=G.fresh(42);G.act(s,'start');
  for(let i=0;i<20000;i++){
    // Avoid ordinary obstacles by using the safe lane; full-width bridges
    // instead require ducking. Start crouching just before reaching the bar.
    for(const item of s.obstacles.filter(o=>o.z<19&&o.z>0)){
      if(item.lane===null && item.z<8 && s.duckAge<0){
        G.act(s,'duck');
      } else if(item.lane===s.lane){
        const free=G.LANES.find(l=>!s.obstacles.some(o=>o.lane===l&&Math.abs(o.z-item.z)<3));
        if(free!==undefined)s.lane=free;
      }
    }
    if(s.phase==='over')break;
    G.step(s,.025);
  }
  assert.ok(s.distance>300,'Runner should be able to progress');
  assert.ok(G.speedAt(200)>G.speedAt(0));
  assert.equal(G.speedAt(99999),29);
  assert.ok(s.waves>5);
});

test('collision and action-specific protection',()=>{
  const fail=G.fresh(33); G.act(fail,'start');
  fail.obstacles=[{lane:0,z:2.04,kind:'avoid',item:'stump',checked:false}];
  G.step(fail,.03);assert.equal(fail.phase,'over');
  const jump=G.fresh(33); G.act(jump,'start');
  G.act(jump,'jump');
  for(let i=0;i<5;i++)G.step(jump,.05);
  jump.obstacles=[{lane:0,z:2.04,kind:'jump',item:'rock',checked:false}];
  G.step(jump,.03);assert.equal(jump.phase,'running');
  const duck=G.fresh(33); G.act(duck,'start');G.act(duck,'duck');
  for(let i=0;i<7;i++)G.step(duck,.05);
  duck.obstacles=[{lane:0,z:2.04,kind:'duck',item:'vine',checked:false}];
  G.step(duck,.03);assert.equal(duck.phase,'running');
});

test('pausing and resume do not secretly advance running distance',()=>{
  const s=G.fresh(99);G.act(s,'start');
  G.step(s,.025);const before=s.distance;
  G.act(s,'pause');G.step(s,20);
  assert.equal(s.distance,before);
  G.act(s,'pause');assert.equal(s.phase,'running');
  G.step(s,.025);assert.ok(s.distance>before);
});

test('all hazard definitions map to an action',()=>{
  const all=Object.values(G.kinds).flat();
  assert.equal(new Set(all).size,all.length);
  assert.equal(G.LANES.length,3);
});
test('terrain alternates between stream, boardwalk and dry forest',()=>{
  assert.equal(G.terrainAt(0),'river');
  assert.equal(G.terrainAt(194),'river');
  assert.equal(G.terrainAt(195),'boardwalk');
  assert.equal(G.terrainAt(359),'boardwalk');
  assert.equal(G.terrainAt(360),'forest');
  assert.equal(G.terrainAt(529),'forest');
  assert.equal(G.terrainAt(530),'river');
  assert.equal(G.terrainAt(650),'river');
  assert.equal(G.terrainAt(845),'boardwalk');
});

test('full-width bridge requires ducking and cannot be dodged by changing lanes',()=>{
  for(const lane of G.LANES){
    const s=G.fresh(27);G.act(s,'start');
    s.lane=lane;
    s.obstacles=[{lane:null,z:2.04,kind:'duck',item:'low-bridge',checked:false}];
    G.step(s,.03);
    assert.equal(s.phase,'over','Low bridge must collide without crouching in lane '+lane);
  }
  const s=G.fresh(27);G.act(s,'start');G.act(s,'duck');
  for(let i=0;i<11;i++)G.step(s,.03);
  s.obstacles=[{lane:null,z:2.04,kind:'duck',item:'low-bridge',checked:false}];
  G.step(s,.03);
  assert.equal(s.phase,'running');
  assert.equal(s.completedDucks,1);
  assert.equal(s.obstacles[0].passed,true);
});

test('early tutorial includes mandatory duck bridge and a stepping stone jump later',()=>{
  const s=G.fresh(271);
  G.act(s,'start');
  while(s.waves<3)G.step(s,.05);
  assert.ok(s.obstacles.some(x=>x.item==='low-bridge'&&x.lane===null));
});

test('collision uses rendered position during lane transition, not destination',()=>{
  const s=G.fresh(33);G.act(s,'start');
  s.obstacles=[{lane:0,z:2.04,kind:'avoid',item:'stump',checked:false}];
  G.act(s,'right');
  G.step(s,.02);
  assert.equal(s.lane,1);
  assert.ok(s.visualLane<.6);
  assert.equal(s.phase,'over','cannot evade before body visibly reaches safe lane');

  const clear=G.fresh(33);G.act(clear,'start');
  G.act(clear,'right');
  for(let i=0;i<8;i++)G.step(clear,.025);
  assert.ok(clear.visualLane>.8,'avatar visibly moved to next lane');
  clear.obstacles=[{lane:0,z:2.04,kind:'avoid',item:'stump',checked:false}];
  G.step(clear,.02);
  assert.equal(clear.phase,'running','collision agrees with rendered location');
  assert.equal(clear.completedDodges,1);
});

test('obstacles in destination lane still hit as the character arrives',()=>{
  const s=G.fresh(33);G.act(s,'start');G.act(s,'right');
  for(let i=0;i<6;i++)G.step(s,.025);
  s.obstacles=[{lane:1,z:2.04,kind:'avoid',item:'basket',checked:false}];
  G.step(s,.02);
  assert.equal(s.phase,'over');
});

test('notes are lane-local, collected only once and frozen by pause',()=>{
  const s=G.fresh(7); G.act(s,'start');
  s.notes=[{z:2.02,lane:0},{z:2.02,lane:1}];
  G.act(s,'pause');G.step(s,.04);assert.equal(s.notes[0].z,2.02);
  G.act(s,'pause');G.step(s,.04);assert.equal(s.noteCount,1);
  assert.equal(s.notes.length,1);
  G.step(s,.05);assert.equal(s.noteCount,1);
  assert.equal(G.fresh(7).noteCount,0);
});

test('both clips start in the visible pose and resume the designated run frame',()=>{
  const vm=require('node:vm'), fs=require('node:fs'), path=require('node:path');
  const ctx={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../examples/mupi-run/poses.js'),'utf8'),ctx);
  for(const name of ['jump','slide']){
    const spec=ctx.window.MuPiPoses.actions[name];
    for(let phase=0;phase<24;phase++){
      const s=G.fresh(131);G.act(s,'start');s.runPose=phase+.25;
      assert.ok(G.act(s,name==='jump'?'jump':'duck',spec.resume[phase]));
      assert.equal(s.entryPose,phase);assert.equal(spec.clips[phase][0],phase*5);
      assert.equal(spec.clips[phase].length,35);
      G.act(s,'pause');G.step(s,.075);G.act(s,'pause');
      assert.equal(s.jumpAge<0?s.duckAge:s.jumpAge,0);
      for(let i=0;i<70;i++)G.step(s,1/60);
      assert.ok(Math.abs(s.runPose-spec.resume[phase])<.01);
    }
  }
});

test('the low bridge collides before the glide and after rising',()=>{
  for(const [age,expected] of [[.05,'over'],[.36,'running'],[.87,'over']]){
    const s=G.fresh(22);G.act(s,'start');G.act(s,'duck');
    s.duckAge=age;s.obstacles=[{lane:null,z:2,kind:'duck',item:'low-bridge'}];
    G.step(s,.02);assert.equal(s.phase,expected);
  }
});

test('optional sound slots dispatch on the native SDK and silence on pause',()=>{
  const vm=require('node:vm'), fs=require('node:fs'), path=require('node:path');
  const ctx={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../examples/mupi-run/sound.js'),'utf8'),ctx);
  const calls=[];
  const audio={};
  for(const method of ['playMusic','playSample','stopMusic','stopSamples']){
    audio[method]=async(...args)=>{calls.push([method,...args]);};
  }
  const slots=Object.fromEntries(['music','run','jump','slide','collect','kilometer'].map(n=>[n,'assets/audio/'+n+'.ogg']));
  const make=files=>ctx.window.createRunAudio({isHosted:true,audio},files);
  const silent=make({});silent.active(true);silent.play('jump');silent.active(false);
  assert.equal(calls.length,0);
  const player=make(slots);player.active(true);player.active(true);
  for(const name of ['run','jump','slide','collect','kilometer'])player.play(name);
  player.active(false);player.play('run');
  assert.deepEqual(calls.map(c=>c[0]),['playMusic',...Array(5).fill('playSample'),'stopMusic','stopSamples']);
  assert.deepEqual(calls.slice(0,6).map(c=>c[1]),Object.values(slots));
});
