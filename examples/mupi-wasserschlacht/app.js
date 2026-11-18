/* MuPi Wasserschlacht – original UI for the MuPiBox-NG Plugin SDK. */
(()=>{"use strict";
const E=WaterBattle, sdk=window.MuPiBoxSDK, $=id=>document.getElementById(id);
const words={
 de:{audioTitle:"Toneinstellungen",volume:"Lautstärke",mute:"Ton aus",unmute:"Ton an",testSound:"Probeton",audioHint:"Nur dieses Spiel; die Lautstärkegrenze der Box bleibt erhalten.",mode:"Modus",quick:"Quick · 8×8",classic:"Classic · 10×10",max:"Max · 12×12",viewown:"Boote",viewenemy:"Gegner",viewboth:"Beide",level:"MuPi-Stärke",easy:"Leicht",medium:"Mittel",hard:"Schlau",new:"Neu",opponent:"MuPis Versteck",own:"Deine Boote",
 rotate:"↻ Drehen",random:"Zufall",start:"Los geht's!",again:"Nochmal!",help:"Boote rechts platzieren. Danach links ein Feld antippen.",
 controller:"Controller: Pfeile · A wählen · X drehen",ready:"Platziere deine Boote!",placed:"Alle Boote sind bereit!",next:"Boot mit {n} Feldern",invalid:"Hier ist zu wenig Platz.",yourTurn:"Du bist dran! Tippe links auf ein Feld.",
 botTurn:"MuPi sucht ein Feld …",miss:"Platsch! Nur Wasser!",hit:"Huch! MuPi bekommt nasse Füße!",sunk:"Oh nein! MuPi braucht den Rettungsring!",win:"Juhu, du hast gewonnen!",lose:"MuPi hat gewonnen. Nächste Runde?",
 ownMiss:"MuPi ist ins Wasser geplumpst!",ownHit:"Auweia! Dein Boot wurde getroffen!",ownSunk:"Blubb! Ein Boot ist untergegangen!",wait:"MuPi ist noch am Zug.",preview:"Vorschau: Fenster schließen"},
 en:{audioTitle:"Sound settings",volume:"Volume",mute:"Mute",unmute:"Unmute",testSound:"Test sound",audioHint:"This game only; the box volume limit still applies.",mode:"Mode",quick:"Quick · 8×8",classic:"Classic · 10×10",max:"Max · 12×12",viewown:"Your boats",viewenemy:"Target",viewboth:"Both",level:"MuPi skill",easy:"Easy",medium:"Normal",hard:"Clever",new:"New",opponent:"MuPi's hideout",own:"Your boats",
 rotate:"↻ Rotate",random:"Random",start:"Let's go!",again:"Play again!",help:"Place your boats on the right. Then tap the left ocean.",
 controller:"Controller: arrows · A select · X rotate",ready:"Place your boats!",placed:"All boats are ready!",next:"Boat with {n} squares",invalid:"Not enough room here.",yourTurn:"Your turn! Tap a square on the left.",
 botTurn:"MuPi is searching …",miss:"Splash! Just water!",hit:"Oops! MuPi's getting wet!",sunk:"Oh no! MuPi needs the lifebuoy!",win:"Hooray, you won!",lose:"MuPi won. Another round?",
 ownMiss:"MuPi splashed into the sea!",ownHit:"Oh dear! Your boat was hit!",ownSunk:"Glug! A boat went down!",wait:"MuPi's turn.",preview:"Preview: close this window"}
};
let lang="de",player=E.empty(),computer=E.empty(),phase="place",turn="player",placed=0,vertical=false,selected=27,epoch=0,muted=false,volume=40,reactionTimer=0,focusTarget="own";
const ui={enemy:[],own:[]};
const t=(key,arg)=>((words[lang]||words.de)[key]||words.de[key]||key).replace("{n}",String(arg??""));
function translate(){
 document.documentElement.lang=lang;
 document.querySelectorAll("[data-i18n]").forEach(node=>node.textContent=t(node.dataset.i18n));
 $("title").textContent="MuPi Water Battle";
 updateAudioControls();
}
function makeGrid(which){
 const element=$(which),size=player.size;
 element.replaceChildren();ui[which]=[];
 element.style.gridTemplateColumns=`repeat(${size}, minmax(0, 1fr))`;
 element.style.gridTemplateRows=`repeat(${size}, minmax(0, 1fr))`;
 for(let i=0;i<size*size;i++){
  const btn=document.createElement("button");
  btn.type="button";btn.className="cell";btn.dataset.i=String(i);
  btn.addEventListener("click",()=>which==="own"?tryPlace(i):tryFire(i));
  btn.setAttribute("aria-label",(which==="enemy"?"Opposite ":"Own ")+String.fromCharCode(65+i%size)+(Math.floor(i/size)+1));
  ui[which].push(btn);element.appendChild(btn);
 }
}
function toggleView(){
 if($("mode").value!=="max")return;
 const cycle=phase==="place"?["own","both"]:["enemy","own","both"];
 focusTarget=cycle[(cycle.indexOf(focusTarget)+1)%cycle.length];draw();
}
function draw(){
 const ownCell=new Set(player.ships.flatMap(s=>s.cells));
 $("app").dataset.mode=$("mode").value;
 $("app").dataset.focus=focusTarget;
 $("view").hidden=$("mode").value!=="max";
 $("view").textContent=t("view"+focusTarget);
 const fleetSize=player.fleet.length;
 for(const which of ["enemy","own"]){
  const board=which==="enemy"?computer:player;
  ui[which].forEach((btn,i)=>{
   const shot=board.shots[i];
   btn.className="cell";
   if(which==="own"&&ownCell.has(i))btn.classList.add("ship");
   if(shot)btn.classList.add(shot);
   if(selected===i&&(phase==="place"?which==="own":which==="enemy")&&phase!=="finished")btn.classList.add("aim");
   btn.disabled=phase==="finished"||(which==="enemy"?(phase!=="play"||turn!=="player"||shot!==null):(phase!=="place"));
  });
 }
 $("own-score").textContent=E.sunkCount(player)+" / "+fleetSize;
 $("enemy-score").textContent=E.sunkCount(computer)+" / "+fleetSize;
 $("start").disabled=placed<player.fleet.length;
 $("placement").hidden=phase!=="place";
 $("game-controls").hidden=phase==="place";
 $("again").hidden=phase!=="finished";
 $("ship-hint").textContent=placed===player.fleet.length?t("placed"):t("next",player.fleet[placed])+" "+(vertical?"↕":"↔");
 $("rotate").setAttribute("aria-pressed",String(vertical));
 $("turn").textContent=phase==="play"&&turn==="computer"?t("botTurn"):"";
}
let audioContext;
function browserSound(kind){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  audioContext=audioContext||new AC();
  if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
  const now=audioContext.currentTime;
  // Realistic synthetic watery splash: decaying filtered noise + bubble chirps.
  const duration=kind==="sunk"?.6:kind==="hit"?.34:.22;
  const length=Math.floor(audioContext.sampleRate*duration);
  const buffer=audioContext.createBuffer(1,length,audioContext.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<length;i++){
   const d=i/length;data[i]=(Math.random()*2-1)*Math.pow(1-d,2)*(kind==="sunk"?.6:.38);
  }
  const noise=audioContext.createBufferSource(),low=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  noise.buffer=buffer;low.type="lowpass";low.frequency.value=kind==="miss"?930:1500;
  gain.gain.value=.32*volume/100;noise.connect(low);low.connect(gain);gain.connect(audioContext.destination);
  noise.start(now);
  const notes=kind==="miss"?[280,390]:kind==="hit"?[480,330,540]:[390,290,210,170];
  for(let i=0;i<notes.length;i++){
   const osc=audioContext.createOscillator(),g=audioContext.createGain();
   osc.type="sine";osc.frequency.setValueAtTime(notes[i],now+i*.085);
   osc.frequency.exponentialRampToValueAtTime(Math.max(110,notes[i]*.68),now+i*.085+.12);
   g.gain.setValueAtTime(.0001,now+i*.085);
   g.gain.exponentialRampToValueAtTime(Math.max(.0001,.065*volume/100),now+i*.085+.018);
   g.gain.exponentialRampToValueAtTime(.0001,now+i*.085+.16);
   osc.connect(g);g.connect(audioContext.destination);osc.start(now+i*.085);osc.stop(now+i*.085+.17);
  }
 }catch(error){console.warn("Preview audio",error);}
}
function sound(kind){
 if(muted||volume<=0)return;
 if(!sdk.isHosted){browserSound(kind);return;}
 // Native Pi audio transport only exposes approved notes, not sample playback.
 const tones=kind==="miss"?["C4","G4"]:kind==="hit"?["G4","E4","C5"]:["C4","E4","G4","C5"];
 const instrument=kind==="miss"?"marimba":kind==="hit"?"xylophone":"glockenspiel";
 tones.forEach((note,i)=>setTimeout(()=>{if(!muted&&volume>0)sdk.audio.playNote(note,volume,instrument,{relative:true}).catch(()=>{});},i*90));
}
function picture(kind){
 $("reaction-img").src="assets/"+kind+".png";
 const node=$("reaction");node.classList.remove("pop");void node.offsetWidth;node.classList.add("pop");
 clearTimeout(reactionTimer);reactionTimer=setTimeout(()=>node.classList.remove("pop"),500);
}
function message(text){$("message").textContent=text;}
function announce(kind,key){picture(kind);sound(kind);message(t(key));}
function newRound(){
 epoch++;
 player=E.empty($("mode").value);computer=E.empty($("mode").value);
 phase="place";turn="player";placed=0;vertical=false;
 selected=E.index(Math.floor(player.size/2),Math.floor(player.size/2),player);
 focusTarget="own";makeGrid("enemy");makeGrid("own");
 $("reaction-img").src="assets/sunk.png";message(t("ready"));draw();
}
function tryPlace(i){
 if(phase!=="place"||placed>=player.fleet.length)return;
 selected=i;const [x,y]=E.xy(i,player);
 if(!E.place(player,x,y,player.fleet[placed],vertical)){message(t("invalid"));draw();return;}
 placed++;message(t(placed===player.fleet.length?"placed":"ready"));draw();
}
function randomPlacement(){
 if(phase!=="place")return;
 player=E.randomFleet($("mode").value);placed=player.fleet.length;message(t("placed"));draw();
}
function begin(){
 if(phase!=="place"||placed!==player.fleet.length)return;
 computer=E.randomFleet($("mode").value);phase="play";turn="player";
 focusTarget="enemy";selected=E.index(Math.floor(player.size/2),Math.floor(player.size/2),player);message(t("yourTurn"));draw();
}
function finish(won){
 phase="finished";turn=won?"player":"computer";
 // The final shot has already played its reaction; do not duplicate the sound.
 message(t(won?"win":"lose"));draw();
}
function tryFire(i){
 if(phase!=="play"||turn!=="player")return;
 selected=i;const hit=E.fire(computer,i);
 if(!hit){draw();return;}
 announce(hit.type,hit.type);draw();
 if(hit.win){finish(true);return;}
 turn="computer";draw();
 const run=epoch;
 setTimeout(()=>{
  if(run!==epoch||phase!=="play"||turn!=="computer")return;
  const chosen=E.chooseShot(player.shots,$("level").value,Math.random,$("mode").value);
  if(chosen===null){finish(true);return;}
  const response=E.fire(player,chosen);
  if(!response)return;
  announce(response.type,response.type==="miss"?"ownMiss":response.type==="hit"?"ownHit":"ownSunk");
  if(response.win){finish(false);return;}
  turn="player";draw();
 },680);
}
$("exit").onclick=()=>{epoch++;sdk.exit().then(ok=>{if(ok===false)message(t("preview"));}).catch(()=>{});};
$("restart").onclick=newRound;$("again").onclick=newRound;
$("start").onclick=begin;$("auto").onclick=randomPlacement;
$("rotate").onclick=()=>{vertical=!vertical;draw();};
const VOLUME_KEY="waterbattle.audio.v1";
function updateAudioControls(){
 $("volume").value=String(volume);
 $("volume-value").textContent=String(volume)+" %";
 $("mute").textContent=t(muted?"unmute":"mute");
 $("mute").setAttribute("aria-pressed",String(muted));
 $("sound").textContent=muted||volume===0?"♫̸":"♫";
 $("sound").setAttribute("aria-label",t("audioTitle"));
}
function saveAudio(){
 sdk.storage.set(VOLUME_KEY,{volume,muted}).catch(()=>{});
}
function openAudio(open){
 $("audio-popover").hidden=!open;
 $("sound").setAttribute("aria-expanded",String(open));
 if(open){updateAudioControls();$("volume").focus();}
 else $("sound").focus();
}
$("sound").onclick=()=>openAudio($("audio-popover").hidden);
$("close-audio").onclick=()=>openAudio(false);
$("volume").oninput=()=>{
 volume=Number($("volume").value);
 if(volume>0)muted=false;
 updateAudioControls();
};
$("volume").onchange=()=>{saveAudio();sound("miss");};
$("mute").onclick=()=>{muted=!muted;updateAudioControls();saveAudio();if(!muted)sound("miss");};
$("test-sound").onclick=()=>sound("hit");
sdk.storage.get(VOLUME_KEY).then(data=>{
 if(!data||typeof data!=="object")return;
 if(Number.isInteger(data.volume)&&data.volume>=0&&data.volume<=100)volume=data.volume;
 if(typeof data.muted==="boolean")muted=data.muted;
 updateAudioControls();
}).catch(()=>{});
$("level").onchange=newRound;$("mode").onchange=newRound;$("view").onclick=toggleView;
sdk.on("input",({button,action})=>{
 if(action!=="press")return;
 if(button==="BACK"||button==="B"){
  if(!$("audio-popover").hidden){openAudio(false);return;}
  epoch++;sdk.exit().catch(()=>{});return;
 }
 if(button==="X"&&phase==="place"){vertical=!vertical;draw();return;}
 if(button==="Y"&&phase==="place"){randomPlacement();return;}
 if(button==="Y"&&phase!=="place"){toggleView();return;}
 if(button==="START"&&phase==="place"&&placed===player.fleet.length){begin();return;}
 if(["UP","DOWN","LEFT","RIGHT"].includes(button)){
  let [x,y]=E.xy(selected,player);
  if(button==="UP")y=(y+player.size-1)%player.size;else if(button==="DOWN")y=(y+1)%player.size;
  else if(button==="LEFT")x=(x+player.size-1)%player.size;else x=(x+1)%player.size;
  selected=E.index(x,y,player);draw();
 }
 if(button==="A"||button==="START"){
  if(phase==="place")tryPlace(selected);else if(phase==="play")tryFire(selected);else newRound();
 }
});
sdk.on("lifecycle.pause",()=>{epoch++;if(phase==="play"&&turn==="computer"){turn="player";draw();}});
translate();newRound();
sdk.getContext().then(ctx=>{const tag=String(ctx?.language||"de").toLowerCase();lang=tag.startsWith("en")?"en":"de";translate();draw();if(phase==="place")message(t("ready"));}).catch(()=>{});
})();