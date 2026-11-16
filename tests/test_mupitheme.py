"""Standalone Theme SDK contract tests; no NG source or third-party libraries."""
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "tools" / "mupitheme.py"
spec = importlib.util.spec_from_file_location("mupitheme", MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SAMPLE = Path(__file__).resolve().parents[1] / "examples" / "themes" / "starfield"

class ThemePackTests(unittest.TestCase):
    def test_example_package(self):
        with tempfile.TemporaryDirectory() as tmp:
            output=Path(tmp)/"out.mupitheme"
            self.assertEqual(module.pack(SAMPLE, output)["id"],"community.sternenreise")
            self.assertEqual(module.validate(output)["id"],"community.sternenreise")

    def test_bad_token(self):
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        theme=json.loads((SAMPLE/"theme.json").read_text())
        theme["tokens"]["bg"]=";danger"
        with self.assertRaises(module.ThemeError):
            module.verify(manifest,theme,set(["assets/preview.png","assets/background.png"]))

    def test_bad_components_and_paths(self):
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        theme=json.loads((SAMPLE/"theme.json").read_text())
        theme["components"]["player.progress"]["another"]="bad"
        with self.assertRaises(module.ThemeError):
            module.verify(manifest,theme,{"assets/preview.png","assets/background.png"})
        theme["components"]["player.progress"].pop("another")
        theme["assets"]["background"]="assets/../../root.json"
        with self.assertRaises(module.ThemeError):
            module.verify(manifest,theme,{"assets/preview.png","assets/background.png"})

    def test_duplicate_archive_filename_and_code(self):
        with tempfile.TemporaryDirectory() as tmp:
            target=Path(tmp)/"bad.mupitheme"
            with zipfile.ZipFile(target,'w') as z:
                z.writestr('manifest.json','{}')
                z.writestr('theme.json','{}')
                z.writestr('assets/other.js','alert("no");')
            with self.assertRaises(module.ThemeError):
                module.validate(target)
            with zipfile.ZipFile(target,'w') as z:
                z.writestr('manifest.json','{}')
                z.writestr('Manifest.json','{}')
                z.writestr('theme.json','{}')
            with self.assertRaises(module.ThemeError):
                module.validate(target)
if __name__=="__main__":unittest.main()
