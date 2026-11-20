"""Summarize app paints, Qt swaps and the sampled processes from an isolated trial."""
import argparse
import itertools
import json
import math
import statistics
from pathlib import Path


def percentile(values, fraction):
    if values:
        return round(sorted(values)[math.ceil(len(values) * fraction) - 1], 2)


def frames(times):
    gaps = [b - a for a, b in itertools.pairwise(times)]
    return gaps, {
        'p95': percentile(gaps, .95), 'p99': percentile(gaps, .99),
        'max': percentile(gaps, 1), 'over33': sum(g > 33.3 for g in gaps),
        'over100': sum(g > 100 for g in gaps), 'n': len(gaps),
    }


def summarize(folder, label):
    scenes, gaps, costs = [], [], []
    ready, swaps, done = None, [], False
    for line in (folder / f'{label}.log').read_text().splitlines():
        if 'MUPIBENCH ' not in line:
            continue
        kind, payload = line.split('MUPIBENCH ', 1)[1].split(' ', 1)
        if kind == 'READY':
            ready = json.loads(payload)
        elif kind == 'DONE':
            done = json.loads(payload)
        elif kind == 'SWAPS':
            swaps = json.loads(payload)
        elif kind == 'SCENE':
            scene = json.loads(payload)
            times = scene['times']
            intervals, metrics = frames(times)
            gaps.extend(intervals)
            costs.extend(scene['costs'])
            scenes.append(dict(name=scene['label'], frames=len(times),
                               elapsedMs=round(scene['elapsed'], 2), **metrics,
                               fps=round(len(times) * 1000 / scene['elapsed'], 2),
                               firstPaintMs=times[0] if times else None,
                               tailMs=round(scene['elapsed'] - times[-1], 2) if times else None,
                               actionCount=scene['actions'], simSeconds=round(scene['sim'], 2)))
    result = dict(trial=label, complete=done and len(scenes) == 6, scenes=scenes)
    if not ready or not gaps:
        return result
    stats = [json.loads(line) for line in (folder / f'{label}-proc.jsonl').read_text().splitlines()]
    loaded = [row for row in stats if row[0] >= ready['ms'] / 1000
              and any(proc[0] == 'qmlscene' for proc in row[1].values())]
    def memory(row):
        return sum(proc[2] for proc in row[1].values()) / 1024
    elapsed = cpu = gpu = 0.0
    for a, b in itertools.pairwise(loaded):
        delta = b[0] - a[0]
        if delta <= 0:
            continue
        elapsed += delta
        cpu += sum(max(0, proc[1] - a[1][pid][1]) for pid, proc in b[1].items() if pid in a[1])
        gpu += sum(max(0, value[1] - a[2][client][1]) for client, value in b[2].items() if client in a[2]) / 1e9
    audio = [float(line.split()[2]) for line in (folder / f'{label}-host.log').read_text().splitlines()
             if line.startswith('AUDIO audio.sample.play ')]
    if len(swaps) > 1 and swaps[-1] > swaps[0]:
        _, swap_stats = frames(swaps)
        result['qtSwaps'] = dict(fps=round((len(swaps)-1)*1000/(swaps[-1]-swaps[0]), 2), **swap_stats)
    result.update(
        readyFromLaunch=round(ready['ms'] - float((folder / f'{label}-clock').read_text())*1000),
        readyInPage=round(ready['inPageMs']),
        fps=round(sum(s['frames'] for s in scenes)*1000 / sum(s['elapsedMs'] for s in scenes), 2),
        mean=round(statistics.mean(gaps), 2), median=round(statistics.median(gaps), 2),
        p95=percentile(gaps, .95), p99=percentile(gaps, .99), max=percentile(gaps, 1),
        over33=sum(g > 33.3 for g in gaps), over100=sum(g > 100 for g in gaps), n=len(gaps),
        drawMedian=percentile(costs, .5), drawP95=percentile(costs, .95),
        cpu=round(100*cpu/elapsed, 1) if elapsed else None,
        gpuRender=round(100*gpu/elapsed, 2) if elapsed and any(r[2] for r in loaded) else None,
        pssMean=round(statistics.mean(map(memory, loaded)), 1) if loaded else None,
        pssPeak=round(max(map(memory, stats)), 1) if stats else None,
        pssPlayPeak=round(max(map(memory, loaded)), 1) if loaded else None,
        audioMean=round(statistics.mean(audio), 2) if audio else None, audioP95=percentile(audio, .95),
        temperatureC=round(max(r[4] for r in stats)/1000, 1) if stats else None,
        loadRange=[min(r[3] for r in stats), max(r[3] for r in stats)] if stats else None)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('folder', type=Path)
    parser.add_argument('labels', nargs='+')
    args = parser.parse_args()
    print(json.dumps([summarize(args.folder, label) for label in args.labels], indent=2))
