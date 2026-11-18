const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../examples/funny-mupi');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

async function launch({hostname, preview = false, enabled = true, available = true, spokenState = 'completed', afterClipQueued = false}) {
  const elements = new Map();
  const calls = [];
  for (const id of ['bubble', 'next', 'exit', 'language', 'joke', 'status', 'hint', 'exit-label', 'next-label']) {
    const handlers = {};
    elements.set(id, {
      textContent: '',
      disabled: false,
      handlers,
      addEventListener: (name, fn) => handlers[name] = fn,
      click() { this.handlers.click?.(); }
    });
  }
  const sdk = {
    getContext: async () => ({language: 'de-DE', preview}),
    tts: {
      stop: async () => { calls.push(['boxStop']); },
      status: async () => { calls.push(['boxStatus']); return {enabled, available}; },
      speak: async (text, options) => { calls.push(['boxSpeak', text, options]); return {state:spokenState, after_clip_queued:afterClipQueued}; }
    },
    audio: {playClip: async (asset) => {calls.push(['boxClip', asset]);}},
    exit: async () => {calls.push(['exit']);},
    on: () => {}
  };
  const speech = {
    utterance: null,
    cancel: () => { calls.push(['browserCancel']); },
    speak: (utterance) => { speech.utterance = utterance; calls.push(['browserSpeak', utterance.text, utterance.lang]); }
  };
  class Audio {
    constructor(src) {this.src=src;this.currentTime=0;}
    async play() {calls.push(['browserClip',this.src]);}
    pause() {calls.push(['browserClipPause',this.src]);}
  }
  const window = {MuPiBoxSDK:sdk, location:{hostname}, speechSynthesis:speech, Audio,
    SpeechSynthesisUtterance: class {constructor(text) {this.text=text;}}};
  const document = {
    getElementById: id => elements.get(id),
    documentElement: {lang:'de'},
    addEventListener() {},
    hidden: false
  };
  const fetch = async file => ({
    ok: true,
    json: async () => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
  });
  vm.runInNewContext(app, {window, document, navigator:{language:'de-DE'}, fetch, console});
  for (let n = 0; n < 15; n++) await Promise.resolve();
  return {calls, elements, speech, click: id => elements.get(id).click()};
}

test('remote admin preview speaks in this browser even if older host marks preview false', async () => {
  const b = await launch({hostname: '192.168.2.83', preview: false, enabled: false, available: false});
  b.click('bubble');
  for (let n=0;n<10;n++) await Promise.resolve();
  const speech = b.calls.find(c => c[0] === 'browserSpeak');
  assert.ok(speech, 'browser speech did not start');
  assert.equal(speech[2], 'de-DE');
  assert.ok(!b.calls.some(c => c[0] === 'boxSpeak' || c[0] === 'boxStatus'));
  b.click('next');
  assert.ok(b.calls.some(c=>c[0]==='browserCancel'));
});

test('native box uses configured host TTS rather than browser voice', async () => {
  const b = await launch({hostname:'127.0.0.1'});
  b.click('bubble');
  for(let n=0;n<12;n++) await Promise.resolve();
  assert.ok(b.calls.some(c=>c[0]==='boxSpeak'));
  assert.ok(!b.calls.some(c=>c[0]==='browserSpeak'));
});

test('disabled TTS and missing voice cache have different actionable messages', async () => {
  const off = await launch({hostname:'localhost', enabled:false, available:false});
  off.click('bubble');
  for(let n=0;n<12;n++) await Promise.resolve();
  assert.match(off.elements.get('status').textContent, /TTS ist ausgeschaltet/);
  const cache = await launch({hostname:'localhost', enabled:true, available:false});
  cache.click('bubble');
  for(let n=0;n<12;n++) await Promise.resolve();
  assert.match(cache.elements.get('status').textContent, /noch nicht bereit/);
  assert.ok(!cache.calls.some(c=>c[0]==='boxSpeak'));
});


test('end of browser speech plays the bundled laugh once, never when stopped', async () => {
  const b = await launch({hostname:'192.168.2.83'});
  b.click('bubble');
  for(let n=0;n<12;n++) await Promise.resolve();
  assert.equal(b.calls.filter(c=>c[0]==='browserClip').length,0);
  b.speech.utterance.onend();
  for(let n=0;n<12;n++) await Promise.resolve();
  assert.deepEqual(b.calls.filter(c=>c[0]==='browserClip').map(c=>c[1]),['assets/laugh-ionakan-712055.mp3']);
  b.click('next');
  assert.equal(b.calls.filter(c=>c[0]==='browserClipPause').length,1);
  b.click('bubble');
  for(let n=0;n<12;n++) await Promise.resolve();
  b.click('next');
  b.speech.utterance.onend();
  for(let n=0;n<12;n++) await Promise.resolve();
  assert.equal(b.calls.filter(c=>c[0]==='browserClip').length,1);
});

test('native speech completion invokes on-device audio.clip exactly once', async () => {
  const b = await launch({hostname:'localhost'});
  b.click('bubble');
  for(let n=0;n<20;n++) await Promise.resolve();
  assert.equal(b.calls.filter(c=>c[0]==='boxClip').length,1);
  assert.equal(b.calls.find(c=>c[0]==='boxSpeak')[2].waitForCompletion,true);
  assert.equal(b.calls.find(c=>c[0]==='boxClip')[1], 'assets/laugh-ionakan-712055.mp3');
  assert.equal(b.calls.filter(c=>c[0]==='browserClip').length,0);
  const stopped = await launch({hostname:'localhost',spokenState:'stopped'});
  stopped.click('bubble');
  for(let n=0;n<20;n++) await Promise.resolve();
  assert.equal(stopped.calls.filter(c=>c[0]==='boxClip').length,0);
});


test('new host plays the laugh inline without a second audio.clip request', async () => {
  const b = await launch({hostname:'localhost', afterClipQueued:true});
  b.click('bubble');
  for (let n=0;n<20;n++) await Promise.resolve();
  const request = b.calls.find(c=>c[0]==='boxSpeak');
  assert.equal(request[2].afterClip,'assets/laugh-ionakan-712055.wav');
  assert.equal(request[2].waitForCompletion,true);
  assert.equal(b.calls.filter(c=>c[0]==='boxClip').length,0);
  assert.equal(b.calls.filter(c=>c[0]==='browserClip').length,0);
  assert.equal(b.elements.get('status').textContent,'');
});
