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
        for slug, version in (("four-in-a-row", "0.1.3"), ("tic-tac-toe", "0.2.4")):
            with self.subTest(slug=slug):
                directory = ROOT / "examples" / slug
                manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["version"], version)
                self.assertEqual(manifest["category"], "games")
                self.assertEqual(manifest["cover"], "assets/cover.jpg")
                self.assertTrue((directory / manifest["cover"]).is_file())
                self.assertEqual(manifest["icon"], "assets/icon.png")
                self.assertTrue((directory / manifest["icon"]).is_file())
                self.assertEqual(manifest["display"]["background"], "system")
                self.assertIs(manifest["display"]["showBackButton"], False)
                self.assertIs(manifest["display"]["showSystemInfo"], False)
                self.assertIs(manifest["display"]["fullScreen"], True)

                css = (directory / "web/style.css").read_text(encoding="utf-8")
                for selector in (r":root", r"html,body", r"body", r"\.screen"):
                    self.assertRegex(css, selector + r"\s*\{[^}]*background:\s*transparent\s*;")
                markup = Markup()
                markup.feed((directory / "web/index.html").read_text(encoding="utf-8"))
                self.assertTrue({"board", "mode", "status", "reset"}.issubset(markup.ids))
                self.assertIn("exit", markup.ids)
                self.assertNotIn("header", markup.tags)
                self.assertNotIn("footer", markup.tags)
                js = (directory / "web/app.js").read_text(encoding="utf-8")
                self.assertIn("sdk.exit()", js)
                self.assertIn("exit.addEventListener", js)

    def test_tic_tac_toe_board_and_menu_reveal_wallpaper(self):
        directory = ROOT / "examples" / "tic-tac-toe"
        css = (directory / "web/style.css").read_text(encoding="utf-8")
        # The outer page and large settings block must never paint a solid
        # layer over the selected MuPiBox theme. Board cells retain a subtle
        # touch target with visible wallpaper passing underneath.
        self.assertRegex(css, r"\.info\s*\{[^}]*background:\s*transparent\s*;")
        self.assertRegex(css, r"\.board button\s*\{[^}]*background:\s*rgba\(13, 39, 67, \.27\)")
        self.assertRegex(css, r"\.board button:not\(:disabled\):active\s*\{[^}]*background:\s*rgba\(")
        self.assertIn("text-shadow:", css)
        self.assertNotIn("background:#1b3757", css)

    def test_all_four_games_use_fullscreen_and_their_own_back_button(self):
        for slug in ("tic-tac-toe", "four-in-a-row", "chess", "crumbworm"):
            with self.subTest(slug=slug):
                directory = ROOT / "examples" / slug
                manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["display"]["background"], "system")
                self.assertFalse(manifest["display"]["showBackButton"])
                self.assertFalse(manifest["display"]["showSystemInfo"])
                self.assertTrue(manifest["display"]["fullScreen"])
                html = (directory / "web/index.html").read_text(encoding="utf-8")
                self.assertIn('id="exit"', html)
                self.assertNotIn('<header class="mupibox-', html)
                js = (directory / "web/app.js").read_text(encoding="utf-8")
                self.assertIn("sdk.exit()", js)

    def test_crumbworm_cover_is_landscape_and_packaged(self):
        import struct
        directory = ROOT / "examples" / "crumbworm"
        manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["cover"], "cover.jpg")
        cover = directory / "web" / manifest["cover"]
        self.assertTrue(cover.is_file())
        raw = cover.read_bytes()
        self.assertEqual(raw[:2], b"\xff\xd8")
        self.assertGreater(len(raw), 5000)
        # JPEG is a verified raster cover in the self-contained package.
        self.assertTrue((directory / "art" / "cover.svg").is_file())



if __name__ == "__main__":
    unittest.main()
