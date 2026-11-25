#!/usr/bin/env python3
from pathlib import Path
from mupiapp import pack
ROOT=Path(__file__).resolve().parents[1]
if __name__ == "__main__":
    pack(ROOT/"examples/mupi-malbuch", ROOT/"dist/mupi-malbuch.mupiapp", excluded=["README.md"])
