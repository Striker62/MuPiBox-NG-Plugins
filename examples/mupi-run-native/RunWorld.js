.pragma library
// Same projection (CONTACT=1.9, HORIZON=113, DEPTH=17) and deterministic
// 16-segment scenery recipe as original examples/mupi-run/world.js.
var ratios={'oak':370/366,'pine':370/398,'fern-bed':260/217,'moss-rock':260/219};
var hazards={rock:['moss-rock',76,36],boulder:['moss-rock',125,101],fox:['sleeping-fox',116,78],log:['windfall',117,38],root:['branch',100,31],stump:['stump',104,91],reeds:['reeds',96,94],'stepping-stones':['stepping-stones',125,41],branch:['branch',151,67],vine:['vine',130,103],willow:['vine',130,103]};
function scale(z) {return 17/(17+Math.max(-8,z)-1.9);}
function project(z,lat,distance) {
 var s=scale(z), travel=distance*.012;
 var cx=400+108*(Math.sin(travel+z*.022)-Math.sin(travel))*(1-Math.min(1,s));
 return {x:cx+lat*333*s, y:113+322*s,s:s};
}
function makeScenery(id,seed) {
 var objects=[];
 var n=(Math.imul(id+931,0x45d9f3b)^seed)>>>0;
 function rand(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}
 for(var k=0;k<2;k++){
  var side=k===0?-1:1;
  var z=(id+rand())*8;
  var tree=rand()>.47;
  var kind=tree?(rand()<.57?'oak':'pine'):(rand()<.80?'fern-bed':'moss-rock');
  var lateral=side*(tree?1.36+rand()*1.05:1.02+rand()*.51);
  var height=(tree?215:55)*(.7+rand()*.72);
  objects.push({kind:kind,world:z,lateral:lateral,height:height});
 }
 if(rand()<.37){var side2=rand()<.5?-1:1;objects.push({kind:'butterfly',world:(id+rand())*8,lateral:side2*(1.03+rand()*.39),height:49+rand()*62,phase:rand()*6.28,variant:Math.floor(rand()*3)});}
 return objects;
}
function buildObjects(state,cache,game) {
 var dist=state.distance, objects=[];
 var first=Math.floor((dist-8)/8),last=Math.floor((dist+108)/8);
 for(var id=first;id<=last;id++){
  var key=(id%16+16)%16;
  var seg=cache[key];
  if(!seg||seg.id!==id||seg.seed!==state.scenerySeed){seg={id:id,seed:state.scenerySeed,props:makeScenery(id,state.scenerySeed)};cache[key]=seg;}
  for(var j=0;j<seg.props.length;j++){
   var o=seg.props[j], z=o.world-dist;
   if(z>=-7&&z<108)objects.push({kind:o.kind,z:z,lat:o.lateral,height:o.height,phase:o.phase,variant:o.variant});
  }
 }
 for(var i=0;i<state.obstacles.length;i++){
  var hazard=state.obstacles[i];if(hazard.z>=-8)objects.push({kind:'hazard',z:hazard.z,lat:(hazard.lane||0)*.555,item:hazard.item,type:hazard.kind,checked:hazard.checked});
 }
 for(var k=0;k<state.notes.length;k++){
  var note=state.notes[k];if(note.z>=-5)objects.push({kind:'note',z:note.z,lat:note.lane*.555});
 }
 for(var z=Math.ceil((dist-5)/8)*8;z<dist+108;z+=8){
   if(game.terrainAt(z)==='boardwalk'){
    objects.push({kind:'railing',z:z-dist,lat:-1.04});
    objects.push({kind:'railing',z:z-dist,lat:1.04});
   }
 }
 objects.sort((a,b)=>b.z-a.z);
 var out=[];
 for(var t=0;t<objects.length;t++) {
  var o=objects[t],p=project(o.z,o.lat,dist);
  var source='',w=0,h=0,bottom=0,frame=0,row=0,alpha=1;
  if(o.kind==='hazard'){
   if(o.item==='low-bridge'){source='timber-bridge';w=724*p.s;h=220*p.s;bottom=-2*p.s;}
   else{
    var spec=hazards[o.item]||hazards.rock;
    source=spec[0];w=spec[1]*p.s;h=spec[2]*p.s;
    bottom=o.type==='duck'?112*p.s:0;
    var rx=Math.max(1,w*.34),ry=Math.max(1,5*p.s);
    out.push({source:"shadow",x:p.x-rx,y:p.y+1-ry,w:rx*2,h:ry*2,worldZ:o.z+.001,frame:0,row:0});
   }
   if(!o.checked && o.z<state.speed*.93+2 && o.z>3){
    var size=26*p.s;
    out.push({source:o.type==='duck'?'hint-duck':o.type==='jump'?'hint-jump':'hint-dodge',
        x:p.x-size/2,y:p.y-bottom-h-12*p.s-size/2,w:size,h:size,worldZ:o.z-.002,frame:0,row:0});
   }
  }else if(o.kind==='note'){
   source='notes';w=49*p.s;h=w;
   frame=(Math.floor(state.time*13)+Math.floor(dist+o.z))%12;
   bottom=(80+3*Math.sin(state.time*3+o.z*.12))*p.s-h/2;
  }else if(o.kind==='railing'){
   if(game.terrainAt(dist+o.z+8)==='boardwalk'){
    var far=project(o.z+8,o.lat,dist);
    var ax=p.x,ay=p.y-53*p.s,bx=far.x,by=far.y-53*far.s;
    var cx=(ax+bx)/2,cy=(p.y+far.y)/2-39*p.s;
    // A short quadratic rope approximated by four joined GPU rectangles.
    for(let segment=1;segment<=4;segment++){
      const q=segment/4, inverse=1-q;
      var ex=inverse*inverse*p.x+2*inverse*q*cx+q*q*bx;
      var ey=inverse*inverse*(p.y-53*p.s)+2*inverse*q*cy+q*q*by;
      if(Math.max(ax,ex)>=0 && Math.min(ax,ex)<=800 && Math.max(ay,ey)>=0 && Math.min(ay,ey)<=480)
        out.push({source:'rope',x:ax,y:ay,w:Math.hypot(ex-ax,ey-ay)+.5,h:Math.max(1,3*p.s),
          angle:Math.atan2(ey-ay,ex-ax)*180/Math.PI,worldZ:o.z+.001,frame:0,row:0});
      ax=ex;ay=ey;
    }
   }
   source='rail-post';w=51*p.s;h=70*p.s;bottom=-5*p.s;
  }else if(o.kind==='butterfly'){
   source='butterflies';w=42*p.s;h=31*p.s;bottom=o.height*p.s-h;
   frame=Math.floor((state.time*11+o.phase)*1.6)%8;row=o.variant;
   p.x+=Math.sin(state.time*2+o.phase)*17*p.s;
   bottom-=Math.cos((state.time*2+(o.phase||0))*1.43)*12*p.s;
  }else{
   source=o.kind;alpha=Math.min(1,(108-o.z)/10);h=o.height*p.s;w=h*(ratios[source]||1);
  }
  var x=p.x-w/2,y=p.y-h-bottom;
  if(x+w>=0 && x<=800 && y+h>=0 && y<=480)
    out.push({source:source,x:x,y:y,w:w,h:h,worldZ:o.z,frame:frame,row:row,opacity:alpha});
 }
 return out;
}
function autopilot(game,s){
 var imminent=s.obstacles.filter(o=>!o.checked&&o.z>0&&o.z<56).sort((a,b)=>a.z-b.z);
 if(!imminent.length)return null;
 var item=imminent[0],group=imminent.filter(o=>Math.abs(o.z-item.z)<3),speed=s.speed;
 var safe=game.LANES.filter(l=>!group.some(o=>o.lane===l));
 if(item.lane===null){if(item.z<speed*.66+2&&s.duckAge<0&&s.jumpAge<0)return 'duck';return null;}
 if(s.distance<65&&item.kind==='jump'&&item.z>32&&s.lane!==item.lane)return item.lane<s.lane?'left':'right';
 var occupying=group.find(o=>o.lane!==null&&Math.abs(o.lane-s.visualLane)<.65);
 if(!occupying)return null;
 if(occupying.kind==='jump'&&item.z<speed*.67+2){if(s.jumpAge<0)return 'jump';return null;}
 if(occupying.kind==='jump')return null;
 if(occupying.kind==='duck'&&item.z<speed*.67+2){if(s.duckAge<0&&s.jumpAge<0)return 'duck';return null;}
 if(occupying.kind==='duck')return null;
 if(safe.length){var dest=safe.sort((a,b)=>Math.abs(a-s.lane)-Math.abs(b-s.lane))[0];if(s.lane!==dest)return dest<s.lane?'left':'right';}
 return null;
}
