'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../examples/countdown/model.js');
const event=(extra={})=>({id:'birthday',title:'Mein Geburtstag',target:'2026-12-24T11:00:00.000Z',zone:'Europe/Berlin',theme:'winter',mode:'days',image:'',animation:true,...extra});
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
