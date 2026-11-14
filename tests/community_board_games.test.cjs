const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../examples/mupi-reversi/app.js');
const M=require('../examples/mupi-muehle/app.js');
const D=require('../examples/mupi-dame/app.js');
const L=require('../examples/mupi-wuerfelrennen/app.js');

test('Reversi opens with 4 valid moves and flips one disc',()=>{
 const b=R.initial(),moves=R.legal(b,1);
 assert.equal(moves.length,4);const m=moves.find(x=>x.at===19);
 assert.ok(m);assert.deepEqual(m.flips,[27]);
 const after=R.apply(b,1,m);assert.equal(after.filter(x=>x===1).length,4);
 assert.equal(after.filter(x=>x===2).length,1);
 for(const level of ['easy','medium','hard']){const choice=R.choose(b,1,level);assert.ok(moves.some(x=>x.at===choice.at));}
});
test('Reversi forced pass and no moves when board full',()=>{
 const b=Array(64).fill(1);assert.equal(R.legal(b,1).length,0);assert.equal(R.legal(b,2).length,0);
});
test('Nine Men Morris graph, protected captures, placing and flying',()=>{
 assert.equal(M.points.length,24);assert.equal(M.mills.length,16);
 assert.deepEqual(M.neighbors[0].sort((a,b)=>a-b),[1,7]);
 assert.ok(M.neighbors[1].includes(9));assert.ok(M.neighbors[9].includes(17));
 const b=Array(24).fill(0);
 assert.equal(M.options(b,[0,9,9],1).length,24);
 [0,1,2].forEach(i=>b[i]=1);[8,9,10,11].forEach(i=>b[i]=2);
 assert.equal(M.inMill(b,1,1),true);
 assert.deepEqual(M.captures(b,1),[11]);
 const flyer=Array(24).fill(0);[0,1,2].forEach(i=>flyer[i]=1);
 [8,9,10,12].forEach(i=>flyer[i]=2);
 assert.ok(M.options(flyer,[0,0,0],1).some(m=>m.from===0&&m.to===23));
 for(const level of ['easy','medium','hard'])assert.ok(M.choose(b,[0,0,0],1,level));
});
test('Dame initial, compulsory captures, multiple jump, promotion, flying king',()=>{
 const b=D.initial();assert.equal(b.filter(v=>D.owner(v)===1).length,12);
 assert.equal(b.filter(v=>D.owner(v)===2).length,12);
 assert.equal(D.legal(b,1).length,7);
 const capture=Array(64).fill(0);capture[42]=1;capture[33]=2;capture[17]=2;
 const moves=D.legal(capture,1);assert.ok(moves.length);
 assert.ok(moves.every(m=>m.captures.length>0)); 
 assert.ok(moves.some(m=>m.captures.length===2));
 const two=moves.find(m=>m.captures.length===2);
 const after=D.apply(capture,two,1);assert.equal(after[33],0);assert.equal(after[17],0);
 const promoted=Array(64).fill(0);promoted[9]=1;
 promoted[14]=1; // x6 y1, to x5 y0
 assert.equal(D.apply(promoted,D.legal(promoted,1).find(m=>m.from===14&&m.to===5),1)[5],3);
 const kings=Array(64).fill(0);kings[42]=3;
 assert.ok(D.legal(kings,1).some(m=>m.from===42&&m.to===7)); // north-east long diagonal
 for(const level of ['easy','medium','hard']){const chosen=D.choose(b,1,level);assert.ok(D.legal(b,1).some(m=>m.to===chosen.to&&m.from===chosen.from));}
});
test('Würfelrennen launch, capture, private home and own occupancy',()=>{
 let b=L.state(4);assert.equal(L.possible(b,0,5).length,0);
 assert.equal(L.possible(b,0,6).length,4);
 b=L.apply(b,0,L.possible(b,0,6)[0]);
 assert.equal(b[0][0],0);assert.equal(L.possible(b,0,6).filter(m=>m.to===0).length,0);
 // The second player's 13th track progress lands on first player's start 0.
 b[1][0]=39; // (13+39)%52=0
 const ms=L.possible(b,1,1);
 assert.equal(ms[0].captured.length,0); // it moves off the shared start
 b[1][0]=38; // (13+38)%52=51 -> one step onto red start
 const capture=L.possible(b,1,1).find(m=>m.piece===0);
 assert.equal(capture.captured.length,1);
 b=L.apply(b,1,capture);assert.equal(b[0][0],-1);
 b[0][0]=50;assert.equal(L.possible(b,0,6).some(m=>m.piece===0),false);
 b[0][0]=51;assert.equal(L.possible(b,0,1).some(m=>m.piece===0&&m.to===52),true);
 b[0][1]=52;assert.equal(L.possible(b,0,1).some(m=>m.piece===0&&m.to===52),false);
 for(const level of ['easy','medium','hard'])assert.ok(L.choose(L.state(4),0,6,level));
});

