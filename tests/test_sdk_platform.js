'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../sdk/mupibox-sdk.js'), 'utf8');

function loadSDK(hosted = true) {
  const calls = [];
  const window = {
    console, navigator: {language: 'de'}, addEventListener() {},
    localStorage: {getItem() {return null;}, setItem() {}}
  };
  if (hosted) window.__MUPIBOX_BRIDGE__ = {
    invoke: async (method, payload) => {
      calls.push({method, payload});
      if (method === 'host.capabilities') return {
        sdkRevision: '1.1', methods: [
          {method: 'device.info', granted: true, available: true},
          {method: 'playback.transport', granted: false, available: false}
        ]
      };
      return {ok: true};
    },
    subscribe() {return () => {};}
  };
  vm.runInNewContext(source, {window, console});
  return {sdk: window.MuPiBoxSDK, calls};
}

test('platform SDK exposes permission-scoped device and playback methods', async () => {
  const {sdk, calls} = loadSDK();
  assert.equal(sdk.apiVersion, '1');
  assert.equal(sdk.sdkRevision, '1.1');
  await sdk.device.info();
  await sdk.device.system();
  await sdk.device.display();
  await sdk.device.audio();
  await sdk.playback.status();
  await sdk.playback.queue();
  await sdk.playback.transport('play_pause');
  await sdk.playback.transport('volume_down');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['device.info', {}], ['device.system', {}], ['device.display', {}], ['device.audio', {}],
    ['playback.status', {}], ['playback.queue', {}],
    ['playback.transport', {action: 'play_pause'}],
    ['playback.transport', {action: 'volume_down'}]
  ].map(([method, payload]) => ({method, payload})));
  assert.equal(Object.isFrozen(sdk.device), true);
  assert.equal(Object.isFrozen(sdk.playback), true);
  assert.equal('request' in sdk, false); // no arbitrary HTTP proxy
});

test('playback transport rejects privileged and malformed actions before host invocation', async () => {
  const {sdk, calls} = loadSDK();
  for (const invalid of ['shutdown', 'stop', '/api/admin', '', null, 123, 'NEXT']) {
    await assert.rejects(sdk.playback.transport(invalid), {name: 'TypeError'});
  }
  assert.deepEqual(calls, []);
});

test('capability negotiation supports old hosts and honors denied permissions', async () => {
  const {sdk, calls} = loadSDK();
  assert.equal(await sdk.supports('device.info'), true);
  assert.equal(await sdk.supports('playback.transport'), false);
  assert.equal(await sdk.supports('admin.reboot'), false);
  assert.equal(calls.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(await sdk.capabilities())).methods[1], {
    method: 'playback.transport', granted: false, available: false
  });
  await assert.rejects(sdk.supports('../admin'), {name: 'TypeError'});
  const offline = loadSDK(false).sdk;
  assert.deepEqual(Array.from((await offline.capabilities()).methods), []);
  assert.equal(await offline.supports('device.info'), false);
  await assert.rejects(offline.device.info(), /host unavailable/);
  // Older NG versions do not know host.capabilities; supports() is safe.
  const legacyWindow = {console, navigator: {language: 'de'}, addEventListener() {},
    __MUPIBOX_BRIDGE__: {invoke: async () => {throw new Error('unsupported plugin bridge method');}, subscribe() {}}};
  vm.runInNewContext(source, {window: legacyWindow, console});
  assert.equal(await legacyWindow.MuPiBoxSDK.supports('device.info'), false);
});

test('canonical SDK calls exactly the reviewed bridge method contract', () => {
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, '../schema/sdk-bridge-methods.json'), 'utf8'));
  const invoked = [...source.matchAll(/invoke\('([a-z][a-z.]+)'/g)].map(m => m[1]);
  assert.deepEqual([...new Set(invoked)].sort(), expected.methods);
  assert.equal(expected.apiVersion, '1');
});

test('app can only read its own admin-managed settings via scoped config.get', async () => {
  const {sdk, calls} = loadSDK();
  assert.equal(Object.isFrozen(sdk.config), true);
  assert.deepEqual(JSON.parse(JSON.stringify(await sdk.config.get())), {});
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{method:'config.get', payload:{}}]);
  assert.deepEqual(JSON.parse(JSON.stringify(await loadSDK(false).sdk.config.get())), {});
  assert.equal(typeof sdk.config.set, 'undefined');
});

test('USB Audio CD SDK includes track identity guards, metadata and tray control', async () => {
  const {sdk, calls} = loadSDK();
  const id = '49HHV7Eb8UKF3aQiNmu1GR8vKTY-';
  await sdk.optical.list();
  await sdk.optical.disc('sr0');
  await sdk.optical.play('sr0', 2, id);
  await sdk.optical.status();
  await sdk.optical.transport('next', 'sr0', id);
  await sdk.optical.seek('sr0', id, 42);
  await sdk.optical.metadata('sr0', id);
  await sdk.optical.drive('sr0', 'eject');
  assert.deepEqual(calls.map(c => c.method), [
    'optical.list', 'optical.disc', 'optical.play', 'optical.status', 'optical.transport',
    'optical.seek', 'optical.metadata', 'optical.drive'
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[2].payload)), {device:'sr0',track:2,discId:id});
  for (const device of ['/dev/sda', '../sr0', 'sr-1', 'sr100', '']) {
    await assert.rejects(sdk.optical.disc(device), {name:'TypeError'});
  }
  for (const action of ['eject', 'shutdown', 'volume_up', '']) {
    await assert.rejects(sdk.optical.transport(action, 'sr0', id), {name:'TypeError'});
  }
  await assert.rejects(sdk.optical.play('sr0', 101, id), {name:'TypeError'});
  await assert.rejects(sdk.optical.play('sr0', 2, ''), {name:'TypeError'});
  await assert.rejects(sdk.optical.transport('next', 'sr0', '../pwn'), {name:'TypeError'});
  await assert.rejects(sdk.optical.drive('sr0', 'chmod'), {name:'TypeError'});
  await assert.rejects(sdk.optical.seek('sr0', id, Infinity), {name:'TypeError'});
  assert.equal(Object.isFrozen(sdk.optical), true);
});

test('covers.sample uses only its scoped method and no preview data', async () => {
  const {sdk,calls}=loadSDK();
  assert.equal((await sdk.covers.sample()).length,0);
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,'covers.sample');
  assert.equal(Object.keys(calls[0].payload).length,0);
  const preview=loadSDK(false);
  assert.equal((await preview.sdk.covers.sample()).length,0);
});
