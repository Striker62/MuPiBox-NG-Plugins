// MuPi Hnefatafl – independently developed 11x11 Fetlar-inspired beginner variant.
// Rook movement, custodial captures, hostile corners/throne, four-sided king
// capture, corner escape. Advanced shieldwalls/exit-forts are intentionally
// excluded and explicitly documented as variant differences.
const Tafl=(()=>{
"use strict";
const N=11,CENTER=60,DIRS=[[1,0],[-1,0],[0,1],[0,-1]],CORNERS=[0,10,110,120];
const at=(r,c)=>r*N+c, rc=i=>[Math.floor(i/N),i%N];
const inside=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
const side=p=>p==="A"?"A":p==="D"||p==="K"?"D":null;
const isCorner=i=>CORNERS.includes(i);
const isHostile=(b,i,victim)=>{
 if(isCorner(i))return true;
 if(i!==CENTER)return false;
 return victim==="A"||b[CENTER]===".";
};
function initial(){
 const b=Array(121).fill(".");
 for(let i=3;i<=7;i++){
  b[at(0,i)]="A";b[at(10,i)]="A";b[at(i,0)]="A";b[at(i,10)]="A";
 }
 for(const [r,c] of [[1,5],[9,5],[5,1],[5,9]])b[at(r,c)]="A";
 for(const [r,c] of [[5,3],[5,4],[5,6],[5,7],[3,5],[4,5],[6,5],[7,5],[4,4],[4,6],[6,4],[6,6]])b[at(r,c)]="D";
 b[CENTER]="K";
 return {b,turn:"A",winner:null,ply:0,idle:0,repetitions:[],last:null};
}
function legal(s,from=-1){
 if(s.winner)return [];
 const arr=[],b=s.b;
 for(let f=0;f<121;f++){
  if(from!==-1&&from!==f)continue;
  const p=b[f];
  if(side(p)!==s.turn)continue;
  const [r,c]=rc(f);
  for(const [dr,dc] of DIRS){
   for(let k=1;k<N;k++){
    const rr=r+dr*k,cc=c+dc*k;
    if(!inside(rr,cc))break;
    const t=at(rr,cc);
    if(b[t]!==".")break;
    if(p==="K"||(!isCorner(t)&&t!==CENTER))arr.push({from:f,to:t});
    // Ordinary pieces may cross the EMPTY throne but never land on it.
    // Corners cannot be crossed because they occur at board edges.
   }
  }
 }
 return arr;
}
const key=s=>s.b.join("")+":"+s.turn;
function isKingCaptured(b){
 const k=b.indexOf("K");if(k===-1)return true;
 const [r,c]=rc(k);
 // Edge king cannot be captured by ordinary four-sided custodial capture.
 if(r===0||c===0||r===10||c===10)return false;
 return DIRS.every(([dr,dc])=>{
  const i=at(r+dr,c+dc);
  return b[i]==="A"||(i===CENTER && b[CENTER]===".");
 });
}
function apply(s,m,fast=false){
 const f=m.from,t=m.to,p=s.b[f],b=s.b.slice(),turn=side(p);
 if(turn!==s.turn||b[t]!=="."||f===t)throw Error("Invalid Tafl move");
 const [r,c]=rc(f),[tr,tc]=rc(t);
 if(r!==tr&&c!==tc)throw Error("Diagonal Tafl move");
 if(p!=="K"&&(isCorner(t)||t===CENTER))throw Error("Restricted square");
 const dr=Math.sign(tr-r),dc=Math.sign(tc-c);
 for(let rr=r+dr,cc=c+dc;rr!==tr||cc!==tc;rr+=dr,cc+=dc){
  if(b[at(rr,cc)]!==".")throw Error("Blocked Tafl move");
 }
 b[f]=".";b[t]=p;
 let captures=0;
 for(const [dr,dc]of DIRS){
  const nr=tr+dr,nc=tc+dc,br=tr+dr*2,bc=tc+dc*2;
  if(!inside(nr,nc)||!inside(br,bc))continue;
  const near=at(nr,nc),far=at(br,bc),v=b[near],victim=side(v);
  if(!victim||victim===turn||v==="K")continue;
  if(side(b[far])===turn||isHostile(b,far,victim)){b[near]=".";captures++;}
 }
 let winner=null;
 if(p==="K"&&isCorner(t))winner="D";
 if(turn==="A"&&isKingCaptured(b))winner="A";
 const idle=captures===0?s.idle+1:0;
 const next={b,turn:turn==="A"?"D":"A",winner,ply:s.ply+1,idle,last:{from:f,to:t,captures},repetitions:fast?[]:s.repetitions.slice()};
 if(!fast && !next.winner){
  const k=key(next);next.repetitions.push(k);
  if(next.repetitions.filter(x=>x===k).length>=3||idle>=160)next.winner="draw";
  else if(!legal(next).length)next.winner=turn;
 }
 return next;
}
function evaluate(s,perspective){
 if(s.winner)return s.winner==="draw"?0:s.winner===perspective?100000:-100000;
 let aa=0,dd=0,k=60;
 for(let i=0;i<121;i++){
  if(s.b[i]==="A")aa++;
  else if(s.b[i]==="D")dd++;
  else if(s.b[i]==="K")k=i;
 }
 const [r,c]=rc(k),cornerDist=Math.min(r+c,r+(10-c),(10-r)+c,(10-r)+(10-c));
 let threat=0;
 for(const [dr,dc] of DIRS){
  if(inside(r+dr,c+dc)&&s.b[at(r+dr,c+dc)]==="A")threat++;
 }
 const attack=(12-dd)*16 -(24-aa)*8 +cornerDist*3.5+threat*5;
 return perspective==="A"?attack:-attack;
}
function choose(s,level="medium",random=Math.random()){
 const ms=legal(s);
 if(!ms.length)return null;
 if(level==="easy")return ms[Math.min(ms.length-1,Math.floor(random*ms.length))];
 const player=s.turn;
 const ranked=ms.map(m=>({m,next:apply(s,m,true)}));
 for(const v of ranked)v.v=evaluate(v.next,player);
 ranked.sort((a,b)=>b.v-a.v);
 if(level==="medium")return ranked[Math.min(ranked.length-1,Math.floor(random*3))].m;
 // bounded 2-ply search: consider best first-turn candidates, all replies;
 // avoids quadratic explosion on 1 GB Pi 4 without losing simple tactical threats.
 let best=-Infinity,winner=ranked[0].m;
 for(const candidate of ranked.slice(0,Math.min(8,ranked.length))){
  if(candidate.next.winner===player)return candidate.m;
  const replies=legal(candidate.next);
  let worst=Infinity;
  for(const reply of replies){
    const v=evaluate(apply(candidate.next,reply,true),player);
    if(v<worst)worst=v;
    if(worst<=best-2)break;
  }
  const value=(replies.length?worst:candidate.v)+candidate.v*.05;
  if(value>best){best=value;winner=candidate.m;}
 }
 return winner;
}
return {N,CENTER,CORNERS,initial,legal,apply,choose,evaluate,key,isKingCaptured};
})();
if(typeof module!=="undefined")module.exports=Tafl;
if(typeof document!=="undefined")(()=>{
"use strict";
const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id),svg=$("board"),NS="http://www.w3.org/2000/svg";
let s=Tafl.initial(),history=[s],selected=-1,cursor=60,epoch=0,aiTimer=0,exit=false;
const el=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const base=document.createElementNS(NS,"g"),highlights=document.createElementNS(NS,"g"),pieces=document.createElementNS(NS,"g");
svg.append(base,highlights,pieces);
const label={A:"Angreifer",D:"Verteidiger",draw:"Unentschieden"};
const human=()=> $("mode").value==="local"||s.turn!==($("mode").value==="attack"?"A":"D");
const active=()=>!exit&&!s.winner&&human();
const cell=i=>[22+(i%11)*36,22+Math.floor(i/11)*36];
for(let i=0;i<121;i++){
 const [x,y]=cell(i),isSpecial=Tafl.CORNERS.includes(i),isCenter=i===Tafl.CENTER;
 const rect=el("rect",{x,y,width:36,height:36,fill:isSpecial?"#d4a64e":isCenter?"#e1bd70":(Math.floor(i/11)+i%11)%2?"#d7b98a":"#f0d5a1",stroke:"#75573c","stroke-width":.65});
 rect.classList.add("square");rect.addEventListener("click",()=>click(i));base.append(rect);
 if(isSpecial||isCenter){
  const marker=el("text",{x:x+18,y:y+24,"text-anchor":"middle","font-size":23,fill:"#916539","pointer-events":"none"});
  marker.textContent=isCenter?"✦":"◆";base.append(marker);
 }
}
function click(i){
 cursor=i;
 if(!active())return;
 if(s.b[i]!=="."&&((s.turn==="A"&&s.b[i]==="A")||(s.turn==="D"&&"DK".includes(s.b[i])))){
  selected=selected===i?-1:i;render();return;
 }
 const m=Tafl.legal(s,selected).find(v=>v.to===i);
 if(m)move(m);else{selected=-1;render();}
}
function move(m){
 if(s.winner)return;
 try{s=Tafl.apply(s,m);}catch(e){$("status").textContent=e.message;return;}
 history.push(s);selected=-1;render();scheduleAI();
}
function render(){
 highlights.replaceChildren();pieces.replaceChildren();
 if(selected>=0){
  const [x,y]=cell(selected);
  highlights.append(el("rect",{x:x+1,y:y+1,width:34,height:34,fill:"#fff07c",opacity:.48,"pointer-events":"none"}));
  for(const m of Tafl.legal(s,selected)){
   const [dx,dy]=cell(m.to);
   highlights.append(el("circle",{cx:dx+18,cy:dy+18,r:11,fill:"#45d9a7",opacity:.65,"pointer-events":"none"}));
  }
 }
 for(let i=0;i<121;i++){
  const p=s.b[i];if(p===".")continue;
  const [x,y]=cell(i),cx=x+18,cy=y+18;
  const g=el("g",{"class":"piece"});g.style.cursor="pointer";g.addEventListener("click",()=>click(i));
  const fill=p==="A"?"#32445c":p==="K"?"#ffc868":"#f7e5c2",stroke=p==="A"?"#101d35":"#9b682f";
  g.append(el("circle",{cx,cy,r:14,fill,stroke,"stroke-width":2.8}));
  if(p==="K"){
   const t=el("text",{x:cx,y:cy+6,"font-size":20,"text-anchor":"middle",fill:"#694119","font-weight":"bold","pointer-events":"none"});t.textContent="♛";g.append(t);
  }else {
   g.append(el("circle",{cx:cx-4,cy:cy-5,r:4,fill:p==="A"?"#739bb8":"#fff4de","pointer-events":"none"}));
  }
  pieces.append(g);
 }
 const [cx,cy]=cell(cursor);
 highlights.append(el("rect",{x:cx+2,y:cy+2,width:32,height:32,fill:"none",stroke:"#fff","stroke-width":2,opacity:.8,"pointer-events":"none"}));
 $("turn").textContent=s.winner? s.winner==="draw"?"Unentschieden":label[s.winner]+" gewinnen!":label[s.turn]+" sind dran"+(human()?"":" · MuPi");
 const defenders=s.b.filter(p=>p==="D").length,attackers=s.b.filter(p=>p==="A").length;
 $("stats").textContent="Angreifer "+attackers+"/24 · Verteidiger "+defenders+"/12 · Zug "+s.ply;
 $("status").textContent=s.winner?s.winner==="D"?"Der König ist entkommen!":s.winner==="A"?"Der König ist gefangen!":"Dreifache Stellung oder 160 Züge ohne Schlag.":s.last&&s.last.captures?s.last.captures+" Figur(en) geschlagen.":"Figur auswählen, Ziel antippen.";
 $("undo").disabled=history.length===1;
}
function scheduleAI(){
 clearTimeout(aiTimer);
 if(exit||s.winner||human())return;
 const own=++epoch;
 aiTimer=setTimeout(()=>{
  if(own!==epoch||exit||s.winner||human())return;
  const m=Tafl.choose(s,$("difficulty").value);
  if(m)move(m);
 },130);
}
function reset(){
 epoch++;clearTimeout(aiTimer);s=Tafl.initial();history=[s];selected=-1;cursor=60;render();scheduleAI();
}
$("restart").onclick=reset;
$("mode").onchange=reset;
$("difficulty").onchange=reset;
$("undo").onclick=()=>{
 if(history.length<=1)return;
 epoch++;clearTimeout(aiTimer);
 history.pop();
 if($("mode").value!=="local"&&history.length>1&&!human())history.pop();
 s=history[history.length-1];selected=-1;render();scheduleAI();
};
$("exit").onclick=()=>{exit=true;epoch++;clearTimeout(aiTimer);sdk.exit();};
sdk.on("input",({button,action})=>{
 if(action!=="press")return;
 if(button==="BACK"){exit=true;epoch++;clearTimeout(aiTimer);sdk.exit();return;}
 if(button==="B"){selected=-1;render();return;}
 if(button==="START"){reset();return;}
 const r=Math.floor(cursor/11),c=cursor%11;
 if(button==="LEFT")cursor=r*11+Math.max(c-1,0);
 if(button==="RIGHT")cursor=r*11+Math.min(c+1,10);
 if(button==="UP")cursor=Math.max(r-1,0)*11+c;
 if(button==="DOWN")cursor=Math.min(r+1,10)*11+c;
 if(button==="A")click(cursor);else render();
});
sdk.on("lifecycle.pause",()=>{epoch++;clearTimeout(aiTimer);});
render();
})();
