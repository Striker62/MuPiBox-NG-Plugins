(() => {
'use strict';
const sdk=window.MuPiBoxSDK,$=id=>document.getElementById(id);
const preview=$('preview'),photo=$('photo'),photoCtx=photo.getContext('2d'),canvas=$('painting'),ctx=canvas.getContext('2d'),select=$('devices'),delay=$('delay'),stickersBox=$('stickers');
const colors=['#f72585','#ff8c00','#ffea00','#18d675','#20b9ff','#ffffff'];
const accessoryImages={"moustache":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTAwIj48ZyBzdHJva2U9IiMxZDI0MzUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIj48cGF0aCBkPSJNODAgNDMgQzY2IDIxIDQ5IDMwIDM1IDQyIEMyMiA1NCA5IDU2IDMgNDggQzggODMgNDkgODYgODAgNTkgQzExMSA4NiAxNTIgODMgMTU3IDQ4IEMxNTEgNTYgMTM4IDU0IDEyNSA0MiBDMTExIDMwIDk0IDIxIDgwIDQzIFoiIGZpbGw9IiMzNTIzMTkiLz48L2c+PC9zdmc+","glasses":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTAwIj48ZyBzdHJva2U9IiMxZDI0MzUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIj48ZWxsaXBzZSBjeD0iMzgiIGN5PSI0NSIgcng9IjMwIiByeT0iMjQiLz48ZWxsaXBzZSBjeD0iMTIyIiBjeT0iNDUiIHJ4PSIzMCIgcnk9IjI0Ii8+PHBhdGggZD0iTTY4IDQxIFE4MCAzMCA5MiA0MSBNOCAzOSBMMCAzMyBNMTUyIDM5IEwxNjAgMzMiLz48L2c+PC9zdmc+","ears":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTAwIj48ZyBzdHJva2U9IiMxZDI0MzUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIj48cGF0aCBkPSJNMjkgOTIgUS00IDUxIDEwIDkgUTQwIDggNjEgNTEgUTgwIDQyIDk5IDUxIFExMjAgOCAxNTAgOSBRMTY0IDUxIDEzMSA5MiIgZmlsbD0iI2FlNzQ0NyIvPjxwYXRoIGQ9Ik0yNSA2NSBRMTIgMzggMjAgMjQgUTQyIDMxIDQ4IDYxIE0xMTIgNjEgUTExOCAzMSAxNDAgMjQgUTE0OCAzOCAxMzUgNjUiIGZpbGw9IiNmMmE4YTgiIHN0cm9rZT0ibm9uZSIvPjwvZz48L3N2Zz4=","crown":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTAwIj48ZyBzdHJva2U9IiMxZDI0MzUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIj48cGF0aCBkPSJNMTYgODUgTDQgMTcgTDQ1IDQ5IEw4MCA2IEwxMTUgNDkgTDE1NiAxNyBMMTQ0IDg1IFoiIGZpbGw9IiNmNGJkMmIiLz48cmVjdCB4PSIxNiIgeT0iNzkiIHdpZHRoPSIxMjgiIGhlaWdodD0iMTUiIHJ4PSI0IiBmaWxsPSIjZTlhNzFiIi8+PGNpcmNsZSBjeD0iODAiIGN5PSI2OSIgcj0iOCIgZmlsbD0iI2U2NDc3OCIgc3Ryb2tlPSJub25lIi8+PGNpcmNsZSBjeD0iNDUiIGN5PSI2NiIgcj0iNiIgZmlsbD0iIzM5YTllOCIgc3Ryb2tlPSJub25lIi8+PGNpcmNsZSBjeD0iMTE1IiBjeT0iNjYiIHI9IjYiIGZpbGw9IiMzOWE5ZTgiIHN0cm9rZT0ibm9uZSIvPjwvZz48L3N2Zz4=","hat":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTAwIj48ZyBzdHJva2U9IiMxZDI0MzUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIj48cGF0aCBkPSJNMjUgNzIgTDM1IDEyIFE4MCAtNSAxMjUgMTIgTDEzNSA3MiBaIiBmaWxsPSIjMjIzYTc5Ii8+PHJlY3QgeD0iMTIiIHk9IjY3IiB3aWR0aD0iMTM2IiBoZWlnaHQ9IjE1IiByeD0iNyIgZmlsbD0iIzE2MjM0YiIvPjxyZWN0IHg9IjI5IiB5PSI1NCIgd2lkdGg9IjEwMiIgaGVpZ2h0PSIxMyIgZmlsbD0iI2Y2YjYyZCIgc3Ryb2tlPSJub25lIi8+PC9nPjwvc3ZnPg=="};
const accessories=[['glasses','Brille'],['hat','Hut'],['crown','Krone'],['moustache','Bart'],['ears','Tierohren']];
let active=false,frozen=false,busy=false,timer=null,epoch=0,painting=false,counting=false,countTimer=null,countValue=5;
let saving=false;
let color=colors[0],size=5,eraser=false,history=[],items=[],selected=null,nextId=1,mode='stickers',drag=null,undoBusy=false;
const say=s=>{$('message').textContent=s};
function controls(){
 $('freeze').textContent='📷 Foto machen ('+delay.value+' Sek.)';delay.disabled=counting;
 $('start').disabled=active||!select.value;$('freeze').disabled=!active||counting;
 $('scan').disabled=counting;$('devices').disabled=counting;$('cancel').hidden=!counting;
 $('stop').disabled=!active||counting;$('countdown').hidden=!counting;
 $('camera-panel').hidden=frozen;$('edit-panel').hidden=!frozen;
 $('mode').textContent=frozen?'✏️ BEARBEITEN':'● LIVE';
 $('status').textContent=frozen?'Standbild bearbeiten':counting?'Countdown läuft':active?'Kamera aktiv':'Kamera aus';
 $('save-photo').disabled=!frozen||saving;$('save-photo').textContent=saving?'⏳ Speichere …':'💾 Foto speichern';$('undo').disabled=!frozen||history.length===0||undoBusy;$('clear').disabled=!frozen;$('smaller').disabled=!selected;$('larger').disabled=!selected;$('remove-sticker').disabled=!selected;$('finish-sticker').disabled=!selected;
}
async function scan(){try{const list=await sdk.camera.list(),old=select.value;select.replaceChildren();for(const d of list){const o=document.createElement('option');o.value=d.id;o.textContent=d.name+' ('+d.id+')';select.append(o)}if(list.some(d=>d.id===old))select.value=old;if(!list.length){const o=document.createElement('option');o.value='';o.textContent='Keine Kamera gefunden';select.append(o)}say(list.length?'Kamera starten und Freigabe am Display bestätigen.':'Keine USB-Kamera gefunden.');controls()}catch(e){say('Kamerazugriff nur am MuPiBox-Touchdisplay: '+e.message);controls()}}
async function frame(){if(!active||frozen||busy||document.hidden)return;busy=true;const current=epoch;try{const f=await sdk.camera.capture();if(active&&!frozen&&current===epoch){preview.src=f.image;preview.hidden=false;$('placeholder').hidden=true}}catch(e){if(!frozen){say('Kamerafehler: '+e.message);await stop()}}finally{busy=false}}
async function start(){if(active||!select.value)return;$('start').disabled=true;photo.hidden=true;canvas.hidden=true;stickersBox.hidden=true;preview.hidden=true;preview.removeAttribute('src');$('placeholder').hidden=false;$('placeholder').textContent='Livebild wird geladen …';try{await sdk.camera.start(select.value);active=true;frozen=false;epoch++;controls();say('Livebild läuft. Countdown auswählen und Foto machen.');await frame();timer=setInterval(()=>void frame(),1350)}catch(e){active=false;controls();say('Kamera konnte nicht starten: '+e.message)}}
async function stop(callHost=true){if(frozen)return;cancelCountdown();epoch++;if(timer){clearInterval(timer);timer=null}const was=active;active=false;frozen=false;painting=false;preview.hidden=true;photo.hidden=true;canvas.hidden=true;stickersBox.hidden=true;$('placeholder').hidden=false;$('placeholder').textContent='Kamera ausgeschaltet';controls();if(was&&callHost){try{await sdk.camera.stop()}catch(e){say('Stoppen: '+e.message)}}}
function saveHistory(){
 if(!frozen||!canvas.width||!canvas.height)return;
 try{
  if(history.length>=10)history.shift();
  history.push({pixels:ctx.getImageData(0,0,canvas.width,canvas.height),items:items.map(x=>({...x})),selected});
  controls();
 }catch(e){say('Rückgängig-Speicher nicht verfügbar.');history=[];controls()}
}
function restore(state){
 if(!state||!frozen)return;
 ctx.putImageData(state.pixels,0,0);
 items=state.items.map(x=>({...x}));selected=state.selected;
 renderStickers();controls();
}
function photoBox(){const r=$('stage').getBoundingClientRect(),w=preview.naturalWidth||320,h=preview.naturalHeight||240,scale=Math.min(r.width/w,r.height/h);return{left:(r.width-w*scale)/2,top:(r.height-h*scale)/2,width:w*scale,height:h*scale}}
function updateStickerBox(){const b=photoBox();stickersBox.style.left=b.left+'px';stickersBox.style.top=b.top+'px';stickersBox.style.width=b.width+'px';stickersBox.style.height=b.height+'px'}
async function freeze(){if(!active||preview.hidden||!preview.complete||!preview.naturalWidth){say('Bitte auf das erste Kamerabild warten.');return}frozen=true;epoch++;photo.width=canvas.width=preview.naturalWidth;photo.height=canvas.height=preview.naturalHeight;photoCtx.drawImage(preview,0,0,photo.width,photo.height);ctx.clearRect(0,0,canvas.width,canvas.height);photo.hidden=false;history=[];items=[];selected=null;canvas.hidden=false;preview.hidden=true;stickersBox.hidden=false;updateStickerBox();renderStickers();setMode('stickers');controls();say('Foto aufgenommen. Kamera wird ausgeschaltet.');if(timer){clearInterval(timer);timer=null}active=false;try{await sdk.camera.stop();say('Kamera aus. Accessoire auswählen oder malen.')}catch(e){say('Foto bereit; Kamera-Stopp: '+e.message)}controls()}
function resume(){cancelCountdown();frozen=false;painting=false;photo.hidden=true;canvas.hidden=true;stickersBox.hidden=true;preview.hidden=true;preview.removeAttribute('src');history=[];items=[];selected=null;$('placeholder').hidden=false;$('placeholder').textContent='Kamera neu starten';controls();say('Für ein neues Foto die Kamera erneut starten.')}
function cancelCountdown(){if(countTimer!==null){clearInterval(countTimer);countTimer=null}counting=false;$('countdown').hidden=true;controls()}
function beginCountdown(){if(!active||frozen||counting)return;if(preview.hidden||!preview.complete||!preview.naturalWidth){say('Bitte auf das erste Kamerabild warten.');return}counting=true;countValue=Number(delay.value);$('count-number').textContent=String(countValue);controls();say('In '+countValue+' Sekunden wird das Foto aufgenommen.');countTimer=setInterval(()=>{if(!active||frozen){cancelCountdown();return}countValue--;if(countValue>0){$('count-number').textContent=String(countValue)}else{cancelCountdown();void freeze()}},1000)}
function point(e){const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/canvas.width,r.height/canvas.height),w=canvas.width*scale,h=canvas.height*scale;return{x:(e.clientX-r.left-(r.width-w)/2)/scale,y:(e.clientY-r.top-(r.height-h)/2)/scale}}
function draw(e){if(!painting||!frozen||mode!=='paint')return;e.preventDefault();const p=point(e);ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineTo(p.x,p.y);ctx.stroke()}
canvas.addEventListener('pointerdown',e=>{if(!frozen||mode!=='paint')return;e.preventDefault();saveHistory();painting=true;canvas.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.strokeStyle=color;ctx.globalCompositeOperation=eraser?'destination-out':'source-over';ctx.lineWidth=size;ctx.lineCap='round';ctx.lineTo(p.x+.01,p.y+.01);ctx.stroke()});
canvas.addEventListener('pointermove',draw);for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>{painting=false;ctx.beginPath();ctx.globalCompositeOperation='source-over'});
function setMode(m){mode=m;$('tab-stickers').classList.toggle('chosen',m==='stickers');$('tab-paint').classList.toggle('chosen',m==='paint');$('sticker-tools').hidden=m!=='stickers';$('paint-tools').hidden=m!=='paint';canvas.classList.toggle('passthrough',m==='stickers');canvas.classList.toggle('drawable',m==='paint');stickersBox.style.pointerEvents=m==='stickers'?'auto':'none';for(const el of stickersBox.children)el.style.pointerEvents=m==='stickers'?'auto':'none'}
function renderStickers(){stickersBox.replaceChildren();for(const item of items){const el=document.createElement('img');el.src=accessoryImages[item.type];el.alt=item.type;el.draggable=false;el.className='sticker'+(selected===item.id?' selected':'');el.dataset.id=String(item.id);el.style.left=item.x+'%';el.style.top=item.y+'%';el.style.width=item.width+'%';el.style.height=(item.width*100/160)+'%';el.style.pointerEvents=mode==='stickers'?'auto':'none';el.addEventListener('pointerdown',stickerDown);stickersBox.append(el)}}
function addSticker(type){if(!frozen)return;saveHistory();const id=nextId++;items.push({id,type,x:50,y:43,width:type==='moustache'?25:36});selected=id;renderStickers();controls();say('Mit dem Finger verschieben, mit + / − Größe ändern.')}
function stickerDown(e){if(mode!=='stickers')return;e.preventDefault();e.stopPropagation();const id=Number(e.currentTarget.dataset.id);selected=id;const item=items.find(x=>x.id===id);if(!item)return;saveHistory();drag={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:item.x,y:item.y};e.currentTarget.setPointerCapture(e.pointerId);renderSelection();controls()}
function renderSelection(){for(const el of stickersBox.children)el.classList.toggle('selected',Number(el.dataset.id)===selected)}
stickersBox.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointer||mode!=='stickers')return;e.preventDefault();const b=stickersBox.getBoundingClientRect(),item=items.find(x=>x.id===drag.id);if(!item||!b.width||!b.height)return;item.x=Math.max(0,Math.min(100,drag.x+(e.clientX-drag.startX)/b.width*100));item.y=Math.max(0,Math.min(100,drag.y+(e.clientY-drag.startY)/b.height*100));const el=Array.from(stickersBox.children).find(x=>Number(x.dataset.id)===item.id);if(el){el.style.left=item.x+'%';el.style.top=item.y+'%'}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])stickersBox.addEventListener(ev,()=>{drag=null});
function resizeSticker(factor){const item=items.find(x=>x.id===selected);if(!item)return;saveHistory();item.width=Math.max(12,Math.min(90,Math.round(item.width*factor)));renderStickers();controls()}
function finishSticker(){selected=null;renderSelection();controls();say('Fertig! Der Auswahlrahmen ist ausgeblendet.')}
stickersBox.addEventListener('pointerdown',e=>{if(e.target===stickersBox&&selected!==null&&mode==='stickers')finishSticker()});
function removeSticker(){if(selected===null)return;saveHistory();items=items.filter(x=>x.id!==selected);selected=null;renderStickers();controls()}
for(const [type,label] of accessories){const b=document.createElement('button'),im=document.createElement('img');im.src=accessoryImages[type];im.alt='';b.append(im,document.createTextNode(label));b.addEventListener('click',()=>addSticker(type));$('accessory-grid').append(b)}
for(const c of colors){const b=document.createElement('button');b.className='swatch'+(c===color?' chosen':'');b.style.backgroundColor=c;b.title='Farbe '+c;b.setAttribute('aria-label','Farbe '+c);b.addEventListener('click',()=>{color=c;eraser=false;document.querySelectorAll('.swatch').forEach(x=>x.classList.remove('chosen'));b.classList.add('chosen');$('eraser').classList.remove('chosen')});$('colors').append(b)}
document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{size=Number(b.dataset.size);document.querySelectorAll('[data-size]').forEach(x=>x.classList.remove('chosen'));b.classList.add('chosen')}));
$('eraser').addEventListener('click',()=>{eraser=!eraser;$('eraser').classList.toggle('chosen',eraser)});
$('undo').addEventListener('click',()=>{
 if(undoBusy||!frozen||history.length===0)return;
 undoBusy=true;controls();
 try{restore(history.pop())}catch(e){history=[];say('Rückgängig fehlgeschlagen: '+e.message)}
 finally{undoBusy=false;controls()}
});
$('clear').addEventListener('click',()=>{if(!frozen)return;saveHistory();ctx.clearRect(0,0,canvas.width,canvas.height);items=[];selected=null;renderStickers();controls()});
$('tab-stickers').addEventListener('click',()=>setMode('stickers'));$('tab-paint').addEventListener('click',()=>setMode('paint'));
$('smaller').addEventListener('click',()=>resizeSticker(.85));$('larger').addEventListener('click',()=>resizeSticker(1.18));$('remove-sticker').addEventListener('click',removeSticker);$('finish-sticker').addEventListener('click',finishSticker);

