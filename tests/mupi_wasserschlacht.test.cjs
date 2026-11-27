const test=require("node:test");
const assert=require("node:assert/strict");
const E=require("../examples/mupi-wasserschlacht/engine.js");

const expected={
 quick:{size:8,fleet:[3,2]},
 classic:{size:10,fleet:[5,4,3,3,2]},
 max:{size:12,fleet:[5,4,4,3,3,2,2]}
};

for(const [mode,config] of Object.entries(expected)){
 test(mode+": rules and complete no-contact random fleets",()=>{
  const {size,fleet}=config;
  assert.equal(E.rules(mode).size,size);
  assert.deepEqual(E.rules(mode).fleet,fleet);
  for(let run=0;run<100;run++){
   const b=E.randomFleet(mode);
   assert.equal(b.shots.length,size*size);
   assert.deepEqual(b.ships.map(s=>s.cells.length),fleet);
   const unique=new Set(b.ships.flatMap(s=>s.cells));
   assert.equal(unique.size,fleet.reduce((a,b)=>a+b,0));
   for(let a=0;a<b.ships.length;a++)for(let c=a+1;c<b.ships.length;c++)
    for(const ia of b.ships[a].cells)for(const ib of b.ships[c].cells){
     const [ax,ay]=E.xy(ia,b),[bx,by]=E.xy(ib,b);
     assert.ok(Math.abs(ax-bx)>1||Math.abs(ay-by)>1);
    }
  }
 });
 test(mode+": valid indices and edge of grid",()=>{
  const {size}=config;
  const b=E.empty(mode);
  assert.deepEqual(E.xy(size*size-1,b),[size-1,size-1]);
  assert.equal(E.index(size-1,size-1,b),size*size-1);
  assert.ok(E.place(b,0,0,2,false));
  assert.equal(E.place(b,1,0,2,false),false,"overlap forbidden");
  assert.equal(E.place(b,2,1,2,true),false,"diagonal contact forbidden");
  assert.equal(E.place(b,size-1,size-2,4,false),false,"out of bounds");
 });
 test(mode+": shots, sunk, victory and AI work on correct grid size",()=>{
  const {size}=config;
  const b=E.empty(mode);
  E.place(b,0,0,2,false);
  const last=size*size-1;
  assert.equal(E.fire(b,last).type,"miss");
  assert.equal(E.fire(b,last),null);
  assert.equal(E.fire(b,0).type,"hit");
  const hit=E.fire(b,1);assert.equal(hit.type,"sunk");assert.equal(hit.win,true);
  assert.equal(E.sunkCount(b),1);
  for(const level of ["easy","medium","hard"]){
   const shots=Array(size*size).fill(null);
   shots[0]="miss";shots[size+1]="hit";shots[size*2+2]="sunk";
   for(let k=0;k<30;k++){
    const idx=E.chooseShot(shots,level,Math.random,mode);
    assert.ok(idx>=0&&idx<size*size);assert.equal(shots[idx],null);
   }
   assert.equal(E.chooseShot(Array(size*size).fill("miss"),level,Math.random,mode),null);
  }
 });
}

test("mode safety: a 12x12 board cannot be passed off as 8x8",()=>{
 assert.throws(()=>E.chooseShot(Array(144).fill(null),"hard",Math.random,"quick"),/differ/);
});

test("same seeded random stream is deterministic per mode",()=>{
 for(const mode of Object.keys(expected)){
  const seeded=()=>{let n=123;return ()=>{n=(n*16807)%2147483647;return (n-1)/2147483646;}};
  const a=E.randomFleet(mode,seeded()),b=E.randomFleet(mode,seeded());
  assert.deepEqual(a.ships,b.ships);
 }
});

test("placement preview fits edges and rejects contact without changing the board",()=>{
 for(const mode of Object.keys(expected)){
  const b=E.empty(mode),len=b.fleet[0],last=b.size*b.size-1;
  for(const vertical of [true,false]){
   const ghost=E.placementPreview(b,last,len,vertical);
   assert.equal(ghost.valid,true);
   assert.equal(ghost.cells.length,len);
   assert.equal(ghost.cells.at(-1),last);
   assert.equal(b.ships.length,0);
  }
  const g=E.placementPreview(b,last,len,false);
  assert.ok(E.place(b,g.x,g.y,len,false));
  assert.equal(E.placementPreview(b,last,b.fleet[1],false).valid,false);
  assert.equal(b.ships.length,1);
  b.ships.pop();
  assert.equal(E.placementPreview(b,last,len,false).valid,true);
  assert.equal(E.placementPreview(b,-1,len,false),null);
 }
});
