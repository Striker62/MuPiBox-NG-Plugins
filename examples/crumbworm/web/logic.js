/* MuPi Krümelwurm: original grid/worm rules, deterministic test hooks (MIT). */
(function (root) {
  'use strict';
  const WIDTH = 24, HEIGHT = 16, SIZE = WIDTH * HEIGHT;
  const VECTORS = Object.freeze({
    up: [0,-1], down:[0,1], left:[-1,0], right:[1,0]
  });
  const OPPOSITE = Object.freeze({up:'down',down:'up',left:'right',right:'left'});
  const at = (x, y) => y * WIDTH + x;
  function chooseFood(body, rng, gold = false) {
    const occupied = new Set(body);
    const spaces = [];
    for (let index = 0; index < SIZE; index++) if (!occupied.has(index)) spaces.push(index);
    if (!spaces.length) return null;
    const sample = Number(rng());
    const value = Number.isFinite(sample) ? sample : 0;
    const slot = Math.max(0, Math.min(spaces.length - 1, Math.floor(value * spaces.length)));
    return {position:spaces[slot], gold:!!gold};
  }
  function create(rng = Math.random) {
    let state;
    function snapshot() {
      return {...state, body:state.body.slice(),
        food:state.food ? {...state.food} : null};
    }
    function reset() {
      const x = Math.floor(WIDTH / 2), y = Math.floor(HEIGHT / 2);
      const body = [at(x,y),at(x-1,y),at(x-2,y)];
      state = {body, food:chooseFood(body,rng), direction:'right',
        queued:'right', points:0, meals:0, phase:'ready'};
      return snapshot();
    }
    function start() {
      if (state.phase === 'ready' || state.phase === 'paused') state.phase = 'playing';
      return snapshot();
    }
    function pause() {
      if (state.phase === 'playing') state.phase = 'paused';
      return snapshot();
    }
    function turn(direction) {
      if (!(direction in VECTORS) || OPPOSITE[state.direction] === direction) return false;
      // Accept only one turn per tick to avoid a rapid 180-degree reversal.
      if (state.queued !== state.direction && state.queued !== direction) return false;
      state.queued = direction;
      return true;
    }
    function tick() {
      if (state.phase !== 'playing') return snapshot();
      const direction = state.queued;
      const [dx, dy] = VECTORS[direction];
      const head = state.body[0], x = head % WIDTH + dx, y = Math.floor(head / WIDTH) + dy;
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
        state.phase = 'over';
        return snapshot();
      }
      const next = at(x,y);
      const eats = !!(state.food && state.food.position === next);
      const forbidden = eats ? state.body : state.body.slice(0,-1);
      if (forbidden.includes(next)) {
        state.phase = 'over';
        return snapshot();
      }
      state.body.unshift(next);
      if (eats) {
        state.meals++;
        state.points += state.food.gold ? 30 : 10;
        state.food = chooseFood(state.body,rng,state.meals % 5 === 4);
        if (!state.food) state.phase = 'won';
      } else state.body.pop();
      state.direction = direction;
      state.queued = direction;
      return snapshot();
    }
    reset();
    return Object.freeze({reset,start,pause,turn,tick,snapshot});
  }
  const api = Object.freeze({WIDTH,HEIGHT,create,chooseFood,VECTORS});
  root.MuPiCrumbworm = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
