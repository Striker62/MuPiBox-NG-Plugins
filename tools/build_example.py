#!/usr/bin/env python3
"""Compile the Go/WASM MuPi Kreuz & Kreis example and ship bundled seven-language UI."""

import os
import shutil
import subprocess
import sys
from pathlib import Path
from mupiapp import pack

ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ROOT / "examples" / "tic-tac-toe"
STAGING = ROOT / ".build" / "tic-tac-toe"
DIST = ROOT / "dist" / "mupi-kreuz-kreis.mupiapp"


def main() -> int:
    if STAGING.exists():
        shutil.rmtree(STAGING)
    STAGING.mkdir(parents=True)
    for asset in (EXAMPLE / "web").iterdir():
        if asset.is_file():
            shutil.copy2(asset, STAGING / asset.name)
    shutil.copy2(EXAMPLE / "manifest.json", STAGING / "manifest.json")
    shutil.copy2(ROOT / "sdk" / "mupibox-sdk.js", STAGING / "mupibox-sdk.js")
    shutil.copy2(ROOT / "examples" / "shared" / "game-i18n.js", STAGING / "i18n.js")

    root = Path(subprocess.check_output(["go", "env", "GOROOT"], text=True).strip())
    candidates = [root / "lib" / "wasm" / "wasm_exec.js", root / "misc" / "wasm" / "wasm_exec.js"]
    runtime = next((candidate for candidate in candidates if candidate.is_file()), None)
    if runtime is None:
        raise RuntimeError("could not find Go wasm_exec.js for the installed toolchain")
    shutil.copy2(runtime, STAGING / "wasm_exec.js")
    go_license = root / "LICENSE"
    if not go_license.is_file() and root.name.startswith("go-"):
        go_license = Path("/usr/share/doc") / ("golang-" + root.name[3:] + "-go") / "copyright"
    if not go_license.is_file():
        raise RuntimeError("Go runtime license notice missing; cannot redistribute wasm_exec.js")
    shutil.copy2(go_license, STAGING / "GO_LICENSE.txt")
    env = dict(os.environ, GOOS="js", GOARCH="wasm", CGO_ENABLED="0")
    subprocess.run(["go", "build", "-trimpath", "-o", str(STAGING / "game.wasm"), "./cmd/wasm"],
                   cwd=EXAMPLE, env=env, check=True)
    manifest = pack(STAGING, DIST)
    print(f"Created: {DIST} ({DIST.stat().st_size:,} bytes; {manifest['id']} v{manifest['version']})")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, subprocess.CalledProcessError, RuntimeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
