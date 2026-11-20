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

test('two-handed control placement fits 800x480: up/down left, left/right bottom-right', () => {
  assert.match(html, /class="vertical-controls"/);
  assert.match(html, /class="horizontal-controls"/);
  assert.match(html, /class="action-bar"/);
  assert.match(css, /grid-template-columns:78px minmax\(0,1fr\)/);
  assert.match(css, /\.vertical-controls\{[^}]*flex-direction:column/);
  assert.match(css, /\.horizontal-controls\{[^}]*justify-content:flex-end/);
  assert.match(css, /\.garden\{[^}]*aspect-ratio:3\/2/);
  assert.ok(html.indexOf('class="garden"')<html.indexOf('class="horizontal-controls"'));
  assert.match(css, /\.scoreboard\{[\s\S]*?position:relative/);
  const board=html.indexOf('class="garden"');
  const hud=html.indexOf('class="scoreboard"');
  assert.ok(hud < board, 'scoreboard must be outside and before the arena');
  assert.ok(html.indexOf('class="scoreboard"',board) === -1,'no scoreboard overlay within the arena');
  assert.doesNotMatch(html, /<header|class="touch-controls"/);
});

test('garden and neon aquarium themes are selectable, persistent, and fully offline', () => {
  assert.match(html, /id="theme-toggle"/);
  assert.match(css, /\.screen\[data-design="neon"\] \.garden/);
  assert.match(js, /function paintNeon\(state\)/);
  assert.match(js, /design === 'neon'/);
  assert.match(js, /sdk\.storage\.set\('design',design\)/);
  assert.match(js, /sdk\.storage\.get\('design'\)/);
  assert.match(js, /themeToggle\.addEventListener\('click'/);
  assert.match(css, /#03091f/);
  assert.match(js, /#ffe878/);
  assert.match(js, /#36da80/);
});

test('touch directions start and restart without additional buttons', () => {
  assert.match(js, /engine\.reset\(direction\)/);
  assert.match(js, /state\.phase === 'over' \|\| state\.phase === 'won' \|\| state\.phase === 'ready'/);
  assert.match(js, /if \(state\.phase === 'paused'\) \{ engine\.start\(\); clock\(\); \}/);
  assert.match(js, /if \(event\.pointerType === 'touch'\) screen\.classList\.remove\('controller-mode'\)/);
  assert.match(js, /screen\.classList\.add\('controller-mode'\)/);
});

test('the app supplies landscape cover art rather than defaulting to its vector icon', () => {
  const cover=path.join(APP,'web/cover.jpg');
  const bytes=fs.readFileSync(cover);
  assert.equal(manifest.cover,'cover.jpg');
  assert.equal(bytes[0],0xff);
  assert.equal(bytes[1],0xd8);
  assert.ok(bytes.length>5000);
});

test('neon worm uses glossy lime spheres, smiling face and animated pickup sparks', () => {
  const render=js.match(/function paintNeon\(state\) \{([\s\S]*?)\n  \}\n  function animateSparks/);
  assert.ok(render, 'neon renderer must exist');
  assert.match(render[1], /createRadialGradient/);
  assert.match(render[1], /#c5ff9a/);
  assert.match(render[1], /#36da80/);
  assert.match(render[1], /ctx\.ellipse/);
  assert.match(js, /function emitSparks\(position,gold\)/);
  assert.match(js, /function flashImpact\(\)/);
  assert.match(js, /function flashRecord\(\)/);
  assert.match(css, /@keyframes worm-hit/);
  assert.match(js, /let design = 'neon'/);
  assert.match(js, /applyDesign\('neon',false\)/);
});

test('score and record remain outside the board in the new top HUD', () => {
  const hud=html.split('<div class="scoreboard"')[1].split('</div>\n      <div class="garden">')[0];
  assert.match(hud, /id="points"/);
  assert.match(hud, /id="best"/);
  assert.match(css, /\.play-area \.garden,\.play-area \.action-bar,\.play-area \.scoreboard/);
  assert.match(css, /--board-w:min\(100%,calc\(\(100dvh - 124px\)\*1\.5\)\)/);
});
 
test('four on-screen speed steps preserve old speeds and add Turbo', () => {
  assert.match(html, /id="speed-select"/);
  assert.match(html, /data-i18n="wormSpeed"/);
  for (const speed of ['easy','normal','hard','turbo'])
    assert.match(html, new RegExp('<option value="'+speed+'"'));
  assert.match(js, /const delays = Object\.freeze\(\{easy:230,normal:150,hard:95,turbo:70\}\)/);
  assert.match(js, /speedSelect\.addEventListener\('change'/);
  assert.match(js, /speedSelect\.value = value/);
  assert.match(js, /sdk\.storage\.set\('speed', value\)/);
  assert.match(js, /sdk\.storage\.get\('speed'\)/);
  assert.match(js, /speedSelect\.value = level/);
  assert.match(js, /event\.code === 'Digit4'/);
  assert.match(css, /\.speed-control select\{[^}]*height:44px/);
  assert.match(css, /\.screen\[data-design="neon"\] \.speed-control select/);
});
