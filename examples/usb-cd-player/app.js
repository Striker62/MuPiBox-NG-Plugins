(() => {
"use strict";
const sdk=window.MuPiBoxSDK;
const $=id=>document.getElementById(id);
const state={device:"",toc:null,active:false,paused:false,track:0,busy:false,supported:false};
let polling=null;
function message(text){$("message").textContent=text}
function enabled(id,on){$(id).disabled=!on}
function busy(on){state.busy=on;updateControls()}
function updateControls(){
 const canPlay=state.supported&&Boolean(state.toc)&&!state.busy;
 for(const button of ["previous","toggle","next","stop"])enabled(button,canPlay);
 $("toggle").textContent=state.active&&state.paused?"▶":"⏯";
 $("disc-art").classList.toggle("playing",state.active&&!state.paused);
}
async function scan(){
 if(state.busy)return;
 busy(true);
 try{
  const list=await sdk.optical.list();
  const old=state.device;
  const select=$("drive");select.replaceChildren();
  for(const drive of list){
   if(typeof drive.id!=="string"||typeof drive.name!=="string")continue;
   const option=document.createElement("option");
   option.value=drive.id;option.textContent=drive.name;select.append(option);
  }
  if(list.some(d=>d.id===old))select.value=old;
  state.device=select.value||"";
  if(!state.device){state.toc=null;renderTracks();message("Kein USB-CD/DVD-Laufwerk erkannt. Laufwerk verbinden und Suchen tippen.");return}
  await loadDisc();
 }catch(err){message("Laufwerk nicht verfügbar: "+err.message)}
 finally{busy(false)}
}
async function loadDisc(){
 state.toc=null;state.active=false;state.track=0;renderTracks();
 if(!state.device)return;
 try{
  const toc=await sdk.optical.disc(state.device);
  if(!Number.isInteger(toc.first)||!Number.isInteger(toc.last)||toc.last<toc.first)throw Error("Ungültiges CD-Inhaltsverzeichnis");
  state.toc=toc;renderTracks();
  message("Audio-CD erkannt. Wähle einen Titel oder drücke Abspielen.");
 }catch(err){
  message("Keine lesbare Audio-CD: CD einlegen und Suchen tippen.");
  renderTracks();
 }
}
function renderTracks(){
 $("disc-heading").textContent=state.toc?"Meine Audio-CD":"Keine CD eingelegt";
 $("disc-count").textContent=state.toc?(state.toc.tracks+" Titel"):"";
 const box=$("tracks");box.replaceChildren();
 if(!state.toc){const p=document.createElement("p");p.className="muted";p.textContent="Lege eine Audio-CD ein.";box.append(p);return}
 const fragment=document.createDocumentFragment();
 for(let t=state.toc.first;t<=state.toc.last;t++){
  const btn=document.createElement("button");
  const n=document.createElement("span");n.className="number";n.textContent=String(t).padStart(2,"0");
  const title=document.createElement("span");title.textContent="Titel "+t;
  btn.append(n,title);btn.classList.toggle("selected",t===state.track);
  btn.addEventListener("click",()=>void play(t));
  fragment.append(btn);
 }
 box.append(fragment);updateControls();
}
async function play(track){
 if(state.busy||!state.toc)return;
 busy(true);
 try{
  await sdk.optical.play(state.device,track);
  message("Titel "+track+" wird abgespielt.");
  await refreshStatus();
 }catch(err){message("CD konnte nicht gestartet werden: "+err.message)}
 finally{busy(false)}
}
async function refreshStatus(){
 if(!state.supported||state.busy&&state.active===false)return;
 try{
  const status=await sdk.optical.status();
  const active=status.active===true;
  const track=active&&Number.isInteger(status.track)&&state.toc
     ? state.toc.first+status.track-1 : 0;
  const changed=track!==state.track;
  state.active=active;
  state.paused=active&&status.state==="paused";
  state.track=track;
  if(changed)renderTracks();
  updateControls();
 }catch(err){message("CD-Status nicht verfügbar: "+err.message);state.active=false;updateControls()}
}
async function control(action){
 if(state.busy||!state.toc)return;
 if(action==="toggle"&&!state.active){await play(state.toc.first);return}
 busy(true);
 try{
  await sdk.optical.transport(action);
  await refreshStatus();
  if(action==="stop")message("CD gestoppt.");
 }catch(err){message("CD-Bedienung nicht möglich: "+err.message)}
 finally{busy(false);await refreshStatus()}
}
async function boot(){
 $("exit").addEventListener("click",()=>void sdk.exit());
 $("scan").addEventListener("click",()=>void scan());
 $("drive").addEventListener("change",()=>{state.device=$("drive").value;void loadDisc()});
 for(const action of ["previous","next","stop","toggle"])$(action).addEventListener("click",()=>void control(action));
 if(!sdk||!sdk.isHosted||!await sdk.supports("optical.list")){
   message("USB-CD-Unterstützung fehlt in dieser MuPiBox-NG-Version. Bitte den NG-Host aktualisieren.");
   enabled("scan",false);return;
 }
 state.supported=true;
 await scan();
 polling=setInterval(()=>{if(!document.hidden&&!state.busy)void refreshStatus()},2200);
}
sdk.on("lifecycle.pause",()=>{$("disc-art").classList.remove("playing")});
sdk.on("lifecycle.resume",()=>void refreshStatus());
sdk.on("input",({button,action})=>{if(button==="BACK"&&action==="press")void sdk.exit()});
window.addEventListener("pagehide",()=>{if(polling)clearInterval(polling)});
void boot().catch(err=>message("CD-Player nicht verfügbar: "+err.message));
})();
