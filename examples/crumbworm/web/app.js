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
  let design = 'neon';
  const themeToggle = document.getElementById('theme-toggle');
  const speedSelect = document.getElementById('speed-select');
  let exiting = false;
  const garden = document.querySelector('.garden');
  const particles = [];
  let effectFrame = null;
  let flashTimer = null;
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
      const before = engine.snapshot();
      const state = engine.tick();
      if (state.meals > before.meals) emitSparks(before.food.position,before.food.gold);
      if (state.points > best) {
        best = state.points;
        void sdk.storage.set('best', best).catch(() => {});
        flashRecord();
      }
      if (state.phase === 'over' && before.phase === 'playing') flashImpact();
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
  // Pure Canvas2D art: no external image downloads, keeping the game offline
  // and responsive on the Pi 4/5 even at the 70 ms Turbo setting.
  function paintNeon(state) {
    const w=canvas.width, h=canvas.height, now=performance.now();
    ctx.save();
    ctx.shadowBlur=0;
    const bg=ctx.createLinearGradient(0,0,w,h);
    bg.addColorStop(0,'#052c42');bg.addColorStop(.52,'#062137');
    bg.addColorStop(1,'#021827');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);

    // Aquarium light shafts and subdued tiled game grid.
    for(let n=0;n<3;n++){
      ctx.fillStyle='rgba(6,185,215,.045)';
      ctx.beginPath();
      const top=80+n*195;
      ctx.moveTo(top,0);ctx.lineTo(top+53,0);
      ctx.lineTo(top+122,h);ctx.lineTo(top+49,h);ctx.closePath();ctx.fill();
    }
    ctx.strokeStyle='rgba(31,161,194,.22)';ctx.lineWidth=.8;
    for(let x=0;x<=rules.WIDTH;x++){
      ctx.beginPath();ctx.moveTo(x*cell+.5,0);ctx.lineTo(x*cell+.5,h);ctx.stroke();
    }
    for(let y=0;y<=rules.HEIGHT;y++){
      ctx.beginPath();ctx.moveTo(0,y*cell+.5);ctx.lineTo(w,y*cell+.5);ctx.stroke();
    }
    // Ambient tiny bubbles, stable across frames to avoid visual jitter.
    for(let n=0;n<27;n++){
      const x=13+((n*151+37)%574), y=10+((n*73+41)%379);
      ctx.fillStyle='rgba(104,232,237,.25)';
      ctx.beginPath();ctx.arc(x,y,n%4===0?1.9:1,0,Math.PI*2);ctx.fill();
    }
    // Aquarium plants stay behind the playable characters.
    ctx.lineCap='round';
    for(const side of [0,1]){
      ctx.strokeStyle='rgba(25,215,139,.31)';
      ctx.lineWidth=4;
      for(let j=0;j<3;j++){
        const x=side===0 ? 4+j*10 : w-4-j*10;
        ctx.beginPath();ctx.moveTo(x,h);
        ctx.quadraticCurveTo(x+(side===0?-18:18),h-48,x+(side===0?13:-13),h-83+j*12);ctx.stroke();
      }
    }
    if(state.food){
      const fx=(state.food.position%rules.WIDTH)*cell+cell/2;
      const fy=Math.floor(state.food.position/rules.WIDTH)*cell+cell/2;
      const pulse=1+.09*Math.sin(now/160);
      const rad=cell*(state.food.gold?.41:.34)*pulse;
      const halo=ctx.createRadialGradient(fx,fy,1,fx,fy,cell*.78);
      halo.addColorStop(0,state.food.gold?'rgba(255,244,125,.85)':'rgba(255,193,60,.9)');
      halo.addColorStop(.45,'rgba(253,171,37,.32)');halo.addColorStop(1,'rgba(244,164,11,0)');
      ctx.fillStyle=halo;ctx.beginPath();ctx.arc(fx,fy,cell*.8,0,Math.PI*2);ctx.fill();
      const crumb=ctx.createRadialGradient(fx-3,fy-4,0,fx,fy,rad);
      crumb.addColorStop(0,'#fffad0');crumb.addColorStop(.3,'#ffe878');
      crumb.addColorStop(1,state.food.gold?'#f89814':'#d97809');
      ctx.fillStyle=crumb;ctx.beginPath();ctx.arc(fx,fy,rad,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff8c9';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(fx-3,fy-3,2,0,Math.PI*2);ctx.fill();
      // Golden crumbs produce a clear four-point sparkle.
      if(state.food.gold){
        ctx.strokeStyle='#fff1a0';ctx.lineWidth=1.7;
        ctx.beginPath();ctx.moveTo(fx,fy-rad-7);ctx.lineTo(fx,fy-rad+1);
        ctx.moveTo(fx-4,fy-rad-3);ctx.lineTo(fx+4,fy-rad-3);ctx.stroke();
      }
    }
    // Rounded glossy mint-green segments; head is a cheerful cartoon face.
    for(let i=state.body.length-1;i>=0;i--){
      const pos=state.body[i], x=(pos%rules.WIDTH)*cell+cell/2;
      const y=Math.floor(pos/rules.WIDTH)*cell+cell/2;
      const head=i===0, r=cell*(head?.46:.43);
      const fill=ctx.createRadialGradient(x-5,y-6,1,x,y,r);
      fill.addColorStop(0,head?'#c5ff9a':'#83ffc0');
      fill.addColorStop(.56,head?'#70ef64':'#36da80');
      fill.addColorStop(1,head?'#19b64c':'#11976a');
      ctx.shadowColor=head?'#84ff4f':'#20e0a1';
      ctx.shadowBlur=head?10:4;
      ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle=head?'#cbffb5':'#89ffd1';ctx.lineWidth=1.2;ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.38)';
      ctx.beginPath();ctx.ellipse(x-3,y-5,r*.41,r*.22,-.4,0,Math.PI*2);ctx.fill();
      if(head){
        ctx.save();ctx.translate(x,y);
        const angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[state.direction]||0;
        ctx.rotate(angle);
        // Eyes look forward; cheeks and smile are legible at 5 inches.
        for(const ey of [-5.1,5.1]){
          ctx.fillStyle='#fffef2';ctx.beginPath();ctx.ellipse(2.3,ey,3.7,3.1,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#173d3b';ctx.beginPath();ctx.arc(3.5,ey,.0+1.9,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(4.1,ey-.8,.85,0,Math.PI*2);ctx.fill();
        }
        ctx.fillStyle='#ff809b';
        ctx.beginPath();ctx.arc(-2,-8,1.8,0,Math.PI*2);ctx.arc(-2,8,1.8,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#245c31';ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(-1,0,5,-.85,.85);ctx.stroke();
        ctx.restore();
      }
    }
    // Sparkle fragments from pickups, slightly larger on bonus crumbs.
    for(const p of particles){
      const age=(now-p.at)/620;
      if(age<0||age>=1) continue;
      const x=p.x+p.dx*age, y=p.y+p.dy*age+age*age*12;
      ctx.globalAlpha=1-age;
      ctx.fillStyle=p.gold?'#fff0a7':'#a2ffac';
      ctx.beginPath();ctx.arc(x,y,p.radius*(1-age*.6),0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }
  function animateSparks(){
    effectFrame=null;
    const now=performance.now();
    for(let i=particles.length-1;i>=0;i--) if(now-particles[i].at>620) particles.splice(i,1);
    paint(engine.snapshot());
    if(particles.length) effectFrame=requestAnimationFrame(animateSparks);
  }
  function emitSparks(position,gold){
    if(position==null) return;
    const x=(position%rules.WIDTH)*cell+cell/2;
    const y=Math.floor(position/rules.WIDTH)*cell+cell/2;
    const at=performance.now();
    for(let j=0;j<9;j++){
      const a=(j/9)*Math.PI*2;
      particles.push({x,y,at,dx:Math.cos(a)*(18+(j%3)*6),
        dy:Math.sin(a)*(16+(j%3)*6),radius:gold?3.2:2.5,gold});
    }
    if(!effectFrame) effectFrame=requestAnimationFrame(animateSparks);
  }
  function flashImpact(){
    garden.classList.remove('shake');
    void garden.offsetWidth; // restart the animation on consecutive impacts
    garden.classList.add('shake');
    window.setTimeout(()=>garden.classList.remove('shake'),540);
  }
  function flashRecord(){
    garden.classList.add('record');
    if(flashTimer!==null) clearTimeout(flashTimer);
    flashTimer=window.setTimeout(()=>garden.classList.remove('record'),420);
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
    // Set the visible theme label and neon CSS even on a fresh install.
    applyDesign('neon',false);
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
