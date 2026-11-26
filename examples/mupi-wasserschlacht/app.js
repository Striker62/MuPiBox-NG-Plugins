/* MuPi Wasserschlacht – original UI for the MuPiBox-NG Plugin SDK. */
(()=>{"use strict";
const E=WaterBattle, sdk=window.MuPiBoxSDK, $=id=>document.getElementById(id);
const words={
 de:{audioTitle:"Toneinstellungen",volume:"Lautstärke",mute:"Ton aus",unmute:"Ton an",testSound:"Probeton",audioHint:"Echte Sounds/Musik brauchen die neue NG-Version. Hier sonst nur Tonfolgen.",audioHintNative:"Echte Sounds und Musik laufen über PipeWire. Lautstärke bleibt begrenzt.",musicVolume:"Musik",musicOff:"Musik aus",musicOn:"Musik an",credits:"Soundquellen / Lizenz",mode:"Modus",quick:"Quick · 8×8",classic:"Classic · 10×10",max:"Max · 12×12",viewown:"Meine Karte",viewenemy:"Gegner",viewboth:"Beide",level:"MuPi-Stärke",easy:"Leicht",medium:"Mittel",hard:"Schlau",new:"Neu",opponent:"MuPis Versteck",own:"Deine Boote",
 rotate:"↻ Drehen",random:"Zufallsflotte",confirm:"Boot setzen",undo:"Rückgängig",start:"Los geht's!",again:"Nochmal!",help:"Feld antippen, bei Bedarf drehen und Boot setzen.",
 controller:"Pfeile · A setzen · X drehen · Y Zufall · B zurücknehmen",ready:"Setze deine Boote oder wähle Zufallsflotte.",placed:"Alle Boote sind bereit!",next:"Boot mit {n} Feldern",invalid:"Hier ist zu wenig Platz.",yourTurn:"Du bist dran! Tippe links auf ein Feld.",
 botTurn:"MuPi sucht ein Feld …",miss:"Platsch! Nur Wasser!",hit:"Huch! MuPi bekommt nasse Füße!",sunk:"Oh nein! MuPi braucht den Rettungsring!",win:"Juhu, du hast gewonnen!",lose:"MuPi hat gewonnen. Nächste Runde?",
 ownMiss:"MuPi ist ins Wasser geplumpst!",ownHit:"Auweia! Dein Boot wurde getroffen!",ownSunk:"Blubb! Ein Boot ist untergegangen!",wait:"MuPi ist noch am Zug.",preview:"Vorschau: Fenster schließen"},
 en:{audioTitle:"Sound settings",volume:"Volume",mute:"Mute",unmute:"Unmute",testSound:"Test sound",audioHint:"Original sounds/music require newer NG. Older hosts play note effects only.",audioHintNative:"Real sound effects and music play via PipeWire, within volume limits.",musicVolume:"Music",musicOff:"Music off",musicOn:"Music on",credits:"Audio credits / license",mode:"Mode",quick:"Quick · 8×8",classic:"Classic · 10×10",max:"Max · 12×12",viewown:"My board",viewenemy:"Opponent",viewboth:"Both",level:"MuPi skill",easy:"Easy",medium:"Normal",hard:"Clever",new:"New",opponent:"MuPi's hideout",own:"Your boats",
 rotate:"↻ Rotate",random:"Random fleet",confirm:"Place boat",undo:"Undo",start:"Let's go!",again:"Play again!",help:"Tap a square, rotate if needed, then place the boat.",
 controller:"Arrows · A place · X rotate · Y random · B undo",ready:"Place your boats or choose a random fleet.",placed:"All boats are ready!",next:"Boat with {n} squares",invalid:"Not enough room here.",yourTurn:"Your turn! Tap a square on the left.",
 botTurn:"MuPi is searching …",miss:"Splash! Just water!",hit:"Oops! MuPi's getting wet!",sunk:"Oh no! MuPi needs the lifebuoy!",win:"Hooray, you won!",lose:"MuPi won. Another round?",
 ownMiss:"MuPi splashed into the sea!",ownHit:"Oh dear! Your boat was hit!",ownSunk:"Glug! A boat went down!",wait:"MuPi's turn.",preview:"Preview: close this window"}
};
let touchArmed=false;
let lang="de",player=E.empty(),computer=E.empty(),phase="place",turn="player",placed=0,vertical=false,selected=27,epoch=0,muted=false,volume=40,musicVolume=20,musicEnabled=true,reactionTimer=0,focusTarget="own",shakeTimer=0,lastImpact=null;
const ui={enemy:[],own:[]};
const soundPlayer=new WaterBattleAudio.Player(sdk.isHosted,sdk.audio);
function syncAudio(){soundPlayer.configure({volume,musicVolume,musicEnabled,muted});}

const t=(key,arg)=>((words[lang]||words.de)[key]||words.de[key]||key).replace("{n}",String(arg??""));
function translate(){
 document.documentElement.lang=lang;
 document.querySelectorAll("[data-i18n]").forEach(node=>node.textContent=t(node.dataset.i18n==="audioHint"&&soundPlayer.nativeAvailable?"audioHintNative":node.dataset.i18n));
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
  btn.addEventListener("click",()=>which==="own"?selectPlacement(i):tryFire(i));
  btn.setAttribute("aria-label",(which==="enemy"?"Opposite ":"Own ")+String.fromCharCode(65+i%size)+(Math.floor(i/size)+1));
  ui[which].push(btn);element.appendChild(btn);
 }
}
function toggleView(){
 if($("mode").value!=="max")return;
 const cycle=phase==="place"?["own","both"]:["enemy","own"];
 focusTarget=cycle[(cycle.indexOf(focusTarget)+1)%cycle.length];draw();
}
function draw(){
 const ownCell=new Set(player.ships.flatMap(s=>s.cells));
 const ghost=phase==="place"?E.placementPreview(player,selected,player.fleet[placed],vertical):null;
 const ghostCells=new Set(ghost?.cells||[]);
 $("app").dataset.phase=phase;
 $("app").dataset.mode=$("mode").value;
 $("app").dataset.focus=focusTarget;
 $("view").hidden=phase==="place"||$("mode").value!=="max";
 const target=phase==="place"?(focusTarget==="own"?"both":"own"):(focusTarget==="enemy"?"own":"enemy");
 $("view").textContent=t("view"+target);
 $("view").setAttribute("aria-label",t("view"+target));
 const fleetSize=player.fleet.length;
 for(const which of ["enemy","own"]){
  const board=which==="enemy"?computer:player;
  ui[which].forEach((btn,i)=>{
   const shot=board.shots[i];
   btn.className="cell";
   if(which==="own"&&ownCell.has(i))btn.classList.add("ship");
   if(which==="own"&&ghostCells.has(i))btn.classList.add(ghost.valid?"ghost-valid":"ghost-invalid");
   if(shot)btn.classList.add(shot);
   if(lastImpact&&lastImpact.which===which&&lastImpact.index===i)btn.classList.add("last-hit");
   if(selected===i&&phase==="play"&&which==="enemy")btn.classList.add("aim");
   btn.disabled=phase==="finished"||(which==="enemy"?(phase!=="play"||turn!=="player"||shot!==null):(phase!=="place"));
  });
 }
 $("own-score").textContent=(phase==="place"?placed:E.sunkCount(player))+" / "+fleetSize;
 $("enemy-score").textContent=E.sunkCount(computer)+" / "+fleetSize;
 $("start").disabled=placed<player.fleet.length;
 $("confirm").disabled=!ghost?.valid;
 $("rotate").disabled=!ghost;
 $("undo").disabled=placed===0;
 $("placement").hidden=phase!=="place";
 $("game-controls").hidden=phase==="place";
 $("again").hidden=phase!=="finished";
 $("ship-hint").textContent=placed===player.fleet.length?t("placed"):(placed+1)+" / "+fleetSize+" · "+t("next",player.fleet[placed])+" "+(vertical?"↕":"↔");
 $("rotate").setAttribute("aria-pressed",String(vertical));
 $("turn").textContent=phase==="play"&&turn==="computer"?t("botTurn"):"";
 const help=document.querySelector("footer [data-i18n='help']");
 if(help)help.textContent=phase==="place"?t("help"):phase==="finished"?t("again"):t("yourTurn");
}
function sound(kind){
 if(muted||volume<=0)return;
 // New NG hosts decode Ogg samples into their bounded PipeWire mixer.
 // On older NG alphas keep the existing note fallback (no silent action).
 soundPlayer.sound(kind).then(played=>{if(!played&&sdk.isHosted)fallbackTone(kind);});
}
function fallbackTone(kind){
 const tones=kind==="miss"?["C4","G4"]:kind==="hit"?["G4","E4","C5"]:kind==="sunk"?["C4","E4","G4","C5"]:kind==="win"?["C4","E4","G4","C5"]:["G4","E4","C4"];
 const instrument=kind==="miss"?"marimba":kind==="hit"?"xylophone":"glockenspiel";
 tones.forEach((note,i)=>setTimeout(()=>{if(!muted&&volume>0)sdk.audio.playNote(note,volume,instrument,{relative:true}).catch(()=>{});},i*90));
}
function picture(kind){
 $("reaction-img").src="assets/"+kind+".png";
 const node=$("reaction");node.classList.remove("pop");void node.offsetWidth;node.classList.add("pop");
 clearTimeout(reactionTimer);reactionTimer=setTimeout(()=>node.classList.remove("pop"),500);
}
function message(text){$("message").textContent=text;}
function screenShake(which,index,kind){
 // Restart on EVERY hit, not just the first. The old timer removed "shake"
 // instead of "hit-shake", which left subsequent hits without animation.
 const app=$("app"),board=$(which),panel=board.closest(".panel"),flash=$("impact-flash");
 lastImpact={which,index};
 clearTimeout(shakeTimer);
 for(const node of [app,$("enemy"),$("own")])node.classList.remove("hit-shake","board-impact");
 for(const node of document.querySelectorAll(".panel"))node.classList.remove("impact-glow");
 flash.classList.remove("active","on-own");
 void board.offsetWidth; // force Qt WebEngine repaint and restart CSS keyframes
 const reduced=Boolean(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
 if(!reduced){app.classList.add("hit-shake");board.classList.add("board-impact");}
 panel.classList.add("impact-glow");
 flash.textContent=kind==="sunk"?(lang==="de"?"VERSENKT!":"SUNK!"):(lang==="de"?"TREFFER!":"HIT!");
 flash.classList.add("active");
 if(which==="own")flash.classList.add("on-own");
 shakeTimer=setTimeout(()=>{
  app.classList.remove("hit-shake");board.classList.remove("board-impact");panel.classList.remove("impact-glow");
  flash.classList.remove("active","on-own");
 },1000);
}
function announce(kind,key){picture(kind);sound(kind);message(t(key));}
function newRound(){
 epoch++;
 player=E.empty($("mode").value);computer=E.empty($("mode").value);
 phase="place";turn="player";placed=0;vertical=false;touchArmed=false;
 selected=E.index(Math.floor(player.size/2),Math.floor(player.size/2),player);
 focusTarget="own";makeGrid("enemy");makeGrid("own");
 $("reaction-img").src="assets/sunk.png";lastImpact=null;$("impact-flash").classList.remove("active","on-own");message(t("ready"));draw();
}
function selectPlacement(i){
 if(phase!=="place"||placed>=player.fleet.length)return;
 soundPlayer.startMusic();
 if(touchArmed&&selected===i){tryPlace(i);return;}
 selected=i;touchArmed=true;
 const ghost=E.placementPreview(player,i,player.fleet[placed],vertical);
 message(t(ghost?.valid?"ready":"invalid"));draw();
}
function tryPlace(i){
 if(phase!=="place"||placed>=player.fleet.length)return;
 soundPlayer.startMusic();selected=i;
 const ghost=E.placementPreview(player,i,player.fleet[placed],vertical);
 if(!ghost?.valid||!E.place(player,ghost.x,ghost.y,player.fleet[placed],vertical)){message(t("invalid"));draw();return;}
 placed++;touchArmed=false;
 if(placed<player.fleet.length){
  // Select a legal next position, preferring the current orientation.
  for(const direction of [vertical,!vertical]){
   let found=false;
   for(let i=0;i<player.size*player.size;i++){
    if(E.placementPreview(player,i,player.fleet[placed],direction)?.valid){selected=i;vertical=direction;found=true;break;}
   }
   if(found)break;
  }
 }
 message(t(placed===player.fleet.length?"placed":"ready"));draw();
}
function undoPlacement(){
 if(phase!=="place"||!placed)return;
 const last=player.ships.pop();placed--;selected=last.cells[0];
 vertical=last.cells[1]-last.cells[0]===player.size;
 touchArmed=false;message(t("ready"));draw();
}
function rotatePlacement(){
 if(phase!=="place"||placed===player.fleet.length)return;
 vertical=!vertical;
 const ghost=E.placementPreview(player,selected,player.fleet[placed],vertical);
 message(t(ghost?.valid?"ready":"invalid"));draw();
}
function randomPlacement(){
 if(phase!=="place")return;
 soundPlayer.startMusic();player=E.randomFleet($("mode").value);placed=player.fleet.length;touchArmed=false;message(t("placed"));draw();
}
function begin(){
 if(phase!=="place"||placed!==player.fleet.length)return;
 soundPlayer.startMusic();
 computer=E.randomFleet($("mode").value);phase="play";turn="player";
 focusTarget="enemy";selected=E.index(Math.floor(player.size/2),Math.floor(player.size/2),player);message(t("yourTurn"));draw();
}
function finish(won){
 phase="finished";turn=won?"player":"computer";
 // The final shot has already played its reaction; do not duplicate the sound.
 const run=epoch;
 soundPlayer.stopMusic();
 setTimeout(()=>{if(epoch===run&&phase==="finished")sound(won?"win":"lose");},420);
 message(t(won?"win":"lose"));draw();
}
function tryFire(i){
 if(phase!=="play"||turn!=="player")return;
 selected=i;const hit=E.fire(computer,i);
 if(!hit){draw();return;}
 announce(hit.type,hit.type);if(hit.type!=="miss")screenShake("enemy",i,hit.type);draw();
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
  if(response.type!=="miss")screenShake("own",chosen,response.type);
  if(response.win){finish(false);return;}
  turn="player";draw();
 },680);
}
$("exit").onclick=()=>{epoch++;soundPlayer.stopMusic();sdk.exit().then(ok=>{if(ok===false)message(t("preview"));}).catch(()=>{});};
$("restart").onclick=newRound;$("again").onclick=newRound;
$("start").onclick=begin;$("auto").onclick=randomPlacement;
$("rotate").onclick=rotatePlacement;
$("confirm").onclick=()=>tryPlace(selected);
$("undo").onclick=undoPlacement;
const VOLUME_KEY="waterbattle.audio.v1";
function updateAudioControls(){
 $("volume").value=String(volume);
 $("volume-value").textContent=String(volume)+" %";
 $("music-volume").value=String(musicVolume);
 $("music-volume-value").textContent=String(musicVolume)+" %";
 $("music-toggle").textContent=t(musicEnabled?"musicOff":"musicOn");
 $("music-toggle").setAttribute("aria-pressed",String(musicEnabled));
 syncAudio();
 $("mute").textContent=t(muted?"unmute":"mute");
 $("mute").setAttribute("aria-pressed",String(muted));
 $("sound").textContent=muted||volume===0?"♫̸":"♫";
 $("sound").setAttribute("aria-label",t("audioTitle"));
}
function saveAudio(){
 sdk.storage.set(VOLUME_KEY,{volume,muted,musicVolume,musicEnabled}).catch(()=>{});
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
$("volume").onchange=()=>{saveAudio();soundPlayer.flushVolumes();sound("miss");};
$("music-volume").oninput=()=>{musicVolume=Number($("music-volume").value);updateAudioControls();};
$("music-volume").onchange=()=>{saveAudio();soundPlayer.flushVolumes();soundPlayer.startMusic();};
$("music-toggle").onclick=()=>{musicEnabled=!musicEnabled;updateAudioControls();saveAudio();if(musicEnabled)soundPlayer.startMusic();};
$("mute").onclick=()=>{muted=!muted;updateAudioControls();saveAudio();if(!muted)sound("miss");};
$("test-sound").onclick=()=>sound("hit");
sdk.storage.get(VOLUME_KEY).then(data=>{
 if(!data||typeof data!=="object")return;
 if(Number.isInteger(data.volume)&&data.volume>=0&&data.volume<=100)volume=data.volume;
 if(typeof data.muted==="boolean")muted=data.muted;
 if(Number.isInteger(data.musicVolume)&&data.musicVolume>=0&&data.musicVolume<=100)musicVolume=data.musicVolume;
 if(typeof data.musicEnabled==="boolean")musicEnabled=data.musicEnabled;
 updateAudioControls();
}).catch(()=>{});
$("level").onchange=newRound;$("mode").onchange=newRound;$("view").onclick=toggleView;
sdk.on("input",({button,action})=>{
 if(action!=="press")return;
 if(button==="B"&&phase==="place"&&placed&&$("audio-popover").hidden){undoPlacement();return;}
 if(button==="BACK"||button==="B"){
  if(!$("audio-popover").hidden){openAudio(false);return;}
  epoch++;soundPlayer.stopMusic();sdk.exit().catch(()=>{});return;
 }
 if(button==="X"&&phase==="place"){rotatePlacement();return;}
 if(button==="Y"&&phase==="place"){randomPlacement();return;}
 if(button==="Y"&&phase!=="place"){toggleView();return;}
 if(button==="START"&&phase==="place"&&placed===player.fleet.length){begin();return;}
 if(["UP","DOWN","LEFT","RIGHT"].includes(button)){
  let [x,y]=E.xy(selected,player);
  if(button==="UP")y=(y+player.size-1)%player.size;else if(button==="DOWN")y=(y+1)%player.size;
  else if(button==="LEFT")x=(x+player.size-1)%player.size;else x=(x+1)%player.size;
  selected=E.index(x,y,player);touchArmed=false;
  if(phase==="place"&&placed<player.fleet.length)message(t(E.placementPreview(player,selected,player.fleet[placed],vertical)?.valid?"ready":"invalid"));
  draw();
 }
 if(button==="A"||button==="START"){
  if(phase==="place")tryPlace(selected);else if(phase==="play")tryFire(selected);else newRound();
 }
});
let resumeMusic=false;
sdk.on("lifecycle.pause",()=>{resumeMusic=resumeMusic||soundPlayer.musicStarted;soundPlayer.pause();epoch++;if(phase==="play"&&turn==="computer"){turn="player";draw();}});
sdk.on("lifecycle.resume",()=>{if(resumeMusic&&phase!=="finished")soundPlayer.startMusic();resumeMusic=false;});
translate();newRound();
sdk.getContext().then(ctx=>{
 const tag=String(ctx?.language||"de").toLowerCase();lang=tag.startsWith("en")?"en":"de";
 // Older NG hosts omit these fields and only understand audio.note.
 soundPlayer.setNativeAvailable(ctx?.audioSamples===true&&ctx?.audioMusic===true,ctx?.audioVolumeControl===true);
 translate();draw();if(phase==="place")message(t(placed===player.fleet.length?"placed":"ready"));
}).catch(()=>{});
})();