// Zusammengesetztes Foto: Hintergrund, Zeichnungen und Accessoires ohne Auswahlrahmen.
function loadAccessory(type){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Accessoire konnte nicht geladen werden: '+type));im.src=accessoryImages[type]})}
async function savePhoto(){
 if(!frozen||saving)return;
 saving=true;controls();say('Fertiges Foto wird gespeichert …');
 try{
  if(!sdk.photos||typeof sdk.photos.save!=='function')throw new Error('Die Foto-Speicher-API fehlt.');
  const out=document.createElement('canvas');out.width=photo.width;out.height=photo.height;
  const c=out.getContext('2d');c.drawImage(photo,0,0);c.drawImage(canvas,0,0);
  // Sticker liegen im Editor in einer Prozent-Box; die Darstellung ist auf 160:100 normiert.
  for(const item of items){
   const im=await loadAccessory(item.type);
   const w=out.width*item.width/100;
   const h=out.height*(item.width/160);
   const x=out.width*item.x/100-w/2;
   const y=out.height*item.y/100-h/2;
   c.drawImage(im,x,y,w,h);
  }
  const blob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('PNG konnte nicht erzeugt werden')),'image/png'));
  const result=await sdk.photos.save(blob);
  say('✓ Foto gespeichert!'+(result?.id?' ID: '+result.id:''));
 }catch(e){say('Speichern fehlgeschlagen: '+(e?.message||String(e)))}
 finally{saving=false;controls()}
}
$('save-photo').addEventListener('click',()=>void savePhoto());

