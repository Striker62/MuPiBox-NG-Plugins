(() => {
 'use strict';
 const sdk=window.MuPiBoxSDK,E=window.PaintEngine,$=id=>document.getElementById(id),canvas=$('paint'),ctx=canvas.getContext('2d'),drawing=new E.Drawing();
 const palette=['#ff4f9a','#ff9f43','#ffd93d','#59d27a','#4db8ff','#6c63ff','#a95ce8','#263747','#9c653e','#ffffff'];
 let color=palette[0],size=15,erase=false,pointer=null,ticket=0,english=false,paused=false;
 const tr=(de,en)=>english?en:de;
 const base=[['free','Freies Malen','Free drawing',''],['house','Haus','House','art/house.svg'],['car','Auto','Car','art/car.svg'],['dog','Hund','Dog','art/dog.svg'],['sun','Sonne','Sun','art/sun.svg']];
 const btn=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b;};
 function render(){ctx.clearRect(0,0,canvas.width,canvas.height);for(const s of drawing.strokes)E.stroke(ctx,s);if(drawing.active)E.stroke(ctx,drawing.active);$('undo').disabled=!drawing.strokes.length&&!drawing.active;}
 function finish(){drawing.finish();pointer=null;$('undo').disabled=!drawing.strokes.length;}
 function controls(){
  $('palette').replaceChildren(...palette.map(c=>{const b=btn('',()=>{color=c;erase=false;controls();});b.style.background=c;b.setAttribute('aria-label',c);b.setAttribute('aria-pressed',String(c===color&&!erase));return b;}));
  $('sizes').replaceChildren(...[7,15,30].map(w=>{const b=btn(String(w),()=>{size=w;controls();});b.setAttribute('aria-pressed',String(w===size));return b;}));
  $('erase').setAttribute('aria-pressed',String(erase));
 }
 function menu(){++ticket;finish();$('draw').hidden=true;$('menu').hidden=false;$('back').hidden=true;$('status').textContent='';}
 async function open(item){
  const t=++ticket;finish();drawing.clear();render();$('menu').hidden=true;$('draw').hidden=false;$('back').hidden=false;$('outline').hidden=true;$('outline').removeAttribute('src');
  $('status').textContent=item.title;
  if(item.id==='free')return;
  try{
   const source=item.src||await sdk.coloring.get(item.id);
   if(t!==ticket)return;
   $('outline').src=source;$('outline').hidden=false;
  }catch(_){if(t===ticket)$('status').textContent=tr('Vorlage nicht verfügbar – freies Malen möglich.','Page unavailable – free drawing is still possible.');}
 }
 function addTemplate(item){
  const b=btn('',()=>void open(item));const art=document.createElement('span');art.className='preview';
  if(item.src){const im=document.createElement('img');im.src=item.src;im.alt='';art.append(im);}else art.textContent=item.id==='free'?'✎':'▧';
  const name=document.createElement('span');name.textContent=item.title;b.append(art,name);$('templates').append(b);
 }
 function point(ev){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(canvas.width,(ev.clientX-r.left)*canvas.width/r.width)),Math.max(0,Math.min(canvas.height,(ev.clientY-r.top)*canvas.height/r.height))];}
 canvas.addEventListener('pointerdown',ev=>{
  if(paused||pointer!==null)return;
  if(drawing.full()){$('status').textContent=tr('Zeichenlimit erreicht – Rückgängig oder Neu.','Drawing limit reached – undo or clear.');return;}
  ev.preventDefault();pointer=ev.pointerId;canvas.setPointerCapture(pointer);drawing.begin(...point(ev),color,size,erase);E.stroke(ctx,drawing.active);
 });
 canvas.addEventListener('pointermove',ev=>{if(ev.pointerId===pointer){ev.preventDefault();const stroke=drawing.active;if(!stroke)return;const before=stroke.points.length;drawing.move(...point(ev));if(stroke.points.length>before)E.stroke(ctx,{...stroke,points:stroke.points.slice(-2)});}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,ev=>{if(ev.pointerId===pointer)finish();});
 $('back').addEventListener('click',menu);
 $('erase').addEventListener('click',()=>{erase=!erase;controls();});
 $('undo').addEventListener('click',()=>{finish();drawing.undo();render();});
 $('clear').addEventListener('click',()=>{finish();drawing.clear();render();});
 sdk.on('lifecycle.pause',()=>{paused=true;finish();});sdk.on('lifecycle.resume',()=>{paused=false;});
 async function init(){
  try{const c=await sdk.getContext();english=!String(c.language||'de').startsWith('de');}catch(_){}
  document.documentElement.lang=english?'en':'de';
  $('back').textContent=tr('Vorlagen','Pages');$('erase').textContent=tr('Radierer','Eraser');$('undo').textContent=tr('Rückgängig','Undo');$('clear').textContent=tr('Neu','Clear');
  for(const [id,de,en,src] of base)addTemplate({id,title:tr(de,en),src});
  try{if(await sdk.supports('coloring.list'))for(const item of await sdk.coloring.list())if(item&&typeof item.id==='string'&&typeof item.title==='string')addTemplate(item);}catch(_){}
  controls();render();
 }
 void init();
})();
