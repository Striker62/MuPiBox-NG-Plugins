#!/usr/bin/env python3
"""Build MuPis Würfelrennen without bundling repository-only documentation."""
from pathlib import Path
from mupiapp import pack, validate_package

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "examples" / "mupi-wuerfelrennen"
OUTPUT = ROOT / "dist" / "mupi-wuerfelrennen.mupiapp"


def main() -> None:
    docs = ["README.md"] + [p.name for p in APP.glob("screenshot-*.webp")]
    manifest = pack(APP, OUTPUT, excluded=docs)
    validate_package(OUTPUT)
    print(f"OK: {manifest['id']} v{manifest['version']} – {OUTPUT}")
    print(f"  {len(docs)} documentation assets excluded from the installable archive")


if __name__ == "__main__":
    main()
