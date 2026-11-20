'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('a slow host cannot queue a backlog of identical pickup sounds', async () => {
  const scope = {window: {}, console, performance, setTimeout};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../examples/mupi-run/sound.js'), 'utf8'), scope);
  let plays = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const sdk = {isHosted: true, audio: {playSample: async () => { plays++; await gate; }}};
  const audio = scope.window.createRunAudio(sdk, {collect: 'collect.wav'});
  await audio.active(true);
  const pending = Array.from({length: 30}, () => audio.play('collect'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(plays, 1);
  release();
  await Promise.all(pending);
  assert.equal(plays, 1);
  await audio.play('collect');
  assert.equal(plays, 2);
});
