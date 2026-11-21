/* QA-only prelude for app.js. Never include in the installable package. */
(() => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const output = (name, value) => console.log('MUPIBENCH ' + name + ' ' + JSON.stringify(value));
  const seed = 0x643bd8, game = window.MuPiRun;
  const buildWorld = window.createRunWorld;
  let state, capture, active = false, times = [], costs = [];
  window.createRunWorld = (ctx, rules) => {
    const world = buildWorld(ctx, rules), draw = world.render;
    world.render = (s, runner, hazard) => {
      state = s;
      capture = () => draw(s, runner, hazard);
      const start = performance.now();
      draw(s, runner, hazard);
      if (active) { times.push(performance.now()); costs.push(performance.now() - start); }
    };
    return world;
  };
  function scene(distance, dense) {
    Object.assign(state, game.fresh(seed), { phase:'running', distance, speed:game.speedAt(distance),
      spawnIn:100, lastTerrain:game.terrainAt(distance) });
    state.notes = Array.from({length:dense ? 46 : 7}, (_,i)=>({z:4+i*(dense?2.15:7),lane:dense?i%3-1:0}));
    state.obstacles = [{kind:'avoid',item:'stump',lane:-1,z:17},{kind:'avoid',item:'fox',lane:1,z:48}];
  }
  const press = id => document.getElementById(id).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  async function snapshot(label) {
    capture();
    state.phase='paused';
    output('SNAP',label);
    // Give the Qt window time to composite and save the presented frame.
    await sleep(1100);
  }
  async function run() {
    while(!state || document.querySelector('#primary').disabled) await sleep(20);
    output('READY',{ms:performance.timeOrigin+performance.now(),inPageMs:performance.now(),ua:navigator.userAgent,
      hosted:window.MuPiBoxSDK.isHosted,offscreen:typeof OffscreenCanvas==='function',canvas:document.getElementById('world').width});
    if (window.benchCapture) {
      output('SNAP','menu');
      await sleep(1200);
    }
    document.querySelector('#primary').click();
    if (window.benchCapture) {
      const deadline=performance.now()+10000;
      while (state.phase!=='running' && performance.now()<deadline) await sleep(20);
      if (state.phase!=='running') throw Error('start control did not begin play');
      await sleep(1400);
    }
    const specs=[['river',22,3.4],['boardwalk',208,3.4],['forest',372,3.4],['dense',430,3.4],['actions',36,4.1],['endurance',135,18]];
    for(const [label,start,seconds] of specs){
      scene(start,label==='dense'||label==='endurance');
      if(window.benchCapture){
        if(label==='actions') {state.jumpAge=.33;state.entryPose=13;}
        if(label==='endurance'){state.duckAge=.47;state.entryPose=2;}
        await snapshot(label);
        continue;
      }
      // Warm the renderer and discard the scene-change draw.
      capture();await sleep(200);scene(start,label==='dense'||label==='endurance');
      times=[];costs=[];const startTime=performance.now();active=true;
      let action=0;
      while(state.time < seconds){
        if ((label==='actions'||label==='endurance') && state.time>=.25+action*1.4){
          press(action++%2?'duck':'jump');
        }
        if(state.phase!=='running') throw Error(label+' stopped at '+state.distance);
        await sleep(45);
      }
      active=false;
      output('SCENE',{label,elapsed:performance.now()-startTime,times:times.map(t=>+(t-startTime).toFixed(2)),costs:costs.map(t=>+t.toFixed(2)),actions:action,
        sim:state.time,notes:state.noteCount,distance:state.distance});
    }
    if(window.benchCapture){document.querySelector('#exit').click();output('DONE',true);return;}
    document.querySelector('#pause').click();const d=state.distance;await sleep(250);
    if(state.phase!=='paused'||state.distance!==d)throw Error('pause');
    document.querySelector('#primary').click();
    if(state.phase!=='running')throw Error('resume');
    if(window.benchProfile)output('PROFILE',window.benchProfile);
    document.querySelector('#exit').click();output('DONE',true);
  }
  run().catch(e=>output('ERROR',String(e)));
})();
