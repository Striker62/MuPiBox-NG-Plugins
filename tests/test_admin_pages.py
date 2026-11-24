"""Custom management pages must declare their privileges and app-only folders."""
import copy
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from mupiapp import PackageError,validate_manifest

ROOT=Path(__file__).resolve().parents[1]
BOOKS=ROOT/"examples/Buecherkiste"

class AdminPagesManifestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest=json.loads((BOOKS/"manifest.json").read_text(encoding="utf-8"))
        cls.files={str(p.relative_to(BOOKS)).replace("\\","/") for p in BOOKS.rglob("*") if p.is_file()}

    def test_books_admin_page_valid(self):
        m=copy.deepcopy(self.manifest)
        self.assertEqual(validate_manifest(m,self.files)["admin"]["entry"],"admin/index.html")
        self.assertEqual(m["admin"]["directories"],["books"])

    def test_legacy_manifest_unchanged(self):
        m=copy.deepcopy(self.manifest)
        m.pop("admin")
        m.pop("permissionReasons")
        self.assertEqual(validate_manifest(m,self.files)["id"],"community.buecherkiste")

    def test_unsafe_admin_schema_denied(self):
        for mutation in (
            lambda m:m["admin"].update(entry="../etc/passwd"),
            lambda m:m["admin"].update(entry="index.html"),
            lambda m:m["admin"].update(entry="admin/missing.html"),
            lambda m:m["admin"].update(capabilities=["filesystem.root"]),
            lambda m:m["admin"].update(capabilities=["files.write","files.write"]),
            lambda m:m["admin"].update(capabilities=["files.write"],directories=[]),
            lambda m:m["admin"].update(directories=["../../../etc"]),
            lambda m:m["admin"].update(directories=["accessoires"]),
            lambda m:m["admin"].update(shell="sudo"),
            lambda m:m.update(permissionReasons={"root":"I need root"}),
            lambda m:m.update(permissionReasons={"audio":""}),
            lambda m:m.update(permissions=["audio"]),
            lambda m:m.update(runtime="qtquick-scene",entry="index.html"),
        ):
            m=copy.deepcopy(self.manifest)
            mutation(m)
            with self.subTest(m=m),self.assertRaises(PackageError):
                validate_manifest(m,self.files)

if __name__=="__main__":
    unittest.main()


class NativeAdminSurfaceTests(unittest.TestCase):
    def test_native_scope(self):
        manifest = {"apiVersion":"1","id":"community.native-admin","name":"Native Admin",
                    "version":"1.0.0","runtime":"qtquick-scene","entry":"scene.json",
                    "permissions":["storage"],"admin":{"entry":"admin/index.html",
                    "capabilities":["settings.read","settings.write"]}}
        files = {"manifest.json","scene.json","admin/index.html","admin/app.js"}
        self.assertEqual(validate_manifest(manifest,files)["admin"]["entry"],"admin/index.html")
        for asset in ["evil.js","admin/evil.wasm","outside.html"]:
            with self.assertRaises(PackageError):
                validate_manifest(manifest, files | {asset})
        no_admin = dict(manifest)
        no_admin.pop("admin")
        with self.assertRaises(PackageError):
            validate_manifest(no_admin,files)
