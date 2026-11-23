"""Security and compatibility tests for generated per-app settings pages."""
import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from mupiapp import PackageError, validate_manifest, validate_admin_settings


class DeclarativeAdminSettingsTests(unittest.TestCase):
    def setUp(self):
        import json
        self.demo=json.loads((Path(__file__).resolve().parents[1]/
            "examples/admin-settings-demo/manifest.json").read_text(encoding="utf-8"))
        self.assets={"index.html","app.js","mupibox-sdk.js","manifest.json"}

    def test_demo_and_legacy_manifest(self):
        validate_manifest(self.demo,self.assets)
        old=copy.deepcopy(self.demo)
        old.pop("adminSettings")
        validate_manifest(old,self.assets)

    def test_invalid_schema_rejected(self):
        for alteration in (
            lambda s: s["fields"].append(copy.deepcopy(s["fields"][0])),
            lambda s: s["fields"][0].update(type="password"),
            lambda s: s["fields"][0].update(key="spotifyRefreshToken"),
            lambda s: s["fields"][0].update(default="yes"),
            lambda s: s["fields"][1].update(maxLength=3),
            lambda s: s["fields"][2].update(max=1),
            lambda s: s["fields"][3]["options"][1].update(value="normal"),
            lambda s: s["fields"][3].update(default="unknown"),
            lambda s: s["fields"][0].update(html="<script>alert(1)</script>"),
            lambda s: s["fields"][0].update(key="../settings"),
            lambda s: s.update(entry="admin.html"),
        ):
            with self.subTest(alteration=str(alteration)):
                test=copy.deepcopy(self.demo)
                alteration(test["adminSettings"] if "entry" not in str(alteration) else test)
                with self.assertRaises(PackageError):
                    validate_manifest(test,self.assets)

if __name__=="__main__":
    unittest.main()
