"""Offline developer tests for the new five-inch community app previews."""
import json
import zipfile
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from mupiapp import pack,validate_package

APPS={
 "mupi-beatbox":("creative",{"storage","controller","audio"}),
 "mupi-soundquiz":("learning",{"storage","controller","audio"}),
 "mupi-rhythm":("games",{"storage","controller","audio"}),
 "mupi-links":("tools",{"controller","links"}),
 "mupi-homeassistant":("tools",{"controller","homeassistant"}),
 "mupi-muehle":("games",{"controller"}),
 "mupi-reversi":("games",{"controller"}),
 "mupi-dame":("games",{"controller"}),
 "mupi-wuerfelrennen":("games",{"controller"}),
 "mupi-wikingerduell":("games",{"controller"}),
}
class CommunitySuiteTests(unittest.TestCase):
 def test_all_preview_packages_are_offline_and_valid(self):
  with tempfile.TemporaryDirectory() as td:
   for slug,(category,permissions) in APPS.items():
    with self.subTest(slug=slug):
     folder=ROOT/"examples"/slug
     meta=json.loads((folder/"manifest.json").read_text())
     self.assertEqual(meta["category"],category)
     self.assertEqual(set(meta["permissions"]),permissions)
     self.assertEqual(meta["display"]["minWidth"],800)
     self.assertEqual(meta["display"]["minHeight"],480)
     self.assertTrue((folder/"cover.png").is_file())
     self.assertNotIn("network",meta["permissions"])
     self.assertNotIn("networkHosts",meta)
     target=Path(td)/slug
     shutil.copytree(folder,target)
     shutil.copyfile(ROOT/"sdk"/"mupibox-sdk.js",target/"mupibox-sdk.js")
     shutil.copyfile(ROOT/"LICENSE",target/"LICENSE.txt")
     out=Path(td)/(slug+".mupiapp")
     self.assertEqual(pack(target,out)["id"],meta["id"])
     self.assertEqual(validate_package(out)["version"],"0.1.0")
     with zipfile.ZipFile(out) as z:
      self.assertEqual(z.read("LICENSE.txt"), (ROOT/"LICENSE").read_bytes())
 def test_scripts_parse(self):
  if shutil.which("node") is None:self.skipTest("node unavailable")
  for slug in APPS:
   with self.subTest(slug=slug):
    proc=subprocess.run(["node","--check",str(ROOT/"examples"/slug/"app.js")],capture_output=True,text=True)
    self.assertEqual(proc.returncode,0,proc.stderr)
 def test_no_unapproved_external_content_or_executable_script(self):
  for slug in APPS:
   html=(ROOT/"examples"/slug/"index.html").read_text()
   self.assertNotIn("<iframe",html)
   self.assertNotIn("https://",html)
   self.assertIn('src="mupibox-sdk.js"',html)
if __name__=="__main__":unittest.main()
