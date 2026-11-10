"""Verifies unified offline MuPi axolotl cover artwork metadata and dimensions."""
import json
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPS = (
    ("tic-tac-toe", "assets/cover.jpg", "assets/icon.png", "0.2.5"),
    ("four-in-a-row", "assets/cover.jpg", "assets/icon.png", "0.1.4"),
    ("crumbworm", "cover.jpg", "icon.png", "0.2.2"),
    ("chess", "cover.jpg", "icon.png", "0.1.2"),
    ("klang-memory", "cover.jpg", "icon.png", "0.1.3"),
    ("Buecherkiste", "cover-axolotl-v028.jpg", "icon-axolotl-v028.png", "0.2.28"),
    ("fotospass", "cover.jpg", "icon.png", "0.5.6"),
)

def jpeg_dimensions(data):
    if not data.startswith(b"\xff\xd8\xff"):
        raise ValueError("not JPEG")
    pos = 2
    while pos < len(data) - 10:
        if data[pos] != 0xff:
            raise ValueError("invalid marker")
        marker = data[pos + 1]
        if marker in (0xd8, 0xd9):
            pos += 2
            continue
        length = int.from_bytes(data[pos+2:pos+4], "big")
        if marker in (0xc0, 0xc1, 0xc2, 0xc3):
            return (int.from_bytes(data[pos+7:pos+9], "big"),
                    int.from_bytes(data[pos+5:pos+7], "big"))
        if length < 2:
            raise ValueError("invalid length")
        pos += length + 2
    raise ValueError("missing JPEG dimensions")

class CoverArtTests(unittest.TestCase):
    def test_coverflow_assets_are_the_right_ratio_and_icons_are_square(self):
        for app, cover, icon, version in APPS:
            with self.subTest(app=app):
                directory = ROOT / "examples" / app
                manifest = json.loads((directory/"manifest.json").read_text())
                self.assertEqual(manifest["version"], version)
                self.assertEqual(manifest["cover"], cover)
                self.assertEqual(manifest["icon"], icon)
                asset_dir = directory/"web" if app in ("chess", "crumbworm") else directory
                cover_bytes = (asset_dir/cover).read_bytes()
                icon_bytes = (asset_dir/icon).read_bytes()
                self.assertEqual(jpeg_dimensions(cover_bytes), (832,650) if app == "Buecherkiste" else (416,325))
                self.assertGreater(len(cover_bytes), 20000)
                self.assertTrue(icon_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
                self.assertEqual(struct.unpack(">II", icon_bytes[16:24]), (192,192))
                self.assertGreater(len(icon_bytes), 15000)

if __name__ == "__main__":
    unittest.main()
