#!/usr/bin/env python3
"""Import the original user-provided 6x4 transparent MuPi running sprite sheet.

There is NO redrawing, no flip and no interpolated/fabricated poses.
The original RGBA PNG stays in source/. The runtime atlas resizes each of
its 24 genuine 512x512 cells for smaller Qt/Chromium GPU memory use.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "examples/mupi-run"
SOURCE = APP / "source/mupi-run-24-source.png"
ATLAS = APP / "art/mupi-running-24.webp"
META = APP / "source/mupi-run-24.json"
COLS, ROWS = 6, 4
SOURCE_CELL = 512
RUNTIME_CELL = 320
COUNT = COLS * ROWS
FOOT_Y_SOURCE = 486

def main():
    original = Image.open(SOURCE)
    if original.size != (3072, 2048):
        raise ValueError(f"Unexpected source dimensions: {original.size}, expected 3072x2048")
    if "A" not in original.getbands():
        raise ValueError("Transparent RGBA sprite sheet required")
    original = original.convert("RGBA")
    out = Image.new("RGBA", (COLS * RUNTIME_CELL, ROWS * RUNTIME_CELL), (0,0,0,0))
    bounding_boxes = []
    frames=[]
    for i in range(COUNT):
        x,y = (i%COLS)*SOURCE_CELL, (i//COLS)*SOURCE_CELL
        tile=original.crop((x,y,x+SOURCE_CELL,y+SOURCE_CELL))
        bbox=tile.getchannel("A").getbbox()
        if not bbox or bbox[0]<0 or bbox[2]>SOURCE_CELL or bbox[3]>SOURCE_CELL:
            raise AssertionError(f"Invalid alpha region in frame {i}: {bbox}")
        bounding_boxes.append(bbox)
        tile=tile.resize((RUNTIME_CELL,RUNTIME_CELL),Image.Resampling.LANCZOS)
        frames.append(tile)
        out.alpha_composite(tile,((i%COLS)*RUNTIME_CELL,(i//COLS)*RUNTIME_CELL))
    if len({f.tobytes() for f in frames})!=COUNT:
        raise AssertionError("At least one of the 24 frames is a duplicate")
    out.save(ATLAS,format="WEBP",quality=91,method=5,exact=True)
    META.write_text(json.dumps({
        "source":"mupi-run-24-source.png",
        "sourceSha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "frameCount":COUNT,
        "columns":COLS,
        "rows":ROWS,
        "sourceSizePx":[3072,2048],
        "sourceCellSizePx":SOURCE_CELL,
        "atlasCellSizePx":RUNTIME_CELL,
        "groundAnchorY":FOOT_Y_SOURCE/SOURCE_CELL,
        "sourceFrameBounds":bounding_boxes,
        "usage":"Render raw cells in row-major order; no image mirror; source stays unmodified.",
    },indent=2)+"\n",encoding="utf-8")
    print(f"Imported {COUNT} distinct transparent frames: {ATLAS}, {ATLAS.stat().st_size} bytes")
    print(f"Source SHA256 {hashlib.sha256(SOURCE.read_bytes()).hexdigest()}")

if __name__=="__main__":
    main()
