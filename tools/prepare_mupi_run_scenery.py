#!/usr/bin/env python3
"""Pack filtered scenery sprites into one local, readable WebP texture."""
import base64
import io
import json
from pathlib import Path
from PIL import Image

APP = Path(__file__).resolve().parents[1] / "examples/mupi-run"
SPRITES = "woodland oak pine fern-bed moss-rock windfall sleeping-fox timber-bridge branch vine stump reeds stepping-stones rail-post".split()
rects, tiles = {}, []
for name in SPRITES:
    image = Image.open(next((APP / "art").glob(name + ".*webp"), APP / "art" / (name + ".png"))).convert("RGBA")
    image.thumbnail((800, 500) if name == "woodland" else (800, 400), Image.Resampling.LANCZOS)
    rects[name] = []
    while True:
        tiles.append((name, image))
        if name == "woodland" or min(image.size) <= 24:
            break
        image = image.resize(tuple((v+1)//2 for v in image.size), Image.Resampling.LANCZOS)

width, x, y, row_height = 1024, 0, 0, 0
placements = []
for name, image in tiles:
    w,h = image.size
    if x+w+2 > width:
        x, y, row_height = 0, y+row_height, 0
    rects[name].append([x+1, y+1, w, h])
    placements.append((image, (x+1, y+1)))
    row_height = max(row_height,h+2)
    x += w+2
sheet = Image.new("RGBA",(width,y+row_height))
for image, pos in placements:
    sheet.paste(image,pos)
out = io.BytesIO()
sheet.save(out, format="WEBP", quality=89, method=5)
data = "data:image/webp;base64," + base64.b64encode(out.getvalue()).decode("ascii")
(APP / "scenery-data.js").write_text("window.MuPiScenery = " + json.dumps({"rects":rects,"image":data},separators=(",",":")) + ";\n")
