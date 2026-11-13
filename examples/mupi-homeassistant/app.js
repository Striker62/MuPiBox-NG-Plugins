(() => {"use strict";const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id);
const box=$("entities");let entries=[];
function status(v){$("status").textContent=v}
async function load(){
 box.replaceChildren();
 if(!sdk.homeassistant){status("Die sichere Home-Assistant-Host-API wird noch benötigt.");return}
 try {
 const response=await sdk.homeassistant.list();
 entries=Array.isArray(response.entities)?response.entities:[];
 if(entries.length===0){status("Noch keine Geräte freigegeben. Eltern können dies im NG-Admin einrichten.");return}
 for(const e of entries){
 const card=document.createElement("article");card.className="device";
 const heading=document.createElement("strong");heading.textContent=e.name||e.entity_id;
 const state=document.createElement("span");state.textContent=e.state||"unbekannt";
 card.append(heading,state);
 for(const action of e.actions||[]){
 const btn=document.createElement("button");btn.className="primary";btn.textContent=action==="turn_on"?"Ein":action==="turn_off"?"Aus":action;
 btn.onclick=async()=>{btn.disabled=true;try{await sdk.homeassistant.command(e.entity_id,action);status("Aktion gesendet: "+heading.textContent);await load()}catch(err){status("Nicht erlaubt: "+err.message)}finally{btn.disabled=false}};
 card.append(btn);
 }
 box.append(card);
 }
 status("Geräte geladen."); 
 }catch(e){status("Home Assistant nicht erreichbar / nicht konfiguriert: "+e.message)}
}
$("refresh").onclick=load;$("exit").onclick=()=>sdk.exit();sdk.on("input",({button,action})=>{if(action==="press"&&button==="BACK")sdk.exit()});load();
})();