const test=require('node:test');
const assert=require('node:assert/strict');
const K=require('../examples/mupi-wikingerduell/app.js');
test('Kubb starts with 10 baseline kubbs, king and 2-4-6 baton rule',()=>{
 const s=K.initial();assert.equal(s.blocks.length,10);
 assert.equal(s.blocks.filter(b=>b.side===0).length,5);
 assert.equal(K.eligible(s).length,5);
 assert.equal(s.throwsLeft,2);
 let a=K.throwAt(s,'b1-0','human',1);a=K.throwAt(a,'b1-1','human',1);
 assert.equal(a.throwsLeft,0);
 let b=K.advance(a);assert.equal(b.throwsLeft,4);assert.equal(b.turn,1);
 for(let j=0;j<4;j++)b=K.throwAt(b,K.choose(b,'hard'),'hard',1);
 assert.equal(K.advance(b).throwsLeft,6);
});
test('Knocked-down baseline kubb returns as a field kubb on shooter half',()=>{
 let s=K.initial();
 s=K.throwAt(s,'b1-0','human',0);
 assert.equal(s.fallen.length,1);
 s=K.throwAt(s,'b1-1','human',1);
 s=K.advance(s);
 const returned=s.blocks.find(b=>b.id==='b1-0');
 assert.equal(returned.kind,'field');assert.equal(returned.side,0);
 assert.equal(K.eligible(s).length,1);
 assert.equal(K.eligible(s)[0].id,'b1-0');
 const invalid=K.throwAt(s,'b0-1','human',0);
 assert.equal(invalid.hits,s.hits);
 assert.equal(invalid.throwsLeft,s.throwsLeft-1);
});
test('Premature king strike loses, legal king strike wins',()=>{
 let s=K.initial();
 s=K.throwAt(s,'king','human',0);
 assert.equal(s.winner,1);
 s=K.initial();
 // All 5 opposing baseline cubbs are toppled in the state before
 // throwing the king, as would happen during a later six-baton turn.
 s.throwsLeft=6;
 for(let j=0;j<5;j++)s=K.throwAt(s,'b1-'+j,'human',0);
 assert.equal(K.eligible(s).length,0);assert.deepEqual(K.available(s),['king']);
 s=K.throwAt(s,'king','human',0);assert.equal(s.winner,0);
});
test('AI targets are always legal and scores remain bounded',()=>{
 for(const level of ['easy','medium','hard']){
  let s=K.initial();
  for(let i=0;i<100;i++){
   if(s.winner>=0)break;
   const target=K.choose(s,level,Math.random());
   assert.ok(K.available(s).includes(target),'bad Kubb AI target '+target);
   s=K.throwAt(s,target,level,Math.random());
   assert.ok(s.throwsLeft>=0);
   if(s.throwsLeft===0)s=K.advance(s);
  }
  assert.equal(s.blocks.length,10);
  assert.ok(s.blocks.every(b=>['base','field','fallen'].includes(b.kind)));
 }
});
test('Kubb state isolation and no-op for finished games',()=>{
 const s=K.initial(),a=K.throwAt(s,'b1-0','human',0);
 assert.equal(s.blocks.find(b=>b.id==='b1-0').kind,'base');
 assert.equal(a.blocks.find(b=>b.id==='b1-0').kind,'fallen');
 a.winner=0;const b=K.throwAt(a,'king','human',0);
 assert.equal(b.winner,0);assert.equal(b.shots,a.shots);
});
