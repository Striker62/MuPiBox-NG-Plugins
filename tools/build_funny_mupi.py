#!/usr/bin/env python3
"""Build the standalone offline Funny MuPi community app."""
from pathlib import Path
from tempfile import TemporaryDirectory
import shutil
from mupiapp import pack

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples" / "funny-mupi"
DIST = ROOT / "dist" / "funny-mupi.mupiapp"

def main():
    DIST.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="funny-mupi-") as folder:
        target = Path(folder) / "funny-mupi"
        shutil.copytree(SOURCE, target)
        shutil.copyfile(ROOT / "sdk" / "mupibox-sdk.js", target / "mupibox-sdk.js")
        result = pack(target, DIST, excluded=('README.md',))
        print(f"{result['id']} {result['version']}: {DIST}")

if __name__ == "__main__":
    main()
