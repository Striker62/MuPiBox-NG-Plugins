const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').resolve(__dirname,'../sdk/mupibox-sdk.js'),'utf8');

function getSDK(bridge) {
 const calls=[];
 const window={navigator:{language:'de'},console,localStorage:{getItem:()=>null,setItem:()=>{}},addEventListener:()=>{}};
 if(bridge)window.__MUPIBOX_BRIDGE__={invoke:async(method,payload)=>{calls.push({method,payload});return{ok:true}},subscribe:()=>()=>{}};
 vm.runInNewContext(code,{window,console},{filename:'mupibox-sdk.js'});
 return {sdk:window.MuPiBoxSDK,calls};
}
test('audio permission is requested through the trusted host only',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.playNote('C4',30,'musicbox');
 assert.equal(calls.length,1);
 assert.equal(calls[0].method,'audio.note');
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{note:'C4',volume:30,instrument:'musicbox'});
});
test('invalid note, volume and instruments are rejected before invoking the host',async()=>{
 const {sdk,calls}=getSDK(true);
 for(const args of [['A9',30],['C4',-1],['C4',101],['C4',50.1],['C4',30,'shell']]){
  await assert.rejects(()=>sdk.audio.playNote(...args),{name:'TypeError'});
 }
 assert.equal(calls.length,0);
});
test('browser standalone fallback stays available without a privileged bridge',async()=>{
 const {sdk}=getSDK(false);
 assert.equal(sdk.isHosted,false);
 assert.equal(await sdk.audio.playNote('G4',30,'musicbox'),false);
});


test('bundled audio clip uses the trusted audio bridge with strict asset validation',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.playClip('assets/laugh-ionakan-712055.mp3');
 assert.equal(calls[0].method,'audio.clip');
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{asset:'assets/laugh-ionakan-712055.mp3'});
 for(const invalid of ['../secret.wav','assets/../../secret.mp3','https://example.com/sound.mp3','assets/file.js','assets/.private.mp3','assets/foo.mp3?x']) {
  await assert.rejects(()=>sdk.audio.playClip(invalid),{name:'TypeError'});
 }
 assert.equal(calls.length,1);
});


test('native PCM sound and loop requests are scoped to installed audio assets',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.playSample('assets/audio/hit.ogg',65,{relative:true});
 await sdk.audio.playMusic('assets/audio/bg-music.ogg',20,{relative:true});
 await sdk.audio.stopMusic();
 await sdk.audio.stopSamples();
 assert.deepEqual(calls.map(c=>c.method),['audio.sample.play','audio.music.play','audio.music.stop','audio.sample.stop']);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{asset:'assets/audio/hit.ogg',volume:65,relative:true});
 assert.deepEqual(JSON.parse(JSON.stringify(calls[1].payload)),{asset:'assets/audio/bg-music.ogg',volume:20,relative:true});
 for(const invalid of ['../evil.ogg','assets/../sound.ogg','https://example.org/tone.ogg','assets/foo.js','assets/.secret.wav']) {
  await assert.rejects(()=>sdk.audio.playSample(invalid),{name:'TypeError'});
  await assert.rejects(()=>sdk.audio.playMusic(invalid),{name:'TypeError'});
 }
 for(const invalid of [-1,101,1.5,'loud']) {
  await assert.rejects(()=>sdk.audio.playSample('assets/audio/hit.ogg',invalid),{name:'TypeError'});
 }
 assert.equal(calls.length,4);
});

test('native audio gain controls validate levels without replaying sample assets',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.setMusicVolume(10,{relative:true});
 await sdk.audio.setSampleVolume(80,{relative:true});
 await sdk.audio.setMusicVolume(0,{relative:true});
 assert.deepEqual(calls.map(c=>c.method),['audio.music.volume','audio.sample.volume','audio.music.volume']);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{volume:10,relative:true});
 assert.deepEqual(JSON.parse(JSON.stringify(calls[1].payload)),{volume:80,relative:true});
 assert.deepEqual(JSON.parse(JSON.stringify(calls[2].payload)),{volume:0,relative:true});
 for(const invalid of [-1,101,1.5,'loud']){
  await assert.rejects(()=>sdk.audio.setMusicVolume(invalid),{name:'TypeError'});
  await assert.rejects(()=>sdk.audio.setSampleVolume(invalid),{name:'TypeError'});
 }
 assert.equal(calls.length,3);
});


