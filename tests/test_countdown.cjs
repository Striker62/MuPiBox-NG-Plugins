'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../examples/countdown/model.js');
const event=(extra={})=>({id:'birthday',title:'Mein Geburtstag',target:'2026-12-24T11:00:00.000Z',zone:'Europe/Berlin',theme:'winter',mode:'days',image:'',animation:true,...extra});
test('admin dependencies stay within its asset directory and model copies match',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'../examples/countdown');
 assert.equal(fs.readFileSync(path.join(root,'model.js'),'utf8'),fs.readFileSync(path.join(root,'admin/model.js'),'utf8'));
 const html=fs.readFileSync(path.join(root,'admin/index.html'),'utf8');
 for(const match of html.matchAll(/<script src="([^"]+)"/g)){
  assert.ok(!match[1].includes('..'));assert.ok(fs.existsSync(path.join(root,'admin',match[1])));
 }
});
test('only scoped JPEG paths, valid dates and bounded event lists are accepted',()=>{
 assert.equal(model.validate([event()])[0].title,'Mein Geburtstag');
 for(const image of ['../x.jpg','bilder/../x.jpg','https://example.com/x.jpg','bilder/a.png','bilder/a.jpg?q=x'])assert.throws(()=>model.validate([event({image})]));
 for(const extra of [{target:'invalid'},{target:'2101-01-01T00:00:00Z'},{zone:'not-a-zone'},{title:''},{mode:'seconds'},{theme:'script'},{animation:'yes'}])assert.throws(()=>model.validate([event(extra)]));
 assert.throws(()=>model.validate([event(),event()]));assert.throws(()=>model.validate(Array.from({length:13},(_,i)=>event({id:String(i)}))));
});
test('rounds remaining minutes and days upward without negative times',()=>{
 const item=event({target:'2026-12-24T12:00:00Z'}),target=Date.parse(item.target);
 const time=model.remaining(item,target-86400000-3600000-1);
 assert.equal(time.days,2);assert.equal(time.fullDays,1);assert.equal(time.hours,1);assert.equal(time.minutes,1);
 assert.equal(model.remaining(item,target-1).minutes,1);assert.equal(model.remaining(item,target).done,true);assert.equal(model.remaining(item,target+10000).days,0);
});
test('sleeps counts calendar boundaries including short and long DST nights',()=>{
 const spring=event({target:'2027-03-28T10:00:00Z'});
 assert.equal(model.remaining(spring,Date.parse('2027-03-27T22:30:00Z')).sleeps,1);
 const autumn=event({target:'2027-10-31T11:00:00Z'});
 assert.equal(model.remaining(autumn,Date.parse('2027-10-30T21:30:00Z')).sleeps,1);
 assert.equal(model.remaining(spring,Date.parse('2027-03-28T00:30:00Z')).sleeps,0);
});
test('sleeps uses saved event timezone rather than runtime machine timezone',()=>{
 const item=event({target:'2026-12-25T02:00:00Z',zone:'America/New_York'});
 assert.equal(model.remaining(item,Date.parse('2026-12-24T01:00:00Z')).sleeps,1);
});
test('background choice is retained and older countdowns keep the side image layout',()=>{
 assert.equal(model.validate([event()])[0].imageLayout,'side');
 assert.equal(model.validate([event({imageLayout:'background'})])[0].imageLayout,'background');
 assert.throws(()=>model.validate([event({imageLayout:'unknown'})]));
 assert.equal(model.validate([event()])[0].imageFit,'contain');
 assert.equal(model.validate([event({imageFit:'cover'})])[0].imageFit,'cover');
 assert.throws(()=>model.validate([event({imageFit:'stretch'})]));
});
test('all unit checkbox combinations roll larger units into the first selected unit',()=>{
 const units=['days','hours','minutes','seconds'],scales={days:86400,hours:3600,minutes:60,seconds:1};
 const now=Date.parse('2026-12-01T00:00:00Z'),diff=25*3600+61;
 for(let mask=1;mask<16;mask++){
  const selected=units.filter((unit,index)=>mask&(1<<index));
  const item=model.validate([event({mode:'custom',units:selected,target:new Date(now+diff*1000+1).toISOString()})])[0];
  const result=model.parts(item,now),smallest=scales[selected.at(-1)];
  assert.deepEqual(result.map(part=>part.unit),selected);
  assert.equal(result.reduce((sum,part)=>sum+part.value*scales[part.unit],0),Math.ceil((diff+.001)/smallest)*smallest);
 }
 assert.throws(()=>model.validate([event({mode:'custom',units:[]})]));
 assert.equal(model.validate([event()])[0].showText,false);
 assert.equal(model.validate([event({showText:true})])[0].showText,true);
});
test('GIF validation accepts animation and rejects oversized or truncated content',()=>{
 const bytes=new Uint8Array(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64'));
 assert.equal(model.validateGif(bytes).frames,1);
 const oversized=bytes.slice();oversized[6]=33;oversized[7]=3;assert.throws(()=>model.validateGif(oversized));
 assert.throws(()=>model.validateGif(bytes.slice(0,-1)));assert.throws(()=>model.validateGif(new Uint8Array([1,2,3])));
 const start=bytes.indexOf(0x2c),frame=bytes.slice(start,-1);
 const animated=new Uint8Array(bytes.length+frame.length);animated.set(bytes.slice(0,-1));animated.set(frame,bytes.length-1);animated[animated.length-1]=0x3b;
 assert.equal(model.validateGif(animated).frames,2);
 assert.equal(model.validate([event({image:'bilder/pinguin.gif'})])[0].image,'bilder/pinguin.gif');
});
test('wait clock uses one full clockwise turn over minutes or multiple days and clamps at the endpoints',()=>{
 for(const duration of [60000,7*86400000]){
  const start=Date.parse('2026-12-01T00:00:00Z'),item=event({display:'dial',waitStart:new Date(start).toISOString(),target:new Date(start+duration).toISOString()});
  const valid=model.validate([item])[0];
  assert.equal(model.dial(valid,start-5000).progress,0);assert.equal(model.dial(valid,start).angle,0);
  assert.equal(model.dial(valid,start+duration/4).angle,90);assert.equal(model.dial(valid,start+duration/2).angle,180);
  assert.equal(model.dial(valid,start+duration).angle,360);assert.equal(model.dial(valid,start+duration+5000).sector,'');
  assert.match(model.dial(valid,start).sector,/A100 100/);
  assert.equal(model.dial(valid,start+duration*.75).progress,.75);
 }
 assert.throws(()=>model.validate([event({display:'dial',waitStart:''})]));
 assert.throws(()=>model.validate([event({display:'dial',waitStart:'2027-01-01T00:00:00Z'})]));
 assert.equal(model.validate([event()])[0].display,'numbers');
});
test('chronological order and expiry use an exact one-hour grace period and retain unfinished drafts',()=>{
 const now=Date.parse('2026-12-01T12:00:00Z'),item=(id,offset)=>event({id,target:new Date(now+offset).toISOString()});
 const items=[item('late',86400000),item('boundary',-3600000),item('near',1000),item('grace',-3599999),{...event({id:'draft'}),target:''}];
 assert.deepEqual(model.current(items,now).map(item=>item.id),['grace','near','late','draft']);
 assert.equal(items.length,5,'does not mutate the original settings');
 assert.deepEqual(model.current(items,now+1).map(item=>item.id),['near','late','draft']);
});
