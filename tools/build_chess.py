#!/usr/bin/env python3
"""Package the independent, offline MuPi Schach Community App."""
from pathlib import Path
from shutil import copy2, rmtree
import sys

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'examples'/'chess'
STAGING=ROOT/'.build'/'chess'
DIST=ROOT/'dist'/'mupi-chess.mupiapp'


def main():
    sys.path.insert(0,str(ROOT/'tools'))
    from mupiapp import pack
    if STAGING.exists(): rmtree(STAGING)
    STAGING.mkdir(parents=True)
    for src in (SOURCE/'web').iterdir():
        if src.is_file() and src.name!='mupibox-sdk.js': copy2(src,STAGING/src.name)
    import base64
    cover_source=SOURCE/'cover.base64.txt'
    (STAGING/'cover.png').write_bytes(base64.b64decode(cover_source.read_text(encoding='ascii').strip(),validate=True))
    copy2(SOURCE/'manifest.json',STAGING/'manifest.json')
    copy2(ROOT/'sdk'/'mupibox-sdk.js',STAGING/'mupibox-sdk.js')
    manifest=pack(STAGING,DIST)
    print(f"Created: {DIST} ({DIST.stat().st_size:,} bytes; {manifest['id']} v{manifest['version']})")

if __name__=='__main__': main()
