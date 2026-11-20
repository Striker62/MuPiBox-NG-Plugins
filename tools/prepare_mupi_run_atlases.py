#!/usr/bin/env python3
"""Bake the same padded, draw-size RGBA pages as MuPi Run 0.8.3, before packaging."""
import base64
import io
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile

from PIL import Image


def pack(page, cols, rows):
    """Shelf-pack alpha bounds. Positions include a clear texel around each crop."""
    w,h=page.width//cols-2,page.height//rows-2
    images=[];slots=[]
    for i in range(cols*rows):
        x=(i%cols)*(w+2)+1;y=(i//cols)*(h+2)+1
        tile=page.crop((x,y,x+w,y+h)); box=tile.getchannel('A').getbbox() or (0,0,1,1)
        images.append(tile.crop(box));slots.append([*box[:2],0,0,*images[-1].size])
    best=None
    for width in range(384,1537,64):
        x=y=rh=0;positions={}
        for i in sorted(range(len(images)),key=lambda i:-images[i].height):
            im=images[i]
            if x+im.width+2>width:x=0;y+=rh;rh=0
            positions[i]=(x+1,y+1);x+=im.width+2;rh=max(rh,im.height+2)
        height=y+rh
        if height<=2048 and (best is None or width*height<best[0]):
            best=width*height,width,height,positions
    _,width,height,positions=best
    sheet=Image.new('RGBA',(width,height))
    for i,im in enumerate(images):
        sheet.paste(im,positions[i]);slots[i][2:4]=positions[i]
    return sheet,dict(w=w,h=h,tiles=slots)


def bake(app):
    from html.parser import HTMLParser

    class Result(HTMLParser):
        def handle_data(self, value):
            if value.startswith("data:image/png;base64,"):
                self.png = base64.b64decode(value.split(",", 1)[1])

    chromium = shutil.which("chromium") or shutil.which("chromium-browser")
    if not chromium:
        raise SystemExit("Chromium is required only to regenerate the prepared artwork")
    poses = json.loads((app / "poses.js").read_text().split("=", 1)[1].strip().removesuffix(";"))
    art = app / "art"
    layouts = {}
    for name in ["mupi-running-24", *(f"{action}-{i}" for action in poses["actions"] for i in range(3))]:
        if name == "mupi-running-24":
            cols, count, gutter = 6, 24, 0
            sw = sh = cw = ch = 320
            w = h = 144
        else:
            spec = poses["actions"][name.split("-")[0]]
            cols, count, gutter = poses["columns"], poses["perPage"], 1
            sw, sh = spec["size"]
            cw, ch = spec["cell"]
            w, h = (math.ceil(x * (205 / 512 * .7)) for x in spec["draw"])
        with tempfile.TemporaryDirectory() as temp:
            work = Path(temp)
            page = work / "page.html"
            data = base64.b64encode((art / f"{name}.webp").read_bytes()).decode("ascii")
            page.write_text(f"""<!doctype html><pre id="result"></pre><img id="source" src="data:image/webp;base64,{data}">
<script>
window.onload=()=>{{
 const page=document.createElement('canvas');
 page.width={cols*(w+2)};page.height={math.ceil(count/cols)*(h+2)};
 const ctx=page.getContext('2d',{{willReadFrequently:true}});ctx.imageSmoothingQuality='high';
 for(let i=0;i<{count};i++){{
   const x=i%{cols}, y=Math.floor(i/{cols});
   ctx.drawImage(source,x*{cw}+{gutter},y*{ch}+{gutter},{sw},{sh},x*{w+2}+1,y*{h+2}+1,{w},{h});
 }}
 result.textContent=page.toDataURL();source.remove();
}};
</script>""")
            flags = [chromium, "--headless", "--disable-gpu", "--disable-dev-shm-usage",
                     "--user-data-dir="+str(work/"browser"), "--dump-dom", page.as_uri()]
            # Run Chromium as an ordinary desktop/build user with its normal sandbox.
            result = subprocess.run(flags, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
            parser = Result()
            parser.feed(result.stdout.decode())
            if result.returncode or not hasattr(parser,"png"):
                raise RuntimeError(result.stderr.decode()[-1500:])
            with Image.open(io.BytesIO(parser.png)) as im:
                sheet, layout = pack(im.convert("RGBA"), cols, math.ceil(count / cols))
                sheet.save(art / f"{name}.ready.webp", lossless=True, method=4)
                layouts[name] = layout
            print(name, w, h, flush=True)
    (app / "tile-layout.js").write_text("window.MuPiRunTiles = " + json.dumps(layouts, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    bake(Path(__file__).resolve().parents[1] / "examples/mupi-run")
