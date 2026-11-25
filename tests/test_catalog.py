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
PERMISSIONS = {"storage","controller","audio","camera","photo-save","shared-assets","links","homeassistant","device-status","playback","playback-control","optical-media", "cover-art", "coloring-pages"}

def validate(catalog):
    if not isinstance(catalog, dict) or set(catalog) != {"schema", "apps"} or catalog["schema"] != 1:
        raise ValueError("unsupported schema")
    apps = catalog["apps"]
    if not isinstance(apps, list) or not 0 < len(apps) <= 64:
        raise ValueError("empty or oversized catalog")
    seen = set()
    for app in apps:
        required={"id","name","description","category","author","version","releaseTag","asset","sha256","permissions"}
        optional={"icon","publishedAt","updatedAt"}
        if not isinstance(app,dict) or not required.issubset(app) or not set(app).issubset(required|optional):
            raise ValueError("unsupported app fields")
        if not all(isinstance(app[f], str) for f in ("id","name","description","category","author","version","releaseTag","asset","sha256")):
            raise ValueError("app metadata must be strings")
        if "icon" in app and (not isinstance(app["icon"],str) or not re.fullmatch(r"examples/[A-Za-z0-9_-]+/(?:[A-Za-z0-9_-]+/){0,3}[A-Za-z0-9_.-]+\.(?:png|jpg|jpeg|webp)",app["icon"])):
            raise ValueError("invalid catalog icon")
        if not APP_ID.fullmatch(app["id"]) or not VERSION.fullmatch(app["version"]):
            raise ValueError("invalid app id or version")
        if app["id"] in seen:
            raise ValueError("duplicate app id")
        seen.add(app["id"])
        if not TAG.fullmatch(app["releaseTag"]) or not ASSET.fullmatch(app["asset"]) or not SHA.fullmatch(app["sha256"]):
            raise ValueError("unsafe artifact locator or checksum")
        if not 1 <= len(app["name"]) <= 100 or len(app["description"]) > 1000 or len(app["author"]) > 100 or app["category"] not in ("games","learning","creative","tools","other"):
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
    def assert_source_matches_release(self, app, manifest):
        self.assertEqual(app["id"], manifest["id"], "id")
        self.assertGreaterEqual(version_tuple(manifest["version"]),
                                version_tuple(app["version"]))
        permissions = manifest["permissions"]
        self.assertIsInstance(permissions, list)
        self.assertEqual(len(permissions), len(set(permissions)))
        self.assertLessEqual(set(permissions), PERMISSIONS)
        # The catalog describes published bytes, not unreleased source changes.
        # Matching release versions must still match name and permissions.
        if version_tuple(manifest["version"]) == version_tuple(app["version"]):
            self.assertEqual(app["name"], manifest["name"], "name")
            self.assertEqual(app["permissions"], permissions, "permissions")
    def test_published_catalog(self):
        examples = {
            "community.mupi-run-native":"mupi-run-native",
            "community.tictactoe":"tic-tac-toe",
            "community.mupi-four-in-a-row":"four-in-a-row",
            "community.mupi-kruemelwurm":"crumbworm",
            "community.mupi-chess":"chess",
            "official.klang-memory":"klang-memory",
            "official.webcam-preview":"webcam-preview",
            "community.fotospass":"fotospass",
            "community.buecherkiste":"Buecherkiste",
            "community.mupi-wasserschlacht":"mupi-wasserschlacht"
        }
        for app in validate(self.catalog):
            example = examples.get(app["id"], "")
            path = ROOT/"examples"/example/"manifest.json"
            if path.exists():
                manifest = json.loads(path.read_text())
                self.assert_source_matches_release(app, manifest)
    def test_first_party_extension_keeps_old_catalog_compatible(self):
        old = validate(self.catalog)
        self.assertFalse(any(set(a["permissions"]) & {"cover-art","coloring-pages"} for a in old))
        extra = validate(json.loads((ROOT/"catalog/first-party-apps.json").read_text()))
        paths={"official.cover-memory":"cover-memory","official.mupi-malbuch":"mupi-malbuch"}
        self.assertEqual(set(a["id"] for a in extra),set(paths))
        for app in extra:
            self.assert_source_matches_release(app,json.loads((ROOT/"examples"/paths[app["id"]]/"manifest.json").read_text()))
            self.assertNotIn(app["id"],{a["id"] for a in old})
    def test_new_source_permissions_do_not_rewrite_published_release(self):
        release = {"id": "community.example", "name": "Example", "version": "0.2.19", "permissions": []}
        source = {**release, "version": "0.2.24", "permissions": ["shared-assets"]}
        self.assert_source_matches_release(release, source)
        self.assertEqual(release["permissions"], [])
        for changes in ({"version": "0.2.19"}, {"version": "0.2.18"},
                        {"id": "community.other"}, {"permissions": ["unknown"]},
                        {"permissions": ["shared-assets", "shared-assets"]}):
            with self.subTest(changes=changes), self.assertRaises(AssertionError):
                self.assert_source_matches_release(release, {**source, **changes})
    def test_same_release_keeps_exact_permissions_and_name(self):
        release = {"id": "community.example", "name": "Example", "version": "1.0.0", "permissions": ["shared-assets"]}
        self.assert_source_matches_release(release, dict(release))
        for changes in ({"permissions": []}, {"permissions": ["camera"]}, {"name": "Renamed"}):
            with self.subTest(changes=changes), self.assertRaises(AssertionError):
                self.assert_source_matches_release(release, {**release, **changes})
    def test_chess_cover_and_library_metadata(self):
        import struct
        chess = next(a for a in self.catalog['apps'] if a['id'] == 'community.mupi-chess')
        manifest = json.loads((ROOT/'examples/chess/manifest.json').read_text())
        self.assertEqual(chess['category'], 'games')
        self.assertGreaterEqual(version_tuple(manifest['version']), version_tuple(chess['version']))
        self.assertEqual(chess['permissions'], manifest['permissions'])
        self.assertEqual(manifest['cover'], 'cover-clean-v2.jpg')
        self.assertEqual(manifest['display']['background'], 'app')
        self.assertFalse(manifest['display']['showBackButton'])
        self.assertFalse(manifest['display']['showSystemInfo'])
        self.assertTrue(manifest['display']['fullScreen'])
        cover = (ROOT/'examples/chess/web/cover-clean-v2.jpg').read_bytes()
        self.assertTrue(cover.startswith(b'\xff\xd8\xff'))
        self.assertGreater(len(cover), 8000)

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