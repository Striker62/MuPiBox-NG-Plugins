import os, signal, time
from pathlib import Path
unit=Path('/proc/self/cgroup').read_text().strip().split(':')[-1]
tasks=Path('/sys/fs/cgroup')/unit.lstrip('/')/'cgroup.procs'
# Operate only on the disposable test window in this unit.
while True:
    time.sleep(.2)
    available=int(next(line.split()[1] for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')))
    for pid in tasks.read_text().split():
        try:
            proc=Path('/proc')/pid
            if (proc/'comm').read_text().strip()!='qmlscene':continue
            anon=int(next(line.split()[1] for line in (proc/'status').read_text().splitlines() if line.startswith('RssAnon:')))
            if available<165*1024 or anon>195*1024:
                print('Stopped test window',pid,'AnonKiB',anon,'MemAvailableKiB',available,flush=True)
                os.kill(int(pid),signal.SIGKILL)
                raise SystemExit(1)
        except (FileNotFoundError,ProcessLookupError): pass
