(() => {"use strict";
const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id);
const colors=["#f36b8d","#edb44c","#48c9ad","#668ce7"];
const notes=["C4","E4","G4","C5"];
// A self-authored four-lane training chart; no licensed tracks or external assets.
const chart=Array.from({length:48},(_,i)=>({lane:([0,2,1,3,0,1,2,3,1,2,0,3][i%12]),at:2200+i*490,hit:false,miss:false}));
let running=false,start=0,raf=0,score=0,combo=0,best=0,idx=0;
const lanes=$("lanes"),pads=$("pads");const noteEls=[];
for(let i=0;i<4;i++){const lane=document.createElement("div");lane.className="lane";lane.style.borderColor=colors[i];lanes.append(lane);const pad=document.createElement("button");pad.textContent=["←","↑","↓","→"][i];pad.style.background=colors[i];pad.onclick=()=>hit(i);pads.append(pad);}
function status(s){$("status").textContent=s}
function paint(ts){
 if(!running)return;
 const elapsed=ts-start;
 for(let i=0;i<chart.length;i++){
 const n=chart[i];
 if(n.hit||n.miss){if(noteEls[i])noteEls[i].style.display="none";continue;}
 const until=n.at-elapsed;
 if(until < -190){n.miss=true;combo=0;continue;}
 if(until>2200)continue;
 let el=noteEls[i];if(!el){el=document.createElement("div");el.className="falling";el.style.left="calc("+((n.lane+0.5)*25)+"% - 24px)";el.style.background=colors[n.lane];lanes.append(el);noteEls[i]=el;}
 el.style.top=((1-until/2200)*82)+"%";
 }
 $("combo").textContent="Combo "+combo;
 if(elapsed>chart[chart.length-1].at+500){finish();return}
 raf=requestAnimationFrame(paint);
}
function hit(lane){
 if(!running)return;
 const elapsed=performance.now()-start;
 let closest=null,diff=Infinity;
 for(const n of chart){if(n.hit||n.miss||n.lane!==lane)continue;const d=Math.abs(n.at-elapsed);if(d<diff){diff=d;closest=n}}
 if(closest&&diff<=190){closest.hit=true;combo++;score+=diff<70?100:diff<130?70:40;status(diff<70?"Perfekt!":diff<130?"Gut!":"Getroffen!");
 sdk.audio.playNote(notes[lane],55,["piano","marimba","glockenspiel","epiano"][lane],{relative:true}).catch(()=>{});
 }else{combo=0;status("Daneben!")}
 $("score").textContent=score+" Punkte";$("combo").textContent="Combo "+combo;
}
function finish(){running=false;cancelAnimationFrame(raf);$("play").textContent="▶ Nochmal";status("Fertig! "+score+" Punkte");if(score>best){best=score;sdk.storage.set("rhythm.best",best).catch(()=>{});$("best").textContent="Rekord: "+best}}
function play(){if(running){finish();return}score=0;combo=0;chart.forEach(n=>{n.hit=false;n.miss=false});noteEls.forEach(el=>el?.remove());noteEls.length=0;$("score").textContent="0 Punkte";$("play").textContent="■ Stop";running=true;start=performance.now();raf=requestAnimationFrame(paint);status("Los geht's!")}
$("play").onclick=play;$("exit").onclick=()=>{finish();sdk.exit()};sdk.on("lifecycle.pause",()=>{if(running)finish()});
sdk.on("input",({button,action})=>{if(action!=="press")return;if(button==="BACK"){finish();sdk.exit()}if(button==="START")play();const lane={LEFT:0,UP:1,DOWN:2,RIGHT:3}[button];if(lane!==undefined)hit(lane)});
sdk.storage.get("rhythm.best").then(v=>{best=Number(v)||0;$("best").textContent="Rekord: "+best}).catch(()=>{});
})();