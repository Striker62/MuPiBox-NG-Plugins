#!/usr/bin/env python3
"""Build the independent Klang-Memory reference app with the public SDK."""
import shutil
from pathlib import Path
from mupiapp import pack

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples" / "klang-memory"
STAGING = ROOT / ".build" / "klang-memory"
OUTPUT = ROOT / "dist" / "klang-memory.mupiapp"

def main():
    if STAGING.exists():
        shutil.rmtree(STAGING)
    STAGING.mkdir(parents=True)
    for name in ("manifest.json", "index.html", "app.js", "style.css"):
        shutil.copy2(SOURCE / name, STAGING / name)
    shutil.copy2(ROOT / "sdk" / "mupibox-sdk.js", STAGING / "mupibox-sdk.js")
    return pack(STAGING, OUTPUT)

if __name__ == "__main__":
    manifest = main()
    print(f"Built {OUTPUT} ({OUTPUT.stat().st_size} bytes, {manifest['id']} {manifest['version']})")