delay.addEventListener('change',controls);$('scan').addEventListener('click',()=>void scan());$('start').addEventListener('click',()=>void start());$('stop').addEventListener('click',()=>void stop());$('freeze').addEventListener('click',beginCountdown);$('cancel').addEventListener('click',()=>{cancelCountdown();say('Countdown abgebrochen. Livebild läuft weiter.')});$('resume').addEventListener('click',resume);
window.addEventListener('resize',()=>{if(frozen)updateStickerBox()});
sdk.on('camera.stopped',()=>{if(frozen)return;void stop(false);say('Kamera über die MuPiBox-Leiste ausgeschaltet.')});sdk.on('lifecycle.pause',()=>{if(frozen)return;void stop()});window.addEventListener('pagehide',()=>void stop());setMode('stickers');void scan();
// Galerie: Alle Aktionen erfolgen ausschliesslich ueber die Host-Foto-API.
let galleryOpen=false,galleryEntries=[],gallerySelected=null,galleryLoading=false;
const galleryUrls=new Map();
const gallerySay=message=>{$('gallery-status').textContent=message};
function galleryRevoke(){for(const url of galleryUrls.values())if(url.startsWith('blob:'))URL.revokeObjectURL(url);galleryUrls.clear()}
function galleryNormalizeList(value){const entries=Array.isArray(value)?value:Array.isArray(value?.photos)?value.photos:Array.isArray(value?.items)?value.items:[];return entries.map(x=>typeof x==='string'?{id:x}:x).filter(x=>x&&typeof x.id==='string'&&x.id.length>0)}
function galleryDataUrl(result){
 if(typeof result==='string'&&result.startsWith('data:image/'))return result;
 if(result instanceof Blob)return URL.createObjectURL(result);
 if(result?.blob instanceof Blob)return URL.createObjectURL(result.blob);
 if(typeof result?.image==='string'&&result.image.startsWith('data:image/'))return result.image;
 if(typeof result?.dataUrl==='string'&&result.dataUrl.startsWith('data:image/'))return result.dataUrl;
 if(typeof result?.data_url==='string'&&result.data_url.startsWith('data:image/'))return result.data_url;
 const raw=result?.base64||result?.data;
 if(typeof raw==='string'&&/^[A-Za-z0-9+/=]+$/.test(raw))return 'data:'+(result?.mime||result?.mimeType||'image/png')+';base64,'+raw;
 throw new Error('Unbekanntes Bildformat der Foto-API');
}
async function galleryImage(id){if(galleryUrls.has(id))return galleryUrls.get(id);const result=await sdk.photos.get(id);const url=galleryDataUrl(result);galleryUrls.set(id,url);return url}
function gallerySwitch(open){galleryOpen=open;$('editor-view').hidden=open;$('gallery-view').hidden=!open;$('show-gallery').classList.toggle('chosen',open);$('show-camera').classList.toggle('chosen',!open);if(open){if(active&&!frozen)void stop();void galleryLoad()}else{galleryCloseDetail();galleryRevoke()}}
async function galleryLoad(){if(galleryLoading)return;galleryLoading=true;galleryCloseDetail();galleryRevoke();$('gallery-grid').replaceChildren();gallerySay('Fotos werden geladen …');try{
 if(!sdk.photos?.list||!sdk.photos?.get||!sdk.photos?.delete)throw new Error('Die Galerie-API fehlt in dieser Plugin-Version.');
 const result=await sdk.photos.list();galleryEntries=galleryNormalizeList(result);
 gallerySay(galleryEntries.length?galleryEntries.length+' Foto(s) gespeichert. Foto antippen zum Ansehen.':'Noch keine gespeicherten Fotos.');
 for(const entry of galleryEntries){const tile=document.createElement('button');tile.className='gallery-tile';const img=document.createElement('img');img.alt='Foto';const label=document.createElement('span');label.textContent=entry.name||entry.filename||entry.id.slice(0,20);tile.append(img,label);tile.addEventListener('click',()=>void galleryOpenDetail(entry.id));$('gallery-grid').append(tile);
 // Einzelne Ladefehler duerfen die restliche Galerie nicht blockieren.
 void galleryImage(entry.id).then(url=>{if(tile.isConnected)img.src=url}).catch(()=>{if(tile.isConnected)label.textContent='Bild nicht ladbar'});
 }
 }catch(e){gallerySay('Galerie fehlgeschlagen: '+(e?.message||String(e)))}finally{galleryLoading=false}}
