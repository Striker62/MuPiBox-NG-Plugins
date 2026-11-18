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
        self.assertEqual(m["version"], "0.2.5")
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

    def test_six_offline_audio_files_and_license_credits(self):
        for name in ("bg-music", "miss", "hit", "sunk", "win", "lose"):
            payload=(ROOT / "assets" / "audio" / (name+".ogg")).read_bytes()
            self.assertGreater(len(payload), 10000)
            self.assertEqual(payload[:4], b"OggS")
        credits=(ROOT / "SOUND_CREDITS.txt").read_text()
        self.assertIn("Blender Foundation", credits)
        self.assertIn("CC BY 3.0", credits)
        self.assertIn("Fisheefects", credits)
        self.assertIn("CC0", credits)

    def test_volume_controls_use_scoped_sdk(self):
        html = (ROOT / "index.html").read_text()
        js = (ROOT / "app.js").read_text()
        self.assertIn('id="volume"', html)
        self.assertNotIn('<span class="logo">', html)
        self.assertIn('audioVolumeControl', js)
        self.assertIn('id="music-volume"', html)
        self.assertIn('id="music-toggle"', html)
        self.assertIn('src="audio-player.js"', html)
        self.assertIn('class="audio-credits"', html)
        self.assertIn('id="test-sound"', html)
        self.assertIn('id="mute"', html)
        self.assertIn('sdk.storage.set(VOLUME_KEY,{volume,muted,musicVolume,musicEnabled})', js)
        self.assertIn('sdk.storage.get(VOLUME_KEY)', js)
        self.assertIn('sdk.audio.playNote(note,volume,instrument,{relative:true})', js)
        self.assertIn("if(muted||volume<=0)return;", js)
        self.assertIn('sound(won?"win":"lose")', js)
        css=(ROOT / "style.css").read_text()
        self.assertIn(".cell.sunk::after", css)
        self.assertIn("#app.hit-shake", css)
        self.assertIn(".grid.board-impact", css)
        self.assertIn("@keyframes wb-impact-label", css)
        self.assertIn("animation:wb-screen-impact 1s", css)
        self.assertIn('id="impact-flash"', html)
        self.assertIn('app.classList.remove("hit-shake")', js)
        self.assertIn('screenShake("enemy",i,hit.type)', js)
        self.assertIn('screenShake("own",chosen,response.type)', js)

if __name__ == "__main__":
    unittest.main()
