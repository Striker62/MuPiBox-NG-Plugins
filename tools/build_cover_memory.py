#!/usr/bin/env python3
"""Build the independently authored Cover Memory app."""
from pathlib import Path
from mupiapp import pack
ROOT=Path(__file__).resolve().parents[1]
if __name__ == "__main__":
    pack(ROOT/"examples/cover-memory", ROOT/"dist/cover-memory.mupiapp", excluded=["README.md"])
