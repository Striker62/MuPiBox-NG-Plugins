(() => {"use strict";
const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id);
const instruments=[["piano","Klavier"],["epiano","E-Piano"],["glockenspiel","Glockenspiel"],["xylophone","Xylophon"],["marimba","Marimba"],["harp","Harfe"],["musicbox","Spieluhr"]];
const sounds=["C4","E4","G4","C5"];let round=0,score=0,target=0,answered=false,options=[],best=0,busy=false;
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function status(t){$("status").textContent=t}
async function play(){
 if(busy)return;busy=true;
 $("listen").disabled=true;
 try{for(const note of sounds){await sdk.audio.playNote(note,60,instruments[target][0],{relative:true});await new Promise(resolve=>setTimeout(resolve,210));}}
 catch(e){status("Audio nicht verfügbar: "+e.message)}
 busy=false;$("listen").disabled=false;
}
function choose(i){
 if(answered)return;
 answered=true;const correct=options[i]===target;
 if(correct){score+=10;status("Richtig! +10 Punkte");}else status("Fast! Es war: "+instruments[target][1]);
 $("score").textContent=score+" Punkte";
 [...$("options").children].forEach((b,n)=>{b.disabled=true;b.classList.toggle("active",options[n]===target);if(n===i&&!correct)b.classList.add("wrong")});
 $("next").disabled=false;
 if(score>best){best=score;sdk.storage.set("soundquiz.best",best).catch(()=>{});$("best").textContent="Rekord: "+best;}
}
function next(){
 round++;answered=false;target=Math.floor(Math.random()*instruments.length);
 options=shuffle([target,...shuffle(instruments.map((_,i)=>i).filter(i=>i!==target)).slice(0,3)]);
 $("progress").textContent="Runde "+round;$("next").disabled=true;
 const box=$("options");box.replaceChildren();
 options.forEach((idx,i)=>{const b=document.createElement("button");b.textContent=(i+1)+". "+instruments[idx][1];b.onclick=()=>choose(i);box.append(b)});
 status("Höre dir den Klang an und wähle das Instrument.");
}
$("listen").onclick=play;$("next").onclick=next;
$("exit").onclick=()=>sdk.exit();
sdk.on("input",({button,action})=>{if(action!=="press")return;if(button==="BACK")sdk.exit();if(button==="A"||button==="START"){if(answered)next();else play()}if(!answered){const number={UP:0,RIGHT:1,DOWN:2,LEFT:3}[button];if(number!==undefined)choose(number)}});
(async()=>{try{best=+await sdk.storage.get("soundquiz.best")||0;}catch{}$("best").textContent="Rekord: "+best;next();})();
})();