'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');

const run=join(__dirname,'../examples/mupi-run');
const html=readFileSync(join(run,'index.html'),'utf8');
const js=readFileSync(join(run,'app.js'),'utf8');
const css=readFileSync(join(run,'style.css'),'utf8');

test('MuPi Run has a single back button across the splash, pause and game screens',()=>{
  assert.equal((html.match(/aria-label="Spiel verlassen"/g)||[]).length,1);
  assert.doesNotMatch(html,/id="menu-exit"/);
  assert.match(js,/document\.getElementById\('exit'\)\.addEventListener\('click'/);
  assert.match(js,/classList\.toggle\('menu-open', phase!=='running'\)/);
});

test('the modal menu hides duplicate HUD labels but leaves the one exit button clickable',()=>{
  assert.match(css,/\.game\.menu-open \.hud \{ z-index: 5; \}/);
  assert.match(css,/\.game\.menu-open \.hud > :not\(#exit\) \{ visibility: hidden; pointer-events: none; \}/);
  assert.match(css,/\.game\.menu-open \.controls \{ visibility: hidden;/);
});

test('distance and meter label occupy separate rows instead of overlapping',()=>{
  assert.match(css,/\.scores \.score:not\(\.note-score\) \{ flex-direction: column; gap: 1px; \}/);
  assert.match(css,/\.scores \.score:not\(\.note-score\) small \{ align-self: center; margin: 0;/);
});
