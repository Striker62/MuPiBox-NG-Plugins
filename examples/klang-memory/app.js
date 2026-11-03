/* Independent Klang-Memory web app (MIT). The built-in QML game remains installed. */
(() => {
"use strict";
const sdk=window.MuPiBoxSDK;
const pads=[...document.querySelectorAll("[data-pad]")];
const notes=[261.63,329.63,392,523.25];
const status=document.getElementById("status"),hint=document.getElementById("hint"),round=document.getElementById("round"),bestText=document.getElementById("best");
let audio=null,best=0,sequence=[],position=0,mode="idle",selected=0,token=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function tone(index){
 try{
  if(!audio) audio=new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==="suspended")void audio.resume();
  const osc=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;
  osc.type="sine";osc.frequency.value=notes[index];gain.gain.setValueAtTime(0.0001,time);
  gain.gain.exponentialRampToValueAtTime(.15,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+.29);
  osc.connect(gain);gain.connect(audio.destination);osc.start(time);osc.stop(time+.31);
 }catch(_e){}
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
document.getElementById("new").addEventListener("click",start);
document.getElementById("exit").addEventListener("click",()=>{void sdk.exit()});
sdk.on("input",event=>{
 if(event.action!=="press")return;
 const b=event.button;
 if(b==="BACK"||b==="B"){void sdk.exit();return}
 if(b==="UP")selected=(selected+2)%4;
 if(b==="DOWN")selected=(selected+2)%4;
 if(b==="LEFT")selected=(selected+3)%4;
 if(b==="RIGHT")selected=(selected+1)%4;
 if(b==="A"){if(mode==="lost"||mode==="idle")start();else void tap(selected)}
 draw();
});
sdk.on("lifecycle.pause",()=>{token++;mode="idle";status.textContent="Pausiert";if(audio)void audio.suspend()});
sdk.on("lifecycle.resume",()=>{if(audio)void audio.resume();if(sequence.length){void replay()}});
(async()=>{try{const stored=await sdk.storage.get("best");if(Number.isSafeInteger(stored)&&stored>=0)best=stored}catch(_e){}draw();start()})();
})();
