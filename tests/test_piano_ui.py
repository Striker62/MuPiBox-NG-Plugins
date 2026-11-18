"""Visual UI contract: the mascot must have three gills on each side."""
import json
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "examples" / "mupi-klavier"

class PianoUiTests(unittest.TestCase):
    def test_mupi_has_exactly_three_gill_branches_per_side(self):
        svg = ET.parse(ROOT / "assets" / "mupi-head.svg").getroot()
        ns = "{http://www.w3.org/2000/svg}"
        gill_group = svg.find(ns + "g")
        self.assertIsNotNone(gill_group)
        self.assertEqual(len(gill_group.findall(ns + "path")), 6)
        # First three paths are left-hand gills, last three are right-hand gills.
        paths = gill_group.findall(ns + "path")
        self.assertEqual(len(paths[:3]), 3)
        self.assertEqual(len(paths[3:]), 3)

    def test_ui_references_the_vector_mascot(self):
        html = (ROOT / "index.html").read_text()
        css = (ROOT / "style.css").read_text()
        js = (ROOT / "app.js").read_text()
        manifest = json.loads((ROOT / "manifest.json").read_text())
        self.assertNotIn('class="brand-mupi"', html)
        self.assertIn("assets/treble-clef.svg", js)
        self.assertTrue((ROOT / "assets" / "treble-clef.svg").is_file())
        self.assertIn("#keyboard", css)
        self.assertNotIn("Draw the clef as vector curves", js)
        self.assertEqual(manifest["version"], "0.1.2")
        self.assertEqual(manifest["icon"], "assets/icon.png")
        self.assertEqual(manifest["cover"], "assets/cover.jpg")
        self.assertEqual(manifest["display"]["minWidth"], 800)
        self.assertEqual(manifest["display"]["minHeight"], 480)

if __name__ == "__main__":
    unittest.main()