test('sample preloading uses the trusted bounded PCM cache bridge without playing audio',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.prepareSample('assets/audio/jump.wav');
 assert.deepEqual(calls.map(c=>c.method),['audio.sample.prepare']);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{
  asset:'assets/audio/jump.wav',volume:0,relative:true
 });
 for(const invalid of ['../secret.wav','assets/../secret.wav','assets/.hidden.wav',
    'https://example.org/a.mp3','assets/test.js','assets/a.ogg?query=1']) {
   await assert.rejects(()=>sdk.audio.prepareSample(invalid),{name:'TypeError'});
 }
 assert.equal(calls.length,1);
});

test('sample preloading in browser preview does not invent host PCM caching',async()=>{
 const {sdk}=getSDK(false);
 assert.equal(await sdk.audio.prepareSample('assets/audio/jump.wav'),false);
});

test('music preloading validates the same scoped asset rules but never plays a loop',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.prepareMusic('assets/audio/level.wav');
 assert.deepEqual(calls.map(c=>c.method),['audio.music.prepare']);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{
  asset:'assets/audio/level.wav',volume:0,relative:true
 });
 for(const invalid of ['../secret.wav','assets/../../secret.mp3',
  'https://example.net/music.wav','assets/.hidden.wav','assets/a.js']) {
  await assert.rejects(()=>sdk.audio.prepareMusic(invalid),{name:'TypeError'});
 }
 assert.equal(calls.length,1);
 const standalone=getSDK(false);
 assert.equal(await standalone.sdk.audio.prepareMusic('assets/audio/level.wav'),false);
});

test('music pause and resume keep the owner-scoped host event, without sending playback files',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.pauseMusic();
 await sdk.audio.resumeMusic();
 assert.deepEqual(calls.map(c=>c.method),['audio.music.pause','audio.music.resume']);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{});
 assert.deepEqual(JSON.parse(JSON.stringify(calls[1].payload)),{});
 const preview=getSDK(false).sdk;
 assert.equal(await preview.audio.pauseMusic(),false);
 assert.equal(await preview.audio.resumeMusic(),false);
});

test('music hold/restore uses the session-scoped trusted bridge, never raw audio',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.holdMusic();
 await sdk.audio.restoreMusic();
 assert.deepEqual(calls.map(c=>c.method),['audio.music.hold','audio.music.restore']);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{});
 assert.deepEqual(JSON.parse(JSON.stringify(calls[1].payload)),{});
 const preview=getSDK(false).sdk;
 assert.equal(await preview.audio.holdMusic(),false);
 assert.equal(await preview.audio.restoreMusic(),false);
});

test('one-shot victory music sets loop:false without altering legacy loop payloads',async()=>{
 const {sdk,calls}=getSDK(true);
 await sdk.audio.playMusic('assets/audio/victory.wav',40,{relative:true,loop:false});
 await sdk.audio.playMusic('assets/audio/level.wav',20,{relative:true});
 await sdk.audio.playMusic('assets/audio/menu.wav',20);
 assert.deepEqual(calls.map(c=>c.method),['audio.music.play','audio.music.play','audio.music.play']);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)),{
  asset:'assets/audio/victory.wav',volume:40,relative:true,loop:false
 });
 for(const call of calls.slice(1)) {
  assert.ok(!Object.prototype.hasOwnProperty.call(call.payload,'loop'),
    'legacy apps must keep default infinite loop');
 }
 for(const invalid of ['false',0,null,1]){
  await assert.rejects(()=>sdk.audio.playMusic('assets/audio/victory.wav',40,
    {relative:true,loop:invalid}),{name:'TypeError'});
 }
 assert.equal(calls.length,3);
});
