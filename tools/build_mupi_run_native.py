#!/usr/bin/env python3
"""Generate trusted Qt Quick prototype assets from the original MuPi Run 0.8.7.

Not a native-code .mupiapp! The NG alpha.70 JSON-only runtime must NEVER load
these QML files from an untrusted package. This is a first-party test program.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'examples/mupi-run'
DST = ROOT / 'dist/mupi-run-native'
DST.mkdir(parents=True,exist_ok=True)
(DST/'assets').mkdir(exist_ok=True)

original=(SRC/'logic.js').read_text()
head='})(typeof globalThis !== \'undefined\' ? globalThis : this, function () {'
i=original.index(head)+len(head)
j=original.rindex('\n});')
body=original[i:j]
(DST/'RunLogic.js').write_text('.pragma library\n// Generated from examples/mupi-run/logic.js, SHA256 ' + hashlib.sha256(original.encode()).hexdigest() + '\nvar MuPiRun = (function(){' + body + '\n})();\n')
for name,globalname in [('poses.js','MuPiPoses'),('tile-layout.js','MuPiRunTiles')]:
 text=(SRC/name).read_text()
 data=json.loads(text.split(' = ',1)[1].rstrip().rstrip(';'))
 (DST/('RunPoses.js' if name=='poses.js' else 'RunTiles.js')).write_text('.pragma library\nvar '+globalname+' = '+json.dumps(data,separators=(',',':'))+';\n')

# Source images are intentionally re-encoded to PNG: Qt6 on the target Pi can
# lack the optional WebP QImageIO plugin. Keep all coordinates in the original
# PNG spritesheet, to preserve all 384 existing run/action poses.
art_names = [
 'mupi-running-24.ready.webp',
 *[f'{action}-{page}.ready.webp' for action in ('jump','slide') for page in range(3)],
 'ground-river.webp','ground-boardwalk.webp','ground-forest.webp',
 'oak.webp','pine.webp','fern-bed.webp','moss-rock.webp','sleeping-fox.webp',
 'timber-bridge.webp','windfall.webp','vine.png',
 'backdrop.png','foreground.png','branch.png','stump.png',
 'stepping-stones.png','reeds.png','rail-post.png','logo-ui.png',
]
for name in art_names:
 src=SRC/'art'/name
 if not src.exists():
  raise SystemExit(f'Missing original asset {src}')
 dst=DST/'assets'/(Path(name).stem+'.png')
 with Image.open(src) as img:
  img.save(dst,optimize=True)
print(f'Built {len(art_names)} native PNG assets, logic and atlas metadata at {DST}')

# Convert the original packed woodland bitmap into a single native background.
# This follows scene-pixels.js:begin() with zero camera shift.
import base64, io
raw=(SRC/'scenery-data.js').read_text().split(' = ',1)[1].rstrip().rstrip(';')
scenery=json.loads(raw)
image=Image.open(io.BytesIO(base64.b64decode(scenery['image'].split('base64,',1)[1])))
rect=scenery['rects']['woodland'][0]
wood=image.crop((rect[0],rect[1],rect[0]+rect[2],rect[1]+rect[3]))
back=Image.new('RGBA',(876,604),(0,0,0,255))
back.alpha_composite(wood.convert('RGBA').resize((876,604),Image.Resampling.BILINEAR))
back.crop((38,124,838,604)).save(DST/'assets/scenery-background.png',optimize=True)

# Pre-render the unchanged terrain palette/projection from original world.js
# into small 12-phase texture strips. QML composes on GPU without generating
# each floor pixel in JavaScript. At runtime 2m phases interpolate approximately;
# this is a rendering change (NOT a pixel-identical WebEngine frame).
import math
raw=(SRC/'ground-data.js').read_text().split(' = ',1)[1].rstrip().rstrip(';')
ground=json.loads(raw)
W,H=560,226
widths=[128,192,256,384,512,512,512]
for terrain,data in ground.items():
 palette=[data['palette'][i:i+3] for i in range(0,len(data['palette']),3)]
 levels=[]
 for i,encoded in enumerate(data['levels']):
  th=4<<i;tw=widths[i]
  tex=base64.b64decode(encoded)
  if len(tex)!=tw*th: raise ValueError((terrain,i,len(tex),tw*th))
  levels.append(tex)
 for frame in range(12):
  distance=frame*2
  out=Image.new('RGBA',(W,H),(0,0,0,0))
  pixels=out.load()
  for row in range(H):
   y=157+(row+.5)*(323/H)
   scale=(y-113)/322
   z=1.9+17*(1/scale-1)
   depth_per_pixel=17*322*(480/336)/max((y-113)**2,1)
   level=max(0,min(6,round(math.log2(24/depth_per_pixel))-2))
   tw=widths[level];th=4<<level
   band=4.8*333*scale*(W/800)
   distance_scale=17/(17+max(-8,z)-1.9)
   center=400+108*(math.sin(distance*.012+z*.022)-math.sin(distance*.012))*(1-min(1,distance_scale))
   left=center*W/800-band/2
   first=max(0,math.ceil(left-.5));last=min(W,math.ceil(left+band-.5))
   if first>=last:continue
   phase=-(distance+z)/24
   v=int(math.floor((phase-math.floor(phase))*th))%th
   haze=.7*max(0,(213-y)/57)
   alpha=round(255*min(1,max(0,(y-155)/25)))
   offset=v*tw
   step=tw/band
   base_u=(first+.5-left)*step
   tex=levels[level]
   for x in range(first,last):
    u=max(0,min(tw-1,int(base_u+(x-first)*step)))
    c=palette[tex[offset+u]]
    pixels[x,row]=(int(c[0]*(1-haze)+219*haze),int(c[1]*(1-haze)+203*haze),int(c[2]*(1-haze)+155*haze),alpha)
  out.save(DST/'assets'/f'road-{terrain}-{frame:02}.png',optimize=True)
print('Generated woodland backdrop and 36 perspective road texture phases.')
# Keep the QML import files and trusted test renderer alongside generated art.
import shutil
for name in ('RunWorld.js','MuPiRunNative.qml','NativeBench.qml','NativeBenchZones.qml'):
 src=ROOT/'examples/mupi-run-native'/name
 if src.exists(): shutil.copyfile(src,DST/name)
