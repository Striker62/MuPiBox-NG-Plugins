// MuPi Rhythm Arena – all note charts/graphics original. No copyrighted songs.
// GPU-composited transforms, small visible-note pool and bounded host synth.
const RhythmCore=(()=>{
"use strict";
const MODES={
 easy:{bpm:112,beats:56,travel:1500,window:215},
 medium:{bpm:145,beats:72,travel:1250,window:195},
 hard:{bpm:176,beats:88,travel:1050,window:180}
};
function chart(level){
 const m=MODES[level]||MODES.medium,ms=60000/m.bpm,out=[];
 const phrase=[0,2,1,3,0,1,2,1,3,2,0,3,0,2,3,1];
 for(let beat=0;beat<m.beats;beat++){
  const lane=(phrase[beat%16]+Math.floor(beat/16))%4;
  out.push({lane,at:1100+beat*ms,hit:false,miss:false});
  if(level!=="easy"&&beat>7&&beat%8===4){
   out.push({lane:(lane+2)%4,at:1100+beat*ms,hit:false,miss:false});
  }
  if(level==="hard"&&beat%8===6){
   out.push({lane:(lane+1)%4,at:1100+(beat+.5)*ms,hit:false,miss:false});
  }
 }
 out.sort((a,b)=>a.at-b.at);
 return out;
}
function grade(diff,window){
 if(diff<=66)return {label:"PERFECT",points:120};
 if(diff<=122)return {label:"GREAT",points:85};
 if(diff<=window)return {label:"GOOD",points:45};
 return null;
}
return {MODES,chart,grade};
})();
if(typeof module!=="undefined")module.exports=RhythmCore;
if(typeof document!=="undefined")(()=>{
"use strict";
const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id),lanes=$("lanes"),pads=$("pads"),layer=$("notes");
const colors=["#fa548f","#ffcf6a","#43e2bc","#74a2fb"];
const tones=["C4","E4","G4","C5"],inst=["piano","marimba","epiano","glockenspiel"];
let notes=[],visible=[],running=false,raf=0,start=0,offset=0,score=0,combo=0,maxCombo=0,hitCount=0,perfect=0,misses=0;
let sound=true,level="medium",travel=1250,windowMs=195,positionY=280,nextSpawn=0,measure=0,lastHud=0,lastBeat=-1,countdownTick=-1,epoch=0;
const banner=$("banner"),headline=$("headline"),subline=$("subline"),progress=$("progress-fill");
let timers=[],best=0;
function timer(fn,ms){const h=setTimeout(fn,ms);timers.push(h);return h;}
function clearTimers(){for(const h of timers)clearTimeout(h);timers=[];}
function setMessage(main,subtitle,flash=false){
 headline.textContent=main;subline.textContent=subtitle||"";
 banner.className=flash?"hit":"";
 if(flash){const run=epoch;timer(()=>{if(epoch===run&&running)banner.className="inactive";},300);}
}
function noteSound(lane,vol=37){
 if(!sound)return;
 sdk.audio.playNote(tones[lane],vol,inst[lane],{relative:true}).catch(()=>{});
}
function beatSound(beat){
 if(!sound||beat%2!==0)return;
 sdk.audio.playNote(["C4","E4","G4","E4"][Math.floor(beat/2)%4],14,"epiano",{relative:true}).catch(()=>{});
}
const buttons=[];
for(let i=0;i<4;i++){
 const l=document.createElement("div");l.className="lane";lanes.append(l);
 const b=document.createElement("button");b.type="button";b.textContent=["←","↑","↓","→"][i];b.style.background=colors[i];
 b.setAttribute("aria-label","Spur "+(i+1));b.addEventListener("pointerdown",ev=>{ev.preventDefault();hit(i);});
 b.onclick=ev=>{if(ev.detail===0)hit(i);};pads.append(b);buttons.push(b);
}
function measureStage(){positionY=Math.max(90,$("playfield").clientHeight-35);}
window.addEventListener("resize",measureStage,{passive:true});
function noteNode(n){
 if(n.el)return n.el;
 const e=document.createElement("div");e.className="note l"+n.lane;e.style.left=(12.5+25*n.lane)+"%";
 layer.append(e);n.el=e;visible.push(n);return e;
}
function clearNotes(){for(const n of visible){n.el?.remove();n.el=null;}visible=[];layer.replaceChildren();}
function markGone(n){if(!n.el)return;n.el.remove();n.el=null;const i=visible.indexOf(n);if(i>=0)visible.splice(i,1);}
function finish(stopped=false){
 if(!running)return;
 running=false;epoch++;cancelAnimationFrame(raf);clearTimers();
 clearNotes();$("play").textContent="▶ NOCHMAL";
 const accuracy=hitCount+misses?Math.round(100*hitCount/(hitCount+misses)):0;
 setMessage(stopped?"GESTOPPT":"LEVEL CLEAR",score+" Punkte · "+accuracy+"% Treffer · Max-Combo "+maxCombo);
 if(!stopped&&score>best){best=score;$("best").textContent="BEST "+best;sdk.storage.set("rhythm.best."+level,best).catch(()=>{});}
}
function startGame(){
 if(running){finish(true);return;}
 epoch++;clearTimers();clearNotes();notes=RhythmCore.chart($("level").value);
 level=$("level").value;
 const cfg=RhythmCore.MODES[level];travel=cfg.travel;windowMs=cfg.window;
 score=combo=maxCombo=hitCount=perfect=misses=0;nextSpawn=0;lastBeat=-1;countdownTick=-1;
 $("score").textContent="0";$("combo").textContent="0× COMBO";progress.style.width="0%";
 $("play").textContent="■ STOP";running=true;measureStage();
 // Time base is monotonic and shared by hit judgement / animations.
 start=performance.now()+1200;
 setMessage("3 · 2 · 1","Bereit für "+cfg.bpm+" BPM?");
 raf=requestAnimationFrame(loop);
}
function hit(lane){
 if(!running)return;
 const t=performance.now()-start;
 let bestNote=null,diff=Infinity;
 // Only visible notes are considered; at most a handful are on screen.
 for(const n of visible)if(n.lane===lane&&!n.hit&&!n.miss){
  const d=Math.abs(n.at-t);
  if(d<diff){diff=d;bestNote=n;}
 }
 const grade=bestNote&&RhythmCore.grade(diff,windowMs);
 const button=buttons[lane];button.classList.remove("flash","miss");void button.offsetWidth;
 if(grade){
  bestNote.hit=true;hitCount++;combo++;maxCombo=Math.max(combo,maxCombo);
  score+=grade.points+Math.min(80,Math.floor(combo/8)*8);
  if(grade.label==="PERFECT")perfect++;
  markGone(bestNote);button.classList.add("flash");
  setMessage(grade.label,combo>1?combo+"× COMBO":"GUTER START!",true);
  noteSound(lane,42);
 }else{
  if(t>=0){combo=0;score=Math.max(0,score-15);button.classList.add("miss");
   setMessage("ZU FRÜH / SPÄT","Bleib im Beat!",true);}
 }
 $("score").textContent=String(score);$("combo").textContent=combo+"× COMBO";
 const run=epoch;timer(()=>{if(epoch===run)button.classList.remove("flash","miss");},120);
}
function loop(now){
 if(!running)return;
 const t=now-start;
 if(t<0){
  const tick=Math.max(1,Math.ceil(-t/400));
  if(tick!==countdownTick){countdownTick=tick;setMessage(String(tick),"BEREIT MACHEN");}
 }else if(countdownTick!==0){
  countdownTick=0;setMessage("LOS!","LET'S RHYTHM");
  const run=epoch;timer(()=>{if(epoch===run&&running)banner.className="inactive";},420);
 }
 if(t>=0){
  // Spawn no more than the handful of upcoming notes and reuse DOM nodes.
  while(nextSpawn<notes.length&&notes[nextSpawn].at-t<=travel){
   noteNode(notes[nextSpawn]);nextSpawn++;
  }
  for(let i=visible.length-1;i>=0;i--){
   const n=visible[i],remaining=n.at-t;
   if(remaining< -windowMs){
    n.miss=true;misses++;combo=0;markGone(n);
    $("combo").textContent="0× COMBO";
   }else{
    const y=(1-remaining/travel)*positionY;
    n.el.style.transform="translate3d(0,"+y.toFixed(1)+"px,0)";
   }
  }
  const beat=Math.floor(Math.max(0,t-1100)/(60000/RhythmCore.MODES[level].bpm));
  if(beat>lastBeat){lastBeat=beat;if(beat>=0)beatSound(beat);}
  if(now-lastHud>100){
   const end=notes[notes.length-1].at+400;
   progress.style.width=Math.min(100,Math.max(0,t/end*100)).toFixed(1)+"%";
   if(t>1150&&banner.className!=="hit")banner.className="inactive";
   lastHud=now;
  }
  if(t>notes[notes.length-1].at+windowMs+460){finish(false);return;}
 }
 raf=requestAnimationFrame(loop);
}
async function loadBest(){
 const v=$("level").value;
 try{const score=await sdk.storage.get("rhythm.best."+v);if($("level").value!==v)return;
 best=Number(score)||0;$("best").textContent="BEST "+(best||"–");}catch(e){best=0;$("best").textContent="BEST –";}
}
$("play").onclick=startGame;
$("sound").onclick=()=>{sound=!sound;$("sound").textContent=sound?"♪ Beat an":"♪ Beat aus";};
$("level").onchange=()=>{if(running)finish(true);setMessage("READY?","Wähle Start – neues Tempo");loadBest();};
$("exit").onclick=()=>{finish(true);sdk.exit();};
sdk.on("lifecycle.pause",()=>{if(running)finish(true);});
sdk.on("input",({button,action})=>{
 if(action!=="press")return;
 if(button==="BACK"){finish(true);sdk.exit();return;}
 if(button==="START"){startGame();return;}
 const lane={LEFT:0,UP:1,DOWN:2,RIGHT:3}[button];if(lane!==undefined)hit(lane);
});
window.addEventListener("keydown",e=>{
 const lane={ArrowLeft:0,ArrowUp:1,ArrowDown:2,ArrowRight:3,a:0,s:1,k:2,l:3}[e.key];
 if(lane!==undefined){e.preventDefault();if(!e.repeat)hit(lane);}
 if(e.code==="Space"&&!e.repeat){e.preventDefault();startGame();}
});
loadBest();measureStage();
})();
