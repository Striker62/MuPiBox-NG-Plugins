/* MuPi Krümelwurm: original offline browser presentation (MIT). */
(function () {
  'use strict';
  const sdk = window.MuPiBoxSDK, rules = window.MuPiCrumbworm;
  const engine = rules.create();
  const canvas = document.getElementById('garden');
  const ctx = canvas.getContext('2d');
  const speed = document.getElementById('speed');
  const status = document.getElementById('status');
  const points = document.getElementById('points');
  const bestText = document.getElementById('best');
  const toggle = document.getElementById('toggle');
  const reset = document.getElementById('reset');
  const exit = document.getElementById('exit');
  let locale = null, best = 0, level = 'normal', ticker = null, pausedByHost = false;
  let pointerStart = null;
  const t = (key,args) => locale ? locale.t(key,args) : key;
  const delays = Object.freeze({easy:230,normal:150,hard:95});
  const cell = canvas.width / rules.WIDTH;

  function stopClock() {
    if (ticker !== null) window.clearInterval(ticker);
    ticker = null;
  }
  function clock() {
    stopClock();
    if (engine.snapshot().phase !== 'playing' || pausedByHost) return;
    ticker = window.setInterval(() => {
      const state = engine.tick();
      if (state.points > best) {
        best = state.points;
        void sdk.storage.set('best', best).catch(() => {});
      }
      if (state.phase !== 'playing') stopClock();
      paint(state);
    }, delays[level]);
  }
  function togglePlay() {
    if (pausedByHost) return;
    const state = engine.snapshot();
    if (state.phase === 'playing') {
      engine.pause(); stopClock();
    } else if (state.phase === 'over' || state.phase === 'won') {
      engine.reset(); engine.start(); clock();
    } else {
      engine.start(); clock();
    }
    paint(engine.snapshot());
  }
  function restart() {
    stopClock();
    engine.reset();
    paint(engine.snapshot());
  }
  function setSpeed(value) {
    if (!Object.prototype.hasOwnProperty.call(delays, value)) return;
    level = value;
    speed.value = value;
    void sdk.storage.set('speed', value).catch(() => {});
    if (engine.snapshot().phase === 'playing') clock();
  }
  function steer(direction) {
    if (pausedByHost) return;
    const state = engine.snapshot();
    if (state.phase === 'over' || state.phase === 'won') return;
    engine.turn(direction);
    if (state.phase === 'ready') { engine.start(); clock(); }
    paint(engine.snapshot());
  }
  function paint(state) {
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#102d32';
    ctx.fillRect(0,0,w,h);
    // Staggered dots and subtle tiles are an original garden playfield.
    for (let y = 0; y < rules.HEIGHT; y++) for (let x = 0; x < rules.WIDTH; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#12383b' : '#143f42';
      ctx.fillRect(x*cell+.7,y*cell+.7,cell-1.4,cell-1.4);
      if ((x*13+y*7)%19 === 0) {
        ctx.fillStyle='#255a4c';
        ctx.beginPath(); ctx.arc(x*cell+5,y*cell+5,1.5,0,Math.PI*2);ctx.fill();
      }
    }
    if (state.food) {
      const x = (state.food.position % rules.WIDTH)*cell+cell/2;
      const y = Math.floor(state.food.position / rules.WIDTH)*cell+cell/2;
      ctx.fillStyle = state.food.gold ? '#ffe08c' : '#f7b85c';
      ctx.beginPath(); ctx.arc(x,y,cell*(state.food.gold ? .34 : .27),0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff5c4';
      for (const [dx,dy] of [[-4,-1],[3,-4],[3,4]]) {
        ctx.beginPath(); ctx.arc(x+dx,y+dy,cell*.055,0,Math.PI*2);ctx.fill();
      }
      if (state.food.gold) {
        ctx.strokeStyle='#fff9d6';ctx.lineWidth=2;ctx.beginPath();
        ctx.moveTo(x,y-12);ctx.lineTo(x,y+12);ctx.moveTo(x-12,y);ctx.lineTo(x+12,y);ctx.stroke();
      }
    }
    for (let i=state.body.length-1;i>=0;i--) {
      const pos=state.body[i],x=(pos%rules.WIDTH)*cell+cell/2;
      const y=Math.floor(pos/rules.WIDTH)*cell+cell/2;
      ctx.fillStyle=i===0?'#9bf5ad':i%2?'#52c98b':'#63de98';
      ctx.beginPath();ctx.arc(x,y,cell*.44,0,Math.PI*2);ctx.fill();
      if (i===0) {
        ctx.fillStyle='#153c38';
        let ey=0,ex=0;
        if (state.direction==='up') ey=-3;
        if (state.direction==='down') ey=3;
        if (state.direction==='left') ex=-3;
        if (state.direction==='right') ex=3;
        for (const [dx,dy] of [[-4,-4],[4,-4]]) {
          ctx.beginPath();ctx.arc(x+dx+ex,y+dy+ey,cell*.08,0,Math.PI*2);ctx.fill();
        }
        ctx.strokeStyle='#245b4b';ctx.lineWidth=1.5;ctx.beginPath();
        ctx.arc(x+ex,y+ey+2,5,.1,Math.PI-.1);ctx.stroke();
      }
    }
    points.textContent=String(state.points);
    bestText.textContent=String(best);
    if (pausedByHost || state.phase==='paused') status.textContent=t('wormPause');
    else if (state.phase==='ready') status.textContent=t('wormReady');
    else if (state.phase==='over') status.textContent=t('wormOver');
    else if (state.phase==='won') status.textContent=t('youWin');
    else status.textContent=t('wormStart');
    toggle.textContent=state.phase==='playing' ? t('wormPause') :
      state.phase==='paused' ? t('wormResume') : t('wormStart');
    toggle.disabled=pausedByHost;
  }

  document.querySelectorAll('[data-direction]').forEach(button => {
    button.addEventListener('click', () => steer(button.dataset.direction));
  });
  toggle.addEventListener('click', togglePlay);
  reset.addEventListener('click', restart);
  speed.addEventListener('change', () => setSpeed(speed.value));
  exit.addEventListener('click', () => {
    void sdk.exit().then(handled => {
      if (!handled && !sdk.isHosted) status.textContent=t('previewExit');
    }).catch(() => {});
  });
  canvas.addEventListener('pointerdown', event => {
    pointerStart = {x:event.clientX,y:event.clientY};
  });
  canvas.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;
    pointerStart=null;
    if (Math.max(Math.abs(dx),Math.abs(dy)) < 16) return;
    steer(Math.abs(dx)>Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up'));
  });
  const keys={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',
    ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
  document.addEventListener('keydown', event => {
    if (event.target === speed) return;
    if (keys[event.code]) {event.preventDefault();steer(keys[event.code]);}
    else if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();togglePlay();
    } else if (event.code === 'KeyR') restart();
  });
  sdk.on('input', ({button,action}) => {
    if (action !== 'press') return;
    const direction={UP:'up',DOWN:'down',LEFT:'left',RIGHT:'right'}[button];
    if (direction) steer(direction);
    if (button === 'A') togglePlay();
    if (button === 'X') restart();
    if (button === 'B' || button === 'BACK') void sdk.exit();
  });
  sdk.on('lifecycle.pause', () => {
    pausedByHost=true; engine.pause();stopClock();paint(engine.snapshot());
  });
  sdk.on('lifecycle.resume', () => {
    pausedByHost=false;paint(engine.snapshot());
  });

  (async () => {
    locale = await window.MuPiGamesI18n.create(sdk);
    document.title=t('wormTitle')+' – MuPiBox-NG';
    try {
      const saved = await sdk.storage.get('best');
      if (Number.isSafeInteger(saved) && saved>=0) best=saved;
      const storedLevel = await sdk.storage.get('speed');
      if (Object.prototype.hasOwnProperty.call(delays, storedLevel)) level=storedLevel;
    } catch (_) { /* Browser preview can lack storage. */ }
    speed.value=level;
    paint(engine.snapshot());
  })().catch(error => {
    console.error('[MuPi Krümelwurm] startup error:',error);
    status.textContent=t('error');
  });
})();
