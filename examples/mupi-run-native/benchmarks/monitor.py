#!/usr/bin/env python3
"""Track Qt/Weston CPU and process PSS; no sound device or box settings touched."""
import json, pathlib, time, sys
DURATION=float(sys.argv[1]) if len(sys.argv)>1 else 22
found={};ticks={};seen={}
clock_hz=100
start=time.monotonic()
max_total_pss=0;max_total_rss=0;max_temp=0
while time.monotonic()-start < DURATION:
    jobs=[];pss_total=0;rss_total=0
    for folder in pathlib.Path('/proc').iterdir():
        if not folder.name.isdigit(): continue
        try:
            comm=(folder/'comm').read_text().strip()
            if comm not in ('qmlscene','weston'):continue
            stat=(folder/'stat').read_text().split()
            # only track processes created since benchmark started (avoid
            # counting the existing EGLFS qmlscene as a benchmark process).
            pid=int(folder.name)
            if comm=='qmlscene' and pid==1473:continue
            pstart=int(stat[21]); key=f'{pid}:{pstart}'
            if key not in ticks:ticks[key]={'first':int(stat[13])+int(stat[14]),'last':0,'comm':comm,'pss_max':0,'rss_max':0,'elapsed':0}
            ts=ticks[key];ts['last']=int(stat[13])+int(stat[14]);ts['elapsed']=time.monotonic()-start
            pss=0
            p=(folder/'smaps_rollup')
            for line in p.read_text().splitlines():
                if line.startswith('Pss:'): pss=int(line.split()[1]);break
            rss=int(stat[23])*4
            ts['pss_max']=max(ts['pss_max'],pss)
            ts['rss_max']=max(ts['rss_max'],rss)
            pss_total+=pss;rss_total+=rss; jobs.append((pid,comm))
        except (FileNotFoundError,ProcessLookupError,PermissionError,IndexError,ValueError):pass
    max_total_pss=max(max_total_pss,pss_total)
    max_total_rss=max(max_total_rss,rss_total)
    try:max_temp=max(max_temp,int(pathlib.Path('/sys/class/thermal/thermal_zone0/temp').read_text())/1000)
    except Exception:pass
    time.sleep(.25)
results={'monitorSeconds':round(time.monotonic()-start,2),'maxTotalPSSMiB':round(max_total_pss/1024,2),'maxTotalRSSMiB':round(max_total_rss/1024,2),'maxTemperatureC':round(max_temp,1),'processes':[]}
for key,p in ticks.items():
 pss=p['pss_max'];rss=p['rss_max'];
 results['processes'].append({'pid':int(key.split(':')[0]),'comm':p['comm'],'peakPSSMiB':round(pss/1024,2),'peakRSSMiB':round(rss/1024,2),'cpuTicksUsed':p['last']-p['first']})
print('MUPI_NATIVE_RESOURCE_JSON '+json.dumps(results,sort_keys=True))
