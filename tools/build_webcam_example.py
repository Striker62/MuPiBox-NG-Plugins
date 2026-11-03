#!/usr/bin/env python3
"""Build the optional camera reference application (without remote dependencies)."""
import shutil
from pathlib import Path
from mupiapp import pack
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"examples"/"webcam-preview"
STAGE=ROOT/".build"/"webcam-preview"
DEST=ROOT/"dist"/"webcam-preview.mupiapp"
def main():
    if STAGE.exists():shutil.rmtree(STAGE)
    STAGE.mkdir(parents=True)
    for name in ("manifest.json","index.html","app.js","style.css"):
        shutil.copy2(SRC/name,STAGE/name)
    shutil.copy2(ROOT/"sdk"/"mupibox-sdk.js",STAGE/"mupibox-sdk.js")
    return pack(STAGE,DEST)
if __name__=="__main__":
    result=main()
    print(f"Built {DEST} ({result['id']} {result['version']})")
