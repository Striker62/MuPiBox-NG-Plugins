(() => {
"use strict";
const sdk = window.MuPiBoxSDK;
const $ = id => document.getElementById(id);
const state = {device:"",toc:null,meta:null,active:false,paused:false,track:0,
  busy:false,supported:false,position:0,duration:0};
let polling=null,pollingActive=false,pollCount=0,seekDragging=false;
const fmt = n => Number.isFinite(n) && n >= 0 ? `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,"0")}` : "0:00";
function message(text){$("message").textContent=text;}
function enabled(id,on){$(id).disabled=!on;}
function busy(on){state.busy=on;updateControls();}
function updateControls(){
 const selected=Boolean(state.device)&&state.supported;
 const ready=selected&&Boolean(state.toc)&&!state.busy;
 enabled("previous",ready&&state.active);
 enabled("next",ready&&state.active);
 enabled("stop",ready&&state.active);
 enabled("toggle",ready);
 enabled("seek",ready&&state.active&&state.duration>0);
 enabled("scan",state.supported&&!state.busy);
 enabled("eject",selected&&!state.busy);
 enabled("close",selected&&!state.busy);
 enabled("spindown",selected&&!state.busy);
 enabled("lookup",ready&&!state.meta);
 $("drive").disabled=state.busy;
 $("toggle").textContent=!state.active||state.paused?"▶":"⏸";
 $("disc-art").classList.toggle("playing",state.active&&!state.paused);
 $("position").textContent=fmt(state.position)+" / "+fmt(state.duration);
 if(!seekDragging){
  $("seek").max=String(Math.max(1,Math.floor(state.duration)));
  $("seek").value=String(Math.max(0,Math.floor(state.position)));
 }
}
function refreshAlbum(){
 $("album-name").textContent=state.meta?.title||"Audio-CD";
 $("album-artist").textContent=state.meta?.artist||"Lokal abspielbar";
 const cover=state.meta?.coverData||"";
 // Only host-generated bounded JPEG/PNG data URIs; no remote image URLs.
 const valid=/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(cover)&&cover.length<500000;
 $("cover-img").hidden=!valid;
 $("cover-img").src=valid?cover:"";
}
async function scan({quiet=false}={}){
 if(state.busy)return;
 busy(true);
 try{
  const drives=await sdk.optical.list();
  const old=state.device;
  const select=$("drive");select.replaceChildren();
  for(const d of drives){
   if(typeof d.id!=="string"||typeof d.name!=="string")continue;
   const option=document.createElement("option");
   option.value=d.id;option.textContent=d.name;select.append(option);
  }
  if(drives.some(d=>d.id===old))select.value=old;
  state.device=select.value||"";
  if(!state.device){
   const changed=Boolean(old||state.toc);
   state.toc=null;state.meta=null;state.active=false;state.track=0;state.duration=0;state.position=0;
   refreshAlbum();renderTracks();
   if(!quiet||changed)message("Kein USB-CD/DVD-Laufwerk erkannt. Bitte verbinden.");
   return;
  }
  await loadDisc({quiet});
 }catch(err){if(!quiet)message("Laufwerk nicht verfügbar: "+err.message);}
 finally{busy(false);}
}
async function loadDisc({quiet=false}={}){
 if(!state.device)return;
 try{
  const toc=await sdk.optical.disc(state.device);
  if(!Number.isInteger(toc.first)||!Number.isInteger(toc.last)||
      toc.first<1||toc.last>99||toc.last<toc.first||typeof toc.discId!=="string"){
   throw Error("Ungültiges CD-Inhaltsverzeichnis");
  }
  const previous=state.toc;
  const unchanged=previous&&previous.device===toc.device&&previous.discId===toc.discId;
  state.toc=toc;
  if(!unchanged){
   state.meta=null;state.active=false;state.paused=false;state.track=0;
   state.position=0;state.duration=0;
   refreshAlbum();renderTracks();
   message("Audio-CD erkannt. Titel auswählen oder ▶ drücken.");
  }
 }catch(err){
  const hadDisc=Boolean(state.toc);
  state.toc=null;state.meta=null;state.active=false;state.paused=false;state.track=0;
  state.position=0;state.duration=0;
  refreshAlbum();
  if(hadDisc||!quiet){
   renderTracks();message("Keine lesbare Audio-CD. Bitte Audio-CD einlegen.");
  }
 }
}
function renderTracks(){
 $("disc-heading").textContent=state.meta?.title||(state.toc?"Meine Audio-CD":"Keine CD eingelegt");
 $("disc-count").textContent=state.toc?(state.toc.tracks+" Titel"):"";
 const box=$("tracks");box.replaceChildren();
 if(!state.toc){
  const p=document.createElement("p");p.className="muted";p.textContent="Lege eine Audio-CD ein.";box.append(p);
  updateControls();return;
 }
 const fragment=document.createDocumentFragment();
 for(let t=state.toc.first;t<=state.toc.last;t++){
  const btn=document.createElement("button");
  const number=document.createElement("span");number.className="number";number.textContent=String(t).padStart(2,"0");
  const title=document.createElement("span");title.className="track-title";
  title.textContent=state.meta?.trackTitles?.[t-state.toc.first]||"Titel "+t;
  const duration=state.toc.trackList?.find(item=>item.number===t)?.duration;
  btn.append(number,title);
  if(Number.isFinite(duration)&&duration>0){
   const elapsed=document.createElement("span");elapsed.className="track-duration";elapsed.textContent=fmt(duration);
   btn.append(elapsed);
  }
  btn.classList.toggle("selected",t===state.track);
  btn.addEventListener("click",()=>void play(t));
  fragment.append(btn);
 }
 box.append(fragment);updateControls();
}
async function play(track){
 if(state.busy||!state.toc)return;
 busy(true);
 try{
  await sdk.optical.play(state.device,track,state.toc.discId);
  message("Titel "+track+" wird abgespielt.");
  await refreshStatus();
 }catch(err){
  message("CD-Wiedergabe nicht möglich: "+err.message);
  await loadDisc({quiet:true});
 }finally{busy(false);}
}
async function refreshStatus(){
 if(!state.supported)return;
 try{
  const status=await sdk.optical.status();
  const active=status.active===true&&status.device===state.device&&Boolean(state.toc);
  const track=active&&Number.isInteger(status.track)
   ?state.toc.first+status.track-1:0;
  const changed=track!==state.track;
  state.active=active;state.paused=active&&status.state==="paused";state.track=track;
  state.position=active&&Number.isFinite(status.position)?status.position:0;
  state.duration=active&&Number.isFinite(status.duration)?status.duration:0;
  if(changed)renderTracks();
  updateControls();
 }catch(err){message("CD-Status nicht verfügbar: "+err.message);state.active=false;updateControls();}
}
async function control(action){
 if(state.busy||!state.toc)return;
 if(action==="toggle"&&!state.active){await play(state.toc.first);return;}
 if(!state.active)return;
 busy(true);
 try{
  await sdk.optical.transport(action,state.device,state.toc.discId);
  await refreshStatus();
  if(action==="stop")message("CD gestoppt.");
 }catch(err){message("CD-Bedienung nicht möglich: "+err.message);await loadDisc({quiet:true});}
 finally{busy(false);await refreshStatus();}
}
async function seek(){
 if(state.busy||!state.active||!state.toc||state.duration<=0)return;
 const position=Number($("seek").value);
 if(!Number.isFinite(position))return;
 busy(true);
 try{
  await sdk.optical.seek(state.device,state.toc.discId,position);
  await refreshStatus();
 }catch(err){message("Springen nicht möglich: "+err.message);}
 finally{seekDragging=false;busy(false);}
}
async function loadMetadata(){
 if(state.busy||!state.toc)return;
 const id=state.toc.discId,device=state.device;
 busy(true);message("Albuminfos werden auf Wunsch bei MusicBrainz gesucht …");
 try{
  const meta=await sdk.optical.metadata(device,id);
  if(!state.toc||state.toc.discId!==id||state.device!==device)return;
  state.meta=meta;
  refreshAlbum();renderTracks();
  message("Albuminformationen geladen. CD-Wiedergabe bleibt vollständig lokal.");
 }catch(err){message("Keine Albuminformationen verfügbar (offline oder nicht gefunden).");}
 finally{busy(false);}
}
async function drive(action){
 if(state.busy||!state.device)return;
 busy(true);
 try{
  await sdk.optical.drive(state.device,action);
  if(action==="eject"||action==="spindown"){
   if(action==="eject"){state.toc=null;state.meta=null;state.active=false;state.position=0;state.duration=0;refreshAlbum();renderTracks();}
   message(action==="eject"?"CD ausgeworfen.":"CD-Laufwerk angehalten.");
  }else{message("CD-Laufwerk wird eingezogen.");}
 }catch(err){message("Laufwerksteuerung nicht möglich: "+err.message);}
 finally{busy(false);}
}
async function boot(){
 $("exit").addEventListener("click",()=>void sdk.exit());
 $("scan").addEventListener("click",()=>void scan());
 $("lookup").addEventListener("click",()=>void loadMetadata());
 $("eject").addEventListener("click",()=>void drive("eject"));
 $("close").addEventListener("click",()=>void drive("close"));
 $("spindown").addEventListener("click",()=>void drive("spindown"));
 $("seek").addEventListener("input",()=>{
  seekDragging=true;$("position").textContent=fmt(Number($("seek").value))+" / "+fmt(state.duration);
 });
 $("seek").addEventListener("change",()=>void seek());
 $("drive").addEventListener("change",()=>{
  if(state.busy)return;
  state.device=$("drive").value;
  busy(true);
  void loadDisc().finally(()=>busy(false));
 });
 for(const action of ["previous","next","stop","toggle"])
  $(action).addEventListener("click",()=>void control(action));
 if(!sdk||!sdk.isHosted||!await sdk.supports("optical.drive")){
  message("USB-CD-Unterstützung fehlt in dieser MuPiBox-NG-Version. Bitte NG-Host aktualisieren.");
  enabled("scan",false);return;
 }
 state.supported=true;
 await scan();
 polling=setInterval(()=>{
  if(document.hidden||state.busy||pollingActive)return;
  pollingActive=true;
  void (async()=>{
   await refreshStatus();
   if(++pollCount%5===0&&!state.active)await scan({quiet:true});
  })().finally(()=>{pollingActive=false;});
 },2200);
}
sdk.on("lifecycle.pause",()=>{$("disc-art").classList.remove("playing");});
sdk.on("lifecycle.resume",()=>void refreshStatus());
sdk.on("input",({button,action})=>{if(button==="BACK"&&action==="press")void sdk.exit();});
window.addEventListener("pagehide",()=>{if(polling)clearInterval(polling);});
void boot().catch(err=>message("CD-Player nicht verfügbar: "+err.message));
})();
