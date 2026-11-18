const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../examples/funny-mupi');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

async function launch({hostname, preview = false, enabled = true, available = true}) {
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
      speak: async (text) => { calls.push(['boxSpeak', text]); }
    },
    exit: async () => {calls.push(['exit']);},
    on: () => {}
  };
  const speech = {
    cancel: () => { calls.push(['browserCancel']); },
    speak: (utterance) => { calls.push(['browserSpeak', utterance.text, utterance.lang]); }
  };
  const window = {MuPiBoxSDK:sdk, location:{hostname}, speechSynthesis:speech,
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
  return {calls, elements, click: id => elements.get(id).click()};
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
