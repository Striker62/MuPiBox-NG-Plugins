const test=require('node:test'),assert=require('node:assert/strict'),E=require('../examples/mupi-malbuch/engine.js');
test('drawing records touch points, supports eraser and undo',()=>{
 const d=new E.Drawing();d.begin(1,2,'#ff0000',7,false);d.move(5,6);d.finish();
 d.begin(1,1,'#fff',30,true);d.finish();assert.equal(d.strokes.length,2);assert.equal(d.strokes[1].erase,true);
 d.undo();assert.deepEqual(d.strokes[0].points,[[1,2],[5,6]]);d.clear();assert.equal(d.strokes.length,0);
});
test('stroke point count and history are bounded',()=>{
 const d=new E.Drawing();d.begin(0,0,'#000',7,false);for(let i=0;i<3000;i++)d.move(i,i);d.finish();assert.equal(d.strokes[0].points.length,2048);
 for(let i=1;i<E.LIMIT;i++){d.begin(1,1,'#000',7,false);d.finish();}assert.equal(d.full(),true);
});
