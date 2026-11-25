(function(root){
 'use strict';
 const LIMIT=150,POINTS=2048;
 class Drawing {
  constructor(){this.strokes=[];this.active=null;}
  begin(x,y,color,width,erase){this.finish();this.active={color,width,erase,points:[[x,y]]};}
  move(x,y){if(!this.active)return;const p=this.active.points,last=p[p.length-1];if(p.length<POINTS&&Math.hypot(x-last[0],y-last[1])>=1)p.push([x,y]);}
  finish(){if(!this.active)return;this.strokes.push(this.active);this.active=null;}
  undo(){this.finish();return this.strokes.pop();}
  clear(){this.active=null;this.strokes=[];}
  full(){return this.strokes.length>=LIMIT;}
 }
 function stroke(ctx,s){
  const p=s.points;if(!p.length)return;
  ctx.save();ctx.globalCompositeOperation=s.erase?'destination-out':'source-over';
  ctx.strokeStyle=ctx.fillStyle=s.color;ctx.lineWidth=s.width;ctx.lineCap=ctx.lineJoin='round';
  ctx.beginPath();ctx.arc(p[0][0],p[0][1],s.width/2,0,Math.PI*2);ctx.fill();
  if(p.length>1){ctx.beginPath();ctx.moveTo(...p[0]);for(const point of p.slice(1))ctx.lineTo(...point);ctx.stroke();}
  ctx.restore();
 }
 const api={Drawing,stroke,LIMIT};if(typeof module==='object')module.exports=api;else root.PaintEngine=api;
})(typeof window==='object'?window:globalThis);
