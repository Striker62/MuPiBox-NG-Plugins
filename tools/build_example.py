#!/usr/bin/env python3
"""Compile the independent Go/WASM reference app, bundle the JS SDK, and package it."""

import os
import shutil
import subprocess
import sys
from pathlib import Path

from mupiapp import pack

ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ROOT / "examples" / "tic-tac-toe"
STAGING = ROOT / ".build" / "tic-tac-toe"
DIST = ROOT / "dist" / "tic-tac-toe.mupiapp"


def main() -> int:
    if STAGING.exists():
        shutil.rmtree(STAGING)
    STAGING.mkdir(parents=True)
    for asset in (EXAMPLE / "web").iterdir():
        if asset.is_file():
            shutil.copy2(asset, STAGING / asset.name)
    shutil.copy2(EXAMPLE / "manifest.json", STAGING / "manifest.json")
    shutil.copy2(ROOT / "sdk" / "mupibox-sdk.js", STAGING / "mupibox-sdk.js")

    root = Path(subprocess.check_output(["go", "env", "GOROOT"], text=True).strip())
    candidates = [root / "lib" / "wasm" / "wasm_exec.js", root / "misc" / "wasm" / "wasm_exec.js"]
    runtime = next((candidate for candidate in candidates if candidate.is_file()), None)
    if runtime is None:
        raise RuntimeError("could not find Go wasm_exec.js for the installed toolchain")
    shutil.copy2(runtime, STAGING / "wasm_exec.js")
    # Go runtime assets are BSD-3-Clause licensed; include the notice in distributed packages.
    shutil.copy2(root / "LICENSE", STAGING / "GO_LICENSE.txt")
    env = dict(os.environ, GOOS="js", GOARCH="wasm", CGO_ENABLED="0")
    subprocess.run(["go", "build", "-trimpath", "-o", str(STAGING / "game.wasm"), "./cmd/wasm"], cwd=EXAMPLE, env=env, check=True)
    manifest = pack(STAGING, DIST)
    print(f"Created: {DIST} ({DIST.stat().st_size:,} bytes; {manifest['id']} v{manifest['version']})")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, subprocess.CalledProcessError, RuntimeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
