// MuPi Dame-Duell: original 8×8 German-style checkers implementation, MIT.
// Rules: 12 pieces, mandatory capture, diagonal men forward, flying kings,
// multiple captures, no maximum-capture obligation; promotion ends a turn.
const Checkers=(()=>{
 const dirs=[[-1,-1],[1,-1],[-1,1],[1,1]];
 const owner=v=>v===1||v===3?1:v===2||v===4?2:0;
 const king=v=>v>=3;
 const pos=i=>[i%8,Math.floor(i/8)];
 const at=(x,y)=>x>=0&&x<8&&y>=0&&y<8?y*8+x:-1;
 function initial(){const b=Array(64).fill(0);for(let y=0;y<8;y++)for(let x=0;x<8;x++)if((x+y)%2===1){if(y<3)b[at(x,y)]=2;else if(y>4)b[at(x,y)]=1;}return b;}
 function jumps(b,from,p){
  const out=[];const [x,y]=pos(from),piece=b[from];if(owner(piece)!==p)return out;
  for(const [dx,dy] of dirs){if(!king(piece) && dy!==(p===1?-1:1))continue;
   let xx=x+dx,yy=y+dy,enemy=-1;
   while(true){const i=at(xx,yy);if(i<0)break;
    if(enemy===-1){
      if(b[i]===0){if(!king(piece))break;xx+=dx;yy+=dy;continue;}
      if(owner(b[i])===p||enemy>=0)break;
      enemy=i;xx+=dx;yy+=dy;continue;
    }
    if(b[i]!==0)break;
    out.push({to:i,capture:enemy});
    if(!king(piece))break;
    xx+=dx;yy+=dy;
   }
  }
  return out;
 }
 // Explore every legal capture continuation, removing each victim immediately.
 function capturesFor(b,from,p,root=from,path=[],taken=[]){
  const possibilities=jumps(b,from,p),result=[];
  for(const a of possibilities){
   const next=b.slice(),v=next[from];next[from]=0;next[a.capture]=0;next[a.to]=v;
   const steps=[...path,a.to],victims=[...taken,a.capture];
   const [,y]=pos(a.to);
   const promote=!king(v)&&((p===1&&y===0)||(p===2&&y===7));
   const follow=promote?[]:capturesFor(next,a.to,p,root,steps,victims);
   if(follow.length)result.push(...follow);
   else result.push({from:root,to:a.to,path:steps,captures:victims});
  }
  return result;
 }
 function legal(b,p){
  const own=b.map((v,i)=>owner(v)===p?i:-1).filter(i=>i>=0);
  const capture=own.flatMap(i=>capturesFor(b,i,p));
  if(capture.length)return capture;
  const result=[];
  for(const i of own){
   const [x,y]=pos(i),piece=b[i];
   for(const [dx,dy] of dirs){if(!king(piece)&&dy!==(p===1?-1:1))continue;
    let xx=x+dx,yy=y+dy;
    while(true){const to=at(xx,yy);if(to<0||b[to])break;
     result.push({from:i,to,path:[to],captures:[]});
     if(!king(piece))break;xx+=dx;yy+=dy;
    }
   }
  }
  return result;
 }
 function apply(b,m,p){
  const next=b.slice(),v=next[m.from];next[m.from]=0;
  for(const i of m.captures)next[i]=0;
  const [,y]=pos(m.to),promotion=!king(v)&&((p===1&&y===0)||(p===2&&y===7));
  next[m.to]=promotion?p+2:v;return next;
 }
 function score(b,p){
  let v=0;for(let i=0;i<64;i++)if(b[i]){let own=owner(b[i])===p?1:-1;
   v+=own*(king(b[i])?240:100);v+=own*(3-Math.abs(i%8-3.5));
  }return v;
 }
 function search(b,p,depth,root,alpha=-Infinity,beta=Infinity){
  const moves=legal(b,p);if(!moves.length)return p===root?-20000:20000;
  if(depth===0)return score(b,root);
  let best=p===root?-Infinity:Infinity;
  for(const m of moves){const s=search(apply(b,m,p),3-p,depth-1,root,alpha,beta);
   if(p===root){best=Math.max(best,s);alpha=Math.max(alpha,best);}else{best=Math.min(best,s);beta=Math.min(beta,best);}
   if(beta<=alpha)break;
  }return best;
 }
 function choose(b,p,level){const moves=legal(b,p);if(!moves.length)return null;
  if(level==="easy")return moves[Math.floor(Math.random()*moves.length)];
  const ranked=moves.map(m=>({m,v:level==="medium"?
    score(apply(b,m,p),p)+m.captures.length*15+Math.random()*35:
    search(apply(b,m,p),3-p,2,p)+m.captures.length*4}));
  ranked.sort((a,b)=>b.v-a.v);return ranked[0].m;
 }
 return {initial,legal,apply,choose,owner,king,score};
})();
if(typeof module!=="undefined")module.exports=Checkers;
if(typeof document!=="undefined")(()=>{
 const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id);
 const board=$("board");board.style.display="grid";board.style.gridTemplateColumns="repeat(8,1fr)";board.style.gridTemplateRows="repeat(8,1fr)";board.style.gap="0";board.style.padding="4px";
 const buttons=[];let b,turn,selected,cursor,done,thinking,token=0,quiet=0;
 for(let i=0;i<64;i++){const btn=document.createElement("button");btn.className="cell";btn.style.cssText="position:relative;border-radius:0;padding:0;min-height:0;min-width:0;overflow:hidden";btn.onclick=()=>select(i);buttons.push(btn);board.append(btn);}
 function status(s){$("status").textContent=s}
 function paint(){
  const moves=Checkers.legal(b,turn),froms=new Set(moves.map(m=>m.from)),targets=new Set(moves.filter(m=>m.from===selected).map(m=>m.to));
  for(let i=0;i<64;i++){
   const el=buttons[i],v=b[i];el.textContent="";
   el.style.background=((i%8+Math.floor(i/8))%2===1)?"#806d63":"#ead6bb";
   el.style.outline=i===selected?"3px solid #fae56b":i===cursor?"2px solid #8ad7fa":"none";
   el.style.outlineOffset="-3px";
   if(v){const disk=document.createElement("span");disk.style.cssText="display:flex;align-items:center;justify-content:center;border-radius:50%;width:82%;height:82%;margin:9%;background:"+(Checkers.owner(v)===1?"#34bcac":"#232a40")+";border:3px solid "+(Checkers.owner(v)===1?"#a3fff0":"#9dabc4")+";color:#ffe389;font-size:19px;font-weight:900";disk.textContent=Checkers.king(v)?"★":"";el.append(disk);}
   if(targets.has(i)){const dot=document.createElement("span");dot.style.cssText="position:absolute;left:35%;top:35%;height:30%;width:30%;border-radius:50%;background:#ffeb67";el.append(dot);}
   else if(froms.has(i)&&v===turn||froms.has(i)&&v===turn+2)el.style.boxShadow="inset 0 0 0 3px #92eed4";
  }
  $("turn").textContent=done?"Spiel beendet":(turn===1?"Türkis":"Dunkel")+" am Zug";
  $("score").textContent="Türkis "+b.filter(v=>Checkers.owner(v)===1).length+" · Dunkel "+b.filter(v=>Checkers.owner(v)===2).length;
 }
 function finish(){const m=Checkers.legal(b,turn);if(!m.length){done=true;status((turn===1?"Dunkel":"Türkis")+" gewinnt!");return true;}if(quiet>=80){done=true;status("Unentschieden: 80 Züge ohne Schlag.");return true;}return false;}
 function move(m){b=Checkers.apply(b,m,turn);quiet=m.captures.length?0:quiet+1;selected=-1;turn=3-turn;finish();paint();if(!done){status("Schlagpflicht beachten – wähle einen Stein.");aiTurn();}}
 function select(i){if(done||thinking||($("mode").value!=="human"&&turn===2))return;
  const moves=Checkers.legal(b,turn);
  if(moves.some(m=>m.from===i)){selected=i;status("Ziel markieren. Mehrfachschläge werden automatisch ausgeführt.");paint();return;}
  const m=moves.find(m=>m.from===selected&&m.to===i);
  if(m){move(m);return;}status("Nur erlaubte Diagonalzüge. Schlagen hat Vorrang.");
 }
 function aiTurn(){if(done||turn!==2||$("mode").value==="human")return;
  thinking=true;const t=++token;status("MuPi überlegt …");
  setTimeout(()=>{if(t!==token)return;thinking=false;const m=Checkers.choose(b,2,$("mode").value);if(m)move(m);else{finish();paint()}},250);
 }
 function reset(){token++;b=Checkers.initial();turn=1;done=false;thinking=false;selected=-1;cursor=40;quiet=0;status("8×8-Dame: Schlagpflicht, Mehrfachschläge, fliegende Damen. Türkis beginnt.");paint();}
 $("restart").onclick=reset;$("mode").onchange=reset;$("exit").onclick=()=>{token++;sdk.exit()};
 sdk.on("input",({button,action})=>{if(action!=="press")return;if(button==="BACK"){token++;sdk.exit();return}
 const change={LEFT:-1,RIGHT:1,UP:-8,DOWN:8};if(button in change){cursor=(cursor+change[button]+64)%64;paint()}
 if(button==="A"||button==="START")select(cursor);
 });reset();
})();
