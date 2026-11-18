'use strict';
const sdk = window.MuPiBoxSDK, music = window.PianoMusic;
const $ = id => document.getElementById(id);
let index=0, progress=0, demo=false, paused=false, last=0, selected=0, generation=0;
const buttons=new Map();
const song=()=>music.songs[Number($('song').value)||0];
const mode=()=>$('mode').value;
const target=()=>mode()==='free' ? null : song().notes[index];
const label=n=>n.replace('B','H').replace('#','is');
music.songs.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.title;$('song').append(o);});
function addKey(note,left,width,black) {
  const b=document.createElement('button');b.className='key'+(black?' black':'');
  b.style.left=left+'%';b.style.width=width+'%';b.textContent=label(note);
  b.setAttribute('aria-label',label(note));
  b.onpointerdown=e=>{e.preventDefault();b.focus();press(note);};
  b.onclick=e=>{if(e.detail===0)press(note);};
  $('keyboard').append(b);buttons.set(note,b);
}
music.white.forEach((n,i)=>addKey(n,i*12.5,12.5,false));
[['C#4',1],['D#4',2],['F#4',4],['G#4',5],['A#4',6]].forEach(([n,i])=>addKey(n,i*12.5-3.8,7.6,true));
function refresh() {
  for(const [n,b] of buttons)b.classList.toggle('target',n===target());
  $('hint').textContent=mode()==='free'?'Spiel deine eigene Melodie':index>=song().notes.length?'Geschafft! ↺ für eine neue Runde':label(target())+' drücken · '+index+' / '+song().notes.length;
  $('demo').textContent=demo?'■ Stopp':'▶ Vorspielen';
}
function stop(){demo=false;generation++;refresh();}
function reset(){stop();index=0;progress=0;refresh();}
async function sound(note) {
  try {await sdk.audio.playNote(note,Number($('volume').value),$('instrument').value,{relative:true});return true;}
  catch(e){stop();$('hint').textContent='Ton nicht verfügbar: '+e.message;return false;}
}
async function press(note) {
  if(paused)return;
  const b=buttons.get(note);b.classList.add('pressed');setTimeout(()=>b.classList.remove('pressed'),180);
  const token=generation;
  if(!await sound(note)||token!==generation)return;
  if(!demo&&mode()!=='free') {
    const next=music.advance(index,note,song());
    if(next!==index){index=next;progress=0;refresh();save();}
  }
}
function save(){sdk.storage.set('progress',{song:Number($('song').value),index,mode:mode()}).catch(()=>{});}
$('mode').onchange=()=>{stop();progress=0;refresh();save();};
$('song').onchange=()=>{reset();save();};
$('reset').onclick=()=>{reset();save();};
$('exit').onclick=()=>{stop();sdk.exit();};
$('demo').onclick=()=>{if(demo){stop();return;}if(mode()==='free')$('mode').value='staff';index=0;progress=0;demo=true;generation++;sound(song().notes[0]);refresh();};
for(const id of ['volume','instrument'])$(id).onchange=()=>sdk.storage.set(id,$(id).value).catch(()=>{});
// Drawing is pixel-ratio aware so the staff and falling notes remain sharp on Qt touchscreens.
function roundedPath(g,x,y,w,h,r) {
  const q=Math.min(r,w/2,h/2);
  g.beginPath();g.moveTo(x+q,y);g.lineTo(x+w-q,y);
  g.quadraticCurveTo(x+w,y,x+w,y+q);g.lineTo(x+w,y+h-q);
  g.quadraticCurveTo(x+w,y+h,x+w-q,y+h);g.lineTo(x+q,y+h);
  g.quadraticCurveTo(x,y+h,x,y+h-q);g.lineTo(x,y+q);
  g.quadraticCurveTo(x,y,x+q,y);g.closePath();
}
function draw() {
  const c=$('score'),w=c.clientWidth,h=c.clientHeight;
  if(w<1||h<1)return;
  const dpr=Math.min(2,window.devicePixelRatio||1),pw=Math.round(w*dpr),ph=Math.round(h*dpr);
  if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
  const g=c.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  if(mode()==='free'){
    g.textAlign='center';g.font='700 '+Math.min(21,h*.19)+'px system-ui,sans-serif';
    g.fillStyle='#e7f1ff';g.shadowColor='#55b6ff';g.shadowBlur=8;
    g.fillText('Tippe eine Taste zum Start',w/2,h*.48);
    g.shadowBlur=0;g.font='14px system-ui,sans-serif';g.fillStyle='#a9cbed';
    g.fillText('C  ·  D  ·  E  ·  F  ·  G  ·  A  ·  H  ·  C',w/2,h*.72);
    return;
  }
  const s=song(),start=Math.max(0,index-1);
  if(mode()==='staff') {
    const gap=Math.min(16,Math.max(10,h/9)),bottom=h*.73;
    const lineLeft=56,lineRight=w-20;
    g.lineWidth=1.3;g.strokeStyle='#739ac7';
    for(let j=0;j<5;j++){
      const y=bottom-j*gap;
      g.beginPath();g.moveTo(lineLeft,y);g.lineTo(lineRight,y);g.stroke();
    }
    // Draw the clef as vector curves: Qt images can lack the Unicode music font.
    g.save();g.translate(40,bottom-gap*1.65);g.scale(gap/16,gap/16);
    g.strokeStyle='#e2f3ff';g.lineWidth=2.8;g.lineCap='round';g.lineJoin='round';
    g.beginPath();
    g.moveTo(6,48);
    g.bezierCurveTo(4,22,-5,-8,5,-33);
    g.bezierCurveTo(17,-58,9,-62,-2,-49);
    g.bezierCurveTo(-15,-31,8,-12,8,10);
    g.bezierCurveTo(9,31,-8,42,-20,28);
    g.bezierCurveTo(-29,17,-17,1,-5,1);
    g.bezierCurveTo(12,1,19,23,7,33);
    g.bezierCurveTo(-3,42,-14,35,-12,26);
    g.stroke();
    g.fillStyle='#e2f3ff';g.beginPath();g.arc(-11,27,3.5,0,Math.PI*2);g.fill();g.restore();
    const noteWidth=(w-112)/8;
    for(let j=start;j<Math.min(s.notes.length,start+8);j++){
      const i=music.white.indexOf(s.notes[j]);
      if(i<0)continue;
      const x=84+(j-start)*noteWidth,y=bottom+gap-i*gap/2;
      const active=j===index,shade=active?'#ffe169':'#c5e3fc';
      g.save();if(active){g.shadowColor='#ffda4a';g.shadowBlur=14;}
      g.fillStyle=shade;g.strokeStyle=shade;g.lineWidth=2.2;
      if(s.notes[j]==='C4'){
        g.beginPath();g.moveTo(x-12,y);g.lineTo(x+12,y);g.stroke();
      }
      g.beginPath();g.ellipse(x,y,Math.min(9,gap*.6),Math.min(6,gap*.38),-.25,0,Math.PI*2);
      if(s.beats[j]>=2){g.fillStyle='#113c72';g.fill();g.stroke();}else g.fill();
      const dir=y<bottom-2*gap?-1:1;
      g.beginPath();
      if(dir===1){g.moveTo(x+8,y);g.lineTo(x+8,y-31);}
      else{g.moveTo(x-8,y);g.lineTo(x-8,y+31);}
      g.stroke();g.restore();
    }
  } else {
    // Falling notes stay exactly aligned with the eight white keys below.
    const keyW=w/8,hitY=h-12;
    g.fillStyle='#2165aa15';
    for(let k=0;k<8;k++){g.fillRect(k*keyW,0,keyW-1,h);}
    g.strokeStyle='#67c8ff';g.lineWidth=2;
    g.shadowColor='#33baff';g.shadowBlur=9;
    g.beginPath();g.moveTo(0,hitY);g.lineTo(w,hitY);g.stroke();g.shadowBlur=0;
    for(let j=index;j<Math.min(s.notes.length,index+4);j++){
      const k=music.white.indexOf(s.notes[j]);
      if(k<0)continue;
      const x=(k+.5)*keyW,y=hitY-25-(j-index+1-progress)*h*.28;
      if(y<-28||y>h)continue;
      const active=j===index,width=Math.min(47,keyW*.64),height=Math.min(21,h*.16);
      g.save();if(active){g.shadowColor='#ffe169';g.shadowBlur=14;}
      roundedPath(g,x-width/2,y,width,height,5);
      const fill=g.createLinearGradient(0,y,0,y+height);
      fill.addColorStop(0,active?'#fff6aa':'#aed9ff');
      fill.addColorStop(1,active?'#ffca33':'#5d95e0');
      g.fillStyle=fill;g.fill();g.restore();
    }
  }
}
function frame(now) {
  const dt=Math.min(100,now-last||0);last=now;
  if(!paused&&mode()!=='free'&&index<song().notes.length){
    progress=Math.min(1,progress+dt/(60000/Number($('tempo').value)*song().beats[index]));
    if(demo&&progress>=1){index++;progress=0;refresh();if(index<song().notes.length)sound(song().notes[index]);else{stop();save();}}
  }
  draw();requestAnimationFrame(frame);
}
sdk.on('lifecycle.pause',()=>{paused=true;stop();});
sdk.on('lifecycle.resume',()=>{paused=false;last=performance.now();});
document.addEventListener('visibilitychange',()=>{paused=document.hidden;if(paused)stop();});
sdk.on('input',({button,action})=>{
  if(action!=='press')return;
  if(button==='B'||button==='BACK'){$('exit').click();return;}
  if(button==='LEFT'||button==='RIGHT'){selected=(selected+(button==='LEFT'?7:1))%8;buttons.get(music.white[selected]).focus();}
  if(button==='A')press(music.white[selected]);
});
document.addEventListener('keydown',e=>{
  if(e.repeat||/INPUT|SELECT/.test(e.target.tagName))return;
  const i='asdfghjk'.indexOf(e.key.toLowerCase());if(i>=0){e.preventDefault();press(music.white[i]);}
});
(async()=>{
  for(const id of ['volume','instrument']){try{const v=await sdk.storage.get(id);if(id==='volume'&&Number.isFinite(Number(v))&&v!==null)$(id).value=Math.max(0,Math.min(100,Number(v)));else if(id==='instrument'&&Array.from($(id).options).some(o=>o.value===v))$(id).value=v;}catch{}}
  try{const p=await sdk.storage.get('progress');if(p&&Number.isInteger(p.song)&&music.songs[p.song]){$('song').value=p.song;index=Math.max(0,Math.min(song().notes.length,Number(p.index)||0));if(['free','fall','staff'].includes(p.mode))$('mode').value=p.mode;}}catch{}
  refresh();requestAnimationFrame(frame);
})();