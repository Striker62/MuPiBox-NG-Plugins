#!/usr/bin/env python3
"""Build independent MuPi Klavier community app."""
from pathlib import Path
import shutil
from mupiapp import pack
ROOT = Path(__file__).resolve().parents[1]
def main():
    stage = ROOT / ".build" / "mupi-klavier"
    if stage.exists():
        shutil.rmtree(stage)
    shutil.copytree(ROOT / "examples" / "mupi-klavier", stage, ignore=shutil.ignore_patterns("*.md"))
    shutil.copy2(ROOT / "sdk" / "mupibox-sdk.js", stage / "mupibox-sdk.js")
    return pack(stage, ROOT / "dist" / "mupi-klavier.mupiapp")
if __name__ == "__main__":
    print(main())
