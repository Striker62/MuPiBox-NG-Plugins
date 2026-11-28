const {test} = require('node:test');
const assert = require('node:assert/strict');
const {create,recordingPath} = require('../examples/Buecherkiste/admin/book-recorder.js');
const tick = () => new Promise(resolve => setImmediate(resolve));
test('playback reports media duration and progress and removes listeners at the end',async()=>{
  const h=setup(),listeners=new Map();
  const player={currentTime:0,duration:12.5,pause(){},addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);}};
  h.sdk.audio.playRecording=async()=>({player,release(){}});
  await h.recorder.play();assert.equal(h.recorder.snapshot.playbackDurationMs,12500);
  player.currentTime=4;listeners.get('timeupdate')();assert.equal(h.recorder.snapshot.playbackMs,4000);
  listeners.get('ended')();assert.equal(h.recorder.snapshot.playing,false);assert.equal(listeners.size,0);
  h.recorder.setPage({bookId:'buch',page:{path:'images/02.jpg'},number:2,saved:true});
  assert.equal(h.recorder.snapshot.playbackDurationMs,0);
});
function setup() {
  const calls=[],locks=[];let finish,reject,serial=0;
  const page={path:'images/01.jpg',recording:{path:'audio/old.ogg',revision:'old',size:25}};
  const sdk={audio:{
    async listInputDevices(){return {box:[{id:'capture0',label:'USB microphone'}],browser:[{id:'pc',label:'PC'}],secureContext:false};},
    startRecording(options){calls.push(['start',options]);return new Promise((resolve,fail)=>{finish=resolve;reject=fail;});},
    async getRecordingStatus(){return {state:'recording',durationMs:1200};},
    async stopRecording(){const path=calls.findLast(row=>row[0]==='start')[1].path;finish({path,revision:'new',size:123});},
    async cancelRecording(){calls.push(['cancel']);finish?.({cancelled:true});},
    async playRecording(path){calls.push(['play',path]);return {player:{pause(){calls.push(['pause']);}},release(){calls.push(['release']);}};},
    async deleteRecording(path,options){calls.push(['trash',path,options]);}
  }};
  const recorder=create(sdk,{lock:value=>locks.push(value),unique:()=>('recording'+ ++serial)});
  recorder.setPage({bookId:'buch',page,number:1,saved:true,isCover:false});
  return {recorder,sdk,page,calls,locks,finish:result=>finish(result),fail:error=>reject(error)};
}
test('recording does not replace an existing page until preview and explicit adoption',async()=>{
  const h=setup();await h.recorder.scan();const old=h.page.recording;
  const pending=h.recorder.start(0);await tick();
  assert.equal(h.recorder.snapshot.locked,true);assert.equal(h.page.recording,old);
  assert.deepEqual(h.calls[0],['start',{source:'box',deviceId:'capture0',path:'books/buch/audio/seite-001-recording1.ogg',expectedRevision:''}]);
  await h.recorder.stop();await pending;assert.equal(h.recorder.snapshot.locked,true);
  h.recorder.adopt();assert.equal(h.page.recording,old,'cannot adopt before listening');
  await h.recorder.play();h.recorder.adopt();
  assert.deepEqual(h.page.recording,{path:'audio/seite-001-recording1.ogg',revision:'new',size:123});
  assert.equal(h.recorder.snapshot.locked,false);assert.deepEqual(h.locks,[true,false]);
  assert.equal(h.calls.some(row=>row[0]==='trash'),false,'never delete an old published recording');
});
test('discard trashes only the candidate using its exact revision and filename',async()=>{
  const h=setup();await h.recorder.scan();const old=h.page.recording;
  const pending=h.recorder.start(0);await h.recorder.stop();await pending;
  await h.recorder.discard();
  assert.deepEqual(h.calls.find(row=>row[0]==='trash'),['trash','books/buch/audio/seite-001-recording1.ogg',{expectedRevision:'new',confirmName:'seite-001-recording1.ogg'}]);
  assert.equal(h.page.recording,old);assert.equal(h.recorder.snapshot.locked,false);
});
test('failed deletion or playback retains the candidate and its old page association',async()=>{
  const h=setup();await h.recorder.scan();const old=h.page.recording;
  const pending=h.recorder.start(0);await h.recorder.stop();await pending;
  h.sdk.audio.playRecording=async()=>{throw Error('missing');};
  await assert.rejects(h.recorder.play(),/missing/);h.recorder.adopt();assert.equal(h.page.recording,old);
  h.sdk.audio.deleteRecording=async()=>{throw Error('409');};
  await assert.rejects(h.recorder.discard(),/409/);assert.ok(h.recorder.snapshot.candidate);assert.equal(h.recorder.snapshot.locked,true);
});
test('insecure PC context offers only box microphones; secure context permits browser recording',async()=>{
  const h=setup();await h.recorder.scan();assert.equal(h.recorder.snapshot.inputs.length,1);
  h.sdk.audio.listInputDevices=async()=>({box:[],browser:[{id:'pc',label:'PC mic'}],secureContext:true});
  await h.recorder.scan();const pending=h.recorder.start(0,'ogg');await tick();
  const call=h.calls.find(row=>row[0]==='start')[1];assert.equal(call.source,'browser');assert.equal(call.deviceId,'');assert.match(call.path,/\.ogg$/);
  await h.recorder.cancel();await pending;
});
test('covers can record; unsaved books and unsafe recording references are rejected',async()=>{
  const h=setup();await h.recorder.scan();
  h.recorder.setPage({bookId:'buch',page:h.page,saved:true,isCover:true});
  const pending=h.recorder.start(0);await h.recorder.cancel();await pending;
  h.recorder.setPage({bookId:'../buch',page:h.page,saved:true,isCover:false});
  await assert.rejects(h.recorder.start(0),/Buch zuerst/);
  for(const path of ['../x.ogg','audio/../../x.ogg','https://host/x.ogg','audio/x.mp3','audio/.hidden.ogg'])assert.equal(recordingPath(path),false);
});
test('cancel and failed capture preserve previous recording and unlock the editor',async()=>{
  const h=setup();await h.recorder.scan();const old=h.page.recording;
  let pending=h.recorder.start(0);await h.recorder.cancel();await pending;assert.equal(h.page.recording,old);assert.equal(h.recorder.snapshot.locked,false);
  pending=h.recorder.start(0);h.fail(Error('microphone disconnected'));await pending;
  assert.equal(h.page.recording,old);assert.match(h.recorder.snapshot.message,/disconnected/);assert.equal(h.recorder.snapshot.locked,false);
});
test('navigation disposes playback and cancels a pending host recording',async()=>{
  const h=setup();await h.recorder.scan();await h.recorder.play();
  const pending=h.recorder.start(0);h.recorder.dispose();await pending;
  assert.ok(h.calls.some(row=>row[0]==='release'));assert.ok(h.calls.some(row=>row[0]==='cancel'));assert.equal(h.page.recording.path,'audio/old.ogg');
});
test('wrong host file reference is not accepted as a candidate',async()=>{
  const h=setup();await h.recorder.scan();const pending=h.recorder.start(0);
  h.finish({path:'books/other/audio/file.ogg',revision:'x',size:50});await pending;
  assert.equal(h.recorder.snapshot.candidate,null);assert.match(h.recorder.snapshot.message,/keine gültige/);
});
