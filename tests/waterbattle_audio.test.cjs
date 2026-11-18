const test=require("node:test");
const assert=require("node:assert/strict");
const {Player,SOUNDS,MUSIC}=require("../examples/mupi-wasserschlacht/audio-player.js");

class MockAudio {
 constructor(src){this.src=src;this.loop=false;this.volume=1;this.paused=true;this.currentTime=0;MockAudio.created.push(this);}
 play(){this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
}
MockAudio.created=[];
global.Audio=MockAudio;

test("all six bundled offline sound filenames",()=>{
 const p=new Player();
 assert.equal(Object.keys(SOUNDS).length,5);
 assert.equal(Object.values(SOUNDS).every(v=>v.startsWith("assets/audio/")&&v.endsWith(".ogg")),true);
 assert.equal(MUSIC,"assets/audio/bg-music.ogg");
 assert.equal(p.music.loop,true);
});

test("browser: volume, mute, music loop, and effects",async()=>{
 const p=new Player();
 p.configure({volume:65,musicVolume:15,muted:false,musicEnabled:true});
 assert.equal(p.music.volume,.15);
 assert.equal(p.sfx.hit.volume,.65);
 p.startMusic();assert.equal(p.music.paused,false);
 assert.equal(await p.sound("hit"),true);assert.equal(p.sfx.hit.paused,false);
 p.configure({muted:true});assert.equal(p.music.paused,true);
 assert.equal(p.sfx.miss.volume,0);
 assert.equal(await p.sound("sunk"),false);
 p.configure({muted:false,musicEnabled:false});
 assert.equal(p.music.paused,true);
 p.configure({musicEnabled:true});assert.equal(p.music.paused,false);
 p.stopMusic();assert.equal(p.music.paused,true);assert.equal(p.music.currentTime,0);
});

test("native: sample and looping music go to PipeWire SDK with relative volume",async()=>{
 const calls=[];
 const native={
  playMusic:(asset,volume,opts)=>{calls.push(["playMusic",asset,volume,opts]);return Promise.resolve({playing:true});},
  stopMusic:()=>{calls.push(["stopMusic"]);return Promise.resolve({ok:true});},
  playSample:(asset,volume,opts)=>{calls.push(["playSample",asset,volume,opts]);return Promise.resolve({playing:true});}
 };
 const p=new Player(true,native);
 p.configure({volume:70,musicVolume:25,muted:false,musicEnabled:true});
 p.startMusic();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls.length,0,'native output waits for capability report');
 p.setNativeAvailable(true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls[0],["playMusic",MUSIC,25,{relative:true}]);
 assert.equal(await p.sound("hit"),true);
 assert.deepEqual(calls[1],["playSample",SOUNDS.hit,70,{relative:true}]);
 p.configure({musicVolume:40});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls[2],["playMusic",MUSIC,40,{relative:true}]);
 p.configure({muted:true});
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(calls.some(c=>c[0]==="stopMusic"));
 assert.equal(await p.sound("miss"),false);
 assert.equal(p.music,null);
 p.stopMusic();
});

test("older box API gracefully uses native-note fallback",async()=>{
 const p=new Player(true,{playNote:async()=>({ok:true})});
 assert.equal(p.nativeAvailable,false);
 assert.equal(await p.sound("sunk"),false);
 p.startMusic();p.stopMusic();
 const failing=new Player(true,{
  playMusic:()=>Promise.reject(new Error("old host")),
  stopMusic:()=>Promise.resolve(),
  playSample:()=>Promise.reject(new Error("old host"))
 });
 // Do not make tests depend on the console warning text.
 failing.warned=true;
 assert.equal(await failing.sound("hit"),false);
});
