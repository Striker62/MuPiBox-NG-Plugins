(() => {"use strict";const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id),box=$("favorites");
function status(v){$("status").textContent=v}
async function load(){box.replaceChildren();if(!sdk.links){status("MuPi Links benötigt eine neuere NG-Host-API.");return}
 try{const data=await sdk.links.list();const list=data.favorites||[];
 for(const f of list){const button=document.createElement("button");button.className="favorite";button.textContent=f.title||f.url;button.onclick=async()=>{status("Freigabe wird geprüft …");try{await sdk.links.open(f.url);status("Website geöffnet.")}catch(e){status("Browser noch nicht freigegeben: "+e.message)}};box.append(button)}
 status(list.length?list.length+" Favoriten freigegeben.":"Keine Favoriten. Bitte im Admin URLs freigeben.");
 }catch(e){status("Favoriten nicht verfügbar: "+e.message)}}
$("refresh").onclick=load;$("exit").onclick=()=>sdk.exit();
sdk.on("input",({button,action})=>{if(action==="press"&&button==="BACK")sdk.exit()});
load();
})();