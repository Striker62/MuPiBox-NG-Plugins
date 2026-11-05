"""Packaging and adversarial input tests; no external dependencies."""

import io
import json
import stat
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from mupiapp import PackageError, checked_path, pack, validate_manifest, validate_package


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "app"
        self.source.mkdir()
        self.manifest = {
            "apiVersion": "1", "id": "community.testapp", "name": "Test App",
            "version": "0.1.0", "runtime": "web", "entry": "index.html", "permissions": []
        }
        (self.source / "manifest.json").write_text(json.dumps(self.manifest))
        (self.source / "index.html").write_text("<!doctype html><title>test</title>")
        self.output = self.root / "test.mupiapp"

    def test_pack_and_validate(self):
        result = pack(self.source, self.output)
        self.assertEqual(result["id"], "community.testapp")
        self.assertEqual(validate_package(self.output), result)

    def test_pack_is_reproducible(self):
        pack(self.source, self.output)
        a = self.output.read_bytes()
        pack(self.source, self.output)
        self.assertEqual(a, self.output.read_bytes())

    def test_rejects_traversal(self):
        for name in ("../etc/passwd", "/root/.ssh/id_rsa", "a/../b", r"a\b", "a//b", "./index.html"):
            with self.subTest(name=name), self.assertRaises(PackageError):
                checked_path(name)

    def test_missing_entry(self):
        self.manifest["entry"] = "missing.html"
        with self.assertRaises(PackageError):
            validate_manifest(self.manifest, {"index.html"})

    def test_rejects_unknown_permissions(self):
        self.manifest["permissions"] = ["filesystem"]
        with self.assertRaises(PackageError):
            validate_manifest(self.manifest, {"index.html"})

    def test_photo_permission_is_explicit_and_supported(self):
        self.manifest["permissions"] = ["camera", "photo-save"]
        validated = validate_manifest(self.manifest, {"index.html"})
        self.assertEqual(validated["permissions"], ["camera", "photo-save"])
        self.manifest["permissions"] = ["photo-save", "photo-save"]
        with self.assertRaises(PackageError):
            validate_manifest(self.manifest, {"index.html"})

    def test_requires_network_hosts(self):
        self.manifest["permissions"] = ["network"]
        with self.assertRaises(PackageError):
            validate_manifest(self.manifest, {"index.html"})
        self.manifest["networkHosts"] = ["example.com"]
        self.assertEqual(validate_manifest(self.manifest, {"index.html"})["networkHosts"], ["example.com"])

    def test_rejects_zip_traversal(self):
        with zipfile.ZipFile(self.output, "w") as z:
            z.writestr("manifest.json", json.dumps(self.manifest))
            z.writestr("index.html", "ok")
            z.writestr("../outside.txt", "not ok")
        with self.assertRaises(PackageError):
            validate_package(self.output)

    def test_rejects_archive_symlink(self):
        link = zipfile.ZipInfo("index.html")
        link.create_system = 3
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        with zipfile.ZipFile(self.output, "w") as z:
            z.writestr("manifest.json", json.dumps(self.manifest))
            z.writestr(link, "../../../etc/passwd")
        with self.assertRaises(PackageError):
            validate_package(self.output)

    def test_rejects_duplicate_casefold(self):
        with zipfile.ZipFile(self.output, "w") as z:
            z.writestr("manifest.json", json.dumps(self.manifest))
            z.writestr("index.html", "ok")
            z.writestr("INDEX.html", "bad")
        with self.assertRaises(PackageError):
            validate_package(self.output)

    def test_rejects_symlink_in_source(self):
        (self.source / "link.txt").symlink_to(self.source / "index.html")
        with self.assertRaises(PackageError):
            pack(self.source, self.output)


if __name__ == "__main__":
    unittest.main()
