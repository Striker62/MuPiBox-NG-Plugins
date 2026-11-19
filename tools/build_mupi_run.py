#!/usr/bin/env python3
"""Build and validate the offline MuPi Run community app."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples/mupi-run"
OUTPUT = ROOT / "dist/mupi-run.mupiapp"
FILES = ("manifest.json", "index.html", "app.js", "logic.js", "world.js", "poses.js",
         "art-files.js", "AUDIO-CREDITS.txt", "sound.js", "style.css", "icon.png", "cover.png")
AUDIO_SLOTS = ("music", "run", "jump", "slide", "collect", "kilometer")


def main():
    with tempfile.TemporaryDirectory(prefix="mupi-run-pack-") as temp:
        dest = Path(temp) / "app"
        dest.mkdir()
        for name in FILES:
            shutil.copy2(SOURCE / name, dest / name)
        art = dest / "art"
        art.mkdir()
        for name in json.loads((SOURCE / "art-files.js").read_text().split("=", 1)[1].strip().removesuffix(";")):
            shutil.copy2(SOURCE / "art" / name, art / name)
        audio_files = {}
        for slot in AUDIO_SLOTS:
            matches = [p for p in (SOURCE / "assets/audio").glob(slot + ".*")
                       if p.suffix in (".ogg", ".wav", ".mp3")]
            if len(matches) > 1:
                raise ValueError(f"Choose one audio format for {slot}")
            if matches:
                relative = matches[0].relative_to(SOURCE)
                (dest / relative.parent).mkdir(parents=True, exist_ok=True)
                shutil.copy2(matches[0], dest / relative)
                audio_files[slot] = relative.as_posix()
        (dest / "audio-files.js").write_text("window.MuPiRunAudioFiles = " + json.dumps(audio_files) + ";\n")
        shutil.copy2(ROOT / "sdk/mupibox-sdk.js", dest / "mupibox-sdk.js")
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        for command in (["pack", str(dest), str(OUTPUT)], ["validate", str(OUTPUT)]):
            subprocess.run([sys.executable, str(ROOT / "tools/mupiapp.py"), *command], check=True)
    print(f"Ready: {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
