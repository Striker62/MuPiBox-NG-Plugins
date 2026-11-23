'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '../examples/usb-cd-player/app.js'), 'utf8');

function fixture() {
  const elements = new Map();
  const timers = [];
  const calls = [];
  const media = {drives: [], discs: {}, playing: {active:false}};
  function node(tag = '') {
    const listeners = new Map();
    return {
      tag, children: [], value:'', textContent:'', disabled:false,
      classList: {toggle() {}},
      append(...items) {
        for (const item of items) this.children.push(...(item.tag === 'fragment' ? item.children : [item]));
        if (this.tag === 'select' && !this.value) this.value = this.children[0]?.value || '';
      },
      replaceChildren() {this.children.length = 0; if (this.tag === 'select') this.value = '';},
      addEventListener(type, fn) {listeners.set(type, fn);},
      trigger(type) {listeners.get(type)?.();}
    };
  }
  const document = {
    hidden:false,
    getElementById(id) {if (!elements.has(id)) elements.set(id, node(id === 'drive' ? 'select' : id)); return elements.get(id);},
    createElement:node,
    createDocumentFragment() {return node('fragment');}
  };
  const sdk = {
    isHosted:true, on() {}, exit() {}, supports:async () => true,
    optical: {
      async list() {calls.push('list'); return media.drives;},
      async disc(id) {calls.push('disc:' + id); if (!media.discs[id]) throw Error('no disc'); return media.discs[id];},
      async play(id, track) {calls.push('play:' + id + ':' + track); media.playing = {active:true, device:id, state:'playing', track};},
      async status() {calls.push('status'); return media.playing;},
      async transport(action) {calls.push('transport:' + action); if (action === 'stop') media.playing = {active:false};}
    }
  };
  const window = {MuPiBoxSDK:sdk, addEventListener() {}};
  vm.runInNewContext(app, {window, document, setInterval(fn) {timers.push(fn); return timers.length;}, clearInterval() {}});
  return {elements, document, calls, media, timers};
}
async function flush() {
  for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
}
async function ticks(f, n = 5) {
  for (let i = 0; i < n; i++) {f.timers[0](); await flush();}
}

test('automatically discovers an inserted CD while idle without repeated UI resets', async () => {
  const f = fixture();
  await flush();
  assert.equal(f.elements.get('toggle').disabled, true);
  f.media.drives = [{id:'sr0', name:'USB CD'}];
  f.media.discs.sr0 = {device:'sr0',first:1,last:3,tracks:3};
  await ticks(f);
  assert.equal(f.elements.get('drive').value, 'sr0');
  assert.equal(f.elements.get('tracks').children.length, 3);
  assert.equal(f.elements.get('toggle').disabled, false);
  assert.equal(f.elements.get('stop').disabled, true);
  // A subsequent poll must keep the track list intact when the disc is unchanged.
  const originalButton = f.elements.get('tracks').children[0];
  await ticks(f);
  assert.equal(f.elements.get('tracks').children[0], originalButton);
});

test('controls never affect a CD playing in another USB drive', async () => {
  const f = fixture();
  await flush();
  f.media.drives = [{id:'sr0',name:'CD A'}, {id:'sr1',name:'CD B'}];
  f.media.discs.sr0 = {device:'sr0',first:1,last:3,tracks:3};
  f.media.discs.sr1 = {device:'sr1',first:1,last:3,tracks:3};
  await ticks(f);
  f.media.playing = {active:true,device:'sr1',state:'playing',track:1};
  await ticks(f,1);
  assert.equal(f.elements.get('previous').disabled, true);
  assert.equal(f.elements.get('stop').disabled, true);
  f.elements.get('stop').trigger('click');
  await flush();
  assert.equal(f.calls.includes('transport:stop'), false);
  f.elements.get('toggle').trigger('click');
  await flush();
  assert.equal(f.calls.includes('play:sr0:1'), true);
});

test('removing an idle disc clears stale tracks and disables playback', async () => {
  const f = fixture();
  f.media.drives = [{id:'sr0',name:'CD'}];
  f.media.discs.sr0 = {device:'sr0',first:1,last:4,tracks:4};
  await flush();
  assert.equal(f.elements.get('tracks').children.length, 4);
  delete f.media.discs.sr0;
  await ticks(f);
  assert.equal(f.elements.get('tracks').children.length, 1);
  assert.equal(f.elements.get('toggle').disabled, true);
  assert.match(f.elements.get('message').textContent, /Keine lesbare Audio-CD/);
});
