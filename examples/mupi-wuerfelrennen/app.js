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
  // Die eigene Startposition darf nicht unnötig besetzt bleiben.
  const clearStart=moves.filter(m=>b[p][m.piece]===0);
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
 function apply(b,p,m){const out=b.map(row=>row.slice());out[p][m.piece]=m.to;for(const c of m.captured)out[c.player][c.piece]=-1;return out;}
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
const staticLayer=document.createElementNS(NS,"g"),highlightLayer=document.createElementNS(NS,"g"),pieceLayer=document.createElementNS(NS,"g");
svg.append(staticLayer,highlightLayer,pieceLayer);
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
const lane=(p,j)=>{
 const [x,y]=corners[p];
 const xx=x===0?1:-1,yy=y===0?1:-1,delta=122+j*16;
 return [OFFSET+x*CELL+xx*delta,OFFSET+y*CELL+yy*delta];
};
const base=(p,j)=>{
 const [x,y]=corners[p];
 const xx=x===0?1:-1,yy=y===0?1:-1;
 return [OFFSET+x*CELL+xx*(54+(j%2)*30),OFFSET+y*CELL+yy*(54+Math.floor(j/2)*30)];
};
const S=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const defs=S("defs");svg.insertBefore(defs,staticLayer);
function gradient(id,top,bottom){
 const g=S("linearGradient",{id,x1:"0%",y1:"0%",x2:"15%",y2:"100%"});
 g.append(S("stop",{offset:"0%","stop-color":top}),S("stop",{offset:"100%","stop-color":bottom}));
 defs.append(g);
}
gradient("trackA","#4f91b1","#195474");
gradient("trackB","#4383a5","#123f62");
gradient("centerGold","#28677b","#092739");
gradient("mupiFace","#ffdb95","#f38b37");
const shiny=["#ffc0c6","#fff4a9","#83ffdf","#c4cbff"];
const shaded=["#de3b57","#d89a22","#079c86","#5368e2"];
for(let p=0;p<4;p++)gradient("piece"+p,shiny[p],shaded[p]);
for(let i=0;i<52;i++){
 const [x,y]=pos(i),owner=DiceRace.starts.indexOf(i);
 const r=S("rect",{x:x-14.8,y:y-14.8,width:29.6,height:29.6,rx:5.8,fill:owner>=0?DiceRace.palette[owner]:i%2?"url(#trackA)":"url(#trackB)",stroke:owner>=0?"#fff2bd":"#a6d4e7","stroke-width":1.5});
 staticLayer.append(r);
 staticLayer.append(S("path",{d:"M"+(x-10)+" "+(y-10)+"h20",stroke:"#e5faff","stroke-width":1.5,opacity:.36,"stroke-linecap":"round","pointer-events":"none"}));
}
for(let p=0;p<4;p++){
 for(let j=0;j<4;j++){
  const [x,y]=lane(p,j);
  staticLayer.append(S("rect",{x:x-14,y:y-14,width:28,height:28,rx:6,fill:DiceRace.palette[p],opacity:.78,stroke:"#effbff","stroke-width":1.65}));
  staticLayer.append(S("path",{d:"M"+(x-9)+" "+(y-10)+"h18",stroke:"#fff",opacity:.24,"stroke-width":1.6,"stroke-linecap":"round","pointer-events":"none"}));
  const [bx,by]=base(p,j);
  staticLayer.append(S("circle",{cx:bx,cy:by,r:15.5,fill:"#081f30",stroke:DiceRace.palette[p],"stroke-width":2.8,opacity:1}));
 }
}
// Compact, vector-drawn orange MuPi emblem; everything stays inside its round medallion.
const badge=S("g",{transform:"translate("+WIDTH/2+" "+WIDTH/2+")","pointer-events":"none"});
badge.append(S("circle",{r:36,fill:"#e5af4e",opacity:.15}));
badge.append(S("circle",{r:34,fill:"#061b2b",stroke:"#a66a28","stroke-width":1.8}));
badge.append(S("circle",{r:31.3,fill:"url(#centerGold)",stroke:"#ffdc89","stroke-width":2.4}));
badge.append(S("circle",{r:28.6,fill:"none",stroke:"#80c8ca","stroke-width":.85,opacity:.7}));
const inner=S("g");
const clip=S("clipPath",{id:"mupi-badge-clip"});
clip.append(S("circle",{r:29}));
defs.append(clip);
inner.setAttribute("clip-path","url(#mupi-badge-clip)");
for(const sign of [-1,1]){
 const flip=S("g",{transform:"scale("+sign+" 1)"});
 // Exactly three orange, branching gill stalks per side.
 for(const d of ["M12 -16 Q17 -20 22 -20","M13 -11 Q19 -12 24 -11","M12 -6 Q18 -2 22 -1"]){
  flip.append(S("path",{d,fill:"none",stroke:"#f78964","stroke-width":3.5,"stroke-linecap":"round"}));
 }
 for(const [x,y] of [[22,-20],[24,-11],[22,-1]]){
  flip.append(S("ellipse",{cx:x,cy:y,rx:3.1,ry:3.6,fill:"#ffaf83",stroke:"#c45f40","stroke-width":.8}));
 }
 inner.append(flip);
}
inner.append(S("ellipse",{cx:0,cy:-11,rx:14.7,ry:13.8,fill:"url(#mupiFace)",stroke:"#ffe5a9","stroke-width":1.2}));
inner.append(S("ellipse",{cx:-5.5,cy:-19,rx:5.1,ry:2.8,fill:"#fff4c7",opacity:.5,transform:"rotate(-16 -5.5 -19)"}));
for(const x of [-5.3,5.3]){
 inner.append(S("circle",{cx:x,cy:-12,r:2.1,fill:"#183343"}));
 inner.append(S("circle",{cx:x-.6,cy:-12.9,r:.65,fill:"#ffffff"}));
 inner.append(S("ellipse",{cx:x*1.76,cy:-6.9,rx:2.5,ry:1.45,fill:"#ee765b",opacity:.52}));
}
inner.append(S("path",{d:"M-4.1 -5 Q0 -1.5 4.1 -5",fill:"none",stroke:"#543728","stroke-width":1.55,"stroke-linecap":"round"}));
inner.append(S("path",{d:"M-16 9 Q0 6 16 9",fill:"none",stroke:"#f6c975","stroke-width":1.1,opacity:.65}));
const centerLabel=S("text",{x:0,y:21,"text-anchor":"middle","font-family":"system-ui, sans-serif","font-size":15.5,"letter-spacing":-.55,fill:"#fff1bb","font-weight":900,stroke:"#06253b","stroke-width":.8,"paint-order":"stroke fill"});
centerLabel.textContent="MuPi";inner.append(centerLabel);
badge.append(inner);staticLayer.append(badge);
let b,players=4,human=1,turn=0,die=0,ended=false,epoch=0,selectedPiece=0,aiTimer=0,attempts=0,maxAttempts=3;
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
  const show=p===turn&&k===selectedPiece;
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
 $("attempts").textContent=ended?"Sieg":die?"Zug wählen":maxAttempts===3?"Wurf "+Math.min(attempts+1,3)+"/3":"Dein Zug";
 $("dice").textContent=die?faces[die-1]:"⚄";
 $("roll").disabled=ended||!isHuman()||die>0;
 for(let k=0;k<4;k++){
  const btn=pieceButtons[k];btn.disabled=ended||!isHuman()||!playable.has(k);
  btn.classList.toggle("active",selectedPiece===k&&playable.has(k)&&isHuman()&&!ended);
 }
}
function finishMove(m){
 b=DiceRace.apply(b,turn,m);
 const face=die;
 status(names[turn]+" zieht Stein "+(m.piece+1)+(m.captured.length?" – rausgeworfen!":""));
 if(b[turn].every(v=>v>=52)){ended=true;die=0;status(names[turn]+" GEWINNT!");render();return;}
 if(face===6){
  attempts=0;maxAttempts=DiceRace.rollLimit(b,turn);die=0;
  status(names[turn]+" hat eine Sechs – Extrawurf!");
  render();computer();
 }else next();
}
function select(k,p=turn){
 selectedPiece=k;if(p!==turn||ended||!isHuman()||!die){render();return;}
 const m=DiceRace.possible(b,turn,die).find(m=>m.piece===k);
 if(!m){status("Figur "+(k+1)+" kann mit "+die+" nicht ziehen.");render();return;}
 finishMove(m);
}
function next(){
 die=0;const list=active();turn=list[(list.indexOf(turn)+1)%list.length];
 attempts=0;maxAttempts=DiceRace.rollLimit(b,turn);selectedPiece=0;
 status(names[turn]+" ist dran."+(maxAttempts===3?" Drei Wurfversuche.":""));
 render();computer();
}
function rolled(){
 if(ended||die)return;
 attempts++;
 die=1+Math.floor(Math.random()*6);
 const ms=DiceRace.possible(b,turn,die);
 if(ms.length&&!ms.some(m=>m.piece===selectedPiece))selectedPiece=ms[0].piece;
 const forcedExit=die===6&&ms.length&&ms.every(m=>b[turn][m.piece]===-1);
 const mustClear=ms.length&&ms.every(m=>b[turn][m.piece]===0);
 status(forcedExit?"Sechs! Eine Figur zieht aus dem Haus.":mustClear?
  "Startfeld freimachen: Figur "+(ms[0].piece+1)+" ziehen.":names[turn]+" würfelt "+die+".");
 const diceEl=$("dice");diceEl.classList.remove("roll");void diceEl.offsetWidth;diceEl.classList.add("roll");
 render();
 if(!ms.length){
  const id=epoch;aiTimer=setTimeout(()=>{
   if(id!==epoch||ended)return;
   die=0;
   if(attempts<maxAttempts){
    status("Kein Zug möglich – nächster Versuch ("+(attempts+1)+"/"+maxAttempts+").");
    render();computer();
   }else{status("Kein Zug möglich – nächster Spieler.");next();}
  },300);
 }else if(forcedExit){
  // Alle Basisfiguren sind gleichwertig: automatische Pflichtausfahrt.
  const id=epoch;aiTimer=setTimeout(()=>{
   if(id!==epoch||ended||die!==6)return;finishMove(ms[0]);
  },260);
 }else if(!isHuman()){
  const id=epoch;aiTimer=setTimeout(()=>{if(id!==epoch||ended)return;
   const move=DiceRace.choose(b,turn,die,$("difficulty").value);if(move)finishMove(move);
  },220);
 }
}
function computer(){
 if(!ended&&!isHuman()&&!die){
  const id=epoch;aiTimer=setTimeout(()=>{if(id===epoch)rolled();},160);
 }
}
function reset(){
 epoch++;clearTimeout(aiTimer);
 players=+ $("playercount").value;human=Math.min(+ $("human").value,players);$("human").value=human;
 b=DiceRace.state(players);turn=active()[0];die=0;ended=false;selectedPiece=0;
 attempts=0;maxAttempts=DiceRace.rollLimit(b,turn);
 status("Du hast drei Versuche, eine Sechs zu würfeln.");render();computer();
}
$("roll").onclick=()=>{if(isHuman()&&!die)rolled();};
$("restart").onclick=reset;
for(const id of ["playercount","human","difficulty"])$(id).onchange=reset;
$("exit").onclick=()=>{epoch++;clearTimeout(aiTimer);sdk.exit();};
sdk.on("lifecycle.pause",()=>{epoch++;clearTimeout(aiTimer);});
sdk.on("input",({button,action})=>{
 if(action!=="press")return;
 if(button==="BACK"){epoch++;clearTimeout(aiTimer);sdk.exit();return;}
 if(button==="LEFT"||button==="UP")selectedPiece=(selectedPiece+3)%4;
 if(button==="RIGHT"||button==="DOWN")selectedPiece=(selectedPiece+1)%4;
 if(button==="A"||button==="START"){if(!die&&isHuman())rolled();else if(die)select(selectedPiece);}
 render();
});
reset();
})();
