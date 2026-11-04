#!/usr/bin/env python3
"""Build the entirely offline MuPi Krümelwurm community game."""

import shutil
import sys
from pathlib import Path
from mupiapp import pack

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "examples" / "crumbworm"
STAGING = ROOT / ".build" / "crumbworm"
DIST = ROOT / "dist" / "crumbworm.mupiapp"


def main() -> int:
    if STAGING.exists():
        shutil.rmtree(STAGING)
    STAGING.mkdir(parents=True)
    for source in (APP / "web").iterdir():
        if source.is_file():
            shutil.copy2(source, STAGING / source.name)
    shutil.copy2(APP / "manifest.json", STAGING / "manifest.json")
    shutil.copy2(ROOT / "sdk" / "mupibox-sdk.js", STAGING / "mupibox-sdk.js")
    shutil.copy2(ROOT / "examples" / "shared" / "game-i18n.js", STAGING / "i18n.js")
    manifest = pack(STAGING, DIST)
    print(f"Created: {DIST} ({DIST.stat().st_size:,} bytes; {manifest['id']} v{manifest['version']})")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
