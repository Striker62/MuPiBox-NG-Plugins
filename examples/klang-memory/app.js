/* Independent Klang-Memory web app (MIT). The built-in QML game remains installed. */
(() => {
"use strict";
const sdk=window.MuPiBoxSDK;
const pads=[...document.querySelectorAll("[data-pad]")];
const notes=['C4','E4','G4','C5'];
const status=document.getElementById("status"),hint=document.getElementById("hint"),round=document.getElementById("round"),bestText=document.getElementById("best");
let best=0,sequence=[],position=0,mode="idle",selected=0,token=0,volume=70;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function tone(index){
 // Host audio goes through the MuPiBox native PipeWire mixer, not through
 // Chromium WebAudio (the latter has no audio sink in the appliance session).
 // Standalone browser preview still synthesizes locally via the same SDK.
 void sdk.audio.playNote(notes[index], volume, 'musicbox', {relative:true}).catch(error => {
   console.warn('[Klang-Memory] audio note failed:',error);
 });
}

async function flash(index,ms=390){
 const pad=pads[index];pad.classList.add("lit");tone(index);await sleep(ms);pad.classList.remove("lit");
}
function draw(){
 round.textContent=String(sequence.length||1);bestText.textContent=String(best);
 pads.forEach((p,i)=>p.classList.toggle("selected",i===selected));
}
async function replay(){
 const current=++token;mode="demo";status.textContent="Pass gut auf!";hint.textContent="Merke dir die Klangfolge";
 await sleep(450);
 for(const value of sequence){
  if(current!==token)return;
  await flash(value,380);await sleep(185);
 }
 if(current!==token)return;
 mode="input";position=0;status.textContent="Jetzt bist du dran!";hint.textContent="Wiederhole die Reihenfolge";
}
async function next(){
 sequence.push(Math.floor(Math.random()*4));draw();await replay();
}
function start(){
 token++;sequence=[];position=0;mode="idle";status.textContent="Neues Spiel";void next();
}
async function persist(){
 try{await sdk.storage.set("best",best)}catch(_e){}
}
async function tap(index){
 if(mode!=="input"||index<0||index>=4)return;
 mode="checking";await flash(index,190);
 if(sequence[position]!==index){
  mode="lost";status.textContent="Leider falsch";hint.textContent="Neue Runde starten oder A drücken";return;
 }
 position++;
 if(position===sequence.length){
  if(sequence.length>best){best=sequence.length;void persist()}
  draw();mode="idle";status.textContent="Richtig!";hint.textContent="Nächste Runde";await sleep(450);if(mode==="idle")void next();
 }else{mode="input"}
}
pads.forEach((p,i)=>p.addEventListener("click",()=>{selected=i;draw();void tap(i)}));
const soundPanel=document.getElementById("sound-panel");
const soundButton=document.getElementById("sound-settings");
const soundSlider=document.getElementById("sound-volume");
const soundValue=document.getElementById("sound-volume-value");
function setVolume(value,save=true){
 const v=Number(value);
 if(!Number.isFinite(v))return;
 volume=Math.max(0,Math.min(100,Math.round(v/5)*5));
 soundSlider.value=String(volume);
 soundValue.value=volume+" %";
 if(save)void sdk.storage.set("volume",volume).catch(()=>{});
}
function toggleSettings(force){
 const open=typeof force==="boolean"?force:soundPanel.hidden;
 soundPanel.hidden=!open;
 soundButton.setAttribute("aria-expanded",String(open));
 if(open){token++;mode="paused";status.textContent="Einstellungen";hint.textContent="Lautstärke testen und einstellen"}
 else if(mode==="paused"){mode="idle";void replay()}
}
soundButton.addEventListener("click",()=>toggleSettings());
document.getElementById("sound-close").addEventListener("click",()=>toggleSettings(false));
soundSlider.addEventListener("input",event=>setVolume(event.target.value));
document.getElementById("sound-test").addEventListener("click",()=>tone(0));
setVolume(70,false);
document.getElementById("new").addEventListener("click",()=>{toggleSettings(false);start()});
document.getElementById("exit").addEventListener("click",()=>{void sdk.exit()});
sdk.on("input",event=>{
 if(event.action!=="press")return;
 const b=event.button;
 if(!soundPanel.hidden){
  if(b==="BACK"||b==="B"){toggleSettings(false);return}
  if(b==="LEFT")setVolume(volume-5);
  if(b==="RIGHT")setVolume(volume+5);
  if(b==="A")tone(0);
  return;
 }
 if(b==="BACK"||b==="B"){void sdk.exit();return}
 if(b==="UP")selected=(selected+2)%4;
 if(b==="DOWN")selected=(selected+2)%4;
 if(b==="LEFT")selected=(selected+3)%4;
 if(b==="RIGHT")selected=(selected+1)%4;
 if(b==="A"){if(mode==="lost"||mode==="idle")start();else void tap(selected)}
 draw();
});
sdk.on("lifecycle.pause",()=>{token++;mode="idle";status.textContent="Pausiert";});
sdk.on("lifecycle.resume",()=>{if(sequence.length){void replay()}});
(async()=>{
 try{const stored=await sdk.storage.get("best");if(Number.isSafeInteger(stored)&&stored>=0)best=stored}catch(_e){}
 try{const saved=await sdk.storage.get("volume");if(Number.isInteger(saved)&&saved>=0&&saved<=100)setVolume(saved,false)}catch(_e){}
 draw();start()
})();
})();
