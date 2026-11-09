(()=>{'use strict';const $=id=>document.getElementById(id),shelf=$('shelf'),reader=$('reader'),viewport=$('viewport');let henText=["Es war einmal eine Henne und ein Adler, die Freunde waren. Sie lebten friedlich mit all den anderen Vögeln. Keiner von ihnen konnte fliegen.", "Eines Tages überkam eine Hungersnot das Land. Adler musste sehr weit laufen, um Essen zu finden. Sie kam sehr müde zurück. „Es muss eine leichtere Art der Fortbewegung geben!“, rief Adler.", "Nach einer erholsamen Nacht hatte Henne eine großartige Idee. Sie machte sich daran, alle ausgefallenen Federn ihrer Vogelfreunde einzusammeln. „Lasst uns sie über unsere eigenen Federn nähen“, meinte sie. „Vielleicht wird so die Fortbewegung leichter.“", "Adler war die einzige mit einer Nadel, also nähte sie zuerst. Sie nähte sich ein Paar wunderschöne Flügel und flog hoch über Henne. Henne borgte sich die Nadel, aber sie verlor schnell die Lust am Nähen. Sie ließ die Nadel auf dem Schrank und ging in die Küche, um Essen für ihre Kinder zu machen.", "Aber die anderen Vögel hatten Adler davonfliegen sehen. Sie baten Henne, ihnen die Nadel zu leihen, um sich selbst auch Flügel zu nähen. Schon bald flogen am ganzen Himmel Vögel.", "Als der letzte Vogel die geliehene Nadel zurückbrachte, war Henne nicht da. Also nahmen ihre Kinder die Nadel und spielten damit. Als sie keine Lust mehr am Spielen hatten, ließen sie die Nadel im Sand liegen.", "Später am Nachmittag kam Adler zurück. Sie fragte nach der Nadel, um einige Federn, die sich beim Flug gelockert hatten, zu reparieren. Henne sah auf dem Schrank nach. Sie sah in der Küche nach. Sie sah im Garten nach. Aber die Nadel war nirgends zu finden.", "„Gib mir bloß einen Tag“, bat Henne Adler. „Dann kannst du deinen Flügel reparieren und davonfliegen, um Essen zu holen.“ „Nur ein Tag“, sagte Adler, „Wenn du die Nadel bis dann nicht findest, musst du mir eins deiner Küken zur Wiedergutmachung geben.“", "Als Adler am nächsten Tag vorbeikam, fand sie Henne im Sand scharren, aber ohne Nadel. Daher ging Adler in den Sturzflug und schnappte sich eins der Küken. Sie trug es davon. Seitdem, immer wenn Adler auftaucht, sieht sie Henne im Sand auf der Suche nach der Nadel scharren.", "Wenn Adlers Flügel Schatten auf den Boden werfen, warnt Henne ihre Küken: „Meidet das freie und trockene Land.“ Und sie antworten: „Wir sind keine Narren. Wir werden laufen.“"];fetch("books/henne-und-adler/text/pages.json").then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(data=>{if(Array.isArray(data.pages)){const values=data.pages.map(p=>p.text);if(values.length===10){henText=values;if(book==="henne"&&!reader.hidden)show()}}}).catch(()=>{});let book='ole',current=1,zoomed=false;
let shelfEntries=[],shelfPage=0,shelfCols=3,shelfRows=2;
const bookInfo=Object.assign(Object.create(null),{ole:{pageCount:15,title:'Ole und der verschwundene Knopf',imagePattern:'images/{page:02d}.jpg',layout:'full-page'},henne:{pageCount:10,title:'Henne und Adler',imagePattern:'images/{page_plus_one:02d}.jpg',layout:'image-and-text'}});
const bookFolder=Object.assign(Object.create(null),{ole:'ole',henne:'henne-und-adler'});const bookTexts=Object.create(null);
const pageFiles=Object.assign(Object.create(null),{ole:[],henne:[]});const MAX_PAGES=200;

// SMB files remain content: no raw SMB/HTTP routes and no executable image formats.
const sharedBooks=Object.create(null);
let shelfLoad=0,coverRender=0,pageRender=0,pageObjectURL=null;
const coverURLs=new Set();
const shared=()=>window.MuPiBoxSDK?.shared;
function safeImage(path){return typeof path==='string'&&/^images\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(jpe?g|png|webp|gif)$/i.test(path)&&!path.includes('..')}
function safePattern(pattern){
 if(typeof pattern!=='string'||pattern.length>160)return false;
 const tokens=pattern.match(/\{(?:page|page_plus_one)(?::0?[1-4]d)?\}/g);
 return tokens?.length===1&&safeImage(pattern.replace(tokens[0],'01'));
}
function validSharedInfo(info){
 if(!info||typeof info!=='object'||Array.isArray(info)||typeof info.title!=='string'||!info.title.trim()||info.title.length>300)throw Error('Ungültiger Buchtitel');
 if(!safeImage(info.cover)||!safePattern(info.imagePattern))throw Error('Ungültiger Bildpfad');
 if(info.layout!==undefined&&!['full-page','image-and-text'].includes(info.layout))throw Error('Ungültiges Layout');
 if(info.text!==undefined&&(typeof info.text!=='string'||!/^text\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.json$/.test(info.text)||info.text.includes('..')))throw Error('Ungültiger Textpfad');
 return {title:info.title,cover:info.cover,imagePattern:info.imagePattern,layout:info.layout||'full-page',text:info.text,pageCount:1,attribution:attributionInfo(info)};
}
async function readSharedJSON(path){
 const blob=await shared().read(path);
 if(!(blob instanceof Blob)||blob.size>256*1024)throw Error('JSON fehlt oder ist zu groß');
 return JSON.parse(await blob.text());
}
async function sharedImage(path){
 const blob=await shared().read(path);
 if(!(blob instanceof Blob)||!blob.size||blob.size>8*1024*1024)throw Error('Bild fehlt oder ist zu groß');
 // Check raster signatures even if the host supplied a generic MIME type.
 const b=new Uint8Array(await blob.slice(0,12).arrayBuffer());
 let type;
 if(b[0]===255&&b[1]===216&&b[2]===255)type='image/jpeg';
 else if([137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))type='image/png';
 else if(String.fromCharCode(...b.slice(0,6)).match(/^GIF8[79]a$/))type='image/gif';
 else if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')type='image/webp';
 else throw Error('Kein unterstütztes Rasterbild');
 return URL.createObjectURL(new Blob([blob],{type}));
}
function releasePage(){++pageRender;if(pageObjectURL){URL.revokeObjectURL(pageObjectURL);pageObjectURL=null}}
function releaseCovers(){++coverRender;for(const url of coverURLs)URL.revokeObjectURL(url);coverURLs.clear()}
window.addEventListener('pagehide',()=>{++shelfLoad;releasePage();releaseCovers()});
async function loadSharedShelf(generation){
 if(typeof shared()?.read!=='function'||typeof shared()?.list!=='function')return;
 try{
  const folders=new Map(),validFolder=n=>typeof n==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(n);
  const add=name=>{if(validFolder(name)&&folders.size<60)folders.set(name,{path:'books/'+name,key:'smb:'+name})};
  // The optional index controls ordering; discovery stays inside the books/
  // directory declared by sharedDirectories in the manifest.
  try{
   const data=await readSharedJSON('books/index.json');
   if(!Array.isArray(data?.books))throw Error('books muss ein Array sein');
   for(const name of data.books)add(name);
  }catch(e){console.warn('Optionale SMB-Bücherliste nicht verfügbar:',e)}
  if(generation!==shelfLoad)return;
  try{
   const listing=await shared().list('books');
   for(const entry of listing.entries){if(entry?.isDir===true)add(entry.name)}
   if(listing.truncated)console.warn('SMB-Buchverzeichnis wurde gekürzt');
  }catch(e){console.warn('SMB-Buchverzeichnis nicht verfügbar:',e)}
  const entries=[];
  // Sequential metadata reads keep bridge load bounded on the Raspberry Pi.
  for(const {path:folder,key} of folders.values()){
   if(generation!==shelfLoad)return;
   try{
    const info=validSharedInfo(await readSharedJSON(folder+'/book.json'));
    entries.push({folder:key,sourceFolder:folder,title:info.title,cover:info.cover,info});
   }catch(e){console.warn('SMB-Buch übersprungen:',folder,e)}
  }
  if(generation!==shelfLoad||!reader.hidden)return;
  for(const entry of entries){
   const key=entry.folder;
   sharedBooks[key]=entry.sourceFolder;bookFolder[key]=entry.sourceFolder;
   bookInfo[key]=entry.info;pageFiles[key]=[];delete bookTexts[key];
   shelfEntries.push(entry);
  }
  renderShelf();
 }catch(e){console.warn('Zusätzliche SMB-Bücher nicht verfügbar:',e)}
}
async function loadSharedBook(which){
 const folder=sharedBooks[which],info=bookInfo[which];
 if(info.text){try{
  const data=await readSharedJSON(folder+'/'+info.text);
  if(Array.isArray(data?.pages))bookTexts[which]=data.pages.slice(0,MAX_PAGES).map(p=>typeof p==='string'?p:typeof p?.text==='string'?p.text:'');
 }catch(e){console.warn('SMB-Buchtext nicht geladen:',e)}}
}
async function scanSharedPages(which){
 const folder=sharedBooks[which];
 const listing=await shared().list(folder+'/images');
 if(listing.truncated)throw Error('Bildverzeichnis ist zu groß');
 const names=new Set(listing.entries.filter(e=>!e.isDir&&typeof e.name==='string').map(e=>'images/'+e.name));
 const result=[];let misses=0;
 for(let p=1;p<=MAX_PAGES&&misses<2;p++){
  const original=getImagePath(which,p),relative=original.slice((folder+'/').length);
  const root=relative.replace(/\.(jpe?g|png|webp|gif)$/i,'');
  const candidates=[relative,...(root!==relative?['jpg','jpeg','png','webp','gif','JPG','JPEG','PNG','WEBP','GIF'].map(ext=>root+'.'+ext):[])];
  const found=candidates.find(path=>safeImage(path)&&names.has(path));
  if(found){result.push(folder+'/'+found);misses=0}else misses++;
 }
 if(!result.length)throw Error('Keine SMB-Buchseiten gefunden');
 pageFiles[which]=result;bookInfo[which].pageCount=result.length;
}

function getImageTotal(which){return pageFiles[which].length||Math.max(1,Number(bookInfo[which].pageCount)||1)}
function getTotal(){return getBookTotal(book)}
function attributionInfo(info){
 const text=value=>typeof value==='string'?value.trim().slice(0,500):'';
 const fields={author:text(info.author),illustrator:text(info.illustrator),translator:text(info.translator),license:text(info.license),source:text(info.source),licenseURL:text(info.license_url)};
 return fields.author&&fields.license?fields:null;
}
function isAttributionPage(){return Boolean(bookInfo[book].attribution)&&current===getImageTotal(book)+1}
function renderAttribution(){
 const panel=$('attribution-page'),info=bookInfo[book],credits=info.attribution;
 panel.replaceChildren();
 const card=document.createElement('article');card.className='attribution-card';
 const heading=document.createElement('h2');heading.textContent=info.title;card.appendChild(heading);
 const sub=document.createElement('p');sub.className='attribution-heading';sub.textContent='Urheber und Lizenz';card.appendChild(sub);
 for(const [label,value] of [['Text',credits.author],['Illustrationen',credits.illustrator],['Deutsche Übersetzung',credits.translator],['Lizenz',credits.license],['Quelle',credits.source],['Lizenzadresse',credits.licenseURL]]){
  if(!value)continue;
  const line=document.createElement('p'),name=document.createElement('strong'),content=document.createElement('span');
  name.textContent=label+': ';content.textContent=value;line.appendChild(name);line.appendChild(content);card.appendChild(line);
 }
 panel.appendChild(card);panel.hidden=false;
 $('page').hidden=true;$('page').removeAttribute('src');$('henne-page').hidden=true;$('henne-image').removeAttribute('src');$('credits').hidden=true;$('backdrop').style.backgroundImage='none';
}

function getImagePath(which,page){
 const info=bookInfo[which],folder=bookFolder[which];
 const pattern=info.imagePattern||'images/{page:02d}.jpg';
 return (sharedBooks[which]||'books/'+folder)+'/'+pattern.replace(/\{(page|page_plus_one)(?::0?(\d+)d)?\}/g,(_,kind,width)=>String(page+(kind==='page_plus_one'?1:0)).padStart(Number(width)||1,'0'));
}
async function loadBookInfo(which){
 if(sharedBooks[which])return loadSharedBook(which);
 try{
  const response=await fetch('books/'+bookFolder[which]+'/book.json?ts='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const info=await response.json();
  bookInfo[which].attribution=attributionInfo(info);
  // pageCount is optional: available image files determine the real number of pages.
  if(typeof info.title==='string'&&info.title)bookInfo[which].title=info.title;
  if(typeof info.layout==='string')bookInfo[which].layout=info.layout;
  if(typeof info.text==='string'&&/^text\/[a-zA-Z0-9_.-]+\.json$/.test(info.text)){try{const tr=await fetch('books/'+bookFolder[which]+'/'+info.text+'?ts='+Date.now(),{cache:'no-store'});if(tr.ok){const td=await tr.json();if(Array.isArray(td.pages))bookTexts[which]=td.pages.map(p=>typeof p==='string'?p:(p.text||''));}}catch(e){console.warn('Buchtext nicht geladen',which,e)}}
  if(typeof info.imagePattern==='string'&&/^images\/[a-zA-Z0-9_{}:.\/-]+$/.test(info.imagePattern)&&!info.imagePattern.includes('..'))bookInfo[which].imagePattern=info.imagePattern;
 }catch(err){console.warn('Buchinformationen nicht geladen:',which,err)}
 updateShelfCount(which);
}
function updateShelfCount(which){
 const el=null;
 // Die Regalansicht zeigt bewusst keine Seitenzahl.
}
function getBookTotal(which){return getImageTotal(which)+(bookInfo[which].attribution?1:0)}
// Probe file existence without decoding the image. Try common image formats.
// Stop after two consecutive missing page numbers; keep Pi 4 requests bounded.
async function existsImage(url){
 try{
  let r=await fetch(url,{method:'HEAD',cache:'no-store'});
  if(r.status===405||r.status===501){r=await fetch(url,{headers:{Range:'bytes=0-0'},cache:'no-store'});if(r.body)await r.body.cancel().catch(()=>{});}
  return r.ok;
 }catch(e){console.warn('Bildprüfung fehlgeschlagen',url,e);return false;}
}
async function scanPages(which){
 if(sharedBooks[which])return scanSharedPages(which);
 const result=[],base=bookInfo[which].imagePattern||'images/{page:02d}.jpg';
 let misses=0;
 for(let p=1;p<=MAX_PAGES&&misses<2;p++){
  const original=getImagePath(which,p);
  const candidates=[original];
  const root=original.replace(/\.(jpe?g|png)$/i,'');
  if(root!==original){for(const ext of ['jpg','jpeg','png','JPG','JPEG','PNG']){const path=root+'.'+ext;if(!candidates.includes(path))candidates.push(path);}}
  let found=null;
  for(const path of candidates){if(await existsImage(path)){found=path;break;}}
  if(found){result.push(found);misses=0;}else misses++;
 }
 if(result.length){pageFiles[which]=result;bookInfo[which].pageCount=result.length;}
 else console.warn('Keine Buchbilder gefunden, bisherige Seitenliste bleibt aktiv:',which);
 updateShelfCount(which);
}
function pagePath(which,page){return pageFiles[which][page-1]||getImagePath(which,page)}
function fitHenneText(){
  const panel=$('henne-page'), image=$('henne-image'), el=$('henne-text');
  if(bookInfo[book].layout!=='image-and-text'||reader.hidden||zoomed||panel.hidden)return;
  const cs=getComputedStyle(panel);
  const padX=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
  const padY=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
  const gap=parseFloat(cs.columnGap)||10;
  // Both squares are exactly equal and sized to the ACTUAL plugin viewport.
  const square=Math.max(1,Math.floor(Math.min(panel.clientHeight-padY,(panel.clientWidth-padX-gap)/2)));
  panel.style.setProperty('--square-size',square+'px');
  const inner=$('henne-text-inner');
  if(!inner||!inner.textContent)return;
  const available=el.clientHeight-(parseFloat(getComputedStyle(el).paddingTop)||0)-(parseFloat(getComputedStyle(el).paddingBottom)||0)-5;
  if(available<20)return;
  // Measure actual wrapped text, not a character count or estimated line count.
  // scrollHeight on the inner text node remains reliable with flex centering.
  let lo=8,hi=38,best=8;
  for(let i=0;i<17;i++){
    const mid=(lo+hi)/2;
    inner.style.fontSize=mid+'px';
    inner.style.lineHeight='1.2';
    if(inner.scrollHeight<=available){best=mid;lo=mid}else{hi=mid;}
  }
  inner.style.fontSize=Math.max(8,best-0.35).toFixed(2)+'px';
  for(let i=0;i<12&&inner.scrollHeight>available;i++){
    inner.style.fontSize=Math.max(8,parseFloat(inner.style.fontSize)-0.5).toFixed(2)+'px';
  }
}
function show(){
 releasePage();
 if(isAttributionPage()){renderPage('');return}
 $('attribution-page').hidden=true;
 if(sharedBooks[book]){
  const generation=pageRender,which=book,page=current;
  $('page').removeAttribute('src');$('henne-image').removeAttribute('src');$('backdrop').style.backgroundImage='none';
  renderPage('');
  sharedImage(pagePath(which,page)).then(url=>{
   if(generation!==pageRender||reader.hidden){URL.revokeObjectURL(url);return}
   pageObjectURL=url;renderPage(url);
  }).catch(e=>{if(generation===pageRender)console.warn('SMB-Seite nicht geladen:',e)});
 }else renderPage(pagePath(book,current));
}
function renderPage(resolved){let total=getTotal();if(isAttributionPage()){renderAttribution();updatePageControls();return}if(bookInfo[book].layout!=='image-and-text'){let src=resolved;if(src)$('page').src=src;else $('page').removeAttribute('src');$('page').hidden=false;$('henne-page').hidden=true;$('backdrop').style.backgroundImage=src?'url("'+src+'")':'none';$('credits').hidden=true;}else{$('page').hidden=true;$('henne-page').hidden=false;if(resolved)$('henne-image').src=resolved;else $('henne-image').removeAttribute('src');$('henne-image').onload=()=>requestAnimationFrame(fitHenneText);$('henne-text').innerHTML='';const textInner=document.createElement('div');textInner.id='henne-text-inner';textInner.textContent=(bookTexts[book]||(sharedBooks[book]?[]:henText))[current-1]||'';$('henne-text').appendChild(textInner);$('credits').hidden=book!=='henne';requestAnimationFrame(fitHenneText);}updatePageControls()}
function updatePageControls(){const total=getTotal();$('counter').textContent=current+' / '+total;$('prev').disabled=current===1;$('next').disabled=current===total;viewport.scrollTop=0;viewport.scrollLeft=0;if(bookInfo[book].layout==='image-and-text')requestAnimationFrame(fitHenneText)}function zoom(on){zoomed=on;viewport.classList.toggle('zoom',on);reader.classList.toggle('zoomed',on);$('zoom').textContent=on?'⊟ Ganz':'⌕ Zoom';viewport.scrollTop=0;viewport.scrollLeft=0;if(!on&&bookInfo[book].layout==='image-and-text')requestAnimationFrame(fitHenneText)}async function open(which){++shelfLoad;book=which;current=1;shelf.hidden=true;reader.hidden=false;$('app-exit').hidden=true;reader.classList.toggle('henne',bookInfo[book].layout==='image-and-text');$('reader-title').textContent=bookInfo[which].title;zoom(false);show();try{await loadBookInfo(which);await scanPages(which)}catch(e){console.warn('Buch nicht vollständig geladen:',which,e)}if(book!==which||reader.hidden)return;$('reader-title').textContent=bookInfo[which].title;show()}
async function loadShelf(){
 const generation=++shelfLoad;
 const holder=document.querySelector('#shelf .books');
 try{
  const response=await fetch('books/index.json?ts='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.books))throw Error('books muss ein Array sein');
  const folders=[...new Set(data.books.filter(n=>typeof n==='string'&&/^[a-zA-Z0-9_-]+$/.test(n)))].slice(0,60);
  const entries=await Promise.all(folders.map(async folder=>{
   try{
    const r=await fetch('books/'+folder+'/book.json?ts='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw Error('HTTP '+r.status);
    const info=await r.json();
    if(!info||typeof info.title!=='string'||!info.title.trim())throw Error('Titel fehlt');
    const cover=typeof info.cover==='string'&&/^images\/[a-zA-Z0-9_.-]+$/.test(info.cover)?info.cover:'images/01.jpg';
    return {folder,info,cover};
   }catch(e){console.warn('Buch übersprungen:',folder,e);return null}
  }));
  if(generation!==shelfLoad||!reader.hidden)return;
  shelfEntries=[];
  for(const entry of entries.filter(Boolean)){
   const {folder,info,cover}=entry;
   bookFolder[folder]=folder;
   bookInfo[folder]={title:info.title,pageCount:1,imagePattern:info.imagePattern||'images/{page:02d}.jpg',layout:info.layout||'full-page',attribution:attributionInfo(info)};
   pageFiles[folder]=[];
   shelfEntries.push({folder,title:info.title,cover});
  }
  if(!shelfEntries.length)throw Error('Keine gültigen Bücher gefunden');
  shelfPage=Math.min(shelfPage,Math.ceil(shelfEntries.length/booksPerPage())-1);
  renderShelf();
 }catch(e){console.warn('Bücherliste nicht geladen:',e);if(!holder.children.length)holder.textContent='Bücherliste nicht verfügbar';}
 if(generation===shelfLoad)void loadSharedShelf(generation);
}
function booksPerPage(){measureShelf();return shelfCols*shelfRows;}
function measureShelf(){
 const w=window.innerWidth,h=window.innerHeight;
 shelfCols=w<540?2:3;
 shelfRows=h<315?1:2;
 document.documentElement.style.setProperty('--shelf-cols',shelfCols);
 document.documentElement.style.setProperty('--shelf-rows',shelfRows);
}
function renderShelf(){
 releaseCovers();const generation=coverRender;
 measureShelf();
 const holder=document.querySelector('#shelf .books'),pager=document.querySelector('.shelf-pager');
 const per=booksPerPage(),pages=Math.max(1,Math.ceil(shelfEntries.length/per));
 shelfPage=Math.max(0,Math.min(shelfPage,pages-1));
 holder.replaceChildren();
 const slice=shelfEntries.slice(shelfPage*per,(shelfPage+1)*per);
 for(let i=0;i<per;i++){
  const slot=document.createElement('div');slot.className='book-slot';
  const entry=slice[i];
  if(entry){
   const btn=document.createElement('button');btn.className='book';btn.type='button';btn.setAttribute('aria-label',entry.title);btn.title=entry.title;
   const img=document.createElement('img');if(!sharedBooks[entry.folder])img.src='books/'+entry.folder+'/'+entry.cover;else sharedImage(sharedBooks[entry.folder]+'/'+entry.cover).then(url=>{if(generation!==coverRender){URL.revokeObjectURL(url);return}coverURLs.add(url);img.src=url}).catch(e=>console.warn('SMB-Cover nicht geladen:',e));img.alt=entry.title;img.loading='eager';
   // 0.2.19: Buchruecken exakt an die sichtbare Covergroesse anpassen.
   // Keine feste Hoehe, keine braunen Streifen ueber/unter dem Buch.
   const spineColors=['#c82132','#1974d2','#23944e','#8a4bb9','#d9a31a','#008fae'];
   const spineIndex=entry.folder==='ole'?0:entry.folder==='henne-und-adler'?1:
      Array.from(entry.folder).reduce((n,ch)=>n+ch.charCodeAt(0),0)%spineColors.length;
   btn.style.setProperty('--spine-color',spineColors[spineIndex]);
   const fitSpine=()=>{
     if(!img.isConnected||!img.offsetHeight)return;
     btn.style.setProperty('--spine-left',(img.offsetLeft-7)+'px');
     btn.style.setProperty('--spine-bottom',(btn.clientHeight-img.offsetTop-img.offsetHeight)+'px');
     btn.style.setProperty('--spine-height',img.offsetHeight+'px');
   };
   img.addEventListener('load',()=>requestAnimationFrame(fitSpine),{once:true});
   btn.appendChild(img);btn.onclick=()=>{if(Date.now()-lastShelfSwipe>350)open(entry.folder)};slot.appendChild(btn);
   requestAnimationFrame(fitSpine);
  }
  holder.appendChild(slot);
 }
 pager.replaceChildren();
 if(pages>1){
  for(let i=0;i<pages;i++){const dot=document.createElement('button');dot.type='button';dot.className='pager-dot'+(i===shelfPage?' active':'');dot.setAttribute('aria-label','Regalseite '+(i+1));dot.setAttribute('aria-current',i===shelfPage?'page':'false');dot.onclick=()=>{shelfPage=i;renderShelf()};pager.appendChild(dot)}
 }
}
function changeShelfPage(direction){const pages=Math.max(1,Math.ceil(shelfEntries.length/booksPerPage()));const next=Math.max(0,Math.min(pages-1,shelfPage+direction));if(next!==shelfPage){shelfPage=next;renderShelf()}}
let touchStart=null,lastShelfSwipe=0;
shelf.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:true});
shelf.addEventListener('touchend',e=>{if(!touchStart||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){lastShelfSwipe=Date.now();changeShelfPage(dx<0?1:-1)}},{passive:true});
$('app-exit').onclick=async()=>{
 const button=$('app-exit');
 if(button.disabled)return;
 button.disabled=true;
 try{
  const sdk=window.MuPiBoxSDK;
  if(typeof sdk?.exit!=='function')throw Error('MuPiBox-SDK nicht verfügbar');
  await sdk.exit();
 }catch(e){console.warn('Rückkehr zur MuPiBox fehlgeschlagen:',e)}
 finally{button.disabled=false}
};
loadShelf();
$('back').onclick=()=>{releasePage();$('page').removeAttribute('src');$('henne-image').removeAttribute('src');$('backdrop').style.backgroundImage='none';reader.hidden=true;shelf.hidden=false;$('app-exit').hidden=false;loadShelf()};function turn(d){let total=getTotal();let n=Math.max(1,Math.min(total,current+d));if(n!==current){current=n;show()}}$('prev').onclick=()=>turn(-1);$('next').onclick=()=>turn(1);$('zoom').onclick=()=>zoom(!zoomed);window.addEventListener('resize',()=>{requestAnimationFrame(fitHenneText);if(!shelf.hidden)renderShelf()});if(window.ResizeObserver){new ResizeObserver(()=>requestAnimationFrame(fitHenneText)).observe($('viewport'));}if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>requestAnimationFrame(fitHenneText));document.addEventListener('keydown',e=>{if(reader.hidden){if(e.key==='ArrowRight')changeShelfPage(1);if(e.key==='ArrowLeft')changeShelfPage(-1);return;}if(e.key==='ArrowRight')turn(1);if(e.key==='ArrowLeft')turn(-1);if(e.key==='Escape')$('back').click()})})();
