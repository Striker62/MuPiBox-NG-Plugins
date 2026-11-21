import json, os, time
from pathlib import Path
unit=Path('/proc/self/cgroup').read_text().strip().split(':')[-1]
procs=Path('/sys/fs/cgroup') / unit.lstrip('/') / 'cgroup.procs'
while True:
    rows=[]
    for pid in procs.read_text().split():
        try:
            p=Path('/proc')/pid
            name=(p/'comm').read_text().strip()
            if name not in ('qmlscene','weston','nativehost','host','QtWebEngineProc'): continue
            mem=dict((l.split(':')[0],int(l.split()[1])) for l in (p/'smaps_rollup').read_text().splitlines() if l.startswith(('Pss:','Rss:')))
            stat=(p/'stat').read_text().rsplit(')',1)[1].split()
            gpu={}
            for info in (p/'fdinfo').iterdir():
                try: content=info.read_text()
                except OSError: continue
                if 'drm-driver:\tv3d' in content:
                    f=dict(x.split(':',1) for x in content.splitlines() if ':' in x)
                    gpu[f['drm-client-id'].strip()]=int(f.get('drm-engine-render','0').split()[0])
            rows.append([pid,name,(int(stat[11])+int(stat[12]))/os.sysconf('SC_CLK_TCK'),mem,gpu])
        except (OSError,ValueError,KeyError): pass
    print(json.dumps([time.monotonic(),rows,int(Path('/sys/class/thermal/thermal_zone0/temp').read_text())/1000]),flush=True)
    time.sleep(2)
