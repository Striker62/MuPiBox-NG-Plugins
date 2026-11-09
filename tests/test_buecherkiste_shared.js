'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../examples/Buecherkiste/app.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(mode='ok'){
 const nodes=new Map(),calls=[],urls=new Set(),revoked=[],events={};let next=0;
 function element(){return {hidden:false,children:[],style:{setProperty(){},backgroundImage:''},classList:{toggle(){}},addEventListener(){},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},appendChild(c){this.children.push(c)},replaceChildren(){this.children=[]},isConnected:true}}
 function get(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)}
 get('reader').hidden=true;
 const appRoot=path.join(__dirname,'../examples/Buecherkiste');
 const info=mode==='attribution'?JSON.parse(fs.readFileSync(path.join(appRoot,'books/henne-und-adler/book.json'),'utf8')):{title:'Gleicher Titel',cover:'images/01.jpg',imagePattern:'images/{page:02d}.jpg',layout:'full-page'};
 const shared={
  async read(p){calls.push(p);if(mode==='denied')throw Error('Permission denied');
   if(p==='books/index.json'){
    if(['no-index','root-books'].includes(mode))throw Error('File missing');
    if(mode==='broken-index')return new Blob(['{broken']);
    return new Blob([JSON.stringify({books:['ole','henne-und-adler1','../escape','constructor']})]);
   }
   if(p.endsWith('book.json'))return new Blob([JSON.stringify(mode==='unsafe'?{...info,imagePattern:'../secret.jpg'}:info)]);
   if(p.endsWith('pages.json'))return new Blob([JSON.stringify({pages:[{text:'<script>content</script>'}]})]);
   if(mode==='bad-image')return new Blob(['<svg onload="alert(1)">']);
   return new Blob([new Uint8Array([255,216,255,0])]);
  },
  async list(p){
   calls.push(p);if(mode==='denied')throw Error('Permission denied');
   if(p==='books'||p===''){
    const discover=['no-index','broken-index','root-books','duplicates'].includes(mode);
    const correctBase=mode==='root-books'?p==='':p==='books';
    return {entries:discover&&correctBase?['ole','henne-und-adler1'].map(name=>({name,isDir:true})).concat([{name:'../escape',isDir:true},{name:'not-a-book',isDir:false}]):[],truncated:false};
   }
   const imageNames=mode==='attribution'?fs.readdirSync(path.join(appRoot,'books/henne-und-adler/images')):['01.jpg','02.jpg','03.png'];
   return {entries:imageNames.map(name=>({name,isDir:false})),truncated:false};
  }
 };
 const context={Blob,Uint8Array,console:{warn(){}},URL:{createObjectURL(){const u='blob:'+ ++next;urls.add(u);return u},revokeObjectURL(u){urls.delete(u);revoked.push(u)}},
  window:{innerWidth:800,innerHeight:480,MuPiBoxSDK:mode==='absent'?undefined:{shared},addEventListener(n,f){events[n]=f}},
  document:{getElementById:get,querySelector:get,createElement:element,documentElement:element(),addEventListener(){}},
  requestAnimationFrame(){},fetch:async p=>{
   if(mode==='attribution'){
    const file=path.join(appRoot,p.split('?')[0]);
    return {ok:fs.existsSync(file),json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};
   }
   return {ok:true,json:async()=>p.startsWith('books/index')?{books:['ole']}:{...info}};
  }};
 // Expose lexical app functions only in this test VM, without changing shipped code.
 const exposed=source.replace(/\}\)\(\);\s*$/,`;globalThis.app={loadShelf,loadSharedShelf,scanPages,open,show,turn,validSharedInfo,sharedImage,releaseCovers,releasePage,renderShelf,bookInfo,pageFiles,bookTexts,sharedBooks,get entries(){return shelfEntries},get current(){return current}};})();`);
 vm.runInNewContext(exposed,context);
 return {...context,app:context.app,get,calls,urls,revoked,events};
}
test('SMB books append with separate identities and titles may repeat',async()=>{
 const h=setup();await tick();await tick();
 assert.equal(h.app.entries.length,4);
 assert.equal(h.app.entries[0].folder,'ole');
 assert.equal(h.app.entries[1].folder,'smb:ole');
 assert.equal(h.app.entries[0].title,h.app.entries[1].title);
 assert.ok(!h.calls.some(p=>p.includes('..')));
 assert.equal(Object.getPrototypeOf(h.app.bookInfo),null);
 await h.app.open('smb:ole');await tick();
 assert.equal(h.app.pageFiles['smb:ole'].length,3);
 assert.ok(h.get('page').src.startsWith('blob:'));
 const first=h.get('page').src;h.app.turn(1);await tick();
 assert.equal(h.app.current,2);assert.ok(h.revoked.includes(first));
 h.get('back').onclick();await tick();await tick();
 assert.ok(!h.urls.has(h.get('page').src));
 h.events.pagehide();assert.equal(h.urls.size,0);
});
test('MuPiBox exit is available in shelf, hidden in reader, and retryable after failure',async()=>{
 const h=setup();await tick();await tick();let exits=0;
 h.window.MuPiBoxSDK.exit=async()=>{exits++};
 await h.get('app-exit').onclick();assert.equal(exits,1);
 await h.app.open('smb:ole');await tick();
 assert.equal(h.get('app-exit').hidden,true);
 h.get('back').onclick();await tick();await tick();
 assert.equal(h.get('app-exit').hidden,false);
 await h.get('app-exit').onclick();assert.equal(exits,2);
 h.window.MuPiBoxSDK.exit=async()=>{throw Error('Host unavailable')};
 await h.get('app-exit').onclick();assert.equal(h.get('app-exit').disabled,false);
 h.window.MuPiBoxSDK.exit=async()=>{exits++};
 await h.get('app-exit').onclick();assert.equal(exits,3);
});
test('Henne attribution is the eleventh page for bundled and SMB copies; Ole stays at sixteen',async()=>{
 const h=setup('attribution');await tick();await tick();
 for(const key of ['henne-und-adler','smb:henne-und-adler1']){
  await h.app.open(key);await tick();
  assert.equal(h.get('counter').textContent,'1 / 11');
  h.app.turn(9);h.app.turn(1);await tick();
  assert.equal(h.get('counter').textContent,'11 / 11');
  assert.equal(h.get('attribution-page').hidden,false);
  assert.equal(h.get('page').hidden,true);assert.equal(h.get('henne-page').hidden,true);
  assert.equal(h.get('next').disabled,true);
  const card=h.get('attribution-page').children[0];
  const text=card.children.flatMap(node=>node.children.length?node.children.map(c=>c.textContent):[node.textContent]).join(' ');
  for(const value of ['Ann Nduku','Wiehan de Jager','Anna Westpfahl','CC BY 3.0','https://creativecommons.org/licenses/by/3.0/'])assert.ok(text.includes(value));
  if(key.startsWith('smb:'))assert.ok(!h.calls.some(p=>p.endsWith('/12.jpg')));
  h.app.turn(-1);await tick();
  assert.equal(h.get('counter').textContent,'10 / 11');assert.equal(h.get('attribution-page').hidden,true);
  assert.equal(h.get('henne-page').hidden,false);
 }
 await h.app.open('ole');await tick();assert.equal(h.get('counter').textContent,'1 / 16');
 h.app.turn(100);assert.equal(h.get('counter').textContent,'16 / 16');assert.equal(h.get('attribution-page').hidden,true);
});
for(const mode of ['denied','absent','unsafe'])test(mode+' preserves bundled shelf',async()=>{
 const h=setup(mode);await tick();await tick();assert.equal(h.app.entries.length,1);
 assert.equal(h.app.entries[0].folder,'ole');
});
test('external metadata and image signatures reject executable or escaping content',async()=>{
 const h=setup('bad-image');await tick();await tick();
 for(const patch of [{cover:'images/../secret.jpg'},{imagePattern:'https://evil/{page}.jpg'},{text:'text/../secret.json'},{layout:'html'},{imagePattern:'images/{page:099d}.jpg'}])assert.throws(()=>h.app.validSharedInfo({...h.app.bookInfo['smb:ole'],cover:'images/01.jpg',...patch}));
 await assert.rejects(h.app.sharedImage('books/ole/images/01.jpg'));
 assert.equal(h.urls.size,0);
});
test('outdated cover and page requests release their URLs',async()=>{
 const h=setup();await tick();await tick();
 h.app.renderShelf();h.app.renderShelf();await tick();
 assert.equal(h.urls.size,3);
 h.app.show();h.app.releasePage();h.app.releaseCovers();await tick();
 assert.equal(h.urls.size,0);
});
for(const mode of ['no-index','broken-index','root-books','duplicates'])test(mode+' discovers directories without losing bundled books',async()=>{
 const h=setup(mode);await tick();await tick();
 assert.equal(h.app.entries.length,mode==='broken-index'||mode==='no-index'||mode==='root-books'?3:4);
 const key=mode==='root-books'?'smb-root:ole':'smb:ole';
 assert.equal(h.app.entries.filter(e=>e.folder===key).length,1);
 assert.ok(!h.calls.some(p=>p.includes('..')));
 await h.app.open(key);await tick();
 assert.equal(h.app.pageFiles[key].length,3);
 assert.ok(h.calls.includes((mode==='root-books'?'':'books/')+'ole/images/01.jpg'));
 assert.ok(h.get('page').src.startsWith('blob:'));
 h.events.pagehide();assert.equal(h.urls.size,0);
});

