// MuPis Wikingerduell — entirely original Kubb game simulation, MIT.
// An accessible 5-inch turn-based adaptation, not an official tournament rules
// implementation or a realistic rigid-body physics simulator.
const Kubb = (() => {
  const teams=["Türkis","Bernstein"];
  const colors=["#23bdac","#f2bc6c"];
  const initial=()=>{
    const blocks=[];
    for(let side=0;side<2;side++)for(let n=0;n<5;n++){
      blocks.push({id:"b"+side+"-"+n,side,kind:"base",
        x:54+n*88,y:side===0?341:39});
    }
    return {blocks,turn:0,turnIndex:0,throwsLeft:2,
      fallen:[],winner:-1,shots:0,hits:0,message:"Türkis beginnt mit 2 Wurfhölzern."};
  };
  const clone=s=>({...s,blocks:s.blocks.map(b=>({...b})),fallen:[...s.fallen]});
  const eligible=s=>{
    const opponent=1-s.turn;
    const field=s.blocks.filter(b=>b.kind==="field"&&b.side===opponent);
    if(field.length)return field;
    return s.blocks.filter(b=>b.kind==="base"&&b.side===opponent);
  };
  const available=s=>[...eligible(s).map(b=>b.id),"king"];
  const selectable=s=>[...s.blocks.filter(b=>b.side===1-s.turn).map(b=>b.id),"king"];
  const chance={human:0.88,easy:0.48,medium:0.68,hard:0.86};
  function throwAt(s,target,level="human",roll=Math.random()){
    if(s.winner!==-1 || s.throwsLeft<=0)return clone(s);
    const next=clone(s),wasAllowed=available(s).includes(target);
    const hit=roll<(chance[level]??chance.human);
    next.throwsLeft--;next.shots++;
    if(target==="king"){
      if(hit){
        const allowed=eligible(s).length===0;
        next.winner=allowed?s.turn:1-s.turn;
        next.message=allowed?teams[s.turn]+" trifft den König und gewinnt!":
          "König zu früh getroffen! "+teams[1-s.turn]+" gewinnt.";
        next.hits++;
      }else next.message=teams[s.turn]+": König verfehlt.";
      return next;
    }
    const block=next.blocks.find(b=>b.id===target&&b.side===1-s.turn);
    if(block && wasAllowed && hit){
      block.kind="fallen";next.fallen.push(block.id);next.hits++;
      next.message=teams[s.turn]+" wirft einen "+(s.blocks.find(b=>b.id===target)?.kind==="field"?"Feld-Kubb":"Grundlinien-Kubb")+" um!";
    }else if(block&&!wasAllowed){
      next.message="Erst die Feld-Kubbs umwerfen! Wurf zählt nicht.";
    }else next.message=teams[s.turn]+": daneben.";
    return next;
  }
  function advance(s){
    if(s.winner!==-1 || s.throwsLeft>0)return clone(s);
    const next=clone(s),fallen=new Set(next.fallen);
    // All knocked-down kubbs are thrown back onto the shooter's half
    // by the opposing team. Field kubbs always have priority afterwards.
    const relocate=next.blocks.filter(b=>fallen.has(b.id));
    const occupied=next.blocks.filter(b=>b.side===s.turn&&b.kind==="field").length;
    relocate.forEach((b,i)=>{
      b.side=s.turn;b.kind="field";
      const offset=occupied+i;
      b.x=64+((offset*67+Math.floor(offset/5)*13)%330);
      b.y=s.turn===0?258-(offset%3)*26:122+(offset%3)*26;
    });
    next.fallen=[];next.turn=1-s.turn;next.turnIndex++;
    next.throwsLeft=next.turnIndex===1?4:6;
    next.message=teams[next.turn]+" am Zug: "+next.throwsLeft+" Wurfhölzer.";
    return next;
  }
  function choose(s,level="medium",roll=Math.random()){
    const targets=eligible(s);
    if(!targets.length)return "king";
    if(level==="easy")return targets[Math.floor(roll*targets.length)%targets.length].id;
    // Medium/hard prioritize field kubbs near the midline, as these can
    // give the opponent a further-advanced throwing line if left standing.
    const sorted=[...targets].sort((a,b)=>Math.abs(a.y-190)-Math.abs(b.y-190));
    return level==="medium"&&roll<0.16?sorted[sorted.length-1].id:sorted[0].id;
  }
  return {teams,colors,initial,eligible,available,selectable,throwAt,advance,choose};
})();
if(typeof module!=="undefined")module.exports=Kubb;
if(typeof document!=="undefined")(()=>{
  "use strict";
  const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id);
  const SVG="http://www.w3.org/2000/svg",svg=$("field");
  let s=Kubb.initial(),target="b1-2",timer=0,generation=0,exit=false;
  const el=(tag,attrs={})=>{const e=document.createElementNS(SVG,tag);
    for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e};
  function paint(){
    svg.replaceChildren();
    svg.append(el("rect",{x:13,y:12,width:434,height:356,rx:14,fill:"#277454",stroke:"#82bda0","stroke-width":3}));
    svg.append(el("line",{x1:13,y1:190,x2:447,y2:190,stroke:"#d4e4b8","stroke-width":3,"stroke-dasharray":"11 7"}));
    for(const y of [39,341])svg.append(el("line",{x1:25,y1:y,x2:435,y2:y,stroke:"#d6deb7","stroke-width":2,opacity:.5}));
    for(const b of s.blocks){
      if(b.kind==="fallen")continue;
      const k=el("rect",{x:b.x-16,y:b.y-12,width:32,height:24,rx:5,
        fill:b.kind==="field"?"#e1d197":Kubb.colors[b.side],
        stroke:b.id===target?"#fff8b4":"#1b443b","stroke-width":b.id===target?5:2});
      k.style.cursor="pointer";k.addEventListener("click",()=>{if(!canHuman())return;target=b.id;paint();});
      svg.append(k);
      const label=el("text",{x:b.x,y:b.y+4,"text-anchor":"middle","font-size":13,"font-weight":"bold",fill:"#183025"});
      label.textContent=b.kind==="field"?"F":b.side===0?"T":"B";label.style.pointerEvents="none";svg.append(label);
      // 44px tap target around 32px visual block
      const hitbox=el("rect",{x:b.x-23,y:b.y-22,width:46,height:44,fill:"transparent"});
      hitbox.style.cursor="pointer";hitbox.addEventListener("click",()=>{if(!canHuman())return;target=b.id;paint();});
      svg.append(hitbox);
    }
    const king=el("path",{d:"M216 176 L220 169 L230 175 L240 169 L244 176 L244 202 L216 202Z",
      fill:"#ffce76",stroke:target==="king"?"#fff4a0":"#744d21","stroke-width":target==="king"?4:2});
    king.style.cursor="pointer";king.addEventListener("click",()=>{if(!canHuman())return;target="king";paint();});
    svg.append(king);
    const crown=el("text",{x:230,y:193,"text-anchor":"middle","font-size":14,"font-weight":"bold",fill:"#66421b"});
    crown.textContent="K";crown.style.pointerEvents="none";svg.append(crown);
    const kclick=el("rect",{x:207,y:162,width:46,height:48,fill:"transparent"});kclick.style.cursor="pointer";
    kclick.addEventListener("click",()=>{if(!canHuman())return;target="king";paint();});svg.append(kclick);
    $("turn").textContent=s.winner>=0?"Spiel beendet":Kubb.teams[s.turn]+" ist dran";
    $("status").textContent=s.message;
    $("score").textContent="Wurfhölzer: "+s.throwsLeft+" · Treffer: "+s.hits+"/"+s.shots;
    $("throw").disabled=!canHuman()||s.throwsLeft<=0;
    $("skip").disabled=!canHuman()||s.throwsLeft<=0;
  }
  function canHuman(){return !exit&&s.winner<0&&(s.turn===0||$("mode").value==="human");}
  function selectDefault(){
    const ids=Kubb.available(s);if(!ids.includes(target))target=ids[0]||"king";
  }
  function shot(t,level,roll){
    s=Kubb.throwAt(s,t,level,roll);selectDefault();paint();
    if(s.winner>=0)return;
    if(s.throwsLeft<=0){const g=++generation;timer=setTimeout(()=>{
      if(g!==generation||exit)return;s=Kubb.advance(s);selectDefault();paint();aiPlay();
    },350);}else aiPlay();
  }
  function humanThrow(){if(!canHuman()||s.throwsLeft<1)return;shot(target,"human",Math.random());}
  function aiPlay(){
    if(exit||s.winner>=0||s.turn!==1||$("mode").value==="human"||s.throwsLeft<=0)return;
    const g=++generation;timer=setTimeout(()=>{
      if(g!==generation||exit||s.turn!==1)return;
      const choice=Kubb.choose(s,$("mode").value,Math.random());
      shot(choice,$("mode").value,Math.random());
    },370);
  }
  $("throw").onclick=humanThrow;
  $("skip").onclick=()=>{if(!canHuman())return;s.throwsLeft=0;s.message="Zug freiwillig beendet.";paint();
    const g=++generation;timer=setTimeout(()=>{if(g!==generation||exit)return;s=Kubb.advance(s);selectDefault();paint();aiPlay();},200);
  };
  function reset(){generation++;clearTimeout(timer);s=Kubb.initial();target="b1-2";paint();}
  $("reset").onclick=reset;$("mode").onchange=reset;
  $("exit").onclick=()=>{exit=true;generation++;clearTimeout(timer);sdk.exit()};
  sdk.on("input",({button,action})=>{
    if(action!=="press")return;
    if(button==="BACK"){exit=true;generation++;clearTimeout(timer);sdk.exit();return;}
    if(!canHuman())return;
    if(button==="LEFT"||button==="UP"||button==="RIGHT"||button==="DOWN"){
      const ids=Kubb.selectable(s);let idx=ids.indexOf(target);idx=(idx+(button==="LEFT"||button==="UP"?-1:1)+ids.length)%ids.length;
      target=ids[idx];paint();
    }
    if(button==="A"||button==="START")humanThrow();
  });
  paint();
})();
