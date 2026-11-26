const {test} = require('node:test');
const assert = require('node:assert/strict');
const {create} = require('../examples/Buecherkiste/admin/book-store.js');
function fixture() {
  const data = new Map(); let serial = 0; const writes = [];
  const put = (path,value) => data.set(path,{blob:value instanceof Blob ? value : new Blob([JSON.stringify(value)]), revision:String(++serial)});
  const sdk = {files:{
    async list(path) {
      const entries = new Map();
      for (const key of data.keys()) {
        if (!key.startsWith(path+'/')) continue;
        const rest = key.slice(path.length+1), name=rest.split('/')[0];
        entries.set(name,{name,isDir:rest.includes('/'),path:path+'/'+name});
      }
      return {entries:[...entries.values()],truncated:false};
    },
    async read(path) { if (!data.has(path)) throw Error('not found'); return data.get(path); },
    async write(path,blob,options) {
      if ((data.get(path)?.revision || '') !== options.expectedRevision) throw Error('409 conflict');
      writes.push(path);put(path,blob); return {revision:data.get(path).revision};
    }
  }};
  put('books/buch/book.json',{title:'Buch',cover:'images/00.jpg',imagePattern:'images/{page:02d}.jpg',layout:'full-page',tts:'tts/pages.json',author:'Autor'});
  for(const name of ['00.jpg','01.jpg','02.png']) put('books/buch/images/'+name,new Blob(['image'],{type:'image/jpeg'}));
  put('books/buch/tts/pages.json',{pages:[{text:'Lang '.repeat(500)},{text:''}]});
  put('books/index.json',{books:['buch'],label:'Liste'});
  return {data,sdk,store:create(sdk),put,writes};
}
function draft(loaded) {
  return {id:loaded.id,title:loaded.info.title,coverOnly:loaded.coverOnly,previous:loaded,
    pages:loaded.pages.map(page=>({...page,file:new File([page.blob],page.path.split('/').pop()),text:page.text}))};
}
test('cover is separate; mixed extensions, blanks and long texts retain their mapping',async()=>{
  const f=fixture(), loaded=await f.store.load('buch');
  assert.equal(loaded.coverOnly,true);
  assert.deepEqual(loaded.pages.map(page=>page.path),['images/00.jpg','images/01.jpg','images/02.png']);
  assert.deepEqual(loaded.pages.map(page=>page.text),['','Lang '.repeat(500),'']);
});
test('text-only save reuses original images and publishes complete speech before metadata',async()=>{
  const f=fixture(), loaded=await f.store.load('buch'), input=draft(loaded);
  const saved=await f.store.save(input);
  assert.equal(saved.info.author,'Autor');
  assert.equal(f.writes.some(path=>path.includes('/images/')),false);
  const tts=JSON.parse(await f.data.get('books/buch/'+saved.info.tts).blob.text());
  assert.deepEqual(tts.pages,[{text:'Lang '.repeat(500)},{text:''}]);
  assert.deepEqual(JSON.parse(await f.data.get('books/index.json').blob.text()),{books:['buch'],label:'Liste'});
  assert.equal((await f.store.load('buch')).pages[1].text,'Lang '.repeat(500));
});
test('sorting moves text with images and leaves old image files intact',async()=>{
  const f=fixture(), loaded=await f.store.load('buch'), input=draft(loaded);
  [input.pages[1],input.pages[2]]=[input.pages[2],input.pages[1]];
  await f.store.save(input);
  const updated=await f.store.load('buch');
  assert.deepEqual(updated.pages.map(page=>page.text),['','','Lang '.repeat(500)]);
  assert.ok(f.data.has('books/buch/images/01.jpg'));
});
test('failed image upload leaves published metadata and texts unchanged',async()=>{
  const f=fixture(), loaded=await f.store.load('buch'), before=f.data.get('books/buch/book.json');
  const input=draft(loaded);input.pages.reverse();
  f.sdk.files.write=async()=>{throw Error('quota');};
  await assert.rejects(f.store.save(input),/quota/);
  assert.equal(f.data.get('books/buch/book.json'),before);
});
test('stale book and malformed index are rejected before uploads',async()=>{
  const f=fixture(), loaded=await f.store.load('buch');
  f.put('books/buch/book.json',{...loaded.info,title:'changed'});
  await assert.rejects(f.store.save(draft(loaded)),/zwischenzeitlich/);
  assert.equal(f.writes.length,0);
  f.put('books/index.json',{books:'invalid'});
  await assert.rejects(f.store.save(draft(loaded)),/index.json/);
  assert.equal(f.writes.length,0);
});
test('catalog conflict reports saved book and permits a safe retry',async()=>{
  const f=fixture(), input=draft(await f.store.load('buch')), write=f.sdk.files.write;
  f.sdk.files.write=async(path,...args)=>{if(path==='books/index.json') throw Error('409');return write(path,...args);};
  const saved=await f.store.save(input);
  assert.match(saved.warning,/index.json/);
  assert.equal((await f.store.load('buch')).revision,saved.revision);
});
test('read-only failures name the saving step and retain the published book',async()=>{
  const f=fixture(), input=draft(await f.store.load('buch'));
  const original=f.data.get('books/buch/book.json');
  f.sdk.files.write=async()=>{throw Error('read-only file system');};
  await assert.rejects(f.store.save(input),error=>{
    assert.match(error.message,/Vorlesetexte speichern: books\/buch\/tts\//);
    assert.match(error.message,/read-only file system/);
    assert.match(error.message,/schreibgeschütztes Dateisystem/);
    return true;
  });
  assert.equal(f.data.get('books/buch/book.json'),original);
});

test('page recordings are stored separately from unchanged TTS and follow reordered images',async()=>{
  const f=fixture();f.put('books/buch/audio/a.ogg',new Blob(['audio']));
  const item={path:'audio/a.ogg',revision:f.data.get('books/buch/audio/a.ogg').revision,size:5};
  const loaded=await f.store.load('buch'),input=draft(loaded);input.pages[1].recording=item;
  [input.pages[1],input.pages[2]]=[input.pages[2],input.pages[1]];
  const saved=await f.store.save(input),updated=await f.store.load('buch');
  assert.equal(updated.pages[0].recording,null);assert.equal(updated.pages[1].recording,null);
  assert.deepEqual(updated.pages[2].recording,item);
  assert.deepEqual(saved.info.pageRecordings[saved.pages[2].path],item);
  const tts=JSON.parse(await f.data.get('books/buch/'+saved.info.tts).blob.text());
  assert.deepEqual(tts.pages,[{text:''},{text:'Lang '.repeat(500)}]);
  assert.ok(f.data.has('books/buch/images/01.jpg'));assert.ok(f.data.has('books/buch/audio/a.ogg'));
});

test('unsafe or changed recordings cannot publish book metadata',async()=>{
  const f=fixture(),loaded=await f.store.load('buch'),input=draft(loaded);
  input.pages[1].recording={path:'../other.ogg',revision:'1',size:5};
  await assert.rejects(f.store.save(input),/Ungültige Seitenaufnahme/);assert.equal(f.writes.length,0);
  f.put('books/buch/audio/a.ogg',new Blob(['audio']));
  input.pages[1].recording={path:'audio/a.ogg',revision:'outdated',size:5};
  await assert.rejects(f.store.save(input),/zwischenzeitlich geändert/);assert.equal(f.writes.length,0);
});

test('failed metadata replacement keeps previous recording assignment and its audio file',async()=>{
  const f=fixture();f.put('books/buch/audio/old.ogg',new Blob(['old']));f.put('books/buch/audio/new.ogg',new Blob(['new']));
  const info=JSON.parse(await f.data.get('books/buch/book.json').blob.text());
  info.pageRecordings={'images/01.jpg':{path:'audio/old.ogg',revision:f.data.get('books/buch/audio/old.ogg').revision,size:3}};
  f.put('books/buch/book.json',info);const before=f.data.get('books/buch/book.json');
  const input=draft(await f.store.load('buch'));
  input.pages[1].recording={path:'audio/new.ogg',revision:f.data.get('books/buch/audio/new.ogg').revision,size:3};
  const write=f.sdk.files.write;f.sdk.files.write=async(path,...args)=>{if(path==='books/buch/book.json')throw Error('409');return write(path,...args);};
  await assert.rejects(f.store.save(input),/409/);
  assert.equal(f.data.get('books/buch/book.json'),before);assert.ok(f.data.has('books/buch/audio/old.ogg'));assert.ok(f.data.has('books/buch/audio/new.ogg'));
});
