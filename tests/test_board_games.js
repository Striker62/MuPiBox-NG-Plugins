/* Rules and localization tests. Run with node --test tests/test_board_games.js */
'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const g = require('../examples/four-in-a-row/web/logic.js');
const locales = require('../examples/shared/game-i18n.js');

function fromMoves(columns) {
  let state = g.fresh();
  for (const col of columns) {
    state = g.drop(state, col);
    assert.ok(state, 'illegal setup move: ' + col);
  }
  return state;
}
function fixture(bottomX, bottomO, next = 'O') {
  const s = g.fresh();
  for (const col of bottomX) s.cells[35 + col] = 'X';
  for (const col of bottomO) s.cells[35 + col] = 'O';
  s.moves = bottomX.length + bottomO.length;
  s.next = next;
  return s;
}

test('all seven box locales expose every translated key', () => {
  const keys = Object.keys(locales.strings.en).sort();
  assert.deepEqual(Object.keys(locales.strings).sort(), ['de','en','es','fr','it','nl','sv']);
  for (const [language, dictionary] of Object.entries(locales.strings)) {
    assert.deepEqual(Object.keys(dictionary).sort(), keys, language);
    for (const key of keys) assert.ok(dictionary[key].trim(), language + ': ' + key);
  }
  assert.equal(locales.normalize('sv-SE'), 'sv');
  assert.equal(locales.normalize('de_DE'), 'de');
  assert.equal(locales.normalize('xx-YY'), 'en');
});

test('host locale is preferred to browser locale', async () => {
  globalThis.document = {
    documentElement: {lang:'en'},
    querySelectorAll: () => []
  };
  const i18n = await locales.create({
    isHosted:true, getContext:async () => ({language:'nl-NL'})
  });
  assert.equal(i18n.language, 'nl');
  assert.equal(globalThis.document.documentElement.lang, 'nl');
  assert.match(i18n.t('playerTurn', {name:'X'}), /X/);
  delete globalThis.document;
});

test('empty board, gravity, full columns, invalid moves', () => {
  const empty = g.fresh();
  assert.equal(empty.cells.length, 42);
  assert.deepEqual(g.legal(empty), [3,2,4,1,5,0,6]);
  assert.equal(g.drop(empty, -1), null);
  assert.equal(g.drop(empty, 7), null);
  assert.equal(g.drop(empty, 1.5), null);
  const first = g.drop(empty, 3);
  assert.equal(first.cells[35 + 3], 'X');
  assert.equal(first.next, 'O');
  assert.equal(empty.cells[35 + 3], '');
  let s = first;
  for (let i = 0; i < 5; i++) s = g.drop(s, 3);
  assert.equal(g.drop(s, 3), null);
  assert.ok(!g.legal(s).includes(3));
});

test('four in a row horizontally, vertically and diagonally', () => {
  const horizontal = fromMoves([0,6,1,6,2,5,3]);
  assert.equal(horizontal.winner, 'X');
  assert.equal(horizontal.finished, true);
  assert.equal(horizontal.winning.length, 4);
  assert.equal(g.drop(horizontal, 4), null);

  const vertical = fromMoves([0,1,0,1,0,1,0]);
  assert.equal(vertical.winner, 'X');
  assert.equal(vertical.finished, true);
  assert.equal(vertical.winning.length, 4);

  const diagonal = g.fresh();
  // Just below the diagonal, fill supporting slots; one final drop wins.
  for (const [col, values] of [[0,['X']],[1,['O','X']],[2,['O','O','X']],[3,['O','X','X']]]) {
    for (let i = 0; i < values.length; i++) diagonal.cells[(5-i)*7+col] = values[i];
  }
  diagonal.next = 'X';
  diagonal.moves = 9;
  const finished = g.drop(diagonal, 3);
  assert.equal(finished.winner, 'X');
  assert.equal(finished.winning.length, 4);
});

test('two-player mode alternates colors and AI rejects wrong turn', () => {
  const s = fromMoves([3,2,4]);
  assert.equal(s.next, 'O');
  assert.equal(s.winner, '');
  assert.equal(g.choose(g.fresh(), 'hard'), -1);
  assert.ok(g.legal(s).includes(g.choose(s, 'easy', () => .25)));
});

test('AI takes immediate win and blocks opponent in normal and hard', () => {
  const win = fixture([4,5,6], [0,1,2]);
  const block = fixture([0,1,2], [4,5,6]);
  for (const level of ['normal','hard']) {
    assert.equal(g.choose(win, level, () => .5), 3, level + ' win');
    assert.equal(g.choose(block, level, () => .5), 3, level + ' block');
  }
});

test('easy mode chooses legal moves, seeded RNG produces deterministic selection', () => {
  const s = fixture([0], [2]);
  assert.equal(g.choose(s, 'easy', () => 0), 3);
  assert.equal(g.choose(s, 'easy', () => .999), 6);
});
