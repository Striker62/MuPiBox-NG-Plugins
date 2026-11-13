(() => {
"use strict";
const sdk=window.MuPiBoxSDK;
const names=["Kick","Snare","Bass","Melodie"],notes=["C4","D4","G4","B4"];
const instruments=["musicbox","piano","epiano","glockenspiel","xylophone","marimba","harp"];
const patterns=Array.from({length:4},()=>Array(16).fill(false));
const selectors=[];let playing=false,step=0,selected=0,timer=null,volume=50;
const $=id=>document.getElementById(id), cells=[];
function render(){
 const holder=$("tracks");holder.textContent="";cells.length=0;
 patterns.forEach((pattern,r)=>{
 const row=document.createElement("div");row.className="track";
 const label=document.createElement("label");label.textContent=names[r];label.style.width="88px";
 const sel=document.createElement("select");sel.setAttribute("aria-label",names[r]+" Instrument");
 instruments.forEach(i=>{const o=document.createElement("option");o.value=i;o.textContent=i;sel.appendChild(o)});
 sel.value=["musicbox","marimba","piano","glockenspiel"][r];selectors.push(sel);
 row.append(label,sel);const entry=[];
 pattern.forEach((on,c)=>{
 const b=document.createElement("button");b.className="step"+(on?" on":"");b.type="button";b.setAttribute("aria-label",names[r]+" Schritt "+(c+1));b.setAttribute("aria-pressed",on);
 b.textContent=on?"●":"·";b.onclick=()=>{selected=r*16+c;toggle(r,c)};
 row.appendChild(b);entry.push(b);
 });cells.push(entry);holder.append(row);
 });
 update();
}
function toggle(r,c){patterns[r][c]=!patterns[r][c];update();}
function update(){
 for(let r=0;r<4;r++)for(let c=0;c<16;c++){
 const b=cells[r]?.[c];if(!b)continue;
 b.className="step"+(patterns[r][c]?" on":"")+(playing&&c===step?" current":"")+(selected===r*16+c?" focused":"");
 b.textContent=patterns[r][c]?"●":"·";b.setAttribute("aria-pressed",String(patterns[r][c]));
 }
}
function setStatus(msg){$("status").textContent=msg;}
async function tick(){
 if(!playing)return;
 update();
 // The current host has an explicit 75ms note rate limit. A single
 // prioritised voice per sixteenth step avoids flooding it.
 const r=patterns.findIndex(p=>p[step]);
 if(r>=0)try{await sdk.audio.playNote(notes[r],volume,selectors[r].value,{relative:true})}
 catch(e){setStatus("Audio nicht verfügbar: "+String(e.message||e));}
 step=(step+1)%16;update();
}
function stop(){playing=false;clearInterval(timer);timer=null;step=0;$("play").textContent="▶ Spielen";update();}
function play(){if(playing){stop();return}playing=true;step=0;$("play").textContent="■ Stop";tick();timer=setInterval(tick,60000/(+$("bpm").value*4));}
$("play").onclick=play;
$("bpm").oninput=()=>{$("tempo").textContent=$("bpm").value+" BPM";if(playing){clearInterval(timer);timer=setInterval(tick,60000/(+$("bpm").value*4));}};
$("preset").onclick=()=>{
 for(let r=0;r<4;r++)patterns[r].fill(false);
 [0,4,8,12].forEach(c=>patterns[0][c]=true);[4,12].forEach(c=>patterns[1][c]=true);
 [0,6,8,14].forEach(c=>patterns[2][c]=true);[2,10].forEach(c=>patterns[3][c]=true);
 update();setStatus("Beispielbeat geladen.");
};
$("clear").onclick=()=>{patterns.forEach(p=>p.fill(false));update();setStatus("Alle Spuren geleert.")};
$("save").onclick=async()=>{try{await sdk.storage.set("beatbox.project.v1",{patterns,bpm:+$("bpm").value,instruments:selectors.map(s=>s.value)});setStatus("Pattern gespeichert.")}catch(e){setStatus("Speichern: "+e.message)}};
$("load").onclick=async()=>{try{const v=await sdk.storage.get("beatbox.project.v1");if(!v||!Array.isArray(v.patterns)||v.patterns.length!==4)throw Error("Kein Projekt gefunden");v.patterns.forEach((p,r)=>{if(Array.isArray(p)&&p.length===16)patterns[r]=p.map(Boolean)});if(Number.isInteger(v.bpm))$("bpm").value=Math.max(60,Math.min(140,v.bpm));$("bpm").dispatchEvent(new Event("input"));v.instruments?.forEach((n,r)=>{if(selectors[r]&&instruments.includes(n))selectors[r].value=n});update();setStatus("Projekt geladen.")}catch(e){setStatus("Laden: "+e.message)}};
$("exit").onclick=()=>{stop();sdk.exit()};
sdk.on("lifecycle.pause",stop);
sdk.on("input",({button,action})=>{if(action!=="press")return;
if(button==="START")play();if(button==="BACK"){stop();sdk.exit()}
if(button==="LEFT")selected=(selected+63)%64;if(button==="RIGHT")selected=(selected+1)%64;
if(button==="UP")selected=(selected+48)%64;if(button==="DOWN")selected=(selected+16)%64;
if(button==="A")toggle(Math.floor(selected/16),selected%16);update();
});
render();
})();