#!/usr/bin/env python3
"""Capture reproducible 800×480 screenshots from the real MuPi Water Battle UI.

Requires Chromium, ffmpeg-free static package build, and Pillow.
Screenshots are rendered by the app itself in headless Chromium, not mocked
images; only the sequence of touchscreen actions and RNG seed are scripted.
The screenshots show representative gameplay, not a live Raspberry Pi session.
"""
from __future__ import annotations

from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "examples" / "mupi-wasserschlacht"
STAGE = ROOT / ".build" / "mupi-wasserschlacht"
OUTPUT = APP / "screenshots"

# A fixed RNG makes ship placement repeatable. Every hit/miss is still handled
# by the actual engine and interface, including AI turns, markers and scoring.
PRELOAD = r"""
<script>
window.__docBoards=[];
// Browser captures use the same German labels as the user's MuPiBox.
Object.defineProperty(navigator, 'language', {configurable:true, get:()=> 'de-DE'});
(() => {
  let state=20261118;
  Math.random=()=>{
    state=(1664525*state+1013904223)>>>0;
    return state/4294967296;
  };
  const original=WaterBattle.randomFleet;
  WaterBattle.randomFleet=(...args)=>{
    const board=original(...args);
    window.__docBoards.push(board);
    return board;
  };
})();
</script>
"""

# Each scenario drives real buttons. For gameplay captures, the selected target
# squares are based on the recorded randomized fleet so the example reliably
# illustrates the intended ship-hit/ship-sunk state.
SCENARIOS = {
    "01-quick-aufbau": {
        "budget": 850,
        "script": """
          selectMode('quick');
          document.getElementById('own').children[0].click();
          document.getElementById('confirm').click();
          document.getElementById('own').children[27].click();
          ready('Quick: next boat preview');
        """,
    },
    "02-classic-treffer": {
        "budget": 2750,
        "script": """
          selectMode('classic');
          start();
          const target=window.__docBoards[1];
          const short=target.ships.find(s=>s.cells.length===2).cells;
          const water=waterSquares(target);
          const shots=[water[5],short[0],short[1]];
          fireSequence(shots,450,975);
          setTimeout(()=>ready('Classic: one ship sunk'),2750);
        """,
    },
    "03-max-gegner": {
        "budget": 5100,
        "script": """
          selectMode('max');
          start();
          const target=window.__docBoards[1];
          const short=target.ships.find(s=>s.cells.length===2).cells;
          const other=target.ships.find(s=>s.cells.length===5).cells;
          const water=waterSquares(target);
          const shots=[water[3],other[0],water[17],short[0],short[1]];
          fireSequence(shots,370,1050);
          setTimeout(()=>ready('Max: opponent grid'),4900);
        """,
    },
    "04-max-eigene-karte": {
        "budget": 8620,
        "script": """
          selectMode('max');
          start();
          const target=window.__docBoards[1];
          const water=waterSquares(target);
          const hits=target.ships.map(s=>s.cells[0]);
          const shots=[water[2],hits[0],water[12],hits[1],
                       water[23],hits[2],water[30],hits[3]];
          fireSequence(shots,400,950);
          setTimeout(()=>{
            document.getElementById('view').click();
            ready('Max: own fleet and enemy shots');
          },7950);
        """,
    },
    "05-ton-einstellungen": {
        "budget": 900,
        "script": """
          selectMode('quick');
          document.getElementById('auto').click();
          document.getElementById('sound').click();
          ready('Audio settings');
        """,
    },
    "06-quick-gewonnen": {
        "budget": 5300,
        "script": """
          selectMode('quick');
          start();
          const target=window.__docBoards[1];
          const hits=target.ships.flatMap(s=>s.cells);
          fireSequence(hits,390,980);
          setTimeout(()=>ready('Quick: victory'),4750);
        """,
    },
}

HELPERS = r"""
<script>
const selectMode=(value)=>{
  const sel=document.getElementById('mode');
  sel.value=value;sel.dispatchEvent(new Event('change',{bubbles:true}));
};
function start(){
  document.getElementById('auto').click();
  document.getElementById('start').click();
}
function waterSquares(board){
  const ships=new Set(board.ships.flatMap(s=>s.cells));
  return board.shots.map((_,i)=>i).filter(i=>!ships.has(i));
}
function fireSequence(indices,first,interval){
  for(let k=0;k<indices.length;k++)
    setTimeout(()=>document.getElementById('enemy').children[indices[k]].click(),first+k*interval);
}
function ready(description){
  document.body.dataset.screenshotReady=description;
}
</script>
"""

def main():
    chromium = shutil.which("chromium")
    if not chromium:
        raise SystemExit("Chromium not installed")
    subprocess.run(
        ["python3", str(ROOT / "tools" / "build_wasserschlacht.py")],
        cwd=ROOT, check=True, stdout=subprocess.DEVNULL
    )
    base = (STAGE / "index.html").read_text(encoding="utf-8")
    if '<script src="audio-player.js"></script>' not in base:
        raise SystemExit("Unexpected game HTML layout; update screenshot harness")
    from PIL import Image
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, config in SCENARIOS.items():
        html = base.replace(
            '<script src="audio-player.js"></script>',
            PRELOAD + '<script src="audio-player.js"></script>',
            1
        )
        html = html.replace(
            "</body>",
            HELPERS + f'<script>setTimeout(()=>{{{config["script"]}}},130);</script></body>',
            1,
        )
        # The temporary HTML and screenshots are not packaged in .mupiapp.
        preview = STAGE / ("__screenshot_" + name + ".html")
        preview.write_text(html, encoding="utf-8")
        png = STAGE / ("__screenshot_" + name + ".png")
        command = [
            chromium, "--headless", "--no-sandbox", "--disable-gpu",
            "--disable-dev-shm-usage", "--allow-file-access-from-files",
            "--hide-scrollbars", "--force-device-scale-factor=1",
            "--window-size=800,480",
            f"--virtual-time-budget={config['budget']}",
            f"--screenshot={png}", preview.as_uri(),
        ]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=45)
        with Image.open(png) as im:
            if im.size != (800, 480):
                raise ValueError(f"{name}: screenshot size {im.size}, expected 800×480")
            dst = OUTPUT / f"{name}.webp"
            im.convert("RGB").save(dst, format="WEBP", quality=86, method=6)
        print(f"{dst.relative_to(ROOT)}: {dst.stat().st_size:,} bytes")
        preview.unlink()
        png.unlink()

if __name__ == "__main__":
    main()
