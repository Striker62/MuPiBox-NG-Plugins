// Original MuPiBox Community game implementation. MIT (see LICENSE.txt).
const Reversi = (() => {
 const dirs=[-1,0,1].flatMap(y=>[-1,0,1].filter(x=>x||y).map(x=>[x,y]));
 function initial(){const b=Array(64).fill(0);b[27]=2;b[28]=1;b[35]=1;b[36]=2;return b;}
 function flips(b,p,i){if(b[i])return [];const x=i%8,y=Math.floor(i/8),found=[];
  for(const [dx,dy] of dirs){let xx=x+dx,yy=y+dy,seen=[];while(xx>=0&&xx<8&&yy>=0&&yy<8&&b[yy*8+xx]===3-p){seen.push(yy*8+xx);xx+=dx;yy+=dy;}
  if(seen.length&&xx>=0&&xx<8&&yy>=0&&yy<8&&b[yy*8+xx]===p)found.push(...seen);}
  return found;
 }
 function legal(b,p){const m=[];for(let i=0;i<64;i++){const f=flips(b,p,i);if(f.length)m.push({at:i,flips:f});}return m;}
 function apply(b,p,m){const out=b.slice();out[m.at]=p;for(const i of m.flips)out[i]=p;return out;}
 function evaluation(b,p){const weights=[100,-22,18,8,8,18,-22,100,-22,-40,-3,-3,-3,-3,-40,-22,18,-3,12,3,3,12,-3,18,8,-3,3,1,1,3,-3,8,8,-3,3,1,1,3,-3,8,18,-3,12,3,3,12,-3,18,-22,-40,-3,-3,-3,-3,-40,-22,100,-22,18,8,8,18,-22,100];let sum=0;for(let i=0;i<64;i++)if(b[i])sum+=(b[i]===p?1:-1)*(weights[i]+2);return sum;}
 function search(b,p,depth,original,alpha=-Infinity,beta=Infinity){
  const moves=legal(b,p);
  if(depth<=0||(!moves.length&&!legal(b,3-p).length))return evaluation(b,original)+((b.filter(v=>v===original).length-b.filter(v=>v===3-original).length)*3);
  if(!moves.length)return search(b,3-p,depth-1,original,alpha,beta);
  const maximize=p===original;
  let best=maximize?-Infinity:Infinity;
  for(const m of moves){const s=search(apply(b,p,m),3-p,depth-1,original,alpha,beta);best=maximize?Math.max(best,s):Math.min(best,s);if(maximize)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);if(beta<=alpha)break;}
  return best;
 }
 function choose(b,p,difficulty){
  const moves=legal(b,p);if(!moves.length)return null;
  if(difficulty==="easy")return moves[Math.floor(Math.random()*moves.length)];
  const scored=moves.map(m=>({m,value:difficulty==="medium"?evaluation(apply(b,p,m),p)+m.flips.length*2:search(apply(b,p,m),3-p,3,p)}));
  scored.sort((a,b)=>b.value-a.value);
  return difficulty==="medium"&&Math.random()<.25?scored[Math.floor(Math.random()*Math.min(3,scored.length))].m:scored[0].m;
 }
 return {initial,flips,legal,apply,choose,evaluation};
})();
if(typeof module!=="undefined")module.exports=Reversi;
if(typeof document!=="undefined")(()=>{
 const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id);
 let board=Reversi.initial(),turn=1,ended=false,selected=19,thinking=false,runID=0;
 const grid=$("board");grid.style.display="grid";grid.style.gridTemplateColumns="repeat(8,1fr)";grid.style.gridTemplateRows="repeat(8,1fr)";grid.style.padding="5px";grid.style.gap="2px";
 const squares=[];
 for(let i=0;i<64;i++){const btn=document.createElement("button");btn.className="cell";btn.style.cssText="position:relative;min-width:0;min-height:0;padding:0;background:#2b7762;border:1px solid #1c473f;border-radius:3px";btn.onclick=()=>place(i);squares.push(btn);grid.append(btn);}
 const label=p=>p===1?"Dunkel":"Hell";
 function status(t){$("status").textContent=t}
 function draw(){
  const allowed=Reversi.legal(board,turn);const choices=new Set(allowed.map(m=>m.at));
  squares.forEach((el,i)=>{el.replaceChildren();const v=board[i];
   if(v){const disk=document.createElement("span");disk.style.cssText="display:block;width:80%;height:80%;margin:10%;border-radius:50%;box-shadow:0 2px 4px #0009;background:"+(v===1?"#142032":"#e8f1e8");el.append(disk)}
   else if(choices.has(i)&&!ended){const mark=document.createElement("span");mark.style.cssText="display:block;margin:auto;width:24%;height:24%;border-radius:50%;background:#a1ddb2aa";el.append(mark)}
   el.style.outline=selected===i?"2px solid #ffda6d":"none";el.setAttribute("aria-label","Feld "+(Math.floor(i/8)+1)+","+(i%8+1)+(v?" "+label(v):choices.has(i)?" möglich":" frei"));
  });
  const dark=board.filter(x=>x===1).length,light=board.filter(x=>x===2).length;
  $("score").textContent="Dunkel "+dark+"  ·  Hell "+light;
  $("turn").textContent=ended?"Spiel beendet":label(turn)+" am Zug";
 }
 function afterMove(){
  const own=Reversi.legal(board,3-turn),back=Reversi.legal(board,turn);
  if(!own.length&&!back.length){ended=true;const a=board.filter(v=>v===1).length,b=board.filter(v=>v===2).length;status(a===b?"Unentschieden!":(a>b?"Dunkel":"Hell")+" gewinnt!");draw();return;}
  if(own.length){turn=3-turn;status(label(turn)+" ist am Zug.")}
  else status(label(3-turn)+" muss aussetzen – "+label(turn)+" spielt erneut.");
  draw();aiTurn();
 }
 function place(i){if(ended||thinking||($("mode").value!=="human"&&turn===2))return;const move=Reversi.legal(board,turn).find(m=>m.at===i);if(!move){status("Wähle ein markiertes Feld.");return}board=Reversi.apply(board,turn,move);afterMove();}
 function aiTurn(){if(ended||turn!==2||$("mode").value==="human")return;thinking=true;const id=++runID;status("MuPi denkt …");
  setTimeout(()=>{if(id!==runID)return;const m=Reversi.choose(board,2,$("mode").value);thinking=false;if(m){board=Reversi.apply(board,2,m);afterMove();}else{turn=1;draw();}},250);
 }
 function restart(){runID++;thinking=false;board=Reversi.initial();turn=1;ended=false;selected=19;status("Dunkel beginnt. Leuchtende Felder sind erlaubt.");draw();}
 $("restart").onclick=restart;$("mode").onchange=restart;$("exit").onclick=()=>{runID++;sdk.exit()};
 sdk.on("input",({button,action})=>{if(action!=="press")return;if(button==="BACK"){runID++;sdk.exit();return}
 const changes={LEFT:-1,RIGHT:1,UP:-8,DOWN:8};if(button in changes){selected=(selected+changes[button]+64)%64;draw()}if(button==="A"||button==="START")place(selected);});
 restart();
})();
