/* Pixelwurm/Krümelwurm full-screen touch UI and theme regression checks. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const APP = path.join(__dirname, '../examples/crumbworm');
const html=fs.readFileSync(path.join(APP,'web/index.html'),'utf8');
const css=fs.readFileSync(path.join(APP,'web/style.css'),'utf8');
const js=fs.readFileSync(path.join(APP,'web/app.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(APP,'manifest.json'),'utf8'));

test('native chrome is disabled and MuPiBox system background stays selected', () => {
  assert.deepEqual(manifest.display, {
    orientation:'landscape',minWidth:800,minHeight:480,
    showBackButton:false,showSystemInfo:false,fullScreen:true,background:'system'
  });
  assert.match(css, /html,body\{[^}]*background:transparent/);
  assert.match(css, /\.screen\{[^}]*background:transparent/);
  assert.doesNotMatch(css, /body\{background:[^}]*gradient/);
});

test('only back and four touch direction controls remain', () => {
  assert.match(html, /id="exit"[^>]*data-i18n-aria="wormBack"/);
  for (const direction of ['up','down','left','right']) {
    assert.match(html, new RegExp('data-direction="'+direction+'"'));
  }
  assert.equal((html.match(/data-direction="/g)||[]).length, 4);
  assert.doesNotMatch(html, /id="(toggle|reset|speed)"/);
  assert.doesNotMatch(html, /<footer|class="brand"|class="hint"/);
  assert.match(js, /sdk\.exit\(\)/);
});

test('directions are vertically beside the field with left and right below', () => {
  assert.match(css, /\.direction-up\{grid-column:1 \/ 3;grid-row:1;justify-self:end\}/);
  assert.match(css, /\.direction-down\{grid-column:1 \/ 3;grid-row:2;justify-self:end\}/);
  assert.match(css, /\.direction-left\{grid-column:1;grid-row:3\}/);
  assert.match(css, /\.direction-right\{grid-column:2;grid-row:3\}/);
  assert.match(css, /grid-template-columns:clamp\(118px,22vw,176px\) minmax\(0,1fr\)/);
  assert.match(css, /\.garden\{[^}]*aspect-ratio:3\/2/);
});

test('touch directions start and restart without additional buttons', () => {
  assert.match(js, /engine\.reset\(direction\)/);
  assert.match(js, /state\.phase === 'over' \|\| state\.phase === 'won' \|\| state\.phase === 'ready'/);
  assert.match(js, /if \(state\.phase === 'paused'\) \{ engine\.start\(\); clock\(\); \}/);
  assert.match(js, /if \(event\.pointerType === 'touch'\) screen\.classList\.remove\('controller-mode'\)/);
  assert.match(js, /screen\.classList\.add\('controller-mode'\)/);
});
