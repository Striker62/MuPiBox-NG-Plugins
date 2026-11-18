#!/usr/bin/env python3
"""Capture actual MuPi Klavier browser views at 800×480 for documentation.

Uses the packaged HTML/CSS/JS with a local simulated MuPiBox SDK bridge. No
screenshots, sample code, or test assets are included in the .mupiapp package.
Run: python3 tools/capture_mupi_klavier_screenshots.py
"""
from __future__ import annotations

import json
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "screenshots" / "mupi-klavier"
BUILD = ROOT / ".build" / "mupi-klavier"
SIZE = (800, 480)
VIEWS = (
    ("frei-spielen.png", "free", 0, 0.0, "piano", "E4"),
    ("notenblatt.png", "staff", 4, 0.0, "piano", ""),
    ("fallende-noten.png", "fall", 10, 0.7, "xylophone", ""),
)

BRIDGE = """<script>
window.__MUPIBOX_BRIDGE__ = {
  invoke: async (method) => method === 'storage.get' ? {value: null} : {},
  subscribe: () => () => {}
};
</script>"""


def validate_png(path: Path) -> None:
    with path.open("rb") as fh:
        header = fh.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not PNG: {path}")
    dimensions = struct.unpack(">II", header[16:24])
    if dimensions != SIZE:
        raise ValueError(f"Unexpected image size: {path} {dimensions}")


def main() -> int:
    chromium = shutil.which("chromium") or shutil.which("chromium-browser")
    if not chromium:
        raise RuntimeError("Chromium required to capture documentation screenshots")
    subprocess.run([sys.executable, str(ROOT / "tools" / "build_mupi_klavier.py")],
                   cwd=ROOT, check=True, capture_output=True, text=True)
    template = (BUILD / "index.html").read_text(encoding="utf-8")
    template = template.replace('<script src="mupibox-sdk.js"></script>',
                                BRIDGE + '\n<script src="mupibox-sdk.js"></script>')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="mupi-klavier-capture-") as profiles:
        for filename, view, note_index, note_progress, instrument, pressed_key in VIEWS:
            state = json.dumps({
                "mode": view,
                "index": note_index,
                "progress": note_progress,
                "instrument": instrument,
                "pressed": pressed_key,
            }, ensure_ascii=False)
            # Only the preview HTML is generated. The actual app files are not modified.
            inject = """<script>
window.addEventListener('load', () => setTimeout(() => {
  const state = STATE_JSON;
  $('song').value = '0';
  $('mode').value = state.mode;
  $('instrument').value = state.instrument;
  index = state.index;
  progress = state.progress;
  paused = true; // Freeze animation at a meaningful note for reproducibility.
  refresh();
  if (state.pressed) buttons.get(state.pressed).classList.add('pressed');
  draw();
  document.body.dataset.captureReady = 'true';
}, 80));
</script>""".replace("STATE_JSON", state)
            preview = BUILD / ("preview-" + view + ".html")
            preview.write_text(template.replace("</body>", inject + "\n</body>"),
                               encoding="utf-8")
            dest = OUTPUT / filename
            cmd = [
                chromium, "--headless", "--no-sandbox", "--disable-gpu",
                "--disable-dev-shm-usage", "--hide-scrollbars",
                "--disable-features=Translate",
                "--force-device-scale-factor=1",
                "--window-size=800,480", "--virtual-time-budget=1200",
                "--user-data-dir=" + str(Path(profiles) / view),
                "--screenshot=" + str(dest), preview.resolve().as_uri()
            ]
            subprocess.run(cmd, cwd=ROOT, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                           timeout=35)
            validate_png(dest)
            print(f"{dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KiB)")
            preview.unlink()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
