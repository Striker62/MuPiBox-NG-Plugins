#!/usr/bin/env python3
"""Regression verification of user's ORIGINAL RGBA 6x4 MuPi Run sprite sheet."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import hashlib
import json
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'examples/mupi-run'
source=APP/'source/mupi-run-24-source.png'
meta=json.loads((APP/'source/mupi-run-24.json').read_text())
original=Image.open(source).convert('RGBA')
atlas=Image.open(APP/'art/mupi-running-24.webp').convert('RGBA')
assert original.size==(3072,2048),original.size
assert atlas.size==(1920,1280),atlas.size
assert meta['frameCount']==24 and meta['columns']==6 and meta['rows']==4
assert meta['sourceSha256']==hashlib.sha256(source.read_bytes()).hexdigest()
assert abs(meta['groundAnchorY']-486/512)<1e-9
frames=[]
for idx in range(24):
    x,y=(idx%6)*512,(idx//6)*512
    native=original.crop((x,y,x+512,y+512))
    bbox=native.getchannel('A').getbbox()
    assert bbox and 30<=bbox[0]<=45 and bbox[2]<=485 and bbox[3]<=489,(idx,bbox)
    ax,ay=(idx%6)*320,(idx//6)*320
    runtime=atlas.crop((ax,ay,ax+320,ay+320))
    assert runtime.getchannel('A').getbbox() is not None
    assert runtime.getpixel((0,0))[3]==0
    target=native.resize((320,320),Image.Resampling.LANCZOS)
    diff=ImageChops.difference(target,runtime)
    quality=max(ImageStat.Stat(diff).mean[:3])
    assert quality<14,(idx,quality)
    frames.append(runtime)
assert len({frame.tobytes() for frame in frames})==24,'Duplicate frames in imported atlas'
print('PASS: all 24 source frames in correct 6x4 order, PNG alpha retained, no duplicates')
print('PASS: 1920x1280 compressed atlas and per-frame color quality verified')
