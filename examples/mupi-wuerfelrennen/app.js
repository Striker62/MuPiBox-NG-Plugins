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
 function possible(b,p,die){
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
 return {palette,starts,names,state,possible,apply,choose};
})();
if(typeof module!=="undefined")module.exports=DiceRace;
if(typeof document!=="undefined")(()=>{
 const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id);
 const toolbar=document.querySelector(".toolbar"),mode=$("mode");
 mode.parentElement.innerHTML='<label>Mitspieler <select id="playercount"><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label><label>Menschen <select id="human"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label><label>KI <select id="difficulty"><option value="easy">Leicht</option><option value="medium">Mittel</option><option value="hard">Schwer</option></select></label>';
 const board=$("board");board.style.background="#142c44";
 const SVG="http://www.w3.org/2000/svg",svg=document.createElementNS(SVG,"svg");svg.setAttribute("viewBox","0 0 420 420");board.append(svg);
 const controls=$("controls"),dice=document.createElement("div");dice.id="dice";
 const roll=document.createElement("button");roll.textContent="Würfeln";roll.className="primary";controls.append(roll);
 const pieceBox=document.createElement("div");pieceBox.className="row";controls.append(pieceBox);
 $("score").before(dice);
 let b,players,human,turn,die=0,ended=false,epoch=0,selectedPiece=0;
 const coords=i=>{const a=i*2*Math.PI/52-Math.PI/2;return [210+170*Math.cos(a),210+170*Math.sin(a)]};
 const finish=(p,i)=>{const a=p*Math.PI/2-Math.PI/2;const r=132-i*22;return [210+r*Math.cos(a),210+r*Math.sin(a)]};
 const base=(p,i)=>{const angle=p*Math.PI/2-Math.PI/4;const x=210+93*Math.cos(angle),y=210+93*Math.sin(angle);return [x+((i%2)*2-1)*15,y+(Math.floor(i/2)*2-1)*15]};
 const elem=(tag,attrs)=>{const el=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el};
 const active=()=>players===2?[0,2]:players===3?[0,1,2]:[0,1,2,3];
 const isHuman=()=>active().indexOf(turn)<human;
 function status(s){$("status").textContent=s}
 function loc(p,k){const v=b[p][k];return v<0?base(p,k):v<52?coords((DiceRace.starts[p]+v)%52):finish(p,v-52);}
 function draw(){
  svg.replaceChildren();svg.append(elem("circle",{cx:210,cy:210,r:185,fill:"#1c3851",stroke:"#5f85a4","stroke-width":3}));
  for(let i=0;i<52;i++){const [x,y]=coords(i),owner=DiceRace.starts.indexOf(i);svg.append(elem("circle",{cx:x,cy:y,r:10,fill:owner>=0?DiceRace.palette[owner]:"#325670",stroke:"#8aabc7","stroke-width":1.3}));}
  for(const p of active()){
   const angle=p*Math.PI/2-Math.PI/2, [xx,yy]=finish(p,3);
   svg.append(elem("line",{x1:210,y1:210,x2:xx,y2:yy,stroke:DiceRace.palette[p],"stroke-width":3,opacity:".6"}));
   for(let j=0;j<4;j++){let [x,y]=finish(p,j);svg.append(elem("circle",{cx:x,cy:y,r:11,fill:DiceRace.palette[p],opacity:".48",stroke:"#eee","stroke-width":1}));}
   for(let j=0;j<4;j++){let [x,y]=base(p,j);svg.append(elem("circle",{cx:x,cy:y,r:14,fill:"#12273c",stroke:DiceRace.palette[p],"stroke-width":2,opacity:".75"}));}
  }
  for(const p of active())for(let k=0;k<4;k++){
   let [x,y]=loc(p,k);
   // A small offset lets opposite pieces at the same track coordinate remain visible.
   const occupying=b[p][k]>=0&&b[p][k]<52?b.flatMap((row,q)=>row.map((v,j)=>({q,j,v}))).filter(o=>o.q!==p&&o.v>=0&&o.v<52&&(DiceRace.starts[o.q]+o.v)%52===(DiceRace.starts[p]+b[p][k])%52):[];
   if(occupying.length){x+=p%2?6:-6;y+=p%2?-6:6;}
   const circle=elem("circle",{cx:x,cy:y,r:13,fill:DiceRace.palette[p],stroke:p===turn&&k===selectedPiece?"#fff":"#0e253b","stroke-width":p===turn&&k===selectedPiece?4:2});
   circle.style.cursor="pointer";circle.addEventListener("click",()=>select(k));svg.append(circle);
   const txt=elem("text",{x,y:y+4,"text-anchor":"middle","font-size":"12","font-weight":"bold",fill:"#10253d"});txt.textContent=k+1;txt.style.pointerEvents="none";svg.append(txt);
  }
  $("turn").textContent=ended?"Ziel!":DiceRace.names[turn]+" "+(isHuman()?"(Mensch)":"(MuPi)");
  $("score").textContent=active().map(p=>DiceRace.names[p]+": "+b[p].filter(v=>v>=52).length+"/4").join(" · ");
  dice.textContent=die?"Würfel: "+die:"";
  roll.disabled=ended||!isHuman()||die>0;
  pieceBox.replaceChildren();
  const possibilities=die?DiceRace.possible(b,turn,die):[];
  for(let k=0;k<4;k++){const button=document.createElement("button");button.textContent="Stein "+(k+1);button.className=(selectedPiece===k?"active":"");button.disabled=ended||!isHuman()||!possibilities.some(m=>m.piece===k);
   button.onclick=()=>select(k);pieceBox.append(button);}
  $("hint").textContent="Start: Würfeln · Pfeile: Stein wählen · A: Ziehen. Sechs gibt einen Extrawurf. Alle 4 Steine in die farbige Zielreihe bringen.";
 }
 function next(){die=0;const a=active(),i=a.indexOf(turn);turn=a[(i+1)%a.length];draw();computer();}
 function select(k){selectedPiece=k;if(ended||!isHuman()||!die){draw();return;}
  const m=DiceRace.possible(b,turn,die).find(m=>m.piece===k);if(!m){status("Dieser Stein kann mit "+die+" nicht ziehen.");draw();return;}
  execute(m);
 }
 function execute(m){b=DiceRace.apply(b,turn,m);const face=die;status(DiceRace.names[turn]+" zieht Stein "+(m.piece+1)+(m.captured.length?" und wirft jemanden zurück!":""));
  if(b[turn].every(v=>v>=52)){ended=true;status(DiceRace.names[turn]+" gewinnt!");die=0;draw();return;}
  if(face===6){die=0;draw();computer();}else next();
 }
 function rolled(){if(ended||die)return;die=1+Math.floor(Math.random()*6);
  const ms=DiceRace.possible(b,turn,die);status(DiceRace.names[turn]+" würfelt "+die+".");
  draw();
  if(!ms.length){const id=epoch;setTimeout(()=>{if(id!==epoch||ended)return;status("Kein gültiger Zug – nächste Person.");next();},450);}
  else if(!isHuman()){const id=epoch;setTimeout(()=>{if(id!==epoch||ended)return;const move=DiceRace.choose(b,turn,die,$("difficulty").value);if(move)execute(move);},340);}
 }
 function computer(){if(!ended&&!isHuman()&&!die){const id=epoch;setTimeout(()=>{if(id===epoch)rolled();},350);}}
 function reset(){epoch++;players=+$("playercount").value;human=Math.min(+$("human").value,players);$("human").value=human;
  b=DiceRace.state(players);turn=active()[0];die=0;ended=false;selectedPiece=0;
  status("Würfle eine Sechs, um einen Stein ins Rennen zu bringen.");draw();computer();}
 roll.onclick=rolled;$("restart").onclick=reset;$("playercount").onchange=reset;$("human").onchange=reset;$("difficulty").onchange=reset;
 $("exit").onclick=()=>{epoch++;sdk.exit()};
 sdk.on("input",({button,action})=>{if(action!=="press")return;if(button==="BACK"){epoch++;sdk.exit();return}
  if(button==="START"){if(!die&&isHuman())rolled();else if(die)select(selectedPiece);}
  if(button==="LEFT"||button==="UP")selectedPiece=(selectedPiece+3)%4;
  if(button==="RIGHT"||button==="DOWN")selectedPiece=(selectedPiece+1)%4;
  if(button==="A"){if(!die)rolled();else select(selectedPiece);}draw();
 });
 reset();
})();
