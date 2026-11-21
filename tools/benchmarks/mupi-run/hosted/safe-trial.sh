#!/bin/bash
set -eu
cd "$(dirname "$0")"
unit=$(basename "$(awk -F: '$1=="0"{print $3}' /proc/self/cgroup)")
case "$unit" in runlab-*.service) ;; *) echo "Use a dedicated transient runlab-*.service unit." >&2; exit 2;; esac
name=$1; shift
case "$name" in ""|*[!A-Za-z0-9_-]*) exit 2;; esac
python3 guard-run.py >"$name.guard" &
observer=$!
trap 'kill "$observer" 2>/dev/null || true;wait "$observer" 2>/dev/null || true' EXIT
python3 watch.py >"$name.metrics" &
monitor=$!
trap 'kill "$observer" "$monitor" 2>/dev/null || true;wait || true' EXIT
date +%s%3N >"$name.clock"
./gpu.sh "$@" >"$name.log" 2>&1
cp host.log "$name.audio"
