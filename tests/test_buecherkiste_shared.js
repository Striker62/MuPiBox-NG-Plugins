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
 const info={title:'Gleicher Titel',cover:'images/01.jpg',imagePattern:'images/{page:02d}.jpg',layout:'full-page'};
 const shared={
  async read(p){calls.push(p);if(mode==='denied')throw Error('Permission denied');
   if(p==='books/index.json')return new Blob([JSON.stringify({books:['ole','henne-und-adler1','../escape','constructor']})]);
   if(p.endsWith('book.json'))return new Blob([JSON.stringify(mode==='unsafe'?{...info,imagePattern:'../secret.jpg'}:info)]);
   if(p.endsWith('pages.json'))return new Blob([JSON.stringify({pages:[{text:'<script>content</script>'}]})]);
   if(mode==='bad-image')return new Blob(['<svg onload="alert(1)">']);
   return new Blob([new Uint8Array([255,216,255,0])]);
  },
  async list(p){calls.push(p);return {entries:['01.jpg','02.jpg','03.png'].map(name=>({name,isDir:false})),truncated:false}}
 };
 const context={Blob,Uint8Array,console:{warn(){}},URL:{createObjectURL(){const u='blob:'+ ++next;urls.add(u);return u},revokeObjectURL(u){urls.delete(u);revoked.push(u)}},
  window:{innerWidth:800,innerHeight:480,MuPiBoxSDK:mode==='absent'?undefined:{shared},addEventListener(n,f){events[n]=f}},
  document:{getElementById:get,querySelector:get,createElement:element,documentElement:element(),addEventListener(){}},
  requestAnimationFrame(){},fetch:async p=>({ok:true,json:async()=>p.startsWith('books/index')?{books:['ole']}:{...info}})};
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

