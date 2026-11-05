#!/usr/bin/env python3
"""Package the offline photo storage reference app with the public SDK."""
import shutil
from pathlib import Path
from mupiapp import pack

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "examples" / "photo-library-demo"
STAGE = ROOT / ".build" / "photo-library-demo"
DEST = ROOT / "dist" / "photo-library-demo.mupiapp"

def main():
    if STAGE.exists():
        shutil.rmtree(STAGE)
    STAGE.mkdir(parents=True)
    for filename in ("manifest.json", "index.html", "app.js", "style.css"):
        shutil.copy2(SRC / filename, STAGE / filename)
    shutil.copy2(ROOT / "sdk" / "mupibox-sdk.js", STAGE / "mupibox-sdk.js")
    return pack(STAGE, DEST)

if __name__ == "__main__":
    info = main()
    print(f"Built {DEST} ({info['id']} {info['version']})")
