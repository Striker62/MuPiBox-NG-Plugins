#!/usr/bin/env python3
"""Build the isolated community prototypes (not publishing to catalog)."""
from pathlib import Path
import shutil
from mupiapp import pack
ROOT=Path(__file__).resolve().parent.parent
APPS=('mupi-beatbox','mupi-soundquiz','mupi-rhythm','mupi-links','mupi-homeassistant','mupi-muehle','mupi-reversi','mupi-dame','mupi-wuerfelrennen')
def main():
 dist=ROOT/'dist'/'community-preview'
 dist.mkdir(parents=True,exist_ok=True)
 for slug in APPS:
  source=ROOT/'examples'/slug
  shutil.copyfile(ROOT/'sdk'/'mupibox-sdk.js',source/'mupibox-sdk.js')
  shutil.copyfile(ROOT/'LICENSE',source/'LICENSE.txt')
  output=dist/f'{slug}.mupiapp'
  metadata=pack(source,output)
  print(f'{slug}: {metadata["id"]} {metadata["version"]} -> {output.name} ({output.stat().st_size} B)')
if __name__=='__main__':main()
