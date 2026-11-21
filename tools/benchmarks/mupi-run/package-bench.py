"""Create a throwaway instrumented copy of a release ZIP for the Qt benchmark."""
import argparse
from pathlib import Path
from zipfile import ZipFile
import wave
p=argparse.ArgumentParser()
p.add_argument('--music-pcm', type=Path, help='use the same decoded loop as the native package for a Web audio-only comparison')
p.add_argument('--fixed', action='store_true', help='run the shared 2,880-tick hardware replay')
p.add_argument('--soak', action='store_true', help='play the seeded obstacle course to 1050 m')
p.add_argument('bundle');p.add_argument('output');p.add_argument('--profile',action='store_true');p.add_argument('--capture',action='store_true')
args=p.parse_args()
if Path(args.bundle).resolve()==Path(args.output).resolve():
    p.error('Choose a separate output package for instrumentation')
if args.music_pcm:
    with wave.open(str(args.music_pcm), 'rb') as audio:
        if (audio.getframerate(),audio.getnchannels(),audio.getsampwidth()) != (48000,1,2):
            p.error("expected canonical 48 kHz mono 16-bit PCM")
with ZipFile(args.bundle) as src, ZipFile(args.output,'w') as dst:
    for info in src.infolist():
        content=src.read(info)
        if args.music_pcm and info.filename=="assets/audio/music.ogg":
            info.filename="assets/audio/music.wav"
            content=args.music_pcm.read_bytes()
        if args.music_pcm and info.filename=="audio-files.js":
            if content.count(b"assets/audio/music.ogg")!=1:
                raise ValueError("expected exactly one loop reference")
            content=content.replace(b"assets/audio/music.ogg",b"assets/audio/music.wav")
        if info.filename=='app.js':
            if args.fixed:
                prelude = '\n'.join(Path(__file__).with_name(n).read_text() for n in ['fixed-replay.js', 'fixed-web.js'])
            else:
                prelude = Path(__file__).with_name('soak.js' if args.soak else 'benchmark.js').read_text()
            content=(f"window.benchCapture={str(args.capture).lower()};\n"+prelude).encode()+content
        if args.profile and info.filename=='world.js':
            code=content.decode().replace("  let buffering", "  window.benchProfile={ground:0,stamp:0,present:0,begin:0,frames:0};\n  const stats=window.benchProfile;\n  for(const name of ['stamp','present','begin']){const original=surface[name];surface[name]=(...a)=>{const t=performance.now();const result=original(...a);stats[name]+=performance.now()-t;return result;};}\n  let buffering")
            code=code.replace('    ground(state);','    const startGround=performance.now();ground(state);stats.ground+=performance.now()-startGround;stats.frames++;')
            content=code.encode()
        dst.writestr(info,content)
