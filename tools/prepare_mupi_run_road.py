#!/usr/bin/env python3
"""Prepare filtered, indexed road textures for the Pi's software Canvas renderer."""
import base64
import json
from pathlib import Path
from PIL import Image

APP = Path(__file__).resolve().parents[1] / "examples/mupi-run"
tables = {}
for terrain in ("river", "boardwalk", "forest"):
    im = Image.open(APP / "art" / f"ground-{terrain}.webp").convert("RGB")
    # Each pair covers a different footprint of a screen pixel on the road.
    levels = []
    palette = im.quantize(256)
    for width, height in [(128, 4), (192, 8), (256, 16), (384, 32),
                          (512, 64), (512, 128), (512, 256)]:
        level = im.resize((width, height), Image.Resampling.BOX)
        level = level.quantize(palette=palette, dither=Image.Dither.NONE)
        levels.append(base64.b64encode(level.tobytes()).decode("ascii"))
    tables[terrain] = dict(palette=palette.getpalette(), levels=levels)
(APP / "ground-data.js").write_text("window.MuPiGround = " + json.dumps(tables, separators=(",", ":")) + ";\n")
