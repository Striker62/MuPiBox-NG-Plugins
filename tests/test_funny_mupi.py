"""Contract smoke checks for Funny MuPi. Execute with unittest discover."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "examples" / "funny-mupi"

class FunnyMuPiTests(unittest.TestCase):
    def test_manifest(self):
        manifest = json.loads((APP / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["id"], "community.funny-mupi")
        self.assertEqual(manifest["apiVersion"], "1")
        self.assertEqual(manifest["category"], "other")
        self.assertEqual(set(manifest["permissions"]), {"audio", "controller"})
        for path in ("entry", "icon", "cover"):
            self.assertTrue((APP / manifest[path]).is_file())

    def test_50_german_jokes(self):
        data = json.loads((APP / "jokes/de.json").read_text(encoding="utf-8"))
        self.assertEqual(data["language"], "de")
        self.assertEqual(len(data["jokes"]), 50)
        self.assertEqual(len(set(data["jokes"])), 50)
        self.assertTrue(all(0 < len(j) <= 600 for j in data["jokes"]))

    def test_other_language(self):
        data = json.loads((APP / "jokes/en.json").read_text(encoding="utf-8"))
        self.assertEqual(data["language"], "en")
        self.assertGreater(len(data["jokes"]), 0)
        self.assertTrue(all(isinstance(j, str) and 0 < len(j) <= 600 for j in data["jokes"]))

    def test_orange_mascot_and_pointing_bubble(self):
        svg = (APP / "assets/mupi-laugh.svg").read_text(encoding="utf-8")
        css = (APP / "style.css").read_text(encoding="utf-8")
        self.assertIn("#ff943d", svg)
        self.assertNotIn("#7cd5c7", svg)
        self.assertIn("clip-path:polygon(0 0,100% 50%,0 100%)", css)
        self.assertIn(".bubble:before", css)
        png = (APP / "assets/mupi-laugh-refined.png").read_bytes()
        self.assertTrue(png.startswith(bytes([137,80,78,71,13,10,26,10])))
        self.assertIn("assets/mupi-laugh-refined.png", (APP / "index.html").read_text(encoding="utf-8"))

    def test_bundled_cc0_laughter(self):
        audio = (APP / "assets/laugh-ionakan-712055.mp3")
        self.assertTrue(audio.is_file())
        self.assertGreater(audio.stat().st_size, 10000)
        self.assertIn("ionakan", (APP / "README.md").read_text(encoding="utf-8"))
        import wave
        with wave.open(str(APP / "assets/laugh-ionakan-712055.wav"), "rb") as sound:
            self.assertEqual(sound.getframerate(), 24000)
            self.assertEqual(sound.getnchannels(), 1)
            self.assertEqual(sound.getsampwidth(), 2)

    def test_local_files_only(self):
        code = (APP / "app.js").read_text(encoding="utf-8")
        self.assertIn("sdk.tts.speak(", code)
        self.assertIn("sdk.getContext()", code)
        self.assertIn("'jokes/' + lang + '.json'", code)
        self.assertNotIn("https://", code)

if __name__ == "__main__":
    unittest.main()
