const test = require("node:test");
const assert = require("node:assert/strict");
const audioPath = "../examples/mupi-wasserschlacht/audio-player.js";

class MockAudio {
 constructor(url) {this.src=url;this.loop=false;this.volume=1;this.paused=true;this.currentTime=0;MockAudio.created.push(this);}
 play(){this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
}
MockAudio.created=[];
global.Audio=MockAudio;
const {Player,SOUNDS}=require(audioPath);

test("all six offline sound filenames are wired",()=>{
 const p=new Player();
 assert.equal(Object.keys(SOUNDS).length,5);
 assert.equal(Object.values(SOUNDS).every(v=>v.startsWith("assets/audio/")&&v.endsWith(".ogg")),true);
 assert.equal(p.music.src,"assets/audio/bg-music.ogg");
 assert.equal(p.music.loop,true);
});
test("effects and looping background are separately mixed",()=>{
 const p=new Player();
 p.configure({volume:65,musicVolume:15,muted:false,musicEnabled:true});
 assert.equal(p.music.volume,.15);
 assert.equal(p.sfx.hit.volume,.65);
 p.startMusic();
 assert.equal(p.music.paused,false);
 assert.equal(p.sound("hit"),true);
 assert.equal(p.sfx.hit.paused,false);
 p.configure({muted:true});
 assert.equal(p.music.paused,true);
 assert.equal(p.sfx.miss.volume,0);
 assert.equal(p.sound("sunk"),false);
 p.configure({muted:false,musicEnabled:false});
 assert.equal(p.music.paused,true);
 p.configure({musicEnabled:true});
 assert.equal(p.music.paused,false);
 p.stopMusic(); assert.equal(p.music.paused,true);assert.equal(p.music.currentTime,0);
});
test("on native host, don't promise disconnected browser audio playback",()=>{
 const previous=MockAudio.created.length;
 const p=new Player(true);
 assert.equal(MockAudio.created.length,previous);
 assert.equal(p.music,null);
 assert.equal(p.sound("win"),false);
 p.startMusic();p.stopMusic();
});
