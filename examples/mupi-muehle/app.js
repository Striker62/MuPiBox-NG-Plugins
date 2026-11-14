// MuPi Mühlenmeister: independent Nine Men's Morris implementation. MIT.
const Mill = (() => {
 const points=[];
 for(const r of [22,76,130]){
  const hi=400-r,mid=211;
  points.push([r,r],[mid,r],[hi,r],[hi,mid],[hi,hi],[mid,hi],[r,hi],[r,mid]);
 }
 const mills=[];
 const neighbors=Array.from({length:24},()=>[]);
 function edge(a,b){if(!neighbors[a].includes(b))neighbors[a].push(b);if(!neighbors[b].includes(a))neighbors[b].push(a)}
 for(let s=0;s<3;s++){const off=s*8;
  for(let i=0;i<8;i++)edge(off+i,off+(i+1)%8);
  for(const a of [[0,1,2],[2,3,4],[4,5,6],[6,7,0]])mills.push(a.map(x=>off+x));
 }
 for(const i of [1,3,5,7]){edge(i,8+i);edge(8+i,16+i);mills.push([i,8+i,16+i]);}
 function inMill(b,p,i){return mills.some(m=>m.includes(i)&&m.every(j=>b[j]===p));}
 function captures(b,p){const opponent=3-p,stones=b.map((v,i)=>v===opponent?i:-1).filter(i=>i>=0);const outside=stones.filter(i=>!inMill(b,opponent,i));return outside.length?outside:stones;}
 function options(b,stock,p){const free=b.map((v,i)=>v? -1:i).filter(i=>i>=0);
  if(stock[p]>0)return free.map(to=>({from:-1,to}));
  const pieces=b.map((v,i)=>v===p?i:-1).filter(i=>i>=0);
  const fly=pieces.length===3;
  return pieces.flatMap(from=>(fly?free:neighbors[from].filter(i=>!b[i])).map(to=>({from,to})));
 }
 function projected(b,stock,p,move){
  const next=b.slice();if(move.from>=0)next[move.from]=0;next[move.to]=p;
  return {b:next,mill:inMill(next,p,move.to),stock:stock[p]>0?stock[p]-1:0};
 }
 function evaluate(b,stock,p){let val=0,op=3-p;
  for(const m of mills){let own=m.filter(i=>b[i]===p).length,other=m.filter(i=>b[i]===op).length;
   if(own===3)val+=12;if(other===3)val-=12;
   if(own===2&&!other)val+=5;if(other===2&&!own)val-=6;
  }
  val+=12*(b.filter(x=>x===p).length-b.filter(x=>x===op).length);
  if(stock[p]===0&&b.filter(x=>x===p).length===3)val+=3;
  return val;
 }
 function choose(b,stock,p,level){
  const moves=options(b,stock,p);if(!moves.length)return null;
  if(level==="easy")return moves[Math.floor(Math.random()*moves.length)];
  const opponent=3-p;
  const ranked=moves.map(m=>{
   const after=projected(b,stock,p,m),nextStock=[0,stock[1],stock[2]];nextStock[p]=after.stock;
   let b2=after.b;let score=0;
   if(after.mill){const choices=captures(b2,p);score+=40;if(choices.length){let best=-Infinity;
     for(const c of choices){const clone=after.b.slice();clone[c]=0;const v=evaluate(clone,nextStock,p);if(v>best){best=v;b2=clone;}}
   }}
   score+=evaluate(b2,nextStock,p);
   if(level==="hard"){const counters=options(b2,nextStock,opponent);let danger=0;
    for(const counter of counters){const reply=projected(b2,nextStock,opponent,counter);if(reply.mill)danger=Math.max(danger,35);
      else danger=Math.max(danger,Math.max(0,evaluate(reply.b,[0,nextStock[1],nextStock[2]],opponent)/5));}
    score-=danger;
   }
   return {m,score:score+Math.random()*(level==="medium"?5:1)};
  });
  ranked.sort((a,b)=>b.score-a.score);return ranked[0].m;
 }
 return {points,mills,neighbors,inMill,captures,options,projected,evaluate,choose};
})();
if(typeof module!=="undefined")module.exports=Mill;
if(typeof document!=="undefined")(()=>{
 const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id);
 let board,stock,turn,selected,pending,finished,movesWithoutMill,aiBusy=false,epoch=0,cursor=0;
 const NS="http://www.w3.org/2000/svg", svg=document.createElementNS(NS,"svg");svg.setAttribute("viewBox","0 0 422 422");$("board").append(svg);
 function node(type,attrs){const n=document.createElementNS(NS,type);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n}
 function name(p){return p===1?"Türkis":"Gold"}
 function count(p){return board.filter(v=>v===p).length}
 function hasPieces(p){return stock[p]>0||count(p)>=3}
 function complete(p){return stock[p]===0&&stock[3-p]===0}
 function update(){
  svg.replaceChildren();for(const r of [22,76,130])svg.append(node("rect",{x:r,y:r,width:400-2*r,height:400-2*r,fill:"none",stroke:"#8cb6d1","stroke-width":4}));
  for(const k of [1,3,5,7]){let [x,y]=Mill.points[k],a=Mill.points[16+k];svg.append(node("line",{x1:x,y1:y,x2:a[0],y2:a[1],stroke:"#8cb6d1","stroke-width":4}))}
  const opts=Mill.options(board,stock,turn);
  const targets=selected>=0?opts.filter(m=>m.from===selected).map(m=>m.to):[];
  const captureSet=pending?new Set(Mill.captures(board,turn)) : new Set();
  Mill.points.forEach(([x,y],i)=>{
   const circle=node("circle",{cx:x,cy:y,r:board[i]?17:11,fill:board[i]===1?"#22b8aa":board[i]===2?"#f5c35d":"#142b43",stroke:captureSet.has(i)?"#fb6077":(i===cursor||i===selected)?"#fff4a2":targets.includes(i)?"#6df1bc":"#93b8d5","stroke-width":i===cursor||captureSet.has(i)?5:3});
   circle.style.pointerEvents="none";svg.append(circle);
   // Visual stones are 34px; invisible 48px hit targets suit 800x480 touch.
   const hit=node("circle",{cx:x,cy:y,r:24,fill:"transparent",stroke:"none"});
   hit.style.cursor="pointer";hit.setAttribute("aria-label","Mühle Punkt "+(i+1));
   hit.addEventListener("click",()=>pick(i));svg.append(hit);
  });
  $("turn").textContent=finished?"Beendet":name(turn)+" am Zug";
  $("score").textContent="Türkis: "+count(1)+" (Vorrat "+stock[1]+") · Gold: "+count(2)+" (Vorrat "+stock[2]+")";
 }
 function status(s){$("status").textContent=s;}
 function finish(){if(!complete(turn))return false;const other=3-turn;
   if(count(other)<3){finished=true;status(name(turn)+" gewinnt!");return true;}
   if(!Mill.options(board,stock,other).length){finished=true;status(name(turn)+" gewinnt – Gegner blockiert!");return true;}
   if(movesWithoutMill>=100){finished=true;status("Unentschieden nach 100 Zügen ohne Mühle.");return true;}
   return false;
 }
 function next(){selected=-1;if(!finish()){turn=3-turn;status(name(turn)+" am Zug.");}update();aiTurn();}
 function remove(i){if(!pending||!Mill.captures(board,turn).includes(i))return;
  board[i]=0;pending=false;movesWithoutMill=0;next();
 }
 function move(m){const output=Mill.projected(board,stock,turn,m);board=output.b;stock[turn]=output.stock;
  if(output.mill && Mill.captures(board,turn).length){pending=true;selected=-1;status(name(turn)+": Mühle! Entferne einen roten markierten Stein.");update();aiTurn();}
  else{movesWithoutMill++;next();}
 }
 function pick(i){if(finished||aiBusy||($("mode").value!=="human"&&turn===2))return;
  if(pending){remove(i);return;}
  const opts=Mill.options(board,stock,turn);
  if(stock[turn]>0){const m=opts.find(m=>m.to===i);if(m)move(m);return;}
  if(board[i]===turn){selected=i;status("Wähle das Ziel für deinen Stein.");update();return;}
  const m=opts.find(m=>m.from===selected&&m.to===i);
  if(m)move(m);else status("Wähle erst einen Stein und danach ein erlaubtes Ziel.");
 }
 function aiTurn(){if(finished||turn!==2||$("mode").value==="human")return;
  aiBusy=true;const current=++epoch;setTimeout(()=>{if(current!==epoch)return;aiBusy=false;
   if(pending){let choices=Mill.captures(board,2);if(choices.length)remove(choices[0]);return;}
   const m=Mill.choose(board,stock,2,$("mode").value);if(m)move(m);else{finished=true;status("Keine Züge. Türkis gewinnt.");update();}
  },220);
 }
 function reset(){epoch++;aiBusy=false;board=Array(24).fill(0);stock=[0,9,9];turn=1;selected=-1;pending=false;finished=false;movesWithoutMill=0;cursor=0;status("Setzphase: Auf leere Schnittpunkte tippen.");update();}
 $("restart").onclick=reset;$("mode").onchange=reset;$("exit").onclick=()=>{epoch++;sdk.exit()};
 sdk.on("input",({button,action})=>{if(action!=="press")return;
  if(button==="BACK"){epoch++;sdk.exit();return;}
  if(["UP","DOWN","LEFT","RIGHT"].includes(button)){const [x,y]=Mill.points[cursor];const directions={UP:[0,-1],DOWN:[0,1],LEFT:[-1,0],RIGHT:[1,0]};const [dx,dy]=directions[button];let best=Infinity,n=cursor;
   Mill.points.forEach(([xx,yy],i)=>{const dot=(xx-x)*dx+(yy-y)*dy,perp=Math.abs((xx-x)*dy-(yy-y)*dx);if(dot<=0)return;const score=dot+perp*2;if(score<best){best=score;n=i}});cursor=n;update();
  }if(button==="A"||button==="START")pick(cursor);
 });reset();
})();
