"""Regression checks for the packaged MuPi Water Battle graphics and audio controls."""
import json
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "examples" / "mupi-wasserschlacht"

class WaterBattleAssetTests(unittest.TestCase):
    def test_cover_is_raster_and_has_correct_manifest(self):
        m = json.loads((ROOT / "manifest.json").read_text())
        self.assertEqual(m["cover"], "cover.jpg")
        self.assertEqual(m["version"], "0.2.1")
        self.assertEqual(m["name"], "MuPi Water Battle")
        self.assertIn("storage", m["permissions"])
        cover = (ROOT / m["cover"]).read_bytes()
        self.assertTrue(cover.startswith(b"\xff\xd8\xff"))
        self.assertGreater(len(cover), 30000)

    def test_single_png_reaction_illustration(self):
        page = (ROOT / "index.html").read_text()
        script = (ROOT / "app.js").read_text()
        self.assertEqual(page.count('id="reaction-img"'), 1)
        self.assertIn('src="assets/sunk.png"', page)
        self.assertIn('"assets/"+kind+".png"', script)
        self.assertNotIn('"assets/"+kind+".svg"', script)
        for name in ("hit", "miss", "sunk"):
            image = (ROOT / "assets" / f"{name}.png").read_bytes()
            self.assertTrue(image.startswith(b"\x89PNG\r\n\x1a\n"))
            width,height=struct.unpack(">II",image[16:24])
            self.assertGreaterEqual(width, 440)
            self.assertGreaterEqual(height, 250)

    def test_volume_controls_use_scoped_sdk(self):
        html = (ROOT / "index.html").read_text()
        js = (ROOT / "app.js").read_text()
        self.assertIn('id="volume"', html)
        self.assertIn('id="test-sound"', html)
        self.assertIn('id="mute"', html)
        self.assertIn('sdk.storage.set(VOLUME_KEY,{volume,muted})', js)
        self.assertIn('sdk.storage.get(VOLUME_KEY)', js)
        self.assertIn('sdk.audio.playNote(note,volume,instrument,{relative:true})', js)
        self.assertIn("if(muted||volume<=0)return;", js)

if __name__ == "__main__":
    unittest.main()
