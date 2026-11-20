"""Documentation screenshots reflect the 800x480 MuPi Kreuz & Kreis gameplay UI."""
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "examples" / "tic-tac-toe"
SCREENSHOTS = (
    "screenshot-1-neon-start.png",
    "screenshot-2-neon-ingame.png",
    "screenshot-3-neon-win.png",
)


class TicTacToeScreenshotTests(unittest.TestCase):
    def test_readme_has_all_three_full_resolution_screenshots(self):
        readme = (APP / "README.md").read_text(encoding="utf-8")
        self.assertIn("## Screenshots (800 × 480)", readme)
        for filename in SCREENSHOTS:
            with self.subTest(screenshot=filename):
                self.assertIn(f"./{filename}", readme)
                contents = (APP / filename).read_bytes()
                self.assertTrue(contents.startswith(b"\x89PNG\r\n\x1a\n"))
                self.assertEqual(struct.unpack(">II", contents[16:24]), (800, 480))
                self.assertGreater(len(contents), 10_000)


if __name__ == "__main__":
    unittest.main()
