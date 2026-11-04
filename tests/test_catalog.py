"""The published catalog is pinned data; source examples may be newer than releases."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ID = re.compile(r"^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$")
VERSION = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?$")
TAG = re.compile(r"^v[0-9]+\.[0-9]+\.[0-9]+-preview\.[0-9]+$")
ASSET = re.compile(r"^[a-z0-9][a-z0-9-]*\.mupiapp$")
SHA = re.compile(r"^[0-9a-f]{64}$")
PERMISSIONS = {"storage","controller","audio","camera"}

def validate(catalog):
    if not isinstance(catalog, dict) or set(catalog) != {"schema", "apps"} or catalog["schema"] != 1:
        raise ValueError("unsupported schema")
    apps = catalog["apps"]
    if not isinstance(apps, list) or not 0 < len(apps) <= 64:
        raise ValueError("empty or oversized catalog")
    seen = set()
    for app in apps:
        if not isinstance(app, dict) or set(app) != {"id","name","description","category","author","version","releaseTag","asset","sha256","permissions"}:
            raise ValueError("unsupported app fields")
        if not all(isinstance(app[f], str) for f in ("id","name","description","category","author","version","releaseTag","asset","sha256")):
            raise ValueError("app metadata must be strings")
        if not APP_ID.fullmatch(app["id"]) or not VERSION.fullmatch(app["version"]):
            raise ValueError("invalid app id or version")
        if app["id"] in seen:
            raise ValueError("duplicate app id")
        seen.add(app["id"])
        if not TAG.fullmatch(app["releaseTag"]) or not ASSET.fullmatch(app["asset"]) or not SHA.fullmatch(app["sha256"]):
            raise ValueError("unsafe artifact locator or checksum")
        if not 1 <= len(app["name"]) <= 100 or len(app["description"]) > 1000 or len(app["author"]) > 100 or app["category"] not in ("games","learning","creative"):
            raise ValueError("invalid metadata")
        perms = app["permissions"]
        if not isinstance(perms, list) or len(perms) != len(set(perms)) or not set(perms) <= PERMISSIONS:
            raise ValueError("invalid permissions")
    return apps

def version_tuple(value):
    return tuple(int(part) for part in value.split("-", 1)[0].split(".")[:3])

class CatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT/"catalog/apps.json").read_text())
    def test_published_catalog(self):
        examples = {
            "community.tictactoe":"tic-tac-toe",
            "official.klang-memory":"klang-memory",
            "official.webcam-preview":"webcam-preview"
        }
        for app in validate(self.catalog):
            example = examples.get(app["id"], "")
            path = ROOT/"examples"/example/"manifest.json"
            if path.exists():
                manifest = json.loads(path.read_text())
                for key in ("id", "permissions"):
                    self.assertEqual(app[key], manifest[key], key)
                # Unreleased source changes must not silently change the trusted
                # release asset/hash recorded in the curated catalog.
                self.assertGreaterEqual(version_tuple(manifest["version"]),
                                        version_tuple(app["version"]))
                if version_tuple(manifest["version"]) == version_tuple(app["version"]):
                    self.assertEqual(app["name"], manifest["name"])
    def test_url_injection_rejected(self):
        for key,val in (("releaseTag","../main"),("asset","https://evil.local/a.mupiapp"),("asset","../../etc"),("sha256","abc"),("id","../../../evil")):
            catalog = json.loads(json.dumps(self.catalog))
            catalog["apps"][0][key] = val
            with self.subTest(key=key,val=val),self.assertRaises(ValueError): validate(catalog)
    def test_duplicate_rejected(self):
        catalog = json.loads(json.dumps(self.catalog))
        catalog["apps"].append(catalog["apps"][0])
        with self.assertRaises(ValueError): validate(catalog)

if __name__=="__main__":
    unittest.main()
