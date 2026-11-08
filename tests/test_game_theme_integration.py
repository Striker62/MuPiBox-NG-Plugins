"""Regression tests for native theme and navigation defaults of board games."""

import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Markup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        self.ids.update(v for k, v in attrs if k == "id")


class ThemeIntegrationTests(unittest.TestCase):
    def test_native_back_theme_and_game_only_layout(self):
        for slug, version in (("four-in-a-row", "0.1.1"), ("tic-tac-toe", "0.2.1")):
            with self.subTest(slug=slug):
                directory = ROOT / "examples" / slug
                manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["version"], version)
                self.assertEqual(manifest["category"], "games")
                self.assertEqual(manifest["display"]["background"], "system")
                self.assertIs(manifest["display"]["showBackButton"], True)
                self.assertIs(manifest["display"]["showSystemInfo"], False)
                self.assertIs(manifest["display"]["fullScreen"], False)

                css = (directory / "web/style.css").read_text(encoding="utf-8")
                for selector in (r":root", r"html,body", r"body", r"\.screen"):
                    self.assertRegex(css, selector + r"\s*\{[^}]*background:\s*transparent\s*;")
                markup = Markup()
                markup.feed((directory / "web/index.html").read_text(encoding="utf-8"))
                self.assertTrue({"board", "mode", "status", "reset"}.issubset(markup.ids))
                self.assertNotIn("exit", markup.ids)
                self.assertNotIn("header", markup.tags)
                self.assertNotIn("footer", markup.tags)
                js = (directory / "web/app.js").read_text(encoding="utf-8")
                self.assertIn("sdk.exit()", js)
                self.assertNotIn("exit.addEventListener", js)


if __name__ == "__main__":
    unittest.main()
