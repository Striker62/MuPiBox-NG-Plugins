"""Bake the Web renderer's original Canvas paths into native sprite atlases."""
import base64
from pathlib import Path
import re
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
world = (root / "examples/mupi-run/world.js").read_text()
canvas = world[world.index("  function tokenAtlas()"):world.index("  const notes=")]
extra = world[world.index("  const shadowCanvas="):world.index("  function hint(")]
extra = extra.replace("const shade=surface.frame(shadowCanvas,0,0,80,16);","")
extra = extra.replace("hints[glyph]=surface.frame(canvas,0,0,36,36)", "hints[glyph]=canvas")
canvas += extra
with tempfile.TemporaryDirectory() as tmp:
    page = Path(tmp) / "art.html"
    page.write_text("<body><script>" + canvas +
        "document.body.textContent=[gold,butterflyAtlas,shadowCanvas,hints['↑'],hints['↓'],hints['↔']].map(c=>c.toDataURL()).join(' ')</script>")
    result = subprocess.run(["chromium", "--headless", "--disable-gpu", "--no-sandbox",
        "--user-data-dir=" + tmp + "/profile", "--dump-dom", page.as_uri()],
        capture_output=True, text=True, check=True)
    images = re.findall(r"data:image/png;base64,([a-zA-Z0-9+/=]+)", result.stdout)
    if len(images) != 6:
        raise RuntimeError("Unexpected atlas export")
    for name, data in zip(("notes", "butterflies", "shadow", "hint-jump", "hint-duck", "hint-dodge"), images):
        (root / "examples/mupi-run-native/art" / (name + ".png")).write_bytes(base64.b64decode(data))
