(() => {
  const G=window.MuPiRun;
  const original=window.createRunWorld;
  let state;
  let frames=0, previous=0, maxGap=0;
  window.createRunWorld=(...args)=>{
    const world=original(...args),draw=world.render;
    world.render=(...a)=>{
      state=a[0];draw(...a);if(state.phase!=='running')return;
      const now=performance.now();if(previous)maxGap=Math.max(maxGap,now-previous);
      previous=now;frames++;
    };return world;
  };
  const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function nextAction(s){
 const imminent=s.obstacles.filter(o=>!o.checked&&o.z>0&&o.z<56).sort((a,b)=>a.z-b.z);
 if(!imminent.length)return null;
 const item=imminent[0];
 const group=imminent.filter(o=>Math.abs(o.z-item.z)<3);
 const speed=s.speed;
 const safe=G.LANES.filter(l=>!group.some(o=>o.lane===l));
 if(item.lane===null){
   if(item.z<speed*.66+2&&s.duckAge<0&&s.jumpAge<0)return 'duck';
   return null;
 }
 if(s.distance<65&&item.kind==='jump'&&item.z>32&&s.lane!==item.lane){
   return item.lane<s.lane?'left':'right';
 }
 const occupying=group.find(o=>o.lane!==null&&Math.abs(o.lane-s.visualLane)<.65);
 if(!occupying)return null;
 if(occupying.kind==='jump'&&item.z<speed*.67+2){
   if(s.jumpAge<0)return 'jump';
   return null;
 }
 if(occupying.kind==='jump')return null;
 if(occupying.kind==='duck'&&item.z<speed*.67+2){
   if(s.duckAge<0&&s.jumpAge<0)return 'duck';
   return null;
 }
 if(occupying.kind==='duck')return null;
 if(safe.length){
   const dest=safe.sort((a,b)=>Math.abs(a-s.lane)-Math.abs(b-s.lane))[0];
   if(s.lane!==dest)return dest<s.lane?'left':'right';
 }
 return null;
}

  const counts={left:0,right:0,duck:0,jump:0};
  async function run(){
    while(!state || document.querySelector('#primary').disabled) await nap(25);
    Object.assign(state,G.fresh(414));document.querySelector('#primary').click();
    while(state.distance<1050 && state.phase==='running'){
      const act=nextAction(state);
      if(act) {document.getElementById(act).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));counts[act]++;}
      await nap(30);
    }
    console.log('MUPIBENCH SOAK '+JSON.stringify({distance:state.distance,phase:state.phase,crash:state.crash,notes:state.noteCount,waves:state.waves,counts,frames,maxGap}));
    if(state.phase !== 'running' || state.distance < 1050) throw Error('Course ended early at '+state.distance);
    document.querySelector('#exit').click();console.log('MUPIBENCH DONE true');
  }
  run().catch(e=>console.log('MUPIBENCH ERROR '+String(e)));
})();