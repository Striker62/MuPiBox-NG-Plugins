"""Documentation screenshots of MuPi Klavier stay linked and out of app packages."""
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "docs" / "screenshots" / "mupi-klavier"
MODES = ("frei-spielen.png", "notenblatt.png", "fallende-noten.png")


class PianoScreenshotTests(unittest.TestCase):
    def test_pngs_have_native_touchscreen_resolution(self):
        for filename in MODES:
            with self.subTest(filename=filename):
                path = SCREENSHOTS / filename
                data = path.read_bytes()
                self.assertTrue(data.startswith(bytes.fromhex("89504e470d0a1a0a")))
                self.assertEqual(struct.unpack(">II", data[16:24]), (800, 480))
                self.assertGreater(len(data), 10_000)

    def test_readme_links_all_images(self):
        readme = (ROOT / "examples" / "mupi-klavier" / "README.md").read_text()
        main = (ROOT / "README.md").read_text()
        for filename in MODES:
            with self.subTest(filename=filename):
                self.assertIn(f"../../docs/screenshots/mupi-klavier/{filename}", readme)
        self.assertIn("docs/screenshots/mupi-klavier/notenblatt.png", main)


if __name__ == "__main__":
    unittest.main()
