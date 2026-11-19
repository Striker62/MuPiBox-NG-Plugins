/* Forest runner renderer. Camera and all moving objects share one world-distance axis. */
window.createRunWorld = function (ctx, art, game) {
  'use strict';
  const HORIZON = 113, CONTACT = 1.9, FAR = 108, DEPTH = 17;
  const views = [];
  for (let y = 157; y < 480;) {
    const h = y < 215 ? 2 : 4;
    const depthAt = py => CONTACT + DEPTH * (322 / (py - HORIZON) - 1);
    views.push({y, h, far:depthAt(y), near:depthAt(y + h)});
    y += h;
  }
  const haze = ctx.createLinearGradient(0, 156, 0, 213);
  haze.addColorStop(0, 'rgba(219,203,155,.70)');
  haze.addColorStop(1, 'rgba(219,203,155,0)');

  function scale(z) { return DEPTH / (DEPTH + Math.max(-8, z) - CONTACT); }
  function center(z, distance) {
    const travel = distance * .012;
    return 400 + 108 * (Math.sin(travel + z * .022) - Math.sin(travel)) * (1 - Math.min(1, scale(z)));
  }
  function position(z, lateral, distance) {
    const s = scale(z);
    return {x:center(z, distance) + lateral * 333 * s, y:HORIZON + 322 * s, s};
  }
  function sprite(name, x, y, w, h, opacity = 1) {
    if (x+w/2 < 0 || x-w/2 > 800 || y < 0 || y-h > 480 || opacity <= 0) return;
    const img = art[name];
    if (!img || !img.naturalWidth) return;
    ctx.globalAlpha = Math.min(1, opacity);
    ctx.drawImage(img, x-w/2, y-h, w, h);
    ctx.globalAlpha = 1;
  }

  function ground(state) {
    const bg = art.woodland;
    if (bg.naturalWidth) {
      const shift = 12 * Math.sin(state.distance * .012);
      ctx.drawImage(bg, -38 + shift, -124, 876, 604);
    } else {
      ctx.fillStyle = '#55735a'; ctx.fillRect(0,0,800,480);
    }
    const dist = state.distance;
    for (const row of views) {
      const z = (row.near + row.far) * .5;
      const tile = art['ground-' + game.terrainAt(dist+z)];
      if (!tile.naturalWidth) continue;
      const w = 4.8 * 333 * scale(z);
      const x = center(z,dist) - w/2;
      // Map transverse texture scanlines to ground distance. Near texels travel faster.
      const world = dist + row.far;
      const period = 24;
      const srcY = ((-world % period) + period) % period * tile.height / period;
      const srcH = Math.max(.5, (row.far-row.near) * tile.height / period);
      const first = Math.min(srcH, tile.height-srcY);
      const split = row.h * first/srcH;
      ctx.globalAlpha=Math.min(1,(row.y-155)/25);
      ctx.drawImage(tile,0,srcY,tile.width,first,x,row.y,w,split+.55);
      if (first < srcH) ctx.drawImage(tile,0,0,tile.width,srcH-first,x,row.y+split,w,row.h-split+.55);
      if (row.y < 213) {
        ctx.fillStyle = haze;
        ctx.fillRect(x,row.y,w,row.h+.4);
      }
    }
    ctx.globalAlpha=1;
  }

  // The ring recycles 16 world segments. A segment's contents are stable until it leaves view.
  const ring = Array.from({length:16}, () => ({id:null, props:[]}));
  function fillSegment(seg, id, seed) {
    seg.id=id; seg.seed=seed; seg.props.length=0;
    let n = (Math.imul(id+931, 0x45d9f3b) ^ seed) >>> 0;
    function rand() { n = (Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; }
    for (const side of [-1,1]) {
      const z = (id + rand()) * 8;
      const tree = rand() > .47;
      const kind = tree ? (rand() < .57 ? 'oak' : 'pine') : (rand() < .80 ? 'fern-bed' : 'moss-rock');
      const lateral = side * (tree ? 1.36 + rand() * 1.05 : 1.02 + rand() * .51);
      const height = (tree ? 215 : 55) * (.7 + rand() * .72);
      seg.props.push({kind,world:z,lateral,height});
    }
    if (rand() < .37) {
      const side = rand() < .5 ? -1 : 1;
      seg.props.push({kind:'butterfly',world:(id+rand())*8,lateral:side*(1.03+rand()*.39),
        height:49+rand()*62, phase:rand()*6.28, variant:Math.floor(rand()*3)});
    }
  }
  function tokenAtlas() {
    const atlas = document.createElement('canvas');
    atlas.width=64*12; atlas.height=64;
    const g=atlas.getContext('2d');
    const note=new Path2D('M27 43V12Q27 9 30 9L52 4Q55 3 55 7V40C55 47 41 52 37 46C33 39 44 33 49 35V17L33 21V47C33 55 17 61 13 54C9 47 20 40 27 43Z');
    for(let i=0;i<12;i++){
      g.save(); g.translate(i*64,0);
      g.lineJoin='round';g.lineWidth=5; g.strokeStyle='#673b13';g.stroke(note);
      g.translate(0,-1.5);
      const gold=g.createLinearGradient(6,2,57,57);
      gold.addColorStop(0,'#bd6814'); gold.addColorStop(.29,'#ffdf70');
      gold.addColorStop(.44,'#fff5a2');gold.addColorStop(.53,'#ffc034'); gold.addColorStop(1,'#d58a17');
      g.fillStyle=gold;g.fill(note);g.strokeStyle='#ffefa0';g.lineWidth=1.25;g.stroke(note);
      g.save();g.clip(note);g.strokeStyle='#fff9c8';g.lineWidth=5;
      g.beginPath();g.moveTo(i*8-38,60);g.lineTo(i*8+1,0);g.stroke();g.restore();
      if(i>7){const r=(i===10?7:4);g.fillStyle='#fff9cd';g.beginPath();g.moveTo(52,5-r);g.quadraticCurveTo(53,4,52+r,5);g.quadraticCurveTo(53,6,52,5+r);g.quadraticCurveTo(51,6,52-r,5);g.quadraticCurveTo(51,4,52,5-r);g.fill();}
      g.restore();
    }
    return atlas;
  }
  const gold = tokenAtlas();
  const butterflyAtlas = document.createElement('canvas');
  butterflyAtlas.width=8*64; butterflyAtlas.height=3*48;
  const bg=butterflyAtlas.getContext('2d');
  const wing=new Path2D('M0 0C-6-12 -17-22 -25-19C-31-16 -26-6 -19-2C-26-1 -23 11 -15 12C-8 13 -4 5 0 0Z');
  ['#ed5556','#b995ff','#fbd552'].forEach((color,row)=>{
    for(let i=0;i<8;i++){
      bg.save();bg.translate(i*64+32,row*48+23);
      const spread=.22+.78*(.5+.5*Math.cos(i*Math.PI/4));
      for(const side of [-1,1]){
        bg.save();bg.scale(side*spread,1);
        bg.fillStyle=color;bg.fill(wing);bg.strokeStyle='#393944';bg.lineWidth=1.7;bg.stroke(wing);
        bg.beginPath();bg.moveTo(-2,0);bg.lineTo(-24,-15);bg.moveTo(-3,1);bg.lineTo(-16,9);bg.stroke();
        for(const [x,y] of [[-23,-14],[-19,-10],[-18,6]]){
          bg.fillStyle='#fff1be';bg.beginPath();bg.arc(x,y,1.5,0,Math.PI*2);bg.fill();
        }
        bg.restore();
      }
      bg.fillStyle='#44392f';bg.beginPath();bg.ellipse(0,-1,1.6,7,.16,0,Math.PI*2);bg.fill();bg.restore();
    }
  });
  const drawList=[];
  function render(state, runner, hazard) {
    const distance=state.distance;
    ground(state);
    drawList.length=0;
    const first=Math.floor((distance-8)/8), last=Math.floor((distance+FAR)/8);
    for(let id=first;id<=last;id++){
      const seg=ring[(id%16+16)%16];
      if(seg.id!==id || seg.seed!==state.scenerySeed) fillSegment(seg,id,state.scenerySeed);
      for(const obj of seg.props) {
        obj.z=obj.world-distance;
        if(obj.z>=-7 && obj.z<FAR) drawList.push(obj);
      }
    }
    for(let world=Math.ceil((distance-5)/8)*8;world<distance+FAR;world+=8){
      if(game.terrainAt(world)==='boardwalk') drawList.push({kind:'railing',z:world-distance,world});
    }
    for(const ob of state.obstacles) if(ob.z>=-8) drawList.push(ob);
    for(const note of state.notes) if(note.z>=-5) drawList.push(note);
    drawList.push({kind:'runner',z:CONTACT});
    drawList.sort((a,b)=>b.z-a.z);
    for(const obj of drawList){
      const z=obj.z, p=position(z,obj.lateral || 0,distance), s=p.s;
      if (obj.kind==='runner') { runner(position(CONTACT,state.visualLane*.555,distance)); continue; }
      if (obj.item) {
        hazard(obj,position(z,(obj.lane || 0)*.555,distance)); continue;
      }
      if ('lane' in obj) {
        const q=position(z,obj.lane*.555,distance);
        const frame=(Math.floor(state.time*13)+Math.floor(distance+z))%12;
        const size=49*s;
        ctx.drawImage(gold,frame*64,0,64,64,q.x-size/2,q.y-(80+3*Math.sin(state.time*3+z*.12))*s-size/2,size,size);
      } else if(obj.kind==='railing'){
        for(const side of [-1,1]){
          const q=position(z,side*1.04,distance);
          if(game.terrainAt(obj.world+8)==='boardwalk'){
            const far=position(z+8,side*1.04,distance);
            ctx.strokeStyle='#72533b';ctx.lineWidth=Math.max(1,3*s);ctx.beginPath();
            ctx.moveTo(q.x,q.y-53*s);ctx.quadraticCurveTo((q.x+far.x)/2,(q.y+far.y)/2-39*s,far.x,far.y-53*far.s);ctx.stroke();
          }
          sprite('rail-post',q.x,q.y+5*s,51*s,70*s);
        }
      } else if(obj.kind==='butterfly'){
        const a=state.time*2+obj.phase;
        const f=Math.floor((state.time*11+obj.phase)*1.6)%8;
        ctx.drawImage(butterflyAtlas,f*64,obj.variant*48,64,48,p.x+(Math.sin(a)*17-21)*s,p.y+(-obj.height+Math.cos(a*1.43)*12)*s,42*s,31*s);
      } else {
        const h=obj.height*s;
        const img=art[obj.kind];
        if(img.naturalWidth) sprite(obj.kind,p.x,p.y,h*img.naturalWidth/img.naturalHeight,h,Math.min(1,(FAR-z)/10));
      }
    }
  }
  return {render,sprite};
};