test('AI-vs-AI Reversi completes a legal game and accounts for every square',()=>{
 let board=R.initial(),turn=1,passes=0,steps=0;
 while(passes<2&&steps++<80){
  const moves=R.legal(board,turn);
  if(moves.length){const chosen=R.choose(board,turn,turn===1?'hard':'medium');
   assert.ok(moves.some(m=>m.at===chosen.at));board=R.apply(board,turn,chosen);passes=0;
  }else passes++;
  turn=3-turn;
 }
 assert.ok(steps<=80,'reversi did not terminate');
 assert.equal(board.length,64);assert.ok(board.every(x=>x===0||x===1||x===2));
 assert.ok(board.filter(Boolean).length>=4);
});
test('AI-vs-AI Dame never invents a move, capture chains stay consistent',()=>{
 let board=D.initial(),turn=1,quiet=0;
 for(let step=0;step<90;step++){
  const moves=D.legal(board,turn);if(!moves.length)break;
  const chosen=D.choose(board,turn,turn===1?'medium':'hard');
  assert.ok(moves.some(m=>m.from===chosen.from&&m.to===chosen.to&&m.captures.join(',')===chosen.captures.join(',')));
  const before=board.filter(Boolean).length;
  board=D.apply(board,chosen,turn);
  assert.equal(board.filter(Boolean).length,before-chosen.captures.length);
  if(chosen.captures.length)quiet=0;else quiet++;if(quiet>70)break;
  turn=3-turn;
 }
 assert.ok(board.every(v=>v>=0&&v<=4));
});
test('Mühle strategic AI only chooses legal actions across placement and movement',()=>{
 let board=Array(24).fill(0),stock=[0,9,9],turn=1,steps=0;
 for(;steps<135;steps++){
  const moves=M.options(board,stock,turn);if(!moves.length)break;
  const choice=M.choose(board,stock,turn,turn===1?'hard':'medium');
  assert.ok(moves.some(m=>m.from===choice.from&&m.to===choice.to));
  const after=M.projected(board,stock,turn,choice);
  board=after.b;stock[turn]=after.stock;
  if(after.mill){
   const victims=M.captures(board,turn);
   if(victims.length){board[victims[0]]=0;}
  }
  if(stock[1]===0&&stock[2]===0&&board.filter(v=>v===3-turn).length<3)break;
  turn=3-turn;
 }
 assert.ok(steps>10);assert.ok(stock[1]>=0&&stock[2]>=0);
});
test('Ludo auto-play stays within legal positions and reaches a goal',()=>{
 let board=L.state(4),players=[0,2],turn=0,finished=false,steps=0;
 for(;steps<5000;steps++){
  const die=Math.floor(Math.random()*6)+1;
  const moves=L.possible(board,turn,die);
  if(moves.length){
    const chosen=L.choose(board,turn,die,turn===0?'hard':'medium');
    assert.ok(moves.some(m=>m.piece===chosen.piece&&m.to===chosen.to));
    board=L.apply(board,turn,chosen);
    if(board[turn].every(v=>v>=52)){finished=true;break;}
  }
  if(die!==6||!moves.length)turn=turn===0?2:0;
 }
 assert.ok(finished,'game did not end within cap');
 for(const row of board)assert.ok(row.every(v=>Number.isInteger(v)&&v>=-1&&v<=55));
});
