'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../examples/cover-memory/engine.js');
test('all classic themes have independent 4, 6 and 8 pairs',()=>{
 for(const theme of ['mixed','shapes','animals','numbers'])for(const count of [4,6,8]){
  const state=E.board(E.classic(theme),count);
  assert.equal(state.cards.length,2*count);
  const keys=new Set(state.cards.map(c=>c.key));assert.equal(keys.size,count);
  for(const key of keys){const pair=state.cards.filter(c=>c.key===key);assert.equal(pair.length,2);assert.notEqual(pair[0],pair[1]);}
 }
});
test('mismatch locks board, resets; matched pairs and win are counted',()=>{
 const s=E.board(E.classic('numbers'),4);
 const different=s.cards.findIndex(c=>c.key!==s.cards[0].key);
 assert.equal(E.flip(s,0),'first');assert.equal(E.flip(s,different),'miss');
 assert.equal(E.flip(s,1),'ignored');E.close(s);
 assert.equal(s.cards.some(c=>c.open),false);
 for(const key of new Set(s.cards.map(c=>c.key))){
  const [a,b]=s.cards.map((c,i)=>c.key===key?i:-1).filter(i=>i>=0);
  assert.equal(E.flip(s,a),'first');
  const expected=s.matches===3?'won':'match'; assert.equal(E.flip(s,b),expected);
 }
 assert.equal(s.matches,4);assert.equal(s.attempts,5);
});
test('small local cover pool does not invent duplicate pairs',()=>{
 const s=E.board([{key:'a',image:'one'},{key:'a',image:'one'},{key:'b',image:'two'}],8);
 assert.equal(s.cards.length,4);
});
