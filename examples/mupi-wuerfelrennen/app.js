// MuPis Würfelrennen: original abstract Ludo/Pachisi-style implementation.
// Name/graphics are not affiliated with any commercial board-game publisher.
// MIT; see LICENSE.txt.
const DiceRace=(()=>{
 const palette=["#f16e80","#f2c95f","#31b9a4","#8799ff"];
 const starts=[0,13,26,39],names=["Rot","Gold","Türkis","Blau"];
 function initial(players=4){return Array.from({length:4},(_,p)=>Array(players).fill(0).map((_,i)=>-1));}
 // Four pieces per participant, each with -1 base, 0..51 circular path,
 // 52..55 private finish corridor. These never share another player's finish.
 function state(players=4){return Array.from({length:4},()=>Array(4).fill(-1));}
 function occupiedAt(b,p,progress){
  if(progress>=52)return b[p].includes(progress);
  const at=(starts[p]+progress)%52;
  return b.some((row,q)=>row.some(v=>v>=0&&v<52&&(starts[q]+v)%52===at));
 }
 function rawMoves(b,p,die){
  if(!Number.isInteger(die)||die<1||die>6)return [];
  const moves=[];
  for(let k=0;k<4;k++){
   const v=b[p][k];let dest=v===-1?(die===6?0:-1):v+die;
   if(dest<0||dest>55||v>=55)continue;
   if(dest>=52){ // No jumping past a friendly piece in the home corridor.
    let blocked=false;for(let i=Math.max(52,v+1);i<=dest;i++)if(b[p].includes(i))blocked=true;
    if(blocked)continue;
   }else if(b[p].some((other,j)=>j!==k&&other>=0&&other<52&&(starts[p]+other)%52===(starts[p]+dest)%52))continue;
   const landing=(starts[p]+dest)%52;
   const captured=dest<52?b.flatMap((row,q)=>q===p?[]:row.map((other,j)=>other>=0&&other<52&&(starts[q]+other)%52===landing?{player:q,piece:j}:null).filter(Boolean)):[];
   moves.push({piece:k,to:dest,captured});
  }
  return moves;
 }
 // Pflichtzug: beim Sechser zuerst aus der Basis; ein eigenes Startfeld
 // wird ansonsten bei der nächsten möglichen Gelegenheit geräumt.
 function possible(b,p,die){
  const moves=rawMoves(b,p,die);
  if(!moves.length)return moves;
  const waiting=b[p].some(v=>v===-1);
  if(waiting&&die===6){
   const exits=moves.filter(m=>b[p][m.piece]===-1);
   if(exits.length)return exits;
  }
  // Nur solange Figuren warten, muss die eigene Startposition frei werden.
  const clearStart=waiting?moves.filter(m=>b[p][m.piece]===0):[];
  if(clearStart.length)return clearStart;
  return moves;
 }
 // Drei Chancen, wenn keine bereits ausgezogene Figur mit 1..6 ziehen kann.
 // Bei vorhandener beweglicher Spielfigur nur ein normaler Wurf.
 function rollLimit(b,p){
  const canMoveOutside=Array.from({length:6},(_,i)=>i+1).some(die=>
   rawMoves(b,p,die).some(m=>b[p][m.piece]>=0));
  return canMoveOutside?1:3;
 }
 // Always derive captures from the current board, never trust a delayed/stale move.
 function apply(b,p,m){
  const from=b[p]?.[m.piece];
  const die=from===-1?6:m.to-from;
  const legal=possible(b,p,die).find(x=>x.piece===m.piece&&x.to===m.to);
  if(!legal)throw new Error("Ungültiger oder veralteter Würfelrennen-Zug");
  const out=b.map(row=>row.slice());
  out[p][legal.piece]=legal.to;
  for(const c of legal.captured)out[c.player][c.piece]=-1;
  return out;
 }
 function choose(b,p,die,level){
  const ms=possible(b,p,die);if(!ms.length)return null;
  if(level==="easy")return ms[Math.floor(Math.random()*ms.length)];
  const ranked=ms.map(m=>{let score=m.captured.length*50+(m.to>=52?35:0)+(m.to===0?13:0)+m.to/5;
    if(level==="hard"){const after=apply(b,p,m);let danger=0;for(let q=0;q<4;q++){if(q===p)continue;
      for(let d=1;d<=6;d++)if(possible(after,q,d).some(a=>a.captured.some(c=>c.player===p&&c.piece===m.piece)))danger+=3;
    }score-=danger;}
    return {m,score:score+Math.random()*(level==="medium"?10:1)};
  });ranked.sort((a,b)=>b.score-a.score);return ranked[0].m;
 }
 return {palette,starts,names,state,possible,rollLimit,apply,choose};
})();
if(typeof module!=="undefined")module.exports=DiceRace;
if(typeof document!=="undefined")(()=>{
"use strict";
const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
const board=$("board"),svg=document.createElementNS(NS,"svg");
svg.setAttribute("viewBox","0 0 442 442");svg.setAttribute("aria-label","Großes Würfelrennen-Brett");board.append(svg);
const backdropLayer=document.createElementNS(NS,"g"),staticLayer=document.createElementNS(NS,"g");
const highlightLayer=document.createElementNS(NS,"g"),pieceLayer=document.createElementNS(NS,"g");
// Keep every decorative element behind all selectable targets and moving pieces.
svg.append(backdropLayer,staticLayer,highlightLayer,pieceLayer);
const WIDTH=442,CELL=30.4,OFFSET=23,SPACE=13;
const names=DiceRace.names,faces=["⚀","⚁","⚂","⚃","⚄","⚅"],cache={};
const pos=i=>{
 let r,c;
 if(i<14){r=0;c=i;}
 else if(i<27){r=i-13;c=13;}
 else if(i<40){r=13;c=39-i;}
 else{r=52-i;c=0;}
 return [OFFSET+c*CELL,OFFSET+r*CELL];
};
const corners=[[0,0],[13,0],[13,13],[0,13]];
// Four separate circular home lanes: the diagonal step leaves a visible gap
// between adjacent 13.4px-radius fields, including the four inner fields.
const lane=(p,j)=>{
 const [x,y]=corners[p];
 const xx=x===0?1:-1,yy=y===0?1:-1,delta=111+j*22;
 return [OFFSET+x*CELL+xx*delta,OFFSET+y*CELL+yy*delta];
};
// Push the four start homes slightly outward, away from the new finish lanes.
const base=(p,j)=>{
 const [x,y]=corners[p];
 const xx=x===0?1:-1,yy=y===0?1:-1;
 return [OFFSET+x*CELL+xx*(46+(j%2)*30),OFFSET+y*CELL+yy*(46+Math.floor(j/2)*30)];
};
const S=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const defs=S("defs");svg.insertBefore(defs,backdropLayer);
function gradient(id,top,bottom){
 const g=S("linearGradient",{id,x1:"0%",y1:"0%",x2:"15%",y2:"100%"});
 g.append(S("stop",{offset:"0%","stop-color":top}),S("stop",{offset:"100%","stop-color":bottom}));
 defs.append(g);
}
gradient("trackA","#64bad4","#124765");
gradient("trackB","#49a3c2","#0a3d5d");
const shiny=["#ffbacb","#fff3a4","#91ffe6","#c2d2ff"];
const shaded=["#d92f50","#d99210","#08ac86","#4768d9"];
const goalTop=["#ffe0e8","#fff7c7","#b5ffef","#e2e6ff"];
const goalMid=["#ff6f8b","#ffd44e","#32e2bd","#7fa2ff"];
const cornerTop=["#ffb3be","#ffedaa","#98ffe0","#bdc9ff"];
for(let p=0;p<4;p++){
 gradient("piece"+p,shiny[p],shaded[p]);
 gradient("corner"+p,cornerTop[p],shaded[p]);
 const g=S("radialGradient",{id:"goal"+p,cx:"30%",cy:"19%",r:"88%"});
 g.append(S("stop",{offset:"0%","stop-color":goalTop[p]}));
 g.append(S("stop",{offset:"38%","stop-color":goalMid[p]}));
 g.append(S("stop",{offset:"100%","stop-color":shaded[p]}));
 defs.append(g);
}
const light=S("radialGradient",{id:"boardAtmosphere",cx:"50%",cy:"48%",r:"65%"});
light.append(S("stop",{offset:"0%","stop-color":"#0d7997","stop-opacity":.75}));
light.append(S("stop",{offset:"57%","stop-color":"#0b4b68","stop-opacity":.55}));
light.append(S("stop",{offset:"100%","stop-color":"#06273e","stop-opacity":0}));
defs.append(light);
// Atmospheric spotlight and a discreet circular accent, never a center mascot/die.
backdropLayer.append(S("circle",{cx:WIDTH/2,cy:WIDTH/2,r:202,fill:"url(#boardAtmosphere)","pointer-events":"none"}));
backdropLayer.append(S("circle",{cx:WIDTH/2,cy:WIDTH/2,r:160.5,fill:"none",stroke:"#37b9d6","stroke-width":1.15,opacity:.33,"pointer-events":"none"}));
backdropLayer.append(S("path",{d:"M62 226 A159 159 0 0 1 221 62",fill:"none",stroke:"#64dcf4","stroke-width":1,opacity:.38,"pointer-events":"none"}));
backdropLayer.append(S("path",{d:"M380 216 A159 159 0 0 1 221 380",fill:"none",stroke:"#5bd1eb","stroke-width":1.2,opacity:.42,"pointer-events":"none"}));
for(let i=0;i<52;i++){
 const [x,y]=pos(i),owner=DiceRace.starts.indexOf(i);
 const r=S("rect",{x:x-14.8,y:y-14.8,width:29.6,height:29.6,rx:5.8,
  fill:owner>=0?"url(#corner"+owner+")":i%2?"url(#trackA)":"url(#trackB)",
  stroke:owner>=0?"#ffedb7":"#80d8eb","stroke-width":owner>=0?2.1:1.6});
 staticLayer.append(S("rect",{x:x-13.5,y:y-12.4,width:27,height:25.7,rx:5,
  fill:"#001324",opacity:.2,"pointer-events":"none"}));
 staticLayer.append(r);
 staticLayer.append(S("path",{d:"M"+(x-10)+" "+(y-10)+"Q"+x+" "+(y-12)+" "+(x+10)+" "+(y-10),
  stroke:"#f5ffff","stroke-width":1.9,opacity:.6,fill:"none","stroke-linecap":"round","pointer-events":"none"}));
 staticLayer.append(S("path",{d:"M"+(x-9)+" "+(y+11)+"h18",stroke:"#03172a","stroke-width":1.6,
  opacity:.3,"stroke-linecap":"round","pointer-events":"none"}));
}
for(let p=0;p<4;p++){
 for(let j=0;j<4;j++){
  const [x,y]=lane(p,j);
  // Glossy circular target cells; unlike the former squares they never overlap.
  staticLayer.append(S("circle",{cx:x,cy:y,r:14.1,"class":"finish-cell",fill:"#09293d",
   stroke:DiceRace.palette[p],"stroke-width":2.1}));
  staticLayer.append(S("circle",{cx:x,cy:y,r:12.2,fill:"url(#goal"+p+")",
   stroke:goalTop[p],"stroke-width":1.2}));
  staticLayer.append(S("ellipse",{cx:x-3.3,cy:y-5.9,rx:6.2,ry:3,fill:"#fff",opacity:.47,"pointer-events":"none"}));
  staticLayer.append(S("path",{d:"M"+(x-7)+" "+(y+8)+"Q"+x+" "+(y+12)+" "+(x+7)+" "+(y+8),
   stroke:"#061d2e",opacity:.37,"stroke-width":1.5,fill:"none","pointer-events":"none"}));
  const [bx,by]=base(p,j);
  staticLayer.append(S("circle",{cx:bx,cy:by,r:15.5,fill:"#051929",stroke:DiceRace.palette[p],"stroke-width":2.8}));
  staticLayer.append(S("circle",{cx:bx,cy:by,r:13.2,fill:"#0a3043",stroke:goalTop[p],"stroke-width":.75,opacity:.68}));
 }
}
let b,players=4,human=1,turn=0,die=0,lastRoll=0,ended=false,settling=false,paused=false,epoch=0,selectedPiece=0,aiTimer=0,pendingTimer=null,pendingAdvance=null,attempts=0,maxAttempts=3;
function schedule(delay,action){
 clearTimeout(aiTimer);
 pendingTimer={delay,action};
 if(paused)return;
 const id=epoch;
 aiTimer=setTimeout(()=>{
  if(id!==epoch||paused||ended)return;
  pendingTimer=null;
  action();
 },delay);
}
const active=()=>players===2?[0,2]:players===3?[0,1,2]:[0,1,2,3];
const isHuman=()=>active().indexOf(turn)<human;
const locate=(p,k)=>{
 const v=b[p][k];return v<0?base(p,k):v<52?pos((DiceRace.starts[p]+v)%52):lane(p,v-52);
};
const nodes={};for(let p=0;p<4;p++)for(let k=0;k<4;k++){
 const g=S("g");g.style.cursor="pointer";g.addEventListener("click",()=>select(k,p));
 const shadow=S("circle",{cx:1.3,cy:2,r:15.2,fill:"#071b29",opacity:.65,"pointer-events":"none"});
 const c=S("circle",{cx:0,cy:0,r:14.3,fill:"url(#piece"+p+")",stroke:"#10263c","stroke-width":2.7});
 const shine=S("ellipse",{cx:-3,cy:-6.5,rx:7.5,ry:3.4,fill:"#fff",opacity:.28,"pointer-events":"none"});
 const tx=S("text",{x:0,y:5,"text-anchor":"middle","font-size":14,"font-weight":"bold",fill:"#092438","pointer-events":"none"});tx.textContent=k+1;
 const area=S("circle",{cx:0,cy:0,r:19,fill:"transparent"});
 g.append(shadow,c,shine,tx,area);pieceLayer.append(g);nodes[p+"-"+k]={g,c};
}
const pieceButtons=Array.from({length:4},(_,k)=>{
 const e=document.createElement("button");e.textContent=k+1;e.addEventListener("click",()=>select(k,turn));$("pieces").append(e);return e;
});
function status(msg){$("status").textContent=msg;}
function render(){
 const currentMoves=die?DiceRace.possible(b,turn,die):[];
 const playable=new Set(currentMoves.map(m=>m.piece));
 highlightLayer.replaceChildren();
 for(const p of active())for(let k=0;k<4;k++){
  const e=nodes[p+"-"+k],v=b[p][k];const [x,y]=locate(p,k);
  e.g.setAttribute("transform","translate("+x+" "+y+")");
  const show=die>0&&p===turn&&k===selectedPiece;
  e.c.setAttribute("stroke",show?"#ffffff":"#10263c");
  e.c.setAttribute("stroke-width",show?4.6:2.7);
  e.c.setAttribute("r",show?15.4:14.3);
  e.g.style.display="block";
  if(p===turn&&playable.has(k)&&isHuman()){
   highlightLayer.append(S("circle",{cx:x,cy:y,r:20.2,fill:"none",stroke:"#fff3ad","stroke-width":3,opacity:.72,"pointer-events":"none"}));
  }
 }
 for(let p=0;p<4;p++)if(!active().includes(p))for(let k=0;k<4;k++)nodes[p+"-"+k].g.style.display="none";
 $("turn").textContent=ended?names[turn]+" gewinnt!":names[turn]+" · "+(isHuman()?"DU BIST DRAN":"MuPi DENKT");
 $("turn").classList.toggle("winner",ended);
 $("status").classList.toggle("won",ended);
 const scoreNodes=[];
 for(const [i,p] of active().entries()){
  if(i){const sep=document.createElement("span");sep.className="score-separator";sep.textContent="·";scoreNodes.push(sep);}
  const tag=document.createElement("span");tag.className="score-player";
  tag.style.setProperty("--player-color",DiceRace.palette[p]);
  tag.textContent=names[p]+" "+b[p].filter(v=>v>=52).length+"/4";
  scoreNodes.push(tag);
 }
 $("score").replaceChildren(...scoreNodes);
 $("attempts").textContent=ended?"Sieg":settling?"Geschlagen!":die?"Zug wählen":maxAttempts===3?"Wurf "+Math.min(attempts+1,3)+"/3":"Dein Zug";
 const visibleDie=die||lastRoll;
 $("dice").textContent=visibleDie?faces[visibleDie-1]:"?";
 $("dice").dataset.value=visibleDie?String(visibleDie):"";
 $("dice").classList.toggle("six",visibleDie===6);
 $("roll").disabled=ended||settling||!isHuman()||die>0;
 for(let k=0;k<4;k++){
  const btn=pieceButtons[k];btn.disabled=ended||settling||!isHuman()||!playable.has(k);
  btn.classList.toggle("active",selectedPiece===k&&playable.has(k)&&isHuman()&&!ended);
 }
}
function finishMove(m){
 if(ended||settling||!die)return;
 // Revalidate before applying: a timer must never move a piece for a later turn.
 const legal=DiceRace.possible(b,turn,die).find(x=>x.piece===m.piece&&x.to===m.to);
 if(!legal)return;
 epoch++;clearTimeout(aiTimer);pendingTimer=null;pendingAdvance=null;
 b=DiceRace.apply(b,turn,legal);
 const face=die;
 const victimNames=legal.captured.map(c=>names[c.player]+" "+(c.piece+1)).join(", ");
 status(legal.captured.length?
  names[turn]+" schlägt "+victimNames+" – zurück ins Haus!":
  names[turn]+" zieht Figur "+(legal.piece+1)+".");
 if(b[turn].every(v=>v>=52)){
  ended=true;die=0;status(names[turn]+" GEWINNT!");render();return;
 }
 const advance=()=>{
  pendingAdvance=null;settling=false;die=0;
  if(face===6){
   attempts=0;maxAttempts=DiceRace.rollLimit(b,turn);
   status(names[turn]+" hat eine Sechs – Extrawurf!");
   render();computer();
  }else next();
 };
 if(legal.captured.length){
  // Hold the board so the beaten piece visibly returns home before the next turn.
  settling=true;die=0;pendingAdvance=advance;render();
  const id=epoch;
  schedule(1000,()=>{if(id===epoch&&!ended)advance();});
 }else advance();
}
function select(k,p=turn){
 if(p!==turn||ended||settling||!isHuman()||!die)return;
 selectedPiece=k;
 const m=DiceRace.possible(b,turn,die).find(m=>m.piece===k);
 if(!m){status("Figur "+(k+1)+" kann mit "+die+" nicht ziehen.");render();return;}
 finishMove(m);
}
function next(){
 die=0;lastRoll=0;const list=active();turn=list[(list.indexOf(turn)+1)%list.length];
 attempts=0;maxAttempts=DiceRace.rollLimit(b,turn);selectedPiece=0;
 status(names[turn]+" ist dran."+(maxAttempts===3?" Drei Wurfversuche.":""));
 render();computer();
}
function rolled(){
 if(ended||die||settling||paused)return;
 epoch++;clearTimeout(aiTimer);pendingTimer=null;
 attempts++;
 die=1+Math.floor(Math.random()*6);lastRoll=die;
 const ms=DiceRace.possible(b,turn,die);
 if(ms.length&&!ms.some(m=>m.piece===selectedPiece))selectedPiece=ms[0].piece;
 const forcedExit=die===6&&ms.length&&ms.every(m=>b[turn][m.piece]===-1);
 const mustClear=ms.length&&ms.every(m=>b[turn][m.piece]===0);
 status(forcedExit?"Sechs! Eine Figur zieht aus dem Haus.":mustClear?
  "Startfeld freimachen: Figur "+(ms[0].piece+1)+" ziehen.":names[turn]+" würfelt "+die+".");
 const diceEl=$("dice");diceEl.classList.remove("roll");void diceEl.offsetWidth;diceEl.classList.add("roll");
 render();
 if(!ms.length){
  const id=epoch;schedule(die===6?1050:520,()=>{
   if(id!==epoch||ended)return;
   die=0;
   if(attempts<maxAttempts){
    status("Kein Zug möglich – nächster Versuch ("+(attempts+1)+"/"+maxAttempts+").");
    render();computer();
   }else{status("Kein Zug möglich – nächster Spieler.");next();}
  });
 }else if(forcedExit){
  // Alle Basisfiguren sind gleichwertig: automatische Pflichtausfahrt.
  const id=epoch;schedule(1150,()=>{
   if(id!==epoch||ended||die!==6)return;finishMove(ms[0]);
  });
 }else if(!isHuman()){
  const id=epoch;schedule(die===6?1050:450,()=>{if(id!==epoch||ended)return;
   const move=DiceRace.choose(b,turn,die,$("difficulty").value);if(move)finishMove(move);
  });
 }
}
function computer(){
 if(!ended&&!isHuman()&&!die&&!paused){
  const id=epoch;schedule(320,()=>{if(id===epoch&&!settling)rolled();});
 }
}
function reset(){
 epoch++;clearTimeout(aiTimer);pendingTimer=null;pendingAdvance=null;
 players=+ $("playercount").value;human=Math.min(+ $("human").value,players);$("human").value=human;
 b=DiceRace.state(players);turn=active()[0];die=0;lastRoll=0;ended=false;settling=false;selectedPiece=0;
 attempts=0;maxAttempts=DiceRace.rollLimit(b,turn);
 status("Du hast drei Versuche, eine Sechs zu würfeln.");render();computer();
}
$("roll").onclick=()=>{if(isHuman()&&!die)rolled();};
$("restart").onclick=reset;
for(const id of ["playercount","human","difficulty"])$(id).onchange=reset;
$("exit").onclick=()=>{epoch++;clearTimeout(aiTimer);pendingTimer=null;sdk.exit();};
sdk.on("lifecycle.pause",()=>{paused=true;clearTimeout(aiTimer);});
sdk.on("lifecycle.resume",()=>{
 paused=false;
 // Re-arm the exact interrupted action: missing rolls and pending AI moves
 // must not leave a visible, but non-interactive die on the screen.
 if(pendingTimer){const {delay,action}=pendingTimer;schedule(delay,action);return;}
 if(pendingAdvance){pendingAdvance();return;}
 if(!ended&&!die&&!settling)computer();
});
sdk.on("input",({button,action})=>{
 if(action!=="press")return;
 if(button==="BACK"){epoch++;clearTimeout(aiTimer);sdk.exit();return;}
 if(button==="LEFT"||button==="UP")selectedPiece=(selectedPiece+3)%4;
 if(button==="RIGHT"||button==="DOWN")selectedPiece=(selectedPiece+1)%4;
 if(button==="A"||button==="START"){if(!die&&isHuman()&&!settling)rolled();else if(die)select(selectedPiece);}
 render();
});
reset();
})();
