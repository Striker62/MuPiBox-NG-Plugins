"""Offline guarantees for curated, publisher-hosted data-only community themes."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class ThemeCatalogTests(unittest.TestCase):
    def test_curated_theme_entries_are_safe_and_match_source(self):
        catalog = json.loads((ROOT/'catalog/themes.json').read_text())
        self.assertEqual(set(catalog), {'schema','themes'})
        self.assertEqual(catalog['schema'], 1)
        self.assertLessEqual(len(catalog['themes']), 64)
        ids = set()
        manifests = {
            json.loads(p.read_text())['id']: json.loads(p.read_text())
            for p in (ROOT/'examples/themes').glob('*/manifest.json')
        }
        for entry in catalog['themes']:
            self.assertEqual(set(entry), {
                'id','name','description','author','version','releaseTag','asset','sha256'})
            self.assertRegex(entry['id'], r'^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$')
            self.assertNotIn(entry['id'], ids)
            ids.add(entry['id'])
            self.assertRegex(entry['releaseTag'], r'^v\d+\.\d+\.\d+-preview\.\d+$')
            self.assertRegex(entry['asset'], r'^[a-z0-9][a-z0-9-]*\.mupitheme$')
            self.assertRegex(entry['sha256'], r'^[a-f0-9]{64}$')
            self.assertLessEqual(len(entry['description']), 500)
            manifest = manifests[entry['id']]
            for key in ('id','name','version','author'):
                self.assertEqual(entry[key],manifest[key])
            self.assertTrue(manifest['license'])

if __name__ == '__main__':
    unittest.main()
