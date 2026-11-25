(() => {
'use strict';
const sdk=window.MuPiBoxAdminSDK;
const $=id=>document.getElementById(id);
const state=$('state'),list=$('book-list'),pages=$('pages'),texts=$('texts');
let books=[],selected=null,bookInfo=null,bookRevision='',pageItems=[],pageText=[],textRevision='',ttsRevision='',urls=[];
const busy=new Set();
const slugOK=v=>/^[A-Za-z0-9_-]{1,80}$/.test(v);
const fullPath=part=>'books/'+selected+'/'+part;
const notice=(message,error=false)=>{state.textContent=message;state.classList.toggle('error',error)};
async function operation(name,fn){
 if(busy.size)return;
 busy.add(name);
 try{await fn()}catch(e){notice(e.message||String(e),true)}
 finally{busy.delete(name)}
}
const jsonBlob=obj=>new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
async function readJSON(name){
 const file=await sdk.files.read(name);
 return {value:JSON.parse(await file.blob.text()),revision:file.revision};
}
async function saveJSON(name,value,revision=''){
 return sdk.files.write(name,jsonBlob(value),{expectedRevision:revision});
}
async function refresh(){
 notice('Bücher laden …');
 const found=await sdk.files.list('books');
 books=[];
 for(const row of found.entries||[]) {
  if(!row.isDir||!slugOK(row.name))continue;
  try{
   const info=(await readJSON('books/'+row.name+'/book.json')).value;
   if(typeof info.title==='string')books.push({id:row.name,title:info.title});
  }catch(e){
   // Incomplete folders remain visible for recovery rather than deleted.
   books.push({id:row.name,title:row.name+' (unvollständig)'});
  }
 }
 books.sort((a,b)=>a.title.localeCompare(b.title,'de'));
 renderList();
 notice(books.length+' Buch/Bücher vorhanden.');
}
function renderList(){
 list.replaceChildren();
 books.forEach(b=>{
  const button=document.createElement('button');
  button.type='button';button.textContent=b.title;
  button.setAttribute('aria-current',String(b.id===selected));
  button.onclick=()=>operation('open',()=>openBook(b.id));
  list.append(button);
 });
}
function clearImages(){urls.forEach(URL.revokeObjectURL);urls=[]}
function resetView(){
 clearImages();pageItems=[];pageText=[];selected=null;bookRevision='';textRevision='';
 $('editor').hidden=true;$('empty').hidden=false;renderList();
}
async function openBook(id){
 if(!slugOK(id))throw Error('Ungültiger Buchordner');
 clearImages();
 selected=id;
 bookInfo=null;
 try{
  const result=await readJSON(fullPath('book.json'));
  bookInfo=result.value;bookRevision=result.revision;
 }catch(e){
  bookInfo={title:id,cover:'images/01.jpg',
    imagePattern:'images/{page:02d}.jpg',layout:'full-page'};
  bookRevision='';
 }
 $('title').value=typeof bookInfo.title==='string'?bookInfo.title:id;
 $('slug').value=id;$('slug').disabled=true;
 $('layout').value=bookInfo.layout==='image-and-text'?'image-and-text':'full-page';
 $('editor').hidden=false;$('empty').hidden=true;
 $('heading').textContent='Buch: '+id;
 await reloadPages();
 await loadTexts();
 renderList();
 notice('Buch geladen: '+id);
}
async function reloadPages(){
 clearImages();pageItems=[];pages.replaceChildren();
 try{
  const data=await sdk.files.list(fullPath('images'));
  for(const row of data.entries||[]){
   if(row.isDir||!/^([0-9]{2,3})\.(jpe?g|png|webp|gif)$/i.test(row.name))continue;
   pageItems.push({name:row.name,path:row.path});
  }
 }catch(e){/* newly created books may have no images yet */}
 pageItems.sort((a,b)=>Number(a.name.split('.')[0])-Number(b.name.split('.')[0]));
 await drawPages();
}
async function drawPages(){
 pages.replaceChildren();
 for(const [index,page] of pageItems.entries()){
  const card=document.createElement('div');card.className='page';
  const label=document.createElement('strong');label.textContent='Seite '+(index+1);
  card.append(label);
  try{
   const content=await sdk.files.read(page.path);
   page.revision=content.revision;
   const mime=page.name.toLowerCase().endsWith('.png')?'image/png':
    page.name.toLowerCase().endsWith('.webp')?'image/webp':
    page.name.toLowerCase().endsWith('.gif')?'image/gif':'image/jpeg';
   const url=URL.createObjectURL(new Blob([content.blob],{type:mime}));
   urls.push(url);
   const image=document.createElement('img');image.src=url;image.alt='Seite '+(index+1);
   card.append(image);
  }catch(e){card.append(document.createTextNode('Bild nicht verfügbar'))}
  if(index===pageItems.length-1){
   const del=document.createElement('button');del.type='button';del.textContent='Letzte Seite entfernen';
   del.onclick=()=>operation('delete-page',async()=>{
    if(!confirm('Letzte Seite wirklich in den Papierkorb verschieben?'))return;
    await sdk.files.trash(page.path,{confirmName:page.name,expectedRevision:page.revision});
    await reloadPages();
    notice('Seite in Papierkorb verschoben.');
   });
   card.append(del);
  }
  pages.append(card);
 }
 if(!pageItems.length)pages.append(document.createTextNode('Noch keine Seitenbilder vorhanden.'));
}
async function loadTexts(){
 pageText=[];
 textRevision='';ttsRevision='';
 // Existing books may keep their read-aloud text under tts/ rather than text/.
 try{
  const result=await readJSON(fullPath('text/pages.json'));
  textRevision=result.revision;
  if(Array.isArray(result.value.pages))
   pageText=result.value.pages.map(p=>typeof p==='string'?p:String(p?.text||''));
 }catch(e){}
 try{
  const result=await readJSON(fullPath('tts/pages.json'));
  ttsRevision=result.revision;
  if(!pageText.length && Array.isArray(result.value.pages))
   pageText=result.value.pages.map(p=>typeof p==='string'?p:String(p?.text||''));
 }catch(e){}
 drawTexts();
}
function drawTexts(){
 texts.replaceChildren();
 for(let i=0;i<pageItems.length;i++){
  const wrap=document.createElement('label');
  wrap.textContent='Vorlesetext – Seite '+(i+1);
  const field=document.createElement('textarea');
  field.rows=3;field.maxLength=10000;field.value=pageText[i]||'';
  field.addEventListener('input',()=>{pageText[i]=field.value});
  wrap.append(field);texts.append(wrap);
 }
}
async function toJPEG(input) {
 if(!input.type.startsWith('image/')||input.size>8*1024*1024)
  throw Error('Bitte ein Bild bis 8 MiB wählen: '+input.name);
 const src=URL.createObjectURL(input);
 try{
  const image=new Image();image.decoding='async';
  image.src=src;await image.decode();
  const scale=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
  if(!blob||!blob.size||blob.size>8*1024*1024)throw Error('Bild konnte nicht konvertiert werden');
  return blob;
 }finally{URL.revokeObjectURL(src)}
}
async function upload(){
 if(!selected)throw Error('Bitte zuerst ein Buch auswählen');
 const inputs=Array.from($('uploads').files||[]);
 if(!inputs.length)throw Error('Keine Bilder ausgewählt');
 if(pageItems.length+inputs.length>200)throw Error('Maximal 200 Seiten pro Buch');
 const numbers=pageItems.map(p=>Number(p.name.split('.')[0]));
 let number=Math.max(0,...numbers);
 for(const file of inputs){
  const output=await toJPEG(file);
  ++number;
  const filename=String(number).padStart(2,'0')+'.jpg';
  await sdk.files.write(fullPath('images/'+filename),output,{expectedRevision:''});
 }
 $('uploads').value='';
 await reloadPages();drawTexts();
 notice(inputs.length+' Bilder hochgeladen.');
}
async function saveBook(){
 if(!selected)throw Error('Kein Buch ausgewählt');
 const title=$('title').value.trim();
 if(!title||title.length>300)throw Error('Buchtitel erforderlich (max. 300 Zeichen)');
 const info={...bookInfo,title,
  cover:bookInfo.cover||'images/01.jpg',
  imagePattern:bookInfo.imagePattern||'images/{page:02d}.jpg',
  layout:$('layout').value,
 };
 const saved=await saveJSON(fullPath('book.json'),info,bookRevision);
 bookRevision=saved.revision;bookInfo=info;
 await refresh();
 notice('Buch gespeichert.');
}
async function saveTexts(){
 if(!selected)throw Error('Kein Buch ausgewählt');
 const data={pages:pageItems.map((_,i)=>({text:(pageText[i]||'').slice(0,600)}))};
 const saved=await saveJSON(fullPath('tts/pages.json'),data,ttsRevision);
 ttsRevision=saved.revision;
 bookInfo.tts='tts/pages.json';
 if($('layout').value==='image-and-text') {
  const shown=await saveJSON(fullPath('text/pages.json'),data,textRevision);
  textRevision=shown.revision;
  bookInfo.text='text/pages.json';
 }
 await saveBook();
 notice('Vorlesetexte gespeichert.');
}
async function createBook(){
 const title=prompt('Titel des neuen Buches:');
 if(title===null)return;
 if(!title.trim()||title.length>300)throw Error('Buchtitel fehlt oder ist zu lang');
 const suggestion=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
 const id=prompt('Ordnerkennung (Buch-ID):',suggestion||'mein-buch');
 if(id===null)return;
 if(!slugOK(id))throw Error('Nur Buchstaben, Zahlen, _ und - (max. 80)');
 if(books.some(b=>b.id===id))throw Error('Buch existiert bereits');
 const metadata={title:title.trim(),cover:'images/01.jpg',imagePattern:'images/{page:02d}.jpg',layout:'full-page'};
 await saveJSON('books/'+id+'/book.json',metadata,'');
 await refresh();
 await openBook(id);
 notice('Neues Buch angelegt. Jetzt Seitenbilder hochladen.');
}
async function deleteBook(){
 if(!selected)return;
 const entered=prompt('Zum Verschieben in den Papierkorb bitte die Buch-ID eingeben: '+selected);
 if(entered!==selected){notice('Löschen abgebrochen.');return}
 await sdk.files.trash('books/'+selected,{confirmName:selected});
 const name=selected;resetView();await refresh();
 notice('Buch '+name+' in den Papierkorb verschoben.');
}
$('reload').onclick=()=>operation('refresh',refresh);
$('create').onclick=()=>operation('create',createBook);
$('save').onclick=()=>operation('save',saveBook);
$('save-texts').onclick=()=>operation('texts',saveTexts);
$('upload').onclick=()=>operation('upload',upload);
$('trash').onclick=()=>operation('trash',deleteBook);
void operation('initial',refresh);
})();