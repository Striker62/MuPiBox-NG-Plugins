"""Photo reference app contract and package smoke tests."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from mupiapp import pack, validate_package

class PhotoDemoTests(unittest.TestCase):
    def test_reference_plugin_packages_with_photo_permission_and_sdk(self):
        src = ROOT / "examples" / "photo-library-demo"
        manifest = json.loads((src / "manifest.json").read_text())
        self.assertEqual(manifest["permissions"], ["photo-save"])
        self.assertNotIn("camera", manifest["permissions"])
        js = (src / "app.js").read_text()
        for method in ("photos.save", "photos.list", "photos.get", "photos.delete"):
            self.assertIn("sdk." + method, js)
        with tempfile.TemporaryDirectory() as temporary:
            stage = Path(temporary) / "source"
            stage.mkdir()
            for name in ("manifest.json", "index.html", "app.js", "style.css"):
                (stage / name).write_bytes((src / name).read_bytes())
            (stage / "mupibox-sdk.js").write_bytes((ROOT / "sdk" / "mupibox-sdk.js").read_bytes())
            target = Path(temporary) / "photo-library-demo.mupiapp"
            metadata = pack(stage, target)
            self.assertEqual(metadata, validate_package(target))
            self.assertEqual(metadata["id"], "official.photo-library-demo")

if __name__ == "__main__":
    unittest.main()
