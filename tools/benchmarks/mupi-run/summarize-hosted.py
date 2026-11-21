"""Summarise a fixed-replay or soak log and its cgroup samples (watch.py)."""
import argparse
import json
from pathlib import Path
from statistics import median

def read_marker(text, marker):
    for line in text.splitlines():
        if marker in line:
            return json.loads(line.split(marker, 1)[1])
    return None

def intervals(times):
    gaps=sorted(b-a for a,b in zip(times,times[1:]))
    if not gaps:
        return {}
    def percentile(q):
        return round(gaps[int((len(gaps)-1)*q)],2)
    return dict(p50=percentile(.5),p95=percentile(.95),p99=percentile(.99),maximum=percentile(1),
                over100=sum(x>100 for x in gaps),over33_33=sum(x>1000/30 for x in gaps))

def report(prefix):
    text=prefix.with_suffix(".log").read_text()
    audio_path=prefix.with_suffix(".audio")
    guards=prefix.with_suffix(".guard")
    result={"completed":False,"protectedStop":guards.read_text().strip() if guards.exists() else ""}
    native=read_marker(text,"HOST_RESULT ")
    measurement=native or read_marker(text,"MUPIBENCH FIXED ")
    if measurement:
        times=measurement.pop("times")
        result.update(measurement)
        result["completed"]= ("HOST_EXIT" in text if native else "MUPIBENCH DONE true" in text)
        result["frames"]=len(times)
        result["fps"]=round(len(times)*1000/result["elapsed"],2)
        result["gapsMs"]=intervals(times)
    window=read_marker(text,"MUPIBENCH SWAPS ")
    if window and len(window)>1:
        result["qtSwaps"]={"count":len(window),"fps":round((len(window)-1)*1000/(window[-1]-window[0]),2),
                           "gapsMs":intervals(window)}
    start=read_marker(text,"BENCH_QML_LAUNCH ")
    ready=read_marker(text,"BENCH_READY_AT ")
    if start and ready:
        result["launchMs"]=ready-start
    result["httpErrors"]=sum("QTSDK_ERROR" in line or "bridge timeout" in line for line in text.splitlines())
    if audio_path.exists():
        costs={}
        for line in audio_path.read_text().splitlines():
            if line.startswith("AUDIO "):
                _,method,ms=line.split();costs.setdefault(method,[]).append(float(ms))
        result["audioMs"]={key:{"n":len(v),"median":round(median(v),2),"max":max(v)} for key,v in costs.items()}
    samples=[json.loads(line) for line in prefix.with_suffix(".metrics").read_text().splitlines() if line.strip()]
    if not samples:
        return result
    initial=samples[0][0]
    samples=[(t,rows,temp) for t,rows,temp in samples if any(p[1]=="qmlscene" for p in rows)]
    if not samples:
        return result
    # Paired samples omit startup/teardown PIDs and charge time only to this unit.
    peak_pss=max(sum(p[3]["Pss"] for p in rows) for _,rows,_ in samples)
    peak_rss=max(sum(p[3]["Rss"] for p in rows) for _,rows,_ in samples)
    cpu=duration=0
    gpu_ns=0
    for (t1,rows1,_),(t2,rows2,_) in zip(samples,samples[1:]):
        if not 0<t2-t1<5:
            continue
        before={p[0]:p for p in rows1}
        for pid,_,timestamp,_,gpu in rows2:
            if pid not in before:continue
            cpu+=max(0,timestamp-before[pid][2])
            for client,value in gpu.items():
                if client in before[pid][4]:
                    gpu_ns+=max(0,value-before[pid][4][client])
        duration+=t2-t1
    result.update(peakPssMiB=round(peak_pss/1024,1),peakRssMiB=round(peak_rss/1024,1),
                  cpuPct=round(100*cpu/duration,1) if duration else None,
                  v3dClientRenderSeconds=round(gpu_ns/1e9,2),
                  minC=min(s[2] for s in samples),maxC=max(s[2] for s in samples))
    if samples[-1][0]-initial>300:
        checkpoints={}
        for minute in (1,5,10,15,20,25,29):
            sample=next((row for row in samples if row[0]-initial>=60*minute),None)
            if sample:
                checkpoints[str(minute)]=round(sum(p[3]["Pss"] for p in sample[1] if p[1]=="qmlscene")/1024,2)
        result["qmlPssByMinuteMiB"]=checkpoints
    return result

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prefix",type=Path,nargs="+")
    args=parser.parse_args()
    print(json.dumps({str(p):report(p) for p in args.prefix},indent=2))
