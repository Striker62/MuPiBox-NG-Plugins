'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.join(__dirname, '../examples/Buecherkiste/book-admin.js');
const {folderName, movePage} = require(sourcePath);

test('generated folder names follow SMB rules and keep IDs within 80 characters', () => {
  assert.equal(folderName('Leo Lausemaus – Allein bei den Großeltern'), 'leo-lausemaus-allein-bei-den-grosseltern');
  assert.equal(folderName('Ä Ö Ü ß'), 'ae-oe-ue-ss');
  assert.equal(folderName('../ Mein Buch! '), 'mein-buch');
  assert.equal(folderName('!?'), '');
  assert.equal(folderName('a'.repeat(90)).length, 80);
});

test('reordering preserves each page image and its speech text', () => {
  const first = {file:'first', text:'Text eins'}, second = {file:'second', text:'Text zwei'};
  const pages = [first, second];
  assert.equal(movePage(pages, 0, 1), 1);
  assert.equal(pages[1], first);
  assert.equal(pages[0], second);
  assert.equal(movePage(pages, 1, 1), 1);
  assert.equal(movePage(pages, 1, -1), 0);
  assert.deepEqual(pages, [first, second]);
});

function setup() {
  const nodes = new Map(), events = {}, revoked = [];
  let clock = 0, nextURL = 0;
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, {
      value:'', hidden:false, disabled:false, children:[], files:[], dataset:{},
      addEventListener(name, handler) {this[name] = handler;},
      replaceChildren() {this.children = [];},
      append(...children) {this.children.push(...children);},
      setAttribute(name, value) {this[name] = value;},
      removeAttribute(name) {delete this[name];},
      focus() {}, click() {this.onclick?.();}
    });
    return nodes.get(id);
  };
  get('book-admin').hidden = true;
  get('admin-discard').hidden = true;
  const context = {
    document:{getElementById:get, createElement:()=>get('new-' + nodes.size), activeElement:get('admin-entry')},
    window:{addEventListener(name, handler) {events[name] = handler;}},
    Date:{now:()=>clock},
    URL:{createObjectURL:()=> 'blob:' + ++nextURL, revokeObjectURL:url=>revoked.push(url)},
    Image:class {
      naturalWidth = 300; naturalHeight = 200;
      async decode() {}
    }
  };
  vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), context);
  return {get, events, revoked, time(value) {clock = value;}};
}

test('entry requires three quick taps and returning to the shelf keeps the draft', () => {
  const h = setup();
  h.get('admin-entry').click();h.time(1600);h.get('admin-entry').click();
  h.get('admin-entry').click();
  assert.equal(h.get('book-admin').hidden, true);
  h.get('admin-entry').click();
  assert.equal(h.get('book-admin').hidden, false);
  assert.equal(h.get('shelf').inert, true);
  h.get('admin-title').value = 'Entwurf';h.get('admin-title').oninput();
  h.get('admin-close').click();
  assert.equal(h.get('shelf').inert, false);
  assert.equal(h.get('admin-title').value, 'Entwurf');
  assert.equal(h.get('admin-folder').value, 'entwurf');
});

test('simulated local image imports sort numerically and keep text with reordered images', async () => {
  const h = setup();
  h.get('admin-files').files = [{name:'10.jpg',size:100}, {name:'2.jpg',size:100}];
  await h.get('admin-files').onchange();
  assert.equal(h.get('admin-original-name').textContent, '2.jpg');
  h.get('admin-page-text').value = 'Text zu Bild zwei';h.get('admin-page-text').oninput();
  h.get('admin-down').click();
  assert.equal(h.get('admin-original-name').textContent, '2.jpg');
  assert.equal(h.get('admin-page-text').value, 'Text zu Bild zwei');
  assert.equal(h.get('admin-page-heading').textContent, 'Seite 2');
  h.get('admin-remove').click();
  assert.equal(h.get('admin-original-name').textContent, '10.jpg');
  assert.equal(h.revoked.length, 1);
  h.events.pagehide();
  assert.equal(h.revoked.length, 2);
});

test('new-book action asks before discarding and rejects unsupported image files', async () => {
  const h = setup();
  h.get('admin-title').value = 'Mein Entwurf';
  h.get('admin-new').click();
  assert.equal(h.get('admin-discard').hidden, false);
  h.get('admin-keep').click();
  assert.equal(h.get('admin-title').value, 'Mein Entwurf');
  h.get('admin-files').files = [{name:'unsafe.svg',size:100}, {name:'big.jpg',size:9*1024*1024}];
  await h.get('admin-files').onchange();
  assert.equal(h.get('admin-pages').children.length, 0);
  assert.match(h.get('admin-message').textContent, /2 Bilder konnten nicht geladen werden/);
  h.get('admin-new').click();h.get('admin-discard-confirm').click();
  assert.equal(h.get('admin-title').value, '');
});
