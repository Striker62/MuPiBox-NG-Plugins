/* MuPi Run – offline 2.5D community runner. */
(function () {
  'use strict';
  const game = window.MuPiRun;
  const sdk = window.MuPiBoxSDK;
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d', {alpha: false});
  const art = Object.create(null);
  const atlas = window.MuPiPoses;
  const audio = window.createRunAudio(sdk, window.MuPiRunAudioFiles);
  const loading = window.MuPiRunArt.map(file => new Promise((resolve, reject) => {
    const img = new Image();
    art[file.split('.')[0]] = img;
    img.onload = resolve;
    img.onerror = () => reject(new Error(file));
    img.src = './art/' + file;
  }));
  const world = window.createRunWorld(ctx, art, game);
  const overlay = document.getElementById('overlay');
  const headline = document.getElementById('headline');
  const message = document.getElementById('message');
  const primary = document.getElementById('primary');
  const pauseButton = document.getElementById('pause');
  const bestLabel = document.getElementById('best');
  const distanceLabel = document.getElementById('distance');
  const noteLabel = document.getElementById('notes');
  let ready = false, muted = false;
  const soundButton = document.getElementById('sound');
  soundButton.hidden = !Object.keys(window.MuPiRunAudioFiles).length;
  const toast = document.getElementById('toast');
  let state = game.fresh((Date.now() ^ 0x643bd8) >>> 0);
  let best = 0, lang = 'de', lastFrame = 0, lastLevel = 1, toastUntil = 0;
  let previousTerrain='river';
  let controllerMode=false;
  const gameElement=document.querySelector('.game');
  function setControllerMode(active){
    controllerMode=active;
    gameElement.classList.toggle('controller-active',active);
  }
  let panStart = null, gamepadPrevious = new Set(), crashAt = -9999;

  const languages = {
    de: {meters:'METER',best:'REKORD',jump:'SPRUNG',duck:'GRÄTSCHE',lanes:'SPUR',kicker:'DAS ENDLOS-ABENTEUER',intro:'Sammle goldene Noten. Spring über Stämme und gleite unter Ästen hindurch.',start:"LOS GEHT'S!",controller:'Controller empfohlen · Auch mit Touch spielbar',pause:'PAUSE',resume:'WEITERLAUFEN',over:'AUSGELAUFEN!',again:'NOCH MAL!',result:'Geschafft: {n} Meter! Nächstes Mal kommst du noch weiter.',newbest:'NEUER REKORD!',level:'TEMPO {n}',pausedesc:'Drücke START, A oder tippe auf Weiterlaufen.'},
    en: {meters:'METERS',best:'BEST',jump:'JUMP',duck:'DUCK',lanes:'LANE',kicker:'THE ENDLESS ADVENTURE',intro:'Collect golden notes. Jump over logs and slide under branches.',start:"LET'S RUN!",controller:'Controller recommended · Touch also works',pause:'PAUSED',resume:'KEEP RUNNING',over:'GAME OVER!',again:'TRY AGAIN!',result:'You ran {n} meters. Can you beat it?',newbest:'NEW RECORD!',level:'SPEED {n}',pausedesc:'Press START, A or tap to resume.'},
    fr: {meters:'MÈTRES',best:'RECORD',jump:'SAUTER',duck:'BAISSER',lanes:'VOIE',kicker:"L'AVENTURE SANS FIN",intro:"Saute, baisse-toi et évite les obstacles !",start:'C’EST PARTI !',controller:'Manette conseillée · Tactile aussi',pause:'PAUSE',resume:'CONTINUER',over:'TERMINÉ !',again:'REJOUER',result:'Tu as parcouru {n} mètres !',newbest:'NOUVEAU RECORD !',level:'VITESSE {n}',pausedesc:'START, A ou toucher pour reprendre.'},
    es: {meters:'METROS',best:'RÉCORD',jump:'SALTA',duck:'AGÁCHATE',lanes:'CARRIL',kicker:'AVENTURA INFINITA',intro:'¡Salta, agáchate y esquiva obstáculos!',start:'¡A CORRER!',controller:'Se recomienda mando · También táctil',pause:'PAUSA',resume:'CONTINUAR',over:'¡FIN!',again:'¡OTRA VEZ!',result:'¡Has recorrido {n} metros!',newbest:'¡NUEVO RÉCORD!',level:'VELOCIDAD {n}',pausedesc:'Pulsa START, A o toca para continuar.'},
    it: {meters:'METRI',best:'RECORD',jump:'SALTA',duck:'ABBASSATI',lanes:'CORSIA',kicker:'AVVENTURA SENZA FINE',intro:'Salta, abbassati ed evita gli ostacoli!',start:'VIA!',controller:'Controller consigliato · Anche touch',pause:'PAUSA',resume:'CONTINUA',over:'FINE!',again:'RIPROVA!',result:'Hai percorso {n} metri!',newbest:'NUOVO RECORD!',level:'VELOCITÀ {n}',pausedesc:'Premi START, A o tocca per riprendere.'},
    nl: {meters:'METER',best:'RECORD',jump:'SPRING',duck:'BUK',lanes:'BAAN',kicker:'HET EINDELOZE AVONTUUR',intro:'Spring, buk en ontwijk obstakels!',start:'RENNEN!',controller:'Controller aanbevolen · Ook aanraakbaar',pause:'PAUZE',resume:'VERDER',over:'GAME OVER!',again:'OPNIEUW!',result:'Je rende {n} meter!',newbest:'NIEUW RECORD!',level:'SNELHEID {n}',pausedesc:'Druk START, A of tik om verder te gaan.'},
    sv: {meters:'METER',best:'REKORD',jump:'HOPPA',duck:'DUCKA',lanes:'BANA',kicker:'ÄVENTYRET FORTSÄTTER',intro:'Hoppa, ducka och undvik hinder!',start:'SPRING!',controller:'Handkontroll rekommenderas · Även touch',pause:'PAUS',resume:'FORTSÄTT',over:'SLUT!',again:'IGEN!',result:'Du sprang {n} meter!',newbest:'NYTT REKORD!',level:'FART {n}',pausedesc:'Tryck START, A eller tryck för att fortsätta.'}
  };
  function tr(key, params) {
    let text = (languages[lang] || languages.de)[key] || languages.en[key] || key;
    if (params) Object.keys(params).forEach(k => { text = text.replace('{' + k + '}', String(params[k])); });
    return text;
  }
  function translate() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
    renderOverlay();
  }

  function rounded(x,y,w,h,r,color,stroke) {
    r = Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
    if (color) {ctx.fillStyle = color;ctx.fill();}
    if (stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=2.4;ctx.stroke();}
  }
  function ellipse(x,y,rx,ry,color,paint=ctx) {
    paint.beginPath(); paint.ellipse(x,y,Math.max(0.01,rx),Math.max(0.01,ry),0,0,Math.PI*2);
    paint.fillStyle=color;paint.fill();
  }
  function centeredText(text,x,y,size,color,stroke) {
    ctx.font='1000 '+size+'px "Trebuchet MS", sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(stroke){ctx.lineWidth=4;ctx.strokeStyle=stroke;ctx.strokeText(text,x,y);}
    ctx.fillStyle=color;ctx.fillText(text,x,y);
  }

  function pose() {
    const age = state.jumpAge >= 0 ? state.jumpAge : state.duckAge;
    if (age < 0) return {name:'run', frame:Math.floor(state.runPose)};
    const name = state.jumpAge >= 0 ? 'jump' : 'slide';
    const frame = Math.min(atlas.frames - 1, Math.floor(age * atlas.fps + 1e-8));
    return {name, frame, tile:atlas.actions[name].clips[state.entryPose][frame]};
  }
  function runner(p) {
    const visible = pose();
    const elevation = game.jumpHeight(state)/45;
    ellipse(p.x,p.y+1,32-elevation*9,5-elevation*1.6,'rgba(30,35,25,'+(.36-elevation*.17)+')');
    const scale = 205 / 512;
    if (visible.name === 'run') {
      const im=art['mupi-running-24'];
      if (im.naturalWidth) ctx.drawImage(im,visible.frame%6*320,Math.floor(visible.frame/6)*320,320,320,
        p.x-256*scale,p.y-486*scale,205,205);
      return;
    }
    const spec=atlas.actions[visible.name];
    const tile=visible.tile%atlas.perPage;
    const page=art[visible.name+'-'+Math.floor(visible.tile/atlas.perPage)];
    if(page.naturalWidth) ctx.drawImage(page,tile%atlas.columns*spec.cell[0]+1,
      Math.floor(tile/atlas.columns)*spec.cell[1]+1,spec.size[0],spec.size[1],
      p.x-spec.origin[0]*scale,p.y-spec.origin[1]*scale,spec.draw[0]*scale,spec.draw[1]*scale);
  }
  const hazards = {
    rock:['moss-rock',76,36], boulder:['moss-rock',125,101], fox:['sleeping-fox',116,78],
    log:['windfall',117,38], root:['branch',100,31], stump:['stump',104,91], reeds:['reeds',96,94],
    'stepping-stones':['stepping-stones',125,41], branch:['branch',151,67], vine:['vine',130,103], willow:['vine',130,103]
  };
  function hazard(ob,p,paint) {
    const s=p.s;
    const bridge=ob.item==='low-bridge';
    const overhead=ob.kind==='duck';
    let top;
    if(bridge) {
      world.sprite('timber-bridge',p.x,p.y+2*s,724*s,220*s);
      top=220;
    } else {
      const [name,w,h]=hazards[ob.item] || hazards.rock;
      const bottom=overhead ? 112 : 0;
      ellipse(p.x,p.y+1,Math.max(1,w*s*.34),Math.max(1,5*s),'#26352350',paint);
      world.sprite(name,p.x,p.y-bottom*s,w*s,h*s);
      top=h+bottom;
    }
    if(!ob.checked && ob.z < state.speed*.93+2 && ob.z>3){
      const y=p.y-(top+12)*s;
      rounded(p.x-12*s,y-12*s,24*s,24*s,7*s,'#324238ee','#f4ddac');
      centeredText(overhead?'↓':ob.kind==='jump'?'↑':'↔',p.x,y,18*s,'#fff4cc');
    }
  }
  let sparkleAt=-10;
  let displayedMeters=-1, displayedBest=-1, displayedNotes=-1;
  function render(){
    ctx.save();
    const since=performance.now()-crashAt;
    if(state.phase==='over' && since<330) ctx.translate(Math.sin(since*.1)*(1-since/330)*5,0);
    world.render(state, runner, hazard);
    ctx.restore();
    const meters=Math.floor(state.distance);
    if(meters!==displayedMeters){distanceLabel.textContent=meters.toLocaleString(lang); displayedMeters=meters;}
    if(best!==displayedBest){bestLabel.textContent=best.toLocaleString(lang)+' m'; displayedBest=best;}
    if(state.noteCount!==displayedNotes){
      noteLabel.textContent=state.noteCount;
      if(state.noteCount>0) sparkleAt=state.time;
      displayedNotes=state.noteCount;
    }
    noteLabel.parentElement.classList.toggle('collected',state.time-sparkleAt<.19);
    if(performance.now()>toastUntil)toast.classList.remove('visible');
  }
  function showToast(label) {
    toast.textContent=label;
    toastUntil=performance.now()+1350;
    toast.classList.add('visible');
  }
  function resize(){
    const r=canvas.getBoundingClientRect(), dpr=Math.min(1, 560 / Math.max(1,r.width));
    canvas.width=Math.max(1,Math.round(r.width*dpr));
    canvas.height=Math.max(1,Math.round(r.height*dpr));
    ctx.setTransform(canvas.width/800,0,0,canvas.height/480,0,0);
  }
  function renderOverlay(){
    const phase=state.phase;
    audio.active(phase==='running' && !muted);
    if(phase==='running'){overlay.classList.add('hidden');pauseButton.textContent='Ⅱ';return;}
    overlay.classList.remove('hidden');
    if(phase==='ready'){
      headline.innerHTML='MuPi <em>RUN</em>';
      message.textContent=tr('intro');primary.textContent=tr('start');
    }else if(phase==='paused'){
      headline.textContent=tr('pause');
      message.textContent=tr('pausedesc');primary.textContent=tr('resume');
    }else{
      headline.textContent=tr('over');
      message.textContent=tr('result',{n:Math.floor(state.distance)})+'  ♫ '+state.noteCount+
        (Math.floor(state.distance)>=best && best>0?' '+tr('newbest'):'');
      primary.textContent=tr('again');
    }
    pauseButton.textContent=phase==='paused'?'▶':'Ⅱ';
  }
  function finish(){
    if(state.phase!=='over')return;
    crashAt=performance.now();
    const distance=Math.floor(state.distance);
    if(distance>best){
      best=distance;
      void sdk.storage.set('bestMeters',best).catch(()=>{});
    }
    renderOverlay();
  }
  const paintInterval = 1000/30;
  let nextPaint = 0;
  function frame(now){
    const delta=lastFrame ? Math.min(.20,(now-lastFrame)/1000) : 0;
    lastFrame=now;
    if(state.phase==='running'){
      const notes=state.noteCount, steps=state.steps, kilometer=Math.floor(state.distance/1000);
      // Keep collision and action timing in short steps after a slow paint.
      const stepsDue=Math.ceil(delta*30);
      for(let n=0;n<stepsDue;n++) game.step(state,delta/stepsDue);
      if (state.noteCount>notes) audio.play('collect');
      if (state.steps>steps) audio.play('run');
      if (Math.floor(state.distance/1000)>kilometer) audio.play('kilometer');
      if(state.lastTerrain!==previousTerrain){
        previousTerrain=state.lastTerrain;
        showToast(previousTerrain==='boardwalk'?'HOLZSTEG!':previousTerrain==='forest'?'WALDPFAD!':'FLUSSBETT!');
      }
      const level=1+Math.floor(state.distance/150);
      if(level>lastLevel){lastLevel=level;showToast(tr('level',{n:level}));}
      if(state.phase==='over')finish();
    }
    pollGamepad();
    if ((state.phase==='running' || now-crashAt<360) && now+.5>=nextPaint) {
      render();
      nextPaint = now + paintInterval - (Math.max(0, now - nextPaint) % paintInterval);
    }
    window.requestAnimationFrame(frame);
  }
  function begin(){
    if(!ready)return;
    if(state.phase==='over'){
      state=game.fresh((Date.now() ^ (Math.random()*0xffffffff))>>>0);
      sparkleAt=-10;
      lastLevel=1;
      previousTerrain='river';
    }
    if(state.phase==='paused')game.act(state,'pause');
    else game.act(state,'start');
    renderOverlay();
  }
  function togglePause(){
    if(state.phase==='running'||state.phase==='paused'){
      game.act(state,'pause');renderOverlay();
    }
  }
  function control(action){
    if(action==='exit'){ audio.active(false); void sdk.exit().catch(()=>{});return; }
    if(action==='pause'){
      if(state.phase==='ready'||state.phase==='over') begin();
      else togglePause();
      return;
    }
    if(state.phase!=='running'){
      if(action==='start'||action==='jump')begin();
      return;
    }
    if(action==='jump' || action==='duck') {
      const name=action==='jump'?'jump':'slide';
      const phase=Math.floor(state.runPose);
      if(game.act(state,action,atlas.actions[name].resume[phase])){
        audio.play(name);
        nextPaint=0;
      }
    } else game.act(state,action);
  }
  function controllerButton(button) {
    setControllerMode(true);
    const map={LEFT:'left',RIGHT:'right',UP:'jump',DOWN:'duck',
      A:'jump',B:'duck',X:'jump',Y:'duck',LB:'left',RB:'right',
      L1:'left',R1:'right',START:'pause',MENU:'pause',BACK:'exit',SELECT:'exit'};
    if(map[button])control(map[button]);
  }
  sdk.on('input', payload=>{
    if(payload&&payload.action==='press')controllerButton(String(payload.button||'').toUpperCase());
  });
  sdk.on('lifecycle.pause',()=>{
    if(state.phase==='running') {game.act(state,'pause');renderOverlay();}
  });
  sdk.on('lifecycle.resume',()=>{lastFrame=0;renderOverlay();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&state.phase==='running'){game.act(state,'pause');renderOverlay();}
    lastFrame=0;
  });

  function pollGamepad(){
    if(sdk.isHosted||!navigator.getGamepads)return;
    let pad;
    try{pad=Array.from(navigator.getGamepads()).find(Boolean);}catch(_){return;}
    if(!pad){gamepadPrevious.clear();return;}
    const pressed=new Set();
    const named={0:'A',1:'B',2:'X',3:'Y',8:'SELECT',9:'START',12:'UP',13:'DOWN',14:'LEFT',15:'RIGHT'};
    pad.buttons.forEach((button,index)=>{
      if(button.pressed && named[index])pressed.add(named[index]);
    });
    if(pad.axes[0]<-.55)pressed.add('LEFT');
    if(pad.axes[0]>.55)pressed.add('RIGHT');
    if(pad.axes[1]<-.55)pressed.add('UP');
    if(pad.axes[1]>.55)pressed.add('DOWN');
    pressed.forEach(button=>{if(!gamepadPrevious.has(button))controllerButton(button);});
    gamepadPrevious=pressed;
  }
  const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',
    ArrowUp:'jump',Space:'jump',KeyW:'jump',ArrowDown:'duck',KeyS:'duck',
    Enter:'start',KeyP:'pause',Escape:'exit'};
  document.addEventListener('keydown',event=>{
    const action=keyMap[event.code];
    if(!action)return;
    setControllerMode(true);
    event.preventDefault();
    event.stopPropagation(); // The standalone SDK also maps keys on window.
    if(event.repeat)return;
    control(action);
  });
  for(const id of ['left','right','jump','duck']){
    const button=document.getElementById(id);
    button.addEventListener('pointerdown', event=>{
      event.preventDefault();setControllerMode(false);control(id);
    });
  }
  document.getElementById('exit').addEventListener('click',()=>control('exit'));
  soundButton.addEventListener('click',()=>{
    muted=!muted;
    soundButton.setAttribute('aria-pressed',String(muted));
    soundButton.textContent=muted?'🔇':'♫';
    audio.active(state.phase==='running' && !muted);
  });
  window.addEventListener('blur',()=>{if(state.phase==='running')togglePause();});
  window.addEventListener('pagehide',()=>{if(state.phase==='running')togglePause();});
  pauseButton.addEventListener('click',()=>control('pause'));
  primary.addEventListener('click',begin);
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch')setControllerMode(false);
    panStart={x:event.clientX,y:event.clientY};
  });
  canvas.addEventListener('pointerup',event=>{
    if(!panStart)return;
    const dx=event.clientX-panStart.x,dy=event.clientY-panStart.y;
    panStart=null;
    if(Math.abs(dx)>25&&Math.abs(dx)>Math.abs(dy))control(dx<0?'left':'right');
    else if(Math.abs(dy)>25)control(dy<0?'jump':'duck');
    else control('jump');
  });
  canvas.addEventListener('pointercancel',()=>{panStart=null;});
  // Only a standalone browser preview exposes deterministic test scenes.
  // This API is not registered inside hosted MuPiBox Qt.
  if(!sdk.isHosted){
    window.__MuPiRunPreview=Object.freeze({
      setScene(distance, obstacles=[], lane=0, mode='running') {
        if(!Number.isFinite(distance) || distance<0 || distance>1e6) return false;
        if (!ready) return false;
        state.notes=[14,20,26].map(z=>({lane:0,z}));
        state.distance=distance;
        state.speed=game.speedAt(distance);
        state.lastTerrain=game.terrainAt(distance);
        state.lane=Math.max(-1,Math.min(1,Number(lane)||0));
        state.visualLane=state.lane;
        state.obstacles=obstacles.map(o=>({
          lane:o.lane===null?null:Math.max(-1,Math.min(1,Number(o.lane)||0)),
          kind:o.kind,item:o.item,z:Number(o.z)||20,checked:false,passed:false
        }));
        state.entryPose=Math.floor(state.runPose);
        state.resumePose=atlas.actions[mode==='jump'?'jump':'slide'].resume[state.entryPose];
        state.jumpAge=mode==='jump'?.23:-1;
        state.duckAge=mode==='duck'?.4:-1;
        state.phase='running';
        setControllerMode(true);
        renderOverlay();render();
        return true;
      },
      snapshot() {
        return {
          phase:state.phase,distance:state.distance,lane:state.lane,
          visualLane:state.visualLane,speed:state.speed,
          jumpAge:state.jumpAge,duckAge:state.duckAge,waves:state.waves,
          phaseJump:state.jumpAge,phaseDuck:state.duckAge,
          terrain:state.lastTerrain,obstacles:state.obstacles.map(o=>({...o})),
          missingSprites:Object.keys(art).filter(name=>!art[name].complete||!art[name].naturalWidth),
          controllerMode:gameElement.classList.contains('controller-active'),
          usingUserSheet:!!(art['mupi-running-24']&&art['mupi-running-24'].naturalWidth===1920),
          sheetFrame:Math.floor(state.runPose), pose:pose(), notes:state.noteCount, ready
        };
      }
    });
  }
  primary.disabled=true;
  Promise.all(loading).then(()=>{
    ready=true;primary.disabled=false;render();
  }).catch(error=>{message.textContent='Grafik konnte nicht geladen werden: '+error.message;});
  window.addEventListener('resize',()=>{resize();render();});
  resize();renderOverlay();
  window.requestAnimationFrame(frame);

  (async()=>{
    try{
      const context=await sdk.getContext();
      const candidate=String(context&&context.language||'').slice(0,2).toLowerCase();
      lang=languages[candidate]?candidate:'de';
    }catch(_){
      const candidate=String(navigator.language||'de').slice(0,2).toLowerCase();
      lang=languages[candidate]?candidate:'de';
    }
    try{
      const stored=await sdk.storage.get('bestMeters');
      if(Number.isSafeInteger(stored)&&stored>=0)best=stored;
    }catch(_){}
    translate();
  })().catch(error=>console.warn('[MuPi Run] context error',error));
})();