/* MuPi Run – offline 2.5D community runner. */
(function () {
  'use strict';
  const game = window.MuPiRun;
  const sdk = window.MuPiBoxSDK;
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d', {alpha: false});
  const atlas = window.MuPiPoses;
  const audio = window.MuPiRunSession;
  const hostContext=sdk.getContext().catch(()=>null);
  const audioReady=hostContext.then(context=>audio.prepare(context));
  const runTiles=Object.create(null);
  const tileSurface=document.createElement('canvas');
  // One small upload when the visible pose changes. The seven source pages stay on the CPU.
  tileSurface.width=tileSurface.height=1;
  const tilePaint=tileSurface.getContext('2d',{willReadFrequently:true});
  let lastTilePage=null, lastTileIndex=-1;
  async function prepareAtlas(file) {
    const name=file.split('.')[0], layout=window.MuPiRunTiles[name];
    const image=new Image();
    image.src='./art/'+file;
    await image.decode();
    // Keep the decoded image as an immutable bitmap; a page-size Canvas copy is unnecessary.
    let page=image;
    if(typeof createImageBitmap==='function') {
      try { page=await createImageBitmap(image); } catch (_) { /* decoded Image remains drawable */ }
    }
    const {w,h,tiles}=layout;
    runTiles[name]={page,w,h,tiles};
    tileSurface.width=Math.max(tileSurface.width,w+2);
    tileSurface.height=Math.max(tileSurface.height,h+2);
  }
  async function prepareRunner() {
    // Decode one prepared page at a time to bound temporary memory.
    for(const file of window.MuPiRunArt) {
      if(file!=='logo-ui.png') await prepareAtlas(file);
    }
  }
  let world;
  async function prepareGraphics() {
    await audio.opening;
    world=window.createRunWorld(ctx,game);
    await world.ready;
    await prepareRunner();
  }
  const graphicsReady=prepareGraphics();
  const overlay = document.getElementById('overlay');
  const headline = document.getElementById('headline');
  const message = document.getElementById('message');
  const primary = document.getElementById('primary');
  const pauseButton = document.getElementById('pause');
  const bestLabel = document.getElementById('best');
  const distanceLabel = document.getElementById('distance');
  const noteLabel = document.getElementById('notes');
  let ready = false;
  let loadingError='';
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
    de: {audioSettings:'Audio-Einstellungen',music:'Musik',effects:'Soundeffekte',done:'Fertig',meters:'METER',best:'REKORD',jump:'SPRUNG',duck:'GRÄTSCHE',lanes:'SPUR',kicker:'DAS ENDLOS-ABENTEUER',intro:'Sammle goldene Noten. Spring über Stämme und gleite unter Ästen hindurch.',start:"LOS GEHT'S!",controller:'Controller empfohlen · Auch mit Touch spielbar',pause:'PAUSE',resume:'WEITERLAUFEN',over:'AUSGELAUFEN!',again:'NOCH MAL!',result:'Geschafft: {n} Meter! Nächstes Mal kommst du noch weiter.',newbest:'NEUER REKORD!',level:'TEMPO {n}',pausedesc:'Drücke START, A oder tippe auf Weiterlaufen.'},
    en: {audioSettings:'Audio settings',music:'Music',effects:'Sound effects',done:'Done',meters:'METERS',best:'BEST',jump:'JUMP',duck:'DUCK',lanes:'LANE',kicker:'THE ENDLESS ADVENTURE',intro:'Collect golden notes. Jump over logs and slide under branches.',start:"LET'S RUN!",controller:'Controller recommended · Touch also works',pause:'PAUSED',resume:'KEEP RUNNING',over:'GAME OVER!',again:'TRY AGAIN!',result:'You ran {n} meters. Can you beat it?',newbest:'NEW RECORD!',level:'SPEED {n}',pausedesc:'Press START, A or tap to resume.'},
    fr: {audioSettings:'Paramètres audio',music:'Musique',effects:'Effets sonores',done:'Terminé',meters:'MÈTRES',best:'RECORD',jump:'SAUTER',duck:'BAISSER',lanes:'VOIE',kicker:"L'AVENTURE SANS FIN",intro:"Saute, baisse-toi et évite les obstacles !",start:'C’EST PARTI !',controller:'Manette conseillée · Tactile aussi',pause:'PAUSE',resume:'CONTINUER',over:'TERMINÉ !',again:'REJOUER',result:'Tu as parcouru {n} mètres !',newbest:'NOUVEAU RECORD !',level:'VITESSE {n}',pausedesc:'START, A ou toucher pour reprendre.'},
    es: {audioSettings:'Ajustes de audio',music:'Música',effects:'Efectos de sonido',done:'Listo',meters:'METROS',best:'RÉCORD',jump:'SALTA',duck:'AGÁCHATE',lanes:'CARRIL',kicker:'AVENTURA INFINITA',intro:'¡Salta, agáchate y esquiva obstáculos!',start:'¡A CORRER!',controller:'Se recomienda mando · También táctil',pause:'PAUSA',resume:'CONTINUAR',over:'¡FIN!',again:'¡OTRA VEZ!',result:'¡Has recorrido {n} metros!',newbest:'¡NUEVO RÉCORD!',level:'VELOCIDAD {n}',pausedesc:'Pulsa START, A o toca para continuar.'},
    it: {audioSettings:'Impostazioni audio',music:'Musica',effects:'Effetti sonori',done:'Fine',meters:'METRI',best:'RECORD',jump:'SALTA',duck:'ABBASSATI',lanes:'CORSIA',kicker:'AVVENTURA SENZA FINE',intro:'Salta, abbassati ed evita gli ostacoli!',start:'VIA!',controller:'Controller consigliato · Anche touch',pause:'PAUSA',resume:'CONTINUA',over:'FINE!',again:'RIPROVA!',result:'Hai percorso {n} metri!',newbest:'NUOVO RECORD!',level:'VELOCITÀ {n}',pausedesc:'Premi START, A o tocca per riprendere.'},
    nl: {audioSettings:'Geluidsinstellingen',music:'Muziek',effects:'Geluidseffecten',done:'Gereed',meters:'METER',best:'RECORD',jump:'SPRING',duck:'BUK',lanes:'BAAN',kicker:'HET EINDELOZE AVONTUUR',intro:'Spring, buk en ontwijk obstakels!',start:'RENNEN!',controller:'Controller aanbevolen · Ook aanraakbaar',pause:'PAUZE',resume:'VERDER',over:'GAME OVER!',again:'OPNIEUW!',result:'Je rende {n} meter!',newbest:'NIEUW RECORD!',level:'SNELHEID {n}',pausedesc:'Druk START, A of tik om verder te gaan.'},
    sv: {audioSettings:'Ljudinställningar',music:'Musik',effects:'Ljudeffekter',done:'Klart',meters:'METER',best:'REKORD',jump:'HOPPA',duck:'DUCKA',lanes:'BANA',kicker:'ÄVENTYRET FORTSÄTTER',intro:'Hoppa, ducka och undvik hinder!',start:'SPRING!',controller:'Handkontroll rekommenderas · Även touch',pause:'PAUS',resume:'FORTSÄTT',over:'SLUT!',again:'IGEN!',result:'Du sprang {n} meter!',newbest:'NYTT REKORD!',level:'FART {n}',pausedesc:'Tryck START, A eller tryck för att fortsätta.'}
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

  function ellipse(x,y,rx,ry,color) {
    ctx.beginPath(); ctx.ellipse(x,y,Math.max(0.01,rx),Math.max(0.01,ry),0,0,Math.PI*2);
    ctx.fillStyle=color;ctx.fill();
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
    const running=visible.name==='run';
    const name=running ? 'mupi-running-24' : visible.name+'-'+Math.floor(visible.tile/atlas.perPage);
    const tile=running ? visible.frame : visible.tile%atlas.perPage;
    const {page,w,h,tiles}=runTiles[name];
    const spec=running ? null : atlas.actions[visible.name];
    const [ox,oy]=running ? [256,486] : spec.origin;
    const [dw,dh]=running ? [512,512] : spec.draw;
    if(page!==lastTilePage || tile!==lastTileIndex){
      tilePaint.clearRect(0,0,tileSurface.width,tileSurface.height);
      const [dx,dy,sx,sy,cw,ch]=tiles[tile];
      tilePaint.drawImage(page,sx,sy,cw,ch,1+dx,1+dy,cw,ch);
      lastTilePage=page;lastTileIndex=tile;
    }
    ctx.drawImage(tileSurface,1,1,w,h,
      p.x-ox*scale,p.y-oy*scale,dw*scale,dh*scale);
  }
  const hazards = {
    rock:['moss-rock',76,36], boulder:['moss-rock',125,101], fox:['sleeping-fox',116,78],
    log:['windfall',117,38], root:['branch',100,31], stump:['stump',104,91], reeds:['reeds',96,94],
    'stepping-stones':['stepping-stones',125,41], branch:['branch',151,67], vine:['vine',130,103], willow:['vine',130,103]
  };
  function hazard(ob,p) {
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
      world.shadow(p.x,p.y+1,Math.max(1,w*s*.34),Math.max(1,5*s));
      world.sprite(name,p.x,p.y-bottom*s,w*s,h*s);
      top=h+bottom;
    }
    if(!ob.checked && ob.z < state.speed*.93+2 && ob.z>3){
      const y=p.y-(top+12)*s;
      world.hint(overhead?'↓':ob.kind==='jump'?'↑':'↔',p.x,y,s);
    }
  }
  let sparkleAt=-10;
  let displayedMeters=-1, displayedBest=-1, displayedNotes=-1;
  function render(){
    const since=performance.now()-crashAt;
    const shake=state.phase==='over' && since<330 ? Math.sin(since*.1)*(1-since/330)*5 : 0;
    if(shake || canvas.style.transform) canvas.style.transform=shake?'translateX('+shake.toFixed(1)+'px)':'';
    world.render(state, runner, hazard);
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
    overlay.classList.toggle('intro-art', phase==='ready');
    // Only the shared exit control stays visible above a menu; no live HUD underneath.
    gameElement.classList.toggle('menu-open', phase!=='running');
    if(phase==='running'){overlay.classList.add('hidden');pauseButton.textContent='Ⅱ';return;}
    overlay.classList.remove('hidden');
    if(phase==='ready'){
      headline.innerHTML='MuPi <em>RUN</em>';
      const loadingLabels={de:'Spiel wird geladen …',en:'Loading game …',fr:'Chargement …',es:'Cargando …',it:'Caricamento …',nl:'Spel laden …',sv:'Laddar …'};
      message.textContent=loadingError || tr('intro');
      primary.textContent=ready ? tr('start') : loadingLabels[lang];
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
  // Poses are authored at 30 FPS. Use one presentation slot per two 60 Hz physics ticks.
  let paintedSlot = -1;
  function paintSlot() { return Math.floor(Math.round(state.time * 60) / 2); }

  function simulateUntil(now){
    const delta=lastFrame ? Math.max(0,now-lastFrame)/1000 : 0;
    lastFrame=Math.max(now,lastFrame);
    if(state.phase==='running'){
      const notes=state.noteCount, steps=state.steps, kilometer=Math.floor(state.distance/1000);
      // After the browser stalls, let the player resume from the last visible
      // pose instead of advancing seconds of obstacles in one callback.
      if(delta>1){
        game.act(state,'pause');
        renderOverlay();
        return;
      }
      game.advance(state,delta);
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
  }
  function frame(now){
    simulateUntil(now);
    pollGamepad();
    if (state.phase==='running' && paintSlot()!==paintedSlot) {
      paintedSlot=paintSlot();
      render();
    } else if (state.phase==='over' && (now-crashAt<360 || canvas.style.transform)) {
      render();
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
    lastFrame=performance.now();
    paintedSlot=-1;
    if(state.phase==='paused')game.act(state,'pause');
    else game.act(state,'start');
    renderOverlay();
  }
  function togglePause(){
    if(state.phase==='running'||state.phase==='paused'){
      if(state.phase==='running'){
        simulateUntil(performance.now());
        if(state.phase!=='running')return;
      }
      lastFrame=performance.now();
      game.act(state,'pause');renderOverlay();
    }
  }
  function control(action){
    if(audio.settingsOpen()) {
      if(action==='exit'||action==='pause')audio.closeSettings();
      return;
    }
    if(action==='exit'){ audio.exit(); void sdk.exit().catch(()=>{});return; }
    if(action==='pause'){
      if(state.phase==='ready'||state.phase==='over') begin();
      else togglePause();
      return;
    }
    if(state.phase!=='running'){
      if(action==='start'||action==='jump')begin();
      return;
    }
    simulateUntil(performance.now());
    if(state.phase!=='running')return;
    if(action==='jump' || action==='duck') {
      const name=action==='jump'?'jump':'slide';
      const phase=Math.floor(state.runPose);
      if(game.act(state,action,atlas.actions[name].resume[phase])){
        audio.play(name);
        render();
        paintedSlot=paintSlot();
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
    if(audio.settingsOpen()) {
      if(event.code==='Escape'||event.code==='KeyP') {
        event.preventDefault();event.stopPropagation();audio.closeSettings();
      }
      return; // Let arrow keys change the focused slider, not MuPi's lane.
    }
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
          missingSprites:window.MuPiRunArt.filter(file=>file!=='logo-ui.png' && !runTiles[file.split('.')[0]]),
          controllerMode:gameElement.classList.contains('controller-active'),
          usingUserSheet:runTiles['mupi-running-24']?.w===144,
          sheetFrame:Math.floor(state.runPose), pose:pose(), notes:state.noteCount, ready
        };
      }
    });
  }
  primary.disabled=true;
  Promise.all([graphicsReady,audioReady]).then(()=>{
    ready=true;primary.disabled=false;renderOverlay();render();
  }).catch(error=>{loadingError='Laden fehlgeschlagen: '+error.message; renderOverlay();});
  window.addEventListener('resize',()=>{resize();if(ready)render();});
  resize();renderOverlay();
  window.requestAnimationFrame(frame);

  (async()=>{
    try{
      const context=await hostContext;
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