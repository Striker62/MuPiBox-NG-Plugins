(() => {
"use strict";
const sdk=window.MuPiBoxSDK;
const $=id=>document.getElementById(id);
const select=$("device-select"),img=$("camera-preview"),placeholder=$("placeholder"),indicator=$("live-indicator");
let running=false,freeze=false,requestInProgress=false,loop=null;
function message(text){$("message").textContent=text}
function setRunning(active){
 running=active;$("start").disabled=active;$("stop").disabled=!active;$("capture").disabled=!active;
 indicator.hidden=!active; if(!active){img.hidden=true;placeholder.hidden=false;placeholder.textContent="Kamera ausgeschaltet";freeze=false;$("capture").textContent="Foto anhalten"}
}
async function scan(){
 try{
  const devices=await sdk.camera.list();
  const selected=select.value;select.replaceChildren();
  for(const device of devices){
   const option=document.createElement("option");
   option.value=device.id;option.textContent=device.name+" ("+device.id+")";select.append(option)
  }
  if(devices.some(item=>item.id===selected))select.value=selected;
  $("device-count").textContent=devices.length+" Kamera(s)";
  if(!devices.length){const option=document.createElement("option");option.value="";option.textContent="Keine USB-Webcam gefunden";select.append(option);message("USB-Webcam verbinden und „Kameras suchen“ wählen.")}
  else message("Zum Starten ist eine ausdrückliche Bestätigung am Touchdisplay erforderlich.");
  $("start").disabled=!devices.length;
 }catch(error){$("device-count").textContent="";message("Nur auf dem MuPiBox-Touchdisplay verfügbar: "+error.message)}
}
async function capture(){
 if(!running||freeze||requestInProgress||document.hidden)return;
 requestInProgress=true;
 try{
  const frame=await sdk.camera.capture();
  if(!running)return;
  img.src=frame.image;img.hidden=false;placeholder.hidden=true;
 }catch(error){
  message("Kamerabild nicht verfügbar: "+error.message);
  await stop();
 }finally{requestInProgress=false}
}
async function start(){
 if(running||!select.value)return;
 $("start").disabled=true;
 try{
  await sdk.camera.start(select.value);
  setRunning(true);message("Kamera aktiv. Zum Stoppen unten auf „Kamera ausschalten“ tippen.");
  await capture();
  loop=setInterval(()=>void capture(),1350);
 }catch(error){setRunning(false);message(error.message)}
}
async function stop(){
 if(loop){clearInterval(loop);loop=null}
 const wasRunning=running;setRunning(false);
 if(wasRunning){try{await sdk.camera.stop()}catch(_error){}}
}
$("start").addEventListener("click",()=>void start());
$("stop").addEventListener("click",()=>void stop());
$("refresh").addEventListener("click",()=>void scan());
$("capture").addEventListener("click",()=>{freeze=!freeze;$("capture").textContent=freeze?"Vorschau fortsetzen":"Foto anhalten";if(!freeze)void capture()});
sdk.on("camera.stopped",()=>{if(loop){clearInterval(loop);loop=null}setRunning(false);message("Kamera über die MuPiBox-Leiste ausgeschaltet.")});
sdk.on("lifecycle.pause",()=>void stop());
window.addEventListener("pagehide",()=>void stop());
void scan();
})();
