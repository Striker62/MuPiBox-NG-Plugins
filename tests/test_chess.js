'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../examples/chess/web/engine.js');
const start=()=>C.fromFen(C.START_FEN);
function play(s,moves){for(const name of moves){const move=C.findMove(s,name);assert.ok(move,'must be legal: '+name);s=C.apply(s,move);}return s;}
function perft(s,depth){if(depth===0)return 1;return C.legal(s).reduce((n,m)=>n+perft(C.apply(s,m),depth-1),0);}
test('initial placement and known chess perft positions',()=>{
  const s=start();assert.equal(s.b[C.index('d1')],'Q');assert.equal(s.b[C.index('d8')],'q');
  assert.equal(perft(s,1),20);assert.equal(perft(s,2),400);assert.equal(perft(s,3),8902);
});
test('fools mate, SAN, king protection',()=>{
  let s=start();const history=[s];
  for(const name of ['f2f3','e7e5','g2g4','d8h4']){const move=C.findMove(s,name);assert.ok(move);s=C.apply(s,move);history.push(s);}
  const result=C.status(history);assert.equal(result.reason,'checkmate');assert.equal(result.winner,-1);
  assert.equal(C.legal(s).length,0);
});
test('castling and rook reposition',()=>{
  let s=play(start(),['g1f3','g8f6','e2e4','e7e5','f1e2','f8e7']);
  const king=C.findMove(s,'e1g1');assert.ok(king);assert.equal(C.san(s,king),'O-O');
  s=C.apply(s,king);assert.equal(s.b[C.index('g1')],'K');assert.equal(s.b[C.index('f1')],'R');
  assert.equal(s.c&3,0);
});
test('en passant captures and removes passed pawn',()=>{
  const s=play(start(),['e2e4','a7a6','e4e5','d7d5']);
  const move=C.findMove(s,'e5d6');assert.ok(move);assert.equal(move[3],'ep');
  const after=C.apply(s,move);assert.equal(after.b[C.index('d6')],'P');assert.equal(after.b[C.index('d5')],'.');
});
test('promotion provides four legal outcomes',()=>{
  const s=C.fromFen('7k/P7/8/8/8/8/8/7K w - - 0 1');
  for(const to of ['a7a8q','a7a8r','a7a8b','a7a8n']) assert.ok(C.findMove(s,to),to);
  assert.equal(C.apply(s,C.findMove(s,'a7a8n')).b[C.index('a8')],'N');
});
test('draws: stalemate, insufficient material and threefold repetition',()=>{
  assert.equal(C.status([C.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')]).reason,'stalemate');
  assert.equal(C.status([C.fromFen('7k/8/8/8/8/8/8/K7 w - - 0 1')]).reason,'material');
  let s=start(),history=[s];
  for(const m of ['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1','f6g8']){
    s=C.apply(s,C.findMove(s,m));history.push(s);
  }
  assert.equal(C.status(history).claim,'threefold');
});
test('computer always chooses legal move, all four levels',()=>{
  const s=start(),legal=C.legal(s).map(C.uci);
  for(const level of ['easy','normal','hard','expert']){
    const m=C.bestMove(s,level,{budgetMs:140});assert.ok(m,level);assert.ok(legal.includes(C.uci(m)),level);
  }
});
