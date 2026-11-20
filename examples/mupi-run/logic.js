/* MuPi Run – deterministic, independent endless-runner rules (MIT). */
(function (root, factory) {
  'use strict';
  const game = factory();
  if (typeof module === 'object' && module.exports) module.exports = game;
  if (root) root.MuPiRun = game;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LANES = [-1, 0, 1];
  // Generous timing for controller and touch reactions.
  const JUMP_DURATION = 35 / 30;
  const DUCK_DURATION = 35 / 30;
  const HIT_RADIUS = .55; // width of player + obstacle in lane units
  const kinds = {
    jump: ['log', 'rock', 'root', 'stepping-stones'],
    duck: ['branch', 'vine', 'willow', 'low-bridge'],
    avoid: ['boulder', 'stump', 'reeds', 'fox']
  };

  const ZONES = Object.freeze([
    {name:'river',start:0,end:195},
    {name:'boardwalk',start:195,end:360},
    {name:'forest',start:360,end:530},
    {name:'river',start:530,end:650}
  ]);
  const ZONE_LENGTH = 650;
  function terrainAt(distance) {
    const pos=((distance%ZONE_LENGTH)+ZONE_LENGTH)%ZONE_LENGTH;
    return ZONES.find(z => pos>=z.start && pos<z.end).name;
  }
  function fresh(seed) {
    return {
      phase: 'ready', distance: 0, speed: 13, lane: 0, visualLane: 0,
      jumpAge: -1, duckAge: -1, obstacles: [], spawnIn: 1.5,
      notes: [14, 20, 26].map(z => ({lane: 0, z})), noteCount: 0,
      simulationRemainder: 0, runPose: 0, entryPose: 0, resumePose: 0, steps: 0, stepPhase: 0,
      scenerySeed: seed >>> 0,
      seed: (seed >>> 0) || 0x1badc0de, waves: 0,
      time: 0, crash: null, completedDucks: 0, completedJumps: 0,
      completedDodges: 0, lastTerrain: 'river'
    };
  }

  function random(s) {
    let x = s.seed >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s.seed = x >>> 0;
    return (s.seed >>> 0) / 4294967296;
  }

  function choice(s, items) { return items[Math.floor(random(s) * items.length)]; }
  function speedAt(distance) { return Math.min(29, 13 + distance * 0.022); }
  function intervalAt(distance, speed) {
    // Distances between waves never drop below a safe minimum even at max speed.
    return Math.max(1.17, 2.12 - distance * 0.00108, 28 / speed);
  }
  function jumpHeight(s) {
    if (s.jumpAge < 0 || s.jumpAge >= 23 / 30) return 0;
    const t = s.jumpAge * 30 / 23;
    return 45 * 4 * t * (1 - t);
  }
  function ducking(s) { return s.duckAge >= 0 && s.duckAge < DUCK_DURATION; }

  function act(s, action, resumePose = null) {
    if (action === 'start') {
      if (s.phase === 'ready') { s.phase = 'running'; return true; }
      return false;
    }
    if (action === 'pause') {
      if (s.phase === 'running') { s.phase = 'paused'; return true; }
      if (s.phase === 'paused') { s.phase = 'running'; return true; }
      return false;
    }
    if (s.phase !== 'running') return false;
    if (action === 'left') { s.lane = Math.max(-1, s.lane - 1); return true; }
    if (action === 'right') { s.lane = Math.min(1, s.lane + 1); return true; }
    if ((action === 'jump' || action === 'duck') && s.jumpAge < 0 && s.duckAge < 0) {
      s.entryPose = Math.floor(s.runPose) % 24;
      s.resumePose = resumePose === null ? (s.entryPose >= 11 && s.entryPose < 23 ? 12 : 0) : resumePose;
      if (action === 'jump') s.jumpAge = 0;
      else s.duckAge = 0;
      return true;
    }
    return false;
  }

  function spawnWave(s) {
    const first = s.obstacles.length;
    const spawn = (lane,kind,item) => {
      s.obstacles.push({lane,z:83,kind,item,passed:false,checked:false});
    };
    // Playable first three challenges. The low bridge is a REAL collider,
    // spans all three lanes and is overcome only by crouching.
    if(s.waves===0) spawn(-1,'jump','rock');
    else if(s.waves===1) spawn(1,'avoid','boulder');
    else if(s.waves===2) spawn(null,'duck','low-bridge');
    else {
      const terrain=terrainAt(s.distance+83-1.9);
      // A recurring low-hanging bridge, independent of the lane, creates
      // genuine duck moments even after the tutorial.
      const bridgeChance=terrain==='boardwalk'?.19:terrain==='forest'?.13:.11;
      if(s.waves%10===0 || random(s)<bridgeChance) {
        spawn(null,'duck','low-bridge');
      }else{
        const firstLane=choice(s,LANES);
        const second=s.distance>=125 && random(s)<Math.min(.67,(s.distance-85)/650);
        const lanes=[firstLane];
        if(second)lanes.push(choice(s,LANES.filter(l=>l!==firstLane)));
        for(const lane of lanes){
          const type=choice(s,s.distance<40?['jump','avoid']:['jump','avoid','duck']);
          const items=terrain==='boardwalk' && type==='jump'?['log','stepping-stones','rock']:
           terrain==='forest' && type==='duck'?['branch','willow','vine']:kinds[type].filter(v=>v!=='low-bridge');
          spawn(lane,type,choice(s,items));
        }
      }
    }
    // A line of notes leads down a passable lane, including on two-lane waves.
    const wave = s.obstacles.slice(first);
    const safe = LANES.filter(lane => wave.every(o => o.lane !== lane && o.lane !== null));
    if (safe.length) {
      const lane = safe[s.waves % safe.length];
      for (const z of [73, 78, 83]) s.notes.push({lane, z});
    }
    s.waves++;
  }

  function canPass(s, obstacle) {
    // The visual and physics positions MUST agree while changing lanes.
    // A requested destination does not teleport MuPi past an obstacle.
    if (obstacle.lane!==null && Math.abs(s.visualLane-obstacle.lane)>HIT_RADIUS) return true;
    if (obstacle.kind === 'jump') return jumpHeight(s) >= 11;
    if (obstacle.kind === 'duck') return ducking(s) && s.duckAge >= 9 / 30 && s.duckAge < 22 / 30;
    return false;
  }

  function step(s, delta) {
    if (s.phase !== 'running' || !Number.isFinite(delta) || delta <= 0) return s;
    const dt = Math.min(0.075, delta); // prevent resume/background frame skips
    s.time += dt;
    const ageKey = s.jumpAge >= 0 ? 'jumpAge' : s.duckAge >= 0 ? 'duckAge' : null;
    let runTime = dt;
    if (ageKey) {
      s[ageKey] += dt;
      runTime = Math.max(0, s[ageKey] - JUMP_DURATION);
      if (s[ageKey] >= JUMP_DURATION) {
        s[ageKey] = -1;
        s.runPose = s.resumePose;
      }
    }
    const stride = runTime * (20 + Math.min(8, (s.speed - 13) * .47));
    s.runPose = (s.runPose + stride) % 24;
    s.stepPhase += stride;
    if (s.stepPhase >= 12) { s.stepPhase -= 12; s.steps++; }
    s.visualLane += (s.lane - s.visualLane) * Math.min(1, dt * 13.5);
    s.speed = speedAt(s.distance);
    const travel = s.speed * dt;
    s.distance += travel;
    s.lastTerrain = terrainAt(s.distance);
    s.spawnIn -= dt;
    if (s.spawnIn <= 0) {
      spawnWave(s);
      s.spawnIn += intervalAt(s.distance, s.speed);
    }

    for (const obstacle of s.obstacles) {
      const was = obstacle.z;
      obstacle.z -= travel;
      if (!obstacle.checked && was > 1.9 && obstacle.z <= 1.9) {
        obstacle.checked = true;
        if (!canPass(s, obstacle)) {
          s.phase = 'over';
          s.crash = obstacle.item;
          break;
        }
        obstacle.passed = true;
        if (obstacle.kind==='duck') s.completedDucks++;
        else if (obstacle.kind==='jump') s.completedJumps++;
        else s.completedDodges++;
      }
    }
    for (const note of s.notes) {
      const before = note.z;
      note.z -= travel;
      if (s.phase === 'running' && before > 1.9 && note.z <= 1.9 &&
          Math.abs(s.visualLane - note.lane) < .46) {
        note.collected = true;
        s.noteCount++;
      }
    }
    s.notes = s.notes.filter(note => note.z > -8 && !note.collected);
    s.obstacles = s.obstacles.filter(o => o.z > -12);
    return s;
  }

  // Inputs and paints share this clock. Preserve the fractional tick across callbacks.
  function advance(s, elapsed) {
    if (s.phase !== 'running' || !Number.isFinite(elapsed) || elapsed <= 0) return;
    const total = s.simulationRemainder + elapsed;
    const ticks = Math.floor(total * 60 + 1e-9);
    s.simulationRemainder = Math.max(0, total - ticks / 60);
    for (let i = 0; i < ticks && s.phase === 'running'; i++) step(s, 1 / 60);
  }

  return Object.freeze({
    fresh, act, step, advance, jumpHeight, ducking, speedAt, intervalAt,
    JUMP_DURATION, DUCK_DURATION, HIT_RADIUS, LANES, kinds, terrainAt, ZONES
  });
});