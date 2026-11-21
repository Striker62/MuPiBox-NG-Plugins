"""Real 800x480 browser screenshots for MuPis Würfelrennen v0.2.8."""
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "examples" / "mupi-wuerfelrennen"
SHOTS = (
    "screenshot-1-start.webp",
    "screenshot-2-six.webp",
    "screenshot-3-game.webp",
    "screenshot-4-finish.webp",
    "screenshot-5-win.webp",
)


class DiceRaceScreenshotTests(unittest.TestCase):
    def test_gallery_has_all_five_full_resolution_webp_images(self):
        readme = (APP / "README.md").read_text(encoding="utf-8")
        docs = (ROOT / "docs" / "mupi-wuerfelrennen.md").read_text(encoding="utf-8")
        self.assertIn("## Screenshots (800 × 480)", readme)
        self.assertIn("screenshot-1-start.webp", docs)
        self.assertIn("capture_mupi_wuerfelrennen_screenshots.py", readme)
        for filename in SHOTS:
            with self.subTest(filename=filename):
                data = (APP / filename).read_bytes()
                self.assertIn(f"]({filename})", readme)
                self.assertGreater(len(data), 10_000)
                self.assertEqual(data[0:4], b"RIFF")
                self.assertEqual(data[8:16], b"WEBPVP8 ")
                self.assertEqual(data[23:26], b"\x9d\x01\x2a")
                width, height = struct.unpack("<HH", data[26:30])
                self.assertEqual((width & 0x3FFF, height & 0x3FFF), (800, 480))


if __name__ == "__main__":
    unittest.main()
