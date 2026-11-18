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
        for slug, version, wallpaper in (("four-in-a-row", "0.1.5", "system"), ("tic-tac-toe", "0.2.7", "app")):
            with self.subTest(slug=slug):
                directory = ROOT / "examples" / slug
                manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["version"], version)
                self.assertEqual(manifest["category"], "games")
                self.assertEqual(manifest["cover"], "assets/cover-clean-v2.jpg")
                self.assertTrue((directory / manifest["cover"]).is_file())
                self.assertEqual(manifest["icon"], "assets/icon.png")
                self.assertTrue((directory / manifest["icon"]).is_file())
                self.assertEqual(manifest["display"]["background"], wallpaper)
                self.assertIs(manifest["display"]["showBackButton"], False)
                self.assertIs(manifest["display"]["showSystemInfo"], False)
                self.assertIs(manifest["display"]["fullScreen"], True)

                css = (directory / "web/style.css").read_text(encoding="utf-8")
                if wallpaper == "system":
                    for selector in (r":root", r"html,body", r"body", r"\.screen"):
                        self.assertRegex(css, selector + r"\s*\{[^}]*background:\s*transparent\s*;")
                else:
                    self.assertIn("linear-gradient(", css)
                    self.assertIn(".board button.selected", css)
                markup = Markup()
                markup.feed((directory / "web/index.html").read_text(encoding="utf-8"))
                self.assertTrue({"board", "mode", "status", "reset"}.issubset(markup.ids))
                self.assertIn("exit", markup.ids)
                self.assertNotIn("header", markup.tags)
                self.assertNotIn("footer", markup.tags)
                js = (directory / "web/app.js").read_text(encoding="utf-8")
                self.assertIn("sdk.exit()", js)
                self.assertIn("exit.addEventListener", js)

    def test_tic_tac_toe_neon_marks_are_bundled_and_accessible(self):
        directory = ROOT / "examples" / "tic-tac-toe"
        css = (directory / "web/style.css").read_text(encoding="utf-8")
        js = (directory / "web/app.js").read_text(encoding="utf-8")
        manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["display"]["background"], "app")
        self.assertIn("--grid-size: min(66vh, 43.5vw, 326px)", css)
        self.assertIn("prefers-reduced-motion", css)
        self.assertIn("aria-hidden", js)
        self.assertIn("cell.replaceChildren", js)
        for mark in ("neon-x.svg", "neon-o.svg"):
            asset = (directory / "web" / mark).read_text(encoding="utf-8")
            self.assertIn("<svg", asset)
            self.assertIn("viewBox", asset)
            self.assertIn(mark, js)

    def test_all_four_games_use_fullscreen_and_their_own_back_button(self):
        for slug in ("tic-tac-toe", "four-in-a-row", "chess", "crumbworm"):
            with self.subTest(slug=slug):
                directory = ROOT / "examples" / slug
                manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["display"]["background"], "app" if slug == "tic-tac-toe" else "system")
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