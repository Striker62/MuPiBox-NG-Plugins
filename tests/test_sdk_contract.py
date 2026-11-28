"""Keep all bundled web SDK copies and manifest permissions compatible."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_PERMISSIONS = {
    "storage", "controller", "audio", "camera", "photo-save", "photo-import",
    "shared-assets", "network", "links", "homeassistant",
    "device-status", "playback", "playback-control", "optical-media", "cover-art", "coloring-pages",
}

class SDKContractTests(unittest.TestCase):
    def test_manifest_permissions_match_package_validator(self):
        schema = json.loads((ROOT / "schema/manifest-v1.schema.json").read_text())
        permissions = schema["properties"]["permissions"]
        self.assertEqual(set(permissions["items"]["enum"]), EXPECTED_PERMISSIONS)
        self.assertEqual(permissions["maxItems"], len(EXPECTED_PERMISSIONS))

    def test_bundled_sdk_examples_identical_to_canonical(self):
        sdk = (ROOT / "sdk/mupibox-sdk.js").read_bytes()
        copies = list(ROOT.glob("examples/*/mupibox-sdk.js"))
        self.assertGreaterEqual(len(copies), 10)
        for copy in copies:
            with self.subTest(copy=copy.name, app=copy.parent.name):
                self.assertEqual(copy.read_bytes(), sdk)

    def test_reviewed_method_contract_nonempty_and_unique(self):
        contract = json.loads((ROOT / "schema/sdk-bridge-methods.json").read_text())
        methods = contract["methods"]
        self.assertEqual(methods, sorted(set(methods)))
        self.assertGreaterEqual(len(methods), 40)
        self.assertIn("host.capabilities", methods)
        self.assertIn("playback.transport", methods)

if __name__ == "__main__":
    unittest.main()
