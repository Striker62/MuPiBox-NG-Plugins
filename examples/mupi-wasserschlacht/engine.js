/* MuPi Water Battle – offline fleet search engine (MIT).
 * Each board owns its size, fleet and shots. No hard-coded global grid size.
 */
const WaterBattle = (() => {
  "use strict";
  const MODES=Object.freeze({
    quick:Object.freeze({size:8, fleet:Object.freeze([3,2])}),
    classic:Object.freeze({size:10,fleet:Object.freeze([5,4,3,3,2])}),
    max:Object.freeze({size:12,fleet:Object.freeze([5,4,4,3,3,2,2])})
  });
  const DEFAULT="quick";
  const rules=mode=>MODES[mode]||MODES[DEFAULT];
  const sizeOf=board=>board.size;
  const xy=(i,board)=>[i%sizeOf(board),Math.floor(i/sizeOf(board))];
  const index=(x,y,board)=>y*sizeOf(board)+x;
  const inside=(x,y,board)=>x>=0&&x<sizeOf(board)&&y>=0&&y<sizeOf(board);
  const empty=(mode=DEFAULT)=>{
    const {size,fleet}=rules(mode);
    return {size,fleet:[...fleet],ships:[],shots:Array(size*size).fill(null)};
  };
  function cellsFor(board,x,y,length,vertical){
    const cells=[];
    for(let k=0;k<length;k++){
      const xx=x+(vertical?0:k),yy=y+(vertical?k:0);
      if(!inside(xx,yy,board))return null;
      cells.push(index(xx,yy,board));
    }
    return cells;
  }
  function canPlace(board,x,y,length,vertical){
    const cells=cellsFor(board,x,y,length,vertical);
    if(!cells)return false;
    const occupied=new Set(board.ships.flatMap(s=>s.cells));
    return cells.every(i=>{
      const [cx,cy]=xy(i,board);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
        if(inside(cx+dx,cy+dy,board)&&occupied.has(index(cx+dx,cy+dy,board)))return false;
      return true;
    });
  }
  function place(board,x,y,length,vertical){
    if(!canPlace(board,x,y,length,vertical))return false;
    board.ships.push({cells:cellsFor(board,x,y,length,vertical),length});
    return true;
  }
  function randomFleet(mode=DEFAULT,random=Math.random){
    const board=empty(mode);
    const shuffle=items=>{
      for(let i=items.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[items[i],items[j]]=[items[j],items[i]];}
      return items;
    };
    // Backtracking avoids dead ends when 7 ships must fit on the Max board.
    function search(n){
      if(n===board.fleet.length)return true;
      const positions=[];
      for(let y=0;y<board.size;y++)for(let x=0;x<board.size;x++)
        for(const vertical of [false,true])
          if(canPlace(board,x,y,board.fleet[n],vertical))positions.push([x,y,vertical]);
      for(const [x,y,v] of shuffle(positions)){
        place(board,x,y,board.fleet[n],v);
        if(search(n+1))return true;
        board.ships.pop();
      }
      return false;
    }
    if(!search(0))throw new Error("Unable to place fleet");
    return board;
  }
  function fire(board,i){
    if(!Number.isInteger(i)||i<0||i>=board.shots.length||board.shots[i]!==null)return null;
    const ship=board.ships.find(s=>s.cells.includes(i));
    if(!ship){board.shots[i]="miss";return {type:"miss",win:false};}
    board.shots[i]="hit";
    const sunk=ship.cells.every(c=>board.shots[c]==="hit");
    if(sunk)for(const c of ship.cells)board.shots[c]="sunk";
    const win=board.ships.every(s=>s.cells.every(c=>board.shots[c]==="sunk"));
    return {type:sunk?"sunk":"hit",win,length:ship.length};
  }
  // AI reads only known shots. It never receives the opponent's ship locations.
  function chooseShot(shots,level="medium",random=Math.random,mode=DEFAULT){
    const rule=rules(mode),size=Math.sqrt(shots.length);
    if(!Number.isInteger(size)||size!==rule.size)throw new RangeError("Board and selected mode differ");
    const board={size};
    const free=[];
    for(let i=0;i<shots.length;i++)if(shots[i]===null)free.push(i);
    if(!free.length)return null;
    const pick=a=>a[Math.min(a.length-1,Math.floor(random()*a.length))];
    if(level==="easy")return pick(free);
    const hits=[];
    for(let i=0;i<shots.length;i++)if(shots[i]==="hit")hits.push(i);
    const neighbors=new Set();
    for(const i of hits){
      const [x,y]=xy(i,board);
      for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
        const xx=x+dx,yy=y+dy;
        if(inside(xx,yy,board)&&shots[index(xx,yy,board)]===null)neighbors.add(index(xx,yy,board));
      }
    }
    if(level==="medium"){
      if(neighbors.size&&random()<.85)return pick([...neighbors]);
      return pick(free);
    }
    const heat=Array(shots.length).fill(0),active=hits.length>0;
    for(const len of rule.fleet)for(let y=0;y<size;y++)for(let x=0;x<size;x++)
      for(const v of [false,true]){
        const cells=cellsFor(board,x,y,len,v);
        if(!cells||cells.some(i=>shots[i]==="miss"||shots[i]==="sunk"))continue;
        const matches=cells.filter(i=>shots[i]==="hit").length;
        if(active&&!matches)continue;
        const weight=1+matches*14;
        for(const i of cells)if(shots[i]===null)heat[i]+=weight;
      }
    const max=Math.max(...free.map(i=>heat[i]));
    if(max<=0)return neighbors.size?pick([...neighbors]):pick(free);
    return pick(free.filter(i=>heat[i]===max));
  }
  const sunkCount=board=>board.ships.filter(s=>s.cells.every(c=>board.shots[c]==="sunk")).length;
  return {MODES,DEFAULT,rules,empty,xy,index,cellsFor,canPlace,place,randomFleet,fire,chooseShot,sunkCount};
})();
if(typeof module!=="undefined")module.exports=WaterBattle;
