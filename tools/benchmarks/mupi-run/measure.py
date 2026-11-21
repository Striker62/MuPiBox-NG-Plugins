"""Sample the isolated trial network namespace. CPU percent uses one core as 100%."""
import json, os, sys, time
from pathlib import Path
root=Path('/proc'); trial=os.getppid()
clock=os.sysconf('SC_CLK_TCK'); me=os.getpid()
while True:
    procs={};gpu={}
    for proc in root.glob('[0-9]*'):
        try:
            pid=int(proc.name)
            if pid==me: continue
            stat=(proc/'stat').read_text().rsplit(')',1)[1].split()
            name=(proc/'comm').read_text().strip()
            if name not in ('qmlscene','QtWebEngineProc','host','ffmpeg','QtWebEngineProcess'):continue
            ancestor=int(stat[1]); seen=set()
            while ancestor>1 and ancestor!=trial and ancestor not in seen:
                seen.add(ancestor);ancestor=int((root/str(ancestor)/'stat').read_text().rsplit(')',1)[1].split()[1])
            if ancestor!=trial:continue
            pss=int(next(l for l in (proc/'smaps_rollup').read_text().splitlines() if l.startswith('Pss:')).split()[1])
            procs[pid]=[name,(int(stat[11])+int(stat[12]))/clock,pss]
            for fd in (proc/'fdinfo').iterdir():
                data=fd.read_text()
                if 'drm-driver:\tv3d' not in data:continue
                fields=dict(l.split(':',1) for l in data.splitlines() if ':' in l)
                gpu[fields['drm-client-id'].strip()]=[name,int(fields['drm-engine-render'].split()[0]),int(fields['drm-engine-bin'].split()[0])]
        except (PermissionError,FileNotFoundError,ProcessLookupError,StopIteration):continue
    vm=dict(line.split() for line in Path('/proc/vmstat').read_text().splitlines())
    memory={k:int(v) for k,v in vm.items() if k.startswith(('allocstall','pgscan_direct')) or k in ('pgmajfault','oom_kill','compact_stall')}
    for line in Path('/proc/meminfo').read_text().splitlines():
        name,value=line.split(':',1)
        if name in ('CmaFree','MemAvailable'):memory[name]=int(value.split()[0])
    print(json.dumps([time.time(),procs,gpu,os.getloadavg()[0],int(Path('/sys/class/thermal/thermal_zone0/temp').read_text()),memory]),flush=True)
    time.sleep(.85)
