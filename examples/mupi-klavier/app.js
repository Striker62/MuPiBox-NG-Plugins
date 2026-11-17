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
function draw() {
  const c=$('score'), w=c.clientWidth,h=c.clientHeight;
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  const g=c.getContext('2d');g.clearRect(0,0,w,h);
  if(mode()==='free'){g.fillStyle='#aabbdc';g.font='24px sans-serif';g.textAlign='center';g.fillText('C · D · E · F · G · A · H · C',w/2,h/2);return;}
  const s=song(),start=Math.max(0,index-1);
  if(mode()==='staff') {
    const gap=Math.min(15,h/8),bottom=h*.72;
    g.strokeStyle='#7285ab';g.lineWidth=1;
    for(let j=0;j<5;j++){g.beginPath();g.moveTo(10,bottom-j*gap);g.lineTo(w-10,bottom-j*gap);g.stroke();}
    for(let j=start;j<Math.min(s.notes.length,start+8);j++){
      const x=45+(j-start)*(w-80)/8,y=bottom+gap-music.white.indexOf(s.notes[j])*gap/2;
      g.fillStyle=j===index?'#ffe16b':'#c8d9f4';g.strokeStyle=g.fillStyle;
      if(s.notes[j]==='C4'){g.beginPath();g.moveTo(x-15,y);g.lineTo(x+15,y);g.stroke();}
      g.beginPath();g.ellipse(x,y,9,6,-.25,0,Math.PI*2);
      if(s.beats[j]>=2)g.stroke();else g.fill();
      g.beginPath();g.moveTo(x+8,y);g.lineTo(x+8,y-32);g.stroke();
    }
  } else {
    g.strokeStyle='#7285ab';g.beginPath();g.moveTo(0,h-4);g.lineTo(w,h-4);g.stroke();
    for(let j=index;j<Math.min(s.notes.length,index+4);j++){
      const k=music.white.indexOf(s.notes[j]),x=(k+.5)*w/8,y=h-24-(j-index+1-progress)*h*.3;
      g.fillStyle=j===index?'#ffe16b':'#8aa9e8';g.fillRect(x-w/32,y,w/16,22);
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