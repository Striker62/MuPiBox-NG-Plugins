#!/usr/bin/env bash
# Launch from a fresh network namespace, with a separate headless Qt display.
set -eu
label=${1:?trial label}
bundle=$(realpath "${2:?instrumented mupiapp}")
case "$label" in *[!A-Za-z0-9_-]*|'') exit 2;; esac
if [[ $(readlink /proc/self/ns/net) == $(readlink /proc/1/ns/net) ]]; then
  echo 'Use a private network namespace for the temporary host.' >&2
  exit 1
fi
ip link set lo up
export RUN_BUNDLE="$bundle"
fixture=${BENCH_HOST:?path to compiled opt-in test host}
user=${BENCH_USER:?unprivileged Qt test user}
script_dir=$(cd "$(dirname "$0")" && pwd)
if [[ -e "$label.log" ]]; then echo 'Choose a new trial label.' >&2;exit 1;fi
"$fixture" -test.run '^TestRendererBenchHost$' -test.v >"$label-host.log" 2>&1 &
host=$!
python3 "$script_dir/measure.py" >"$label-proc.jsonl" &
observer=$!
trap 'kill "$observer" "$host" 2>/dev/null || true; wait || true' EXIT
for _ in $(seq 1 100); do
  if grep -q '^BENCH_HOST_READY$' "$label-host.log"; then break; fi
  if ! kill -0 "$host" 2>/dev/null; then cat "$label-host.log" >&2;exit 1;fi
  sleep 0.1
done
grep -q '^BENCH_HOST_READY$' "$label-host.log"
date +%s.%N >"$label-clock"
runuser -m -u "$user" -- timeout 185 /usr/lib/qt6/bin/qmlscene "$script_dir/Test.qml" >"$label.log" 2>&1
grep -q 'MUPIBENCH DONE true' "$label.log"
