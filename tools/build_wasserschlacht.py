#!/usr/bin/env python3
"""Build MuPi Wasserschlacht for the offline MuPiBox-NG Community App manager."""
from pathlib import Path
from shutil import copy2, copytree, rmtree
import sys
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples" / "mupi-wasserschlacht"
STAGING = ROOT / ".build" / "mupi-wasserschlacht"
OUTPUT = ROOT / "dist" / "mupi-wasserschlacht.mupiapp"

def main():
    if STAGING.exists():
        rmtree(STAGING)
    STAGING.mkdir(parents=True)
    for filename in ("index.html", "manifest.json", "app.js", "engine.js", "style.css", "icon.svg", "cover.jpg"):
        copy2(SOURCE / filename, STAGING / filename)
    copytree(SOURCE / "assets", STAGING / "assets")
    copy2(ROOT / "sdk" / "mupibox-sdk.js", STAGING / "mupibox-sdk.js")
    copy2(ROOT / "LICENSE", STAGING / "LICENSE.txt")
    sys.path.insert(0, str(ROOT / "tools"))
    from mupiapp import pack, validate_package
    manifest = pack(STAGING, OUTPUT)
    validate_package(OUTPUT)
    print(f"Built {OUTPUT} ({OUTPUT.stat().st_size:,} B) {manifest['id']} v{manifest['version']}")

if __name__ == "__main__":
    main()
