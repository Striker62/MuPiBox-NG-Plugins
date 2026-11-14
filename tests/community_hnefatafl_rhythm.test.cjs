const test=require("node:test");
const assert=require("node:assert/strict");
const T=require("../examples/mupi-hnefatafl/app.js");
const R=require("../examples/mupi-rhythm/app.js");
const sq=(r,c)=>r*11+c;
const empty=(turn="A")=>({b:Array(121).fill("."),turn,winner:null,ply:0,idle:0,repetitions:[],last:null});
test("Hnefatafl 11x11 setup: 24 attackers 12 defenders plus king, attacker first",()=>{
 const s=T.initial();
 assert.equal(s.b.length,121);assert.equal(s.turn,"A");
 assert.equal(s.b.filter(p=>p==="A").length,24);
 assert.equal(s.b.filter(p=>p==="D").length,12);
 assert.equal(s.b.filter(p=>p==="K").length,1);
 assert.equal(s.b[sq(5,5)],"K");
 assert.deepEqual(T.CORNERS,[0,10,110,120]);
 assert.ok(T.legal(s).length>0);
});
test("Tafl rook movement, restricted throne/corners and passing empty throne",()=>{
 let s=empty("D");s.b[sq(5,5)]="K";s.b[sq(4,4)]="D";s.b[sq(0,4)]="A";
 let ms=T.legal(s,sq(4,4));
 assert.ok(ms.some(m=>m.to===sq(4,7)));
 assert.ok(!ms.some(m=>m.to===sq(5,5)));
 s.b[sq(5,5)]=".";s.b[sq(5,2)]="D";
 ms=T.legal(s,sq(5,2));
 assert.ok(ms.some(m=>m.to===sq(5,7)),"an empty throne is traversable");
 assert.ok(!ms.some(m=>m.to===sq(5,5)),"only the king can stop on the throne");
 assert.ok(!T.legal(s,sq(0,4)).some(m=>T.CORNERS.includes(m.to)));
});
test("Normal custodial capture is active, voluntary entry between enemies survives",()=>{
 let s=empty("A");s.b[sq(0,0)]="K";
 s.b[sq(4,4)]="D";s.b[sq(4,5)]="A";s.b[sq(4,2)]="A";
 const next=T.apply(s,{from:sq(4,2),to:sq(4,3)},true);
 assert.equal(next.b[sq(4,4)],".");assert.equal(next.last.captures,1);
 s=empty("D");s.b[sq(0,0)]="K";s.b[sq(4,3)]="A";s.b[sq(4,5)]="A";s.b[sq(3,4)]="D";
 const safe=T.apply(s,{from:sq(3,4),to:sq(4,4)},true);
 assert.equal(safe.b[sq(4,4)],"D");
});
test("Empty throne is hostile to defenders, throne always hostile to attackers",()=>{
 const s=empty("D");s.b[sq(0,0)]="K";s.b[sq(5,4)]="A";s.b[sq(5,2)]="D";
 const next=T.apply(s,{from:sq(5,2),to:sq(5,3)},true);
 assert.equal(next.b[sq(5,4)],".");
});
test("King escapes by reaching a corner; four-side throne and three-side adjacent capture",()=>{
 let s=empty("D");s.b[sq(0,2)]="K";
 let v=T.apply(s,{from:sq(0,2),to:sq(0,0)},true);
 assert.equal(v.winner,"D");
 s=empty("A");s.b[sq(5,5)]="K";
 for(const [r,c]of [[4,5],[6,5],[5,4]])s.b[sq(r,c)]="A";
 s.b[sq(5,8)]="A";
 v=T.apply(s,{from:sq(5,8),to:sq(5,6)},true);
 assert.equal(v.winner,"A");
 s=empty("A");s.b[sq(5,4)]="K";
 for(const [r,c]of [[4,4],[6,4]])s.b[sq(r,c)]="A";
 s.b[sq(5,1)]="A";
 v=T.apply(s,{from:sq(5,1),to:sq(5,3)},true);
 assert.equal(v.winner,"A");
});
test("AI levels only return legal moves and hard remains bounded",()=>{
 const s=T.initial(),moves=T.legal(s),keys=new Set(moves.map(m=>m.from+":"+m.to));
 for(const level of ["easy","medium","hard"]){
  const start=performance.now();
  const m=T.choose(s,level,.35);
  assert.ok(keys.has(m.from+":"+m.to),level);
  assert.ok(performance.now()-start<1600,level+" took too long");
 }
});
test("Rhythm charts are original, reproducible, ordered and increase in tempo",()=>{
 assert.deepEqual(R.chart("easy"),R.chart("easy"));
 for(const level of Object.keys(R.MODES)){
  const notes=R.chart(level);
  assert.ok(notes.length>=R.MODES[level].beats);
  assert.ok(notes.every(n=>Number.isFinite(n.at)&&n.lane>=0&&n.lane<4));
  assert.ok(notes.every((n,i)=>i===0||n.at>=notes[i-1].at));
 }
 assert.ok(R.MODES.hard.bpm>R.MODES.medium.bpm);
 assert.ok(R.MODES.medium.bpm>R.MODES.easy.bpm);
});
test("Rhythm scoring windows judge perfect/great/good and reject late taps",()=>{
 assert.equal(R.grade(40,190).label,"PERFECT");
 assert.equal(R.grade(110,190).label,"GREAT");
 assert.equal(R.grade(165,190).label,"GOOD");
 assert.equal(R.grade(260,190),null);
});
