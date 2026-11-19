#!/usr/bin/env python3
"""Create reproducible real-browser 800x480 captures of MuPis Würfelrennen.

The screenshot scenario states are sampled from one *legal* game simulated
by the shipped JS engine. Browser rendering uses the shipped HTML, CSS, SDK
and app JS; only the internal board state is supplied by a temporary
preview-only hook. No screenshots or preview hooks are included in .mupiapp.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "examples" / "mupi-wuerfelrennen"
SCENES = (
    ("start", "screenshot-1-start.webp"),
    ("six", "screenshot-2-six.webp"),
    ("game", "screenshot-3-game.webp"),
    ("finish", "screenshot-4-finish.webp"),
    ("win", "screenshot-5-win.webp"),
)
SIMULATE = r"""
const g = require(process.argv[1]);
let seed = 2; // deterministic game where Rot reaches the finish after all scene types
Math.random = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
};
let b = g.state(4), turn = 0, attempts = 0;
let limit = g.rollLimit(b, 0);
const records = [];
const clone = () => b.map(row => row.slice());
const snapshot = (die, chosen) => ({
  board: clone(), turn, die, selected: chosen.piece,
  attempts, maxAttempts: limit,
  outside: b.flat().filter(v => v >= 0 && v < 52).length,
  finished: b.flat().filter(v => v >= 52).length,
  redOutside: b[0].filter(v => v >= 0 && v < 52).length,
  redFinished: b[0].filter(v => v >= 52).length,
  playerCoverage: b.filter(row => row.some(v => v >= 0)).length
});
let victory = null;
for (let roll = 0; roll < 12000; roll++) {
  const die = 1 + Math.floor(Math.random() * 6);
  attempts++;
  const moves = g.possible(b, turn, die);
  if (moves.length) {
    const chosen = g.choose(b, turn, die, "medium");
    if (turn === 0) {
      const state = snapshot(die, chosen);
      state.forcedExit = die === 6 && moves.every(m => b[turn][m.piece] === -1);
      records.push(state);
    }
    b = g.apply(b, turn, chosen);
    if (b[turn].every(v => v >= 52)) {
      victory = { board: clone(), turn, die: 0, lastRoll: die, selected: 0 };
      break;
    }
    if (die === 6) {
      attempts = 0;
      limit = g.rollLimit(b, turn);
      continue;
    }
  } else if (attempts < limit) {
    continue;
  }
  turn = (turn + 1) % 4;
  attempts = 0;
  limit = g.rollLimit(b, turn);
}
if (!victory) throw Error("Seeded legal test game did not produce a winner");
const six = records.find(s => s.forcedExit && s.outside >= 3);
const game = records.find(s =>
  s.die !== 6 && s.outside >= 6 && s.redOutside >= 2 &&
  s.playerCoverage >= 3 && s.finished === 0);
const finish = records.find(s =>
  s.redFinished >= 3 && s.redFinished < 4 && s.die !== 6);
if (!six || !game || !finish) {
  throw Error("Seeded gameplay did not reach all reference states");
}
process.stdout.write(JSON.stringify({start: null, six, game, finish, win:victory}));
"""
HOOK = r"""
window.__setScreenshotState = scene => {
  const item = window.__screenshotStates[scene];
  epoch++;
  clearTimeout(aiTimer);
  if (!item) { reset(); return; }
  players = 4; human = 1;
  $("playercount").value = "4"; $("human").value = "1";
  b = item.board.map(row => row.slice());
  turn = item.turn;
  die = item.die;
  lastRoll = item.lastRoll || item.die || 0;
  settling = false;
  ended = scene === "win";
  selectedPiece = item.selected;
  attempts = item.attempts || 1;
  maxAttempts = item.maxAttempts || 1;
  const descriptions = {
    six: "Sechs! Eine Figur zieht aus dem Haus.",
    game: "Rot würfelt " + die + ". Figur auswählen.",
    finish: "Rot würfelt " + die + ". Nur noch wenige Felder bis zum Ziel!",
    win: "Rot GEWINNT!"
  };
  status(descriptions[scene]);
  render();
};
"""
def states_from_engine() -> dict:
    result = subprocess.run(
        ["node", "-e", SIMULATE, str(APP / "app.js")],
        cwd=ROOT, check=True, text=True, capture_output=True, timeout=30,
    )
    return json.loads(result.stdout)


def capture() -> None:
    chromium = shutil.which("chromium") or shutil.which("chromium-browser")
    if not chromium:
        raise RuntimeError("Chromium is needed for screenshots")
    states = states_from_engine()
    js = (APP / "app.js").read_text(encoding="utf-8")
    # Append a test-only state setter *inside* the IIFE, after the game initializes.
    trailer = "reset();\n})();"
    js = js.rstrip()
    if not js.endswith(trailer):
        raise RuntimeError("The game bootstrap changed; update the capture hook")
    js = js[:-len(trailer)] + "reset();\n" + HOOK + "\n})();"
    html = (APP / "index.html").read_text(encoding="utf-8")
    html = html.replace(
        '<script src="app.js"></script>',
        '<script src="screenshot-preview.js"></script>'
    )
    with tempfile.TemporaryDirectory(prefix="mupi-wuerfelrennen-shot-") as name:
        temp = Path(name)
        for resource in ("mupibox-sdk.js", "style.css"):
            shutil.copy2(APP / resource, temp / resource)
        (temp / "screenshot-preview.js").write_text(js, encoding="utf-8")
        for scene, filename in SCENES:
            scene_html = html.replace(
                '<script src="screenshot-preview.js"></script>',
                '<script>window.__screenshotStates = ' +
                json.dumps(states, ensure_ascii=False, separators=(",", ":")) +
                ';</script><script src="screenshot-preview.js"></script>' +
                '<script>window.__setScreenshotState(' + json.dumps(scene) + ');</script>',
            )
            page = temp / (scene + ".html")
            page.write_text(scene_html, encoding="utf-8")
            png = temp / (scene + ".png")
            cmd = [
                chromium, "--headless", "--no-sandbox", "--disable-gpu",
                "--disable-dev-shm-usage", "--disable-background-networking",
                "--hide-scrollbars", "--window-size=800,480",
                "--virtual-time-budget=900", "--screenshot=" + str(png),
                page.as_uri(),
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=25)
            with Image.open(png) as img:
                if img.size != (800, 480):
                    raise RuntimeError(f"Unexpected browser image size {img.size}")
                img.convert("RGB").save(APP / filename, format="WEBP",
                                        quality=88, method=6)
            print(f"{filename}: { (APP / filename).stat().st_size } bytes (800x480)")
    print("Screenshot captures finished. No temporary hook files were retained.")


if __name__ == "__main__":
    capture()
