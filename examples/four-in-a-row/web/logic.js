/* MuPi 4er-Reihe: independently authored offline rules and computer player. MIT. */
(function (root) {
  'use strict';
  const COLS = 7, ROWS = 6, ORDER = [3, 2, 4, 1, 5, 0, 6];
  const index = (row, col) => row * COLS + col;
  const directions = [[1,0],[0,1],[1,1],[1,-1]];

  function fresh() {
    return {cells: Array(COLS * ROWS).fill(''), next:'X', winner:'', winning:[],
      finished:false, moves:0};
  }
  function legal(state) {
    return ORDER.filter(col => state.cells[index(0, col)] === '');
  }
  function drop(state, col) {
    if (!Number.isInteger(col) || col < 0 || col >= COLS || state.finished) return null;
    if (state.cells[index(0, col)]) return null;
    const next = {
      cells: state.cells.slice(), next:state.next, winner:'',
      winning:[], finished:false, moves:state.moves + 1
    };
    let row = ROWS - 1;
    while (row >= 0 && next.cells[index(row, col)]) row--;
    if (row < 0) return null;
    next.cells[index(row, col)] = state.next;
    for (const [dr, dc] of directions) {
      const squares = [[row, col]];
      for (const sign of [-1, 1]) {
        let r = row + dr * sign, c = col + dc * sign;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS &&
               next.cells[index(r, c)] === state.next) {
          squares.push([r, c]); r += dr * sign; c += dc * sign;
        }
      }
      if (squares.length >= 4) {
        next.winner = state.next;
        next.winning = squares.map(([r, c]) => index(r, c));
        next.finished = true;
        break;
      }
    }
    if (next.moves === COLS * ROWS) next.finished = true;
    if (!next.finished) next.next = state.next === 'X' ? 'O' : 'X';
    return next;
  }

  function score(state) {
    if (state.winner === 'O') return 100000;
    if (state.winner === 'X') return -100000;
    if (state.finished) return 0;
    let value = 0;
    for (let r = 0; r < ROWS; r++) {
      if (state.cells[index(r, 3)] === 'O') value += 7;
      if (state.cells[index(r, 3)] === 'X') value -= 7;
    }
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      for (const [dr, dc] of directions) {
        const endRow = row + dr * 3, endCol = col + dc * 3;
        if (endRow < 0 || endRow >= ROWS || endCol < 0 || endCol >= COLS) continue;
        let own = 0, other = 0;
        for (let i = 0; i < 4; i++) {
          const cell = state.cells[index(row + dr*i, col + dc*i)];
          if (cell === 'O') own++;
          if (cell === 'X') other++;
        }
        if (own && other) continue;
        if (own) value += [0, 2, 14, 95, 100000][own];
        if (other) value -= [0, 2, 18, 115, 100000][other];
      }
    }
    return value;
  }

  function search(state, depth, alpha, beta) {
    if (state.finished) {
      if (state.winner === 'O') return 100000 + depth;
      if (state.winner === 'X') return -100000 - depth;
      return 0;
    }
    if (depth === 0) return score(state);
    const bot = state.next === 'O';
    let best = bot ? -Infinity : Infinity;
    for (const col of legal(state)) {
      const successor = drop(state, col);
      const value = search(successor, depth - 1, alpha, beta);
      if (bot) { best = Math.max(best, value); alpha = Math.max(alpha, best); }
      else { best = Math.min(best, value); beta = Math.min(beta, best); }
      if (alpha >= beta) break;
    }
    return best;
  }

  function choose(state, level = 'normal', random = Math.random) {
    if (!state || state.finished || state.next !== 'O') return -1;
    const candidates = legal(state);
    if (!candidates.length) return -1;
    const sample = choices => choices[Math.min(choices.length - 1,
      Math.max(0, Math.floor(random() * choices.length)))];
    if (level === 'easy') return sample(candidates);
    // Both tactical modes win immediately, and block immediate defeats.
    for (const col of candidates) if (drop(state, col).winner === 'O') return col;
    for (const col of candidates) {
      const threat = {...state, next:'X'};
      if (drop(threat, col).winner === 'X') return col;
    }
    if (level === 'normal') {
      // Deliberately imperfect: pick among safe-looking, center-biased moves.
      const ranked = candidates.map(col => {
        const next = drop(state, col);
        let threatened = false;
        for (const reply of legal(next)) if (drop(next, reply).winner === 'X') threatened = true;
        return {col, points:score(next) - (threatened ? 1000 : 0)};
      }).sort((a,b) => b.points-a.points);
      const pool = ranked.slice(0, Math.min(3, ranked.length));
      return sample(pool).col;
    }
    let highest = -Infinity, best = [];
    for (const col of candidates) {
      const next = drop(state, col);
      const value = search(next, 5, -Infinity, Infinity);
      if (value > highest) { highest = value; best = [col]; }
      else if (value === highest) best.push(col);
    }
    return sample(best);
  }
  const api = Object.freeze({COLS, ROWS, fresh, legal, drop, choose, score});
  root.MuPiFourGame = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