async function galleryOpenDetail(id){gallerySelected=id;$('gallery-grid').hidden=true;$('gallery-detail').hidden=false;$('gallery-large').removeAttribute('src');gallerySay('Foto wird geladen …');try{const url=await galleryImage(id);if(gallerySelected!==id)return;$('gallery-large').src=url;gallerySay('Foto ansehen oder einzeln löschen.')}catch(e){gallerySay('Foto konnte nicht geladen werden: '+e.message)}}
function galleryCloseDetail(){gallerySelected=null;$('gallery-grid').hidden=false;$('gallery-detail').hidden=true;$('gallery-confirm').hidden=true;$('gallery-large').removeAttribute('src')}
async function galleryDelete(){const id=gallerySelected;if(!id)return;$('delete-yes').disabled=true;gallerySay('Foto wird gelöscht …');try{await sdk.photos.delete(id);galleryCloseDetail();galleryLoading=false;await galleryLoad();gallerySay('Foto gelöscht. '+galleryEntries.length+' Foto(s) verbleiben.')}catch(e){gallerySay('Löschen fehlgeschlagen: '+(e?.message||String(e)));$('gallery-confirm').hidden=true}finally{$('delete-yes').disabled=false}}
$('show-gallery').addEventListener('click',()=>gallerySwitch(true));$('show-camera').addEventListener('click',()=>gallerySwitch(false));$('refresh-gallery').addEventListener('click',()=>void galleryLoad());$('gallery-back').addEventListener('click',galleryCloseDetail);$('gallery-delete').addEventListener('click',()=>{if(gallerySelected)$('gallery-confirm').hidden=false});$('delete-cancel').addEventListener('click',()=>{$('gallery-confirm').hidden=true});$('delete-yes').addEventListener('click',()=>void galleryDelete());
})();
