"""Create a throwaway instrumented copy of a release ZIP for the Qt benchmark."""
import argparse
from pathlib import Path
from zipfile import ZipFile
p=argparse.ArgumentParser()
p.add_argument('--soak', action='store_true', help='play the seeded obstacle course to 1050 m')
p.add_argument('bundle');p.add_argument('output');p.add_argument('--profile',action='store_true');p.add_argument('--capture',action='store_true')
args=p.parse_args()
if Path(args.bundle).resolve()==Path(args.output).resolve():
    p.error('Choose a separate output package for instrumentation')
with ZipFile(args.bundle) as src, ZipFile(args.output,'w') as dst:
    for info in src.infolist():
        content=src.read(info)
        if info.filename=='app.js':
            content=(f"window.benchCapture={str(args.capture).lower()};\n"+Path(__file__).with_name('soak.js' if args.soak else 'benchmark.js').read_text()).encode()+content
        if args.profile and info.filename=='world.js':
            code=content.decode().replace("  let buffering", "  window.benchProfile={ground:0,stamp:0,present:0,begin:0,frames:0};\n  const stats=window.benchProfile;\n  for(const name of ['stamp','present','begin']){const original=surface[name];surface[name]=(...a)=>{const t=performance.now();const result=original(...a);stats[name]+=performance.now()-t;return result;};}\n  let buffering")
            code=code.replace('    ground(state);','    const startGround=performance.now();ground(state);stats.ground+=performance.now()-startGround;stats.frames++;')
            content=code.encode()
        dst.writestr(info,content)
