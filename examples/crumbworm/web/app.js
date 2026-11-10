/* MuPi Krümelwurm: original offline browser presentation (MIT). */
(function () {
  'use strict';
  const sdk = window.MuPiBoxSDK, rules = window.MuPiCrumbworm;
  const engine = rules.create();
  const canvas = document.getElementById('garden');
  const ctx = canvas.getContext('2d');
  const screen = document.querySelector('.screen');
  const status = document.getElementById('status');
  const points = document.getElementById('points');
  const bestText = document.getElementById('best');
  const exit = document.getElementById('exit');
  let locale = null, best = 0, level = 'normal', ticker = null, pausedByHost = false;
  let design = 'garden';
  const themeToggle = document.getElementById('theme-toggle');
  const speedSelect = document.getElementById('speed-select');
  let exiting = false;
  let pointerStart = null;
  const t = (key,args) => locale ? locale.t(key,args) : key;
  // Keep stored easy/normal/hard preferences compatible with older versions.
  const delays = Object.freeze({easy:230,normal:150,hard:95,turbo:70});
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
    speedSelect.value = value;
    void sdk.storage.set('speed', value).catch(() => {});
    if (engine.snapshot().phase === 'playing') clock();
  }
  function steer(direction) {
    if (pausedByHost) return;
    const state = engine.snapshot();
    if (state.phase === 'over' || state.phase === 'won' || state.phase === 'ready') {
      // No Start/Restart controls: the first arrow starts (or restarts)
      // the worm in the requested direction, including Left.
      engine.reset(direction);
      engine.start();
      clock();
    } else {
      engine.turn(direction);
      if (state.phase === 'paused') { engine.start(); clock(); }
    }
    paint(engine.snapshot());
  }
  // Original, offline 600x400 canvas art: electric cyan/white lightcycle
  // worm on a dark blue arena with restrained red grid accents. Canvas glow
  // is intentionally bounded: Raspberry Pi 4/5 software GPU paths must keep
  // the 70ms Turbo interval playable even with a long worm.
  function paintNeon(state) {
    const w = canvas.width, h = canvas.height;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#030a20';
    ctx.fillRect(0, 0, w, h);

    // An illuminated circuit grid: fine blue wires + red lane markers.
    ctx.lineWidth = 1;
    for (let x = 0; x <= rules.WIDTH; x++) {
      ctx.strokeStyle = x % 4 === 0 ? '#216cbb' : '#17385f';
      ctx.beginPath();
      ctx.moveTo(x * cell + .5, 0);
      ctx.lineTo(x * cell + .5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= rules.HEIGHT; y++) {
      ctx.strokeStyle = y % 4 === 0 ? '#a62e66' : '#194b82';
      ctx.beginPath();
      ctx.moveTo(0, y * cell + .5);
      ctx.lineTo(w, y * cell + .5);
      ctx.stroke();
    }

    // Dark playing surface, with a thin two-tone light rail on its edge.
    ctx.strokeStyle = '#ff477c';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.strokeStyle = '#34ddff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    if (state.food) {
      const fx = (state.food.position % rules.WIDTH) * cell + cell / 2;
      const fy = Math.floor(state.food.position / rules.WIDTH) * cell + cell / 2;
      ctx.shadowColor = state.food.gold ? '#ffca4e' : '#ff366d';
      ctx.shadowBlur = 13;
      ctx.fillStyle = state.food.gold ? '#ffe984' : '#ff4b6e';
      ctx.beginPath();
      ctx.arc(fx, fy, cell * (state.food.gold ? .37 : .32), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff4ca';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, fy, cell * .11, 0, Math.PI * 2);
      ctx.fill();
    }

    // Neon body: all segments stay cyan/electric blue (no red body pieces).
    // Outer glow is painted once per segment; tiny light cores preserve
    // readability even when the worm overlaps a bright part of the grid.
    for (let i = state.body.length - 1; i >= 0; i--) {
      const pos = state.body[i];
      const x = (pos % rules.WIDTH) * cell;
      const y = Math.floor(pos / rules.WIDTH) * cell;
      const head = i === 0;
      const pad = 3;
      const size = cell - 2 * pad;
      ctx.shadowColor = '#22dfff';
      ctx.shadowBlur = head ? 15 : Math.min(9, 5 + (state.body.length - i) / 8);
      ctx.fillStyle = head ? '#eaffff' : (i % 2 ? '#19b7fa' : '#55dfff');
      ctx.fillRect(x + pad, y + pad, size, size);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = head ? '#ffffff' : '#acf9ff';
      ctx.lineWidth = head ? 2.5 : 1.5;
      ctx.strokeRect(x + pad + 1, y + pad + 1, size - 2, size - 2);
      if (head) {
        // White center, forward-facing cyan visor; keep direction legible.
        let vx = 0, vy = 0;
        if (state.direction === 'up') vy = -4;
        if (state.direction === 'down') vy = 4;
        if (state.direction === 'left') vx = -4;
        if (state.direction === 'right') vx = 4;
        ctx.fillStyle = '#0c4f8b';
        for (const eyeX of [-5, 5])
          ctx.fillRect(x + cell / 2 + eyeX + vx - 2, y + cell / 2 - 2 + vy, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + cell / 2 - 3 + vx, y + cell / 2 + 5 + vy, 6, 2);
      } else {
        ctx.fillStyle = 'rgba(234,255,255,.7)';
        ctx.fillRect(x + 8, y + 8, cell - 16, 3);
      }
    }
    ctx.restore();
  }
  function applyDesign(value,save) {
    design=value==='neon'?'neon':'garden';
    screen.dataset.design=design;
    themeToggle.textContent=design==='neon'?'GARTEN':'NEON';
    themeToggle.setAttribute('aria-pressed',String(design==='neon'));
    themeToggle.setAttribute('aria-label',design==='neon'?'Zum Garten-Design wechseln':'Zum Neon-Design wechseln');
    if(save) void sdk.storage.set('design',design).catch(()=>{});
    paint(engine.snapshot());
  }
  themeToggle.addEventListener('click',()=>applyDesign(design==='garden'?'neon':'garden',true));
  speedSelect.addEventListener('change', () => setSpeed(speedSelect.value));

  function paint(state) {
    if (design === 'neon') paintNeon(state);
    else {
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
    }
    points.textContent=String(state.points);
    bestText.textContent=String(best);
    status.hidden = !pausedByHost && state.phase === 'playing';
    if (pausedByHost || state.phase==='paused') status.textContent=t('wormTouchPaused');
    else if (state.phase==='ready') status.textContent=t('wormTouchReady');
    else if (state.phase==='over') status.textContent=t('wormTouchOver');
    else if (state.phase==='won') status.textContent=t('wormTouchWon');
    else status.textContent='';
  }

  document.querySelectorAll('[data-direction]').forEach(button => {
    button.addEventListener('click', () => {
      screen.classList.remove('controller-mode');
      steer(button.dataset.direction);
    });
  });
  function leave() {
    if (exiting) return;
    exiting = true;
    stopClock();
    void sdk.exit().then(handled => {
      if (!handled && !sdk.isHosted) {
        // A standalone browser preview has no host to close. Keep the
        // game playable rather than leaving its timer permanently stopped.
        exiting = false;
        if (engine.snapshot().phase === 'playing') clock();
        status.hidden = false;
        status.textContent = t('previewExit');
      }
    }).catch(error => {
      exiting = false;
      console.warn('[MuPi Krümelwurm] exit request failed:', error);
      if (engine.snapshot().phase === 'playing') clock();
      status.hidden = false;
      status.textContent = t('previewExit');
    });
  }
  exit.addEventListener('click', leave);
  canvas.addEventListener('pointerdown', event => {
    // A touch after using a controller restores the on-screen arrows.
    if (event.pointerType === 'touch') screen.classList.remove('controller-mode');
    pointerStart = {x:event.clientX,y:event.clientY};
  });
  canvas.addEventListener('pointercancel', () => { pointerStart = null; });
  canvas.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;
    pointerStart=null;
    if (Math.max(Math.abs(dx),Math.abs(dy)) < 16) {
      // A short tap also starts, pauses or restarts a round.
      togglePlay();
      return;
    }
    steer(Math.abs(dx)>Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up'));
  });
  const keys={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',
    ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
  document.addEventListener('keydown', event => {
    if (keys[event.code]) {
      event.preventDefault();screen.classList.add('controller-mode');
      steer(keys[event.code]);
    } else if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();togglePlay();
    } else if (event.code === 'KeyR') restart();
    else if (event.code === 'Digit1') setSpeed('easy');
    else if (event.code === 'Digit2') setSpeed('normal');
    else if (event.code === 'Digit3') setSpeed('hard');
    else if (event.code === 'Digit4') setSpeed('turbo');
    else if (event.code === 'Escape' || event.code === 'Backspace') leave();
  });
  sdk.on('input', ({button,action}) => {
    if (action !== 'press') return;
    // A gamepad has no reason to show on-screen touch arrows. Keyboard
    // arrows can also arrive through the trusted host bridge.
    if (['UP','DOWN','LEFT','RIGHT','A','X','START'].includes(button))
      screen.classList.add('controller-mode');
    const direction={UP:'up',DOWN:'down',LEFT:'left',RIGHT:'right'}[button];
    if (direction) steer(direction);
    if (button === 'A' || button === 'START') togglePlay();
    if (button === 'X') restart();
    if (button === 'B' || button === 'BACK') leave();
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
      const storedDesign = await sdk.storage.get('design');
      if (storedDesign === 'garden' || storedDesign === 'neon') applyDesign(storedDesign,false);
      const storedLevel = await sdk.storage.get('speed');
      if (Object.prototype.hasOwnProperty.call(delays, storedLevel)) {
        level = storedLevel;
        speedSelect.value = level;
      }
    } catch (_) { /* Browser preview can lack storage. */ }
    paint(engine.snapshot());
  })().catch(error => {
    console.error('[MuPi Krümelwurm] startup error:',error);
    status.textContent=t('error');
  });
})();
