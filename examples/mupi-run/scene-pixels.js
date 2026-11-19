/* One software surface for the track, scenery and collectibles behind the runner. */
window.createScenePixels = function (ctx) {
  'use strict';
  const sheet = new Image();
  const assets = {};
  let image, pixels, width, height, sx, sy;
  let backdrop, backdropStride, backdropOffset, base;
  function read(canvas) {
    const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    return new Uint32Array(bytes.buffer);
  }
  function texture(source, data, levels) {
    return {source,data,stride:source.width,levels};
  }
  const ready=new Promise((resolve,reject)=>{
    sheet.onerror=()=>reject(new Error('scenery-data'));
    sheet.onload=()=>{
      try {
        const canvas=document.createElement('canvas');
        canvas.width=sheet.width; canvas.height=sheet.height;
        canvas.getContext('2d',{willReadFrequently:true}).drawImage(sheet,0,0);
        const data=read(canvas);
        for (const [name,levels] of Object.entries(window.MuPiScenery.rects)) {
          assets[name]=texture(sheet,data,levels);
        }
        resolve();
      } catch(error){reject(error);}
    };
    sheet.src=window.MuPiScenery.image;
  });

  const atlases=new WeakMap();
  function frame(canvas,x,y,w,h) {
    if(!atlases.has(canvas)) atlases.set(canvas,read(canvas));
    return texture(canvas,atlases.get(canvas),[[x,y,w,h]]);
  }
  function begin(shift) {
    if (width!==ctx.canvas.width || height!==ctx.canvas.height) {
      width=ctx.canvas.width; height=ctx.canvas.height; sx=width/800; sy=height/480;
      image=ctx.createImageData(width,height);
      pixels=new Uint32Array(image.data.buffer);
      base=new Uint32Array(pixels.length);
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(876*sx); canvas.height=height;
      canvas.getContext('2d').drawImage(sheet,...assets.woodland.levels[0],0,-124*sy,canvas.width,604*sy);
      backdrop=read(canvas); backdropStride=canvas.width; backdropOffset=-1;
    }
    const offset=Math.round((38-shift)*sx);
    if (backdropOffset!==offset) {
      for(let y=0;y<height;y++){
        const start=y*backdropStride+offset;
        base.set(backdrop.subarray(start,start+width),y*width);
      }
      backdropOffset=offset;
    }
    pixels.set(base);
    return pixels;
  }
  // All supported box and browser CPUs store ImageData RGBA little-endian.
  function blend(dst,src,a) {
    const b=256-a;
    return (0xff000000 | ((((src&0xff00ff)*a+(dst&0xff00ff)*b)>>>8)&0xff00ff)
      | ((((src&0xff00)*a+(dst&0xff00)*b)>>>8)&0xff00));
  }
  function stamp(tex,x,y,w,h,opacity=1) {
    const left=x*sx, top=y*sy, dw=w*sx, dh=h*sy;
    const x0=Math.max(0,Math.ceil(left-.5)), x1=Math.min(width,Math.ceil(left+dw-.5));
    const y0=Math.max(0,Math.ceil(top-.5)), y1=Math.min(height,Math.ceil(top+dh-.5));
    if(x0>=x1 || y0>=y1 || opacity<=0) return;
    let level=0;
    while(level+1<tex.levels.length && tex.levels[level+1][2]>=dw) level++;
    const [tx,ty,tw,th]=tex.levels[level], step=tw/dw;
    const start=(x0+.5-left)*step;
    const gain=Math.min(256,Math.round(opacity*256));
    for(let py=y0;py<y1;py++){
      const row=(ty+Math.min(th-1,Math.floor((py+.5-top)*th/dh)))*tex.stride+tx;
      let dest=py*width+x0, u=start;
      for(let px=x0;px<x1;px++,dest++,u+=step){
        const c=tex.data[row+Math.min(tw-1,u|0)], a=(c>>>24)*gain>>>8;
        if(a===255) pixels[dest]=c;
        else if(a) pixels[dest]=blend(pixels[dest],c,a+1);
      }
    }
  }
  function rope(x0,y0,cx,cy,x1,y1,thickness){
    const n=Math.ceil(Math.max(Math.abs(x1-x0)*sx,Math.abs(y1-y0)*sy))+1;
    const r=Math.max(0,Math.floor(thickness*sx/2));
    for(let i=0;i<=n;i++){
      const t=i/n,b=1-t,x=Math.round((b*b*x0+2*t*b*cx+t*t*x1)*sx);
      const y=Math.round((b*b*y0+2*t*b*cy+t*t*y1)*sy);
      if(x>=0&&x<width&&y>=r&&y<height-r)
        for(let dy=-r;dy<=r;dy++) pixels[(y+dy)*width+x]=0xff3b5372;
    }
  }
  return {assets,ready,begin,stamp,frame,rope,blend,present(){ctx.putImageData(image,0,0);}};
};
