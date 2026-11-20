/* Forest runner renderer. Camera and all moving objects share one world-distance axis. */
window.createRunWorld = function (ctx, game) {
  'use strict';
  const surface = window.createScenePixels(ctx);
  let buffering = false;
  const HORIZON = 113, CONTACT = 1.9, FAR = 108, DEPTH = 17;
  // Paint a complete perspective road in one blit. Each scanline selects a
  // prefiltered texture level for the distance covered by a screen pixel.
  const top = 157;
  const widths = [128, 192, 256, 384, 512, 512, 512];
  const textures = Object.create(null);
  for (const [name, data] of Object.entries(window.MuPiGround)) {
    textures[name] = {
      palette: data.palette,
      opaque: [],
      levels: data.levels.map(encoded => {
        const str=atob(encoded), bytes=new Uint8Array(str.length);
        for(let i=0;i<bytes.length;i++) bytes[i]=str.charCodeAt(i);
        return bytes;
      })
    };
  }
  // Use the platform's own RGBA byte order for the fast 32-bit pixel writes.
  function colorsForRow(palette, y) {
    const rgba = new Uint8ClampedArray(256 * 4);
    const haze = .7 * Math.max(0, (213 - y) / 57);
    const alpha = 255 * Math.min(1, (y - 155) / 25);
    for (let i = 0; i < 256; i++) {
      rgba[4*i]   = palette[3*i]   * (1 - haze) + 219 * haze;
      rgba[4*i+1] = palette[3*i+1] * (1 - haze) + 203 * haze;
      rgba[4*i+2] = palette[3*i+2] * (1 - haze) + 155 * haze;
      rgba[4*i+3] = alpha;
    }
    return new Uint32Array(rgba.buffer);
  }
  let rows, lastWidth=0, lastHeight=0;
  function buildRows(width,height,first) {
    const pixelHeight=480/height;
    return Array.from({length:height-first}, (_, ry) => {
      const y = (ry+first+.5) * pixelHeight;
      const s = (y - HORIZON) / 322;
      const z = CONTACT + DEPTH * (1/s - 1);
      const depthPerPixel = DEPTH * 322 * pixelHeight / ((y-HORIZON) ** 2);
      const level = Math.max(0, Math.min(6, Math.round(Math.log2(24 / depthPerPixel)) - 2));
      const texWidth = widths[level], texHeight = 4 << level;
      const bandWidth = 4.8 * 333 * s * width/800;
      const styles = {};
      for (const [name, tex] of Object.entries(textures)) {
        // Near rows have the same opaque palette at every screen position.
        if (y >= 213 && !tex.opaque[level]) {
          const palette = colorsForRow(tex.palette, 213);
          tex.opaque[level] = Uint32Array.from(tex.levels[level], index => palette[index]);
        }
        styles[name] = y >= 213 ? {pixels:tex.opaque[level]} :
          {indices:tex.levels[level], colors:colorsForRow(tex.palette, y)};
      }
      return {z, width:bandWidth, styles, texWidth, texHeight, step:Math.round(texWidth/bandWidth*65536)};
    });
  }

  function scale(z) { return DEPTH / (DEPTH + Math.max(-8, z) - CONTACT); }
  function center(z, distance) {
    const travel = distance * .012;
    return 400 + 108 * (Math.sin(travel + z * .022) - Math.sin(travel)) * (1 - Math.min(1, scale(z)));
  }
  function position(z, lateral, distance) {
    const s = scale(z);
    return {x:center(z, distance) + lateral * 333 * s, y:HORIZON + 322 * s, s};
  }
  function stamp(texture,x,y,w,h,opacity=1) {
    if (x+w<0 || x>800 || y+h<0 || y>480 || opacity<=0) return;
    if(buffering) surface.stamp(texture,x,y,w,h,opacity);
    else {
      ctx.globalAlpha=Math.min(1,opacity);
      ctx.drawImage(texture.source,...texture.levels[0],x,y,w,h);
      ctx.globalAlpha=1;
    }
  }
  function sprite(name,x,y,w,h,opacity=1) {
    stamp(surface.assets[name],x-w/2,y-h,w,h,opacity);
  }
  function ground(state) {
    const dist=state.distance, width=ctx.canvas.width, height=ctx.canvas.height;
    const packed=surface.begin(12*Math.sin(dist*.012));
    const first=Math.ceil(top*height/480);
    if(width!==lastWidth || height!==lastHeight){
      rows=buildRows(width,height,first); lastWidth=width; lastHeight=height;
    }
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y], world = dist + row.z;
      const left = center(row.z, dist) * width/800 - row.width/2;
      const start = Math.max(0, Math.ceil(left - .5));
      const end = Math.min(width, Math.ceil(left + row.width - .5));
      const phase = -world/24;
      const v = Math.floor((phase - Math.floor(phase)) * row.texHeight);
      const offset = v * row.texWidth;
      const style = row.styles[game.terrainAt(world)];
      let u = Math.floor((start + .5 - left) * row.texWidth/row.width * 65536);
      let out = (first+y) * width + start;
      if (style.pixels) {
        const source = style.pixels, step = row.step, last = row.texWidth - 1;
        for (let x = start; x < end; x++, u += step)
          packed[out++] = source[offset + Math.min(last, u >>> 16)];
        continue;
      }
      const {indices, colors} = style;
      for (let x = start; x < end; x++, u += row.step) {
        const color=colors[indices[offset + Math.min(row.texWidth-1, u >>> 16)]];
        packed[out]=(color>>>24)===255 ? color : surface.blend(packed[out],color,color>>>24);
        out++;
      }
    }
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
  const notes=Array.from({length:12},(_,i)=>surface.frame(gold,i*64,0,64,64));
  const butterflies=Array.from({length:24},(_,i)=>surface.frame(butterflyAtlas,i%8*64,Math.floor(i/8)*48,64,48));
  const shadowCanvas=document.createElement('canvas');
  shadowCanvas.width=80; shadowCanvas.height=16;
  const shadowCtx=shadowCanvas.getContext('2d');
  shadowCtx.fillStyle='#26352350';shadowCtx.beginPath();shadowCtx.ellipse(40,8,40,8,0,0,Math.PI*2);shadowCtx.fill();
  const shade=surface.frame(shadowCanvas,0,0,80,16);
  function shadow(x,y,rx,ry){stamp(shade,x-rx,y-ry,2*rx,2*ry);}
  const hints={};
  for(const glyph of ['↑','↓','↔']){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=36;
    const g=canvas.getContext('2d');
    g.fillStyle='#324238ee';g.strokeStyle='#f4ddac';g.lineWidth=3;
    g.beginPath();g.roundRect(2,2,32,32,9);g.fill();g.stroke();
    g.fillStyle='#fff4cc';g.font='bold 24px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(glyph,18,18);
    hints[glyph]=surface.frame(canvas,0,0,36,36);
  }
  function hint(glyph,x,y,s){stamp(hints[glyph],x-13*s,y-13*s,26*s,26*s);}
  const drawList=[];
  function render(state, runner, hazard) {
    const distance=state.distance;
    buffering=true;
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
    for (const obj of drawList) {
      const z=obj.z, p=position(z,obj.lateral || 0,distance), s=p.s;
      if (obj.kind==='runner') {
        surface.present();buffering=false;
        runner(position(CONTACT,state.visualLane*.555,distance));continue;
      }
      if (obj.item) {
        hazard(obj,position(z,(obj.lane || 0)*.555,distance)); continue;
      }
      if ('lane' in obj) {
        const q=position(z,obj.lane*.555,distance);
        const frame=(Math.floor(state.time*13)+Math.floor(distance+z))%12;
        const size=49*s;
        stamp(notes[frame],q.x-size/2,q.y-(80+3*Math.sin(state.time*3+z*.12))*s-size/2,size,size);
      } else if(obj.kind==='railing'){
        for(const side of [-1,1]){
          const q=position(z,side*1.04,distance);
          if(game.terrainAt(obj.world+8)==='boardwalk'){
            const far=position(z+8,side*1.04,distance);
            if(buffering) surface.rope(q.x,q.y-53*s,(q.x+far.x)/2,(q.y+far.y)/2-39*s,far.x,far.y-53*far.s,3*s);
            else {
              ctx.strokeStyle='#72533b';ctx.lineWidth=Math.max(1,3*s);ctx.beginPath();
              ctx.moveTo(q.x,q.y-53*s);ctx.quadraticCurveTo((q.x+far.x)/2,(q.y+far.y)/2-39*s,far.x,far.y-53*far.s);ctx.stroke();
            }
          }
          sprite('rail-post',q.x,q.y+5*s,51*s,70*s);
        }
      } else if(obj.kind==='butterfly'){
        const a=state.time*2+obj.phase;
        const f=Math.floor((state.time*11+obj.phase)*1.6)%8;
        stamp(butterflies[obj.variant*8+f],p.x+(Math.sin(a)*17-21)*s,p.y+(-obj.height+Math.cos(a*1.43)*12)*s,42*s,31*s);
      } else {
        const h=obj.height*s;
        const rect=surface.assets[obj.kind].levels[0];
        sprite(obj.kind,p.x,p.y,h*rect[2]/rect[3],h,Math.min(1,(FAR-z)/10));
      }
    }
  }
  return {render,sprite,shadow,hint,ready:surface.ready};
